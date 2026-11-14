import AVFoundation
import Combine
import CoreImage
import CoreImage.CIFilterBuiltins
import CoreMotion
import Foundation

// MARK: - Options

enum PeakingColor: String, CaseIterable, Identifiable {
    case red = "Red", green = "Green", blue = "Blue", yellow = "Yellow", white = "White"
    var id: String { rawValue }

    var vector: CIVector {
        switch self {
        case .red: return CIVector(x: 1, y: 0.1, z: 0.1, w: 1)
        case .green: return CIVector(x: 0.1, y: 1, z: 0.2, w: 1)
        case .blue: return CIVector(x: 0.2, y: 0.5, z: 1, w: 1)
        case .yellow: return CIVector(x: 1, y: 0.9, z: 0, w: 1)
        case .white: return CIVector(x: 1, y: 1, z: 1, w: 1)
        }
    }
}

enum Desqueeze: Double, CaseIterable, Identifiable {
    case none = 1, x133 = 1.33, x15 = 1.5, x18 = 1.8, x2 = 2
    var id: Double { rawValue }
    var label: String { self == .none ? "Off" : String(format: "%.2g×", rawValue) }
}

/// Snapshot the render loop reads on every frame.
struct MonitorSnapshot {
    var zebras = false
    var zebraThreshold: Float = 0.95
    var falseColor = false
    var peaking = false
    var peakingColor: PeakingColor = .red
    var peakingSensitivity: Float = 0.5
    var desqueeze: Double = 1
}

/// User-facing monitoring options (main thread), mirrored into a lock-protected snapshot for the GPU loop.
final class MonitorOptions: ObservableObject {
    @Published var zebras = false { didSet { sync() } }
    @Published var zebraThreshold: Float = 0.95 { didSet { sync() } }
    @Published var falseColor = false { didSet { sync() } }
    @Published var peaking = false { didSet { sync() } }
    @Published var peakingColor: PeakingColor = .red { didSet { sync() } }
    @Published var peakingSensitivity: Float = 0.5 { didSet { sync() } }
    @Published var desqueeze: Desqueeze = .none { didSet { sync() } }
    @Published var histogram = true { didSet { sync() } }
    @Published var audioMeters = true { didSet { sync() } }
    @Published var horizon = false { didSet { sync() } }

    private let lock = NSLock()
    private var _snapshot = MonitorSnapshot()
    private let defaults = UserDefaults.standard
    private var loading = true

    init() {
        let d = defaults
        if d.object(forKey: "mon.zebras") != nil {
            zebras = d.bool(forKey: "mon.zebras")
            zebraThreshold = d.float(forKey: "mon.zebraThreshold")
            falseColor = d.bool(forKey: "mon.falseColor")
            peaking = d.bool(forKey: "mon.peaking")
            peakingColor = PeakingColor(rawValue: d.string(forKey: "mon.peakingColor") ?? "") ?? .red
            peakingSensitivity = d.float(forKey: "mon.peakingSensitivity")
            desqueeze = Desqueeze(rawValue: d.double(forKey: "mon.desqueeze")) ?? .none
            histogram = d.bool(forKey: "mon.histogram")
            audioMeters = d.bool(forKey: "mon.audioMeters")
            horizon = d.bool(forKey: "mon.horizon")
        }
        loading = false
        sync()
    }

    var snapshot: MonitorSnapshot {
        lock.lock(); defer { lock.unlock() }
        return _snapshot
    }

    private func sync() {
        guard !loading else { return }
        let s = MonitorSnapshot(
            zebras: zebras, zebraThreshold: zebraThreshold, falseColor: falseColor,
            peaking: peaking, peakingColor: peakingColor, peakingSensitivity: peakingSensitivity,
            desqueeze: desqueeze.rawValue)
        lock.lock(); _snapshot = s; lock.unlock()

        defaults.set(zebras, forKey: "mon.zebras")
        defaults.set(zebraThreshold, forKey: "mon.zebraThreshold")
        defaults.set(falseColor, forKey: "mon.falseColor")
        defaults.set(peaking, forKey: "mon.peaking")
        defaults.set(peakingColor.rawValue, forKey: "mon.peakingColor")
        defaults.set(peakingSensitivity, forKey: "mon.peakingSensitivity")
        defaults.set(desqueeze.rawValue, forKey: "mon.desqueeze")
        defaults.set(histogram, forKey: "mon.histogram")
        defaults.set(audioMeters, forKey: "mon.audioMeters")
        defaults.set(horizon, forKey: "mon.horizon")
    }
}

// MARK: - Kernels

enum MonitorKernels {
    private static let library: Data? = Bundle.main
        .url(forResource: "default", withExtension: "metallib")
        .flatMap { try? Data(contentsOf: $0) }

    static let zebra: CIColorKernel? = library.flatMap {
        try? CIColorKernel(functionName: "zebraKernel", fromMetalLibraryData: $0)
    }
    static let falseColor: CIColorKernel? = library.flatMap {
        try? CIColorKernel(functionName: "falseColorKernel", fromMetalLibraryData: $0)
    }
    static let peaking: CIKernel? = library.flatMap {
        try? CIKernel(functionName: "peakingKernel", fromMetalLibraryData: $0)
    }

    /// Applies the assists to an image that's already at display resolution.
    static func apply(_ s: MonitorSnapshot, to image: CIImage, pixelScale: CGFloat) -> CIImage {
        var out = image
        let extent = image.extent
        if s.falseColor, let k = falseColor, let r = k.apply(extent: extent, arguments: [out]) {
            out = r
        }
        if s.peaking, !s.falseColor, let k = peaking {
            // Sensitivity 0 → only very hard edges, 1 → lots of detail.
            let threshold = 0.35 - 0.3 * s.peakingSensitivity
            if let r = k.apply(extent: extent,
                               roiCallback: { _, rect in rect.insetBy(dx: -1, dy: -1) },
                               arguments: [out, threshold, s.peakingColor.vector]) {
                out = r
            }
        }
        if s.zebras, !s.falseColor, let k = zebra,
           let r = k.apply(extent: extent, arguments: [out, s.zebraThreshold, Float(6 * pixelScale)]) {
            out = r
        }
        return out.cropped(to: extent)
    }
}

// MARK: - Histogram

final class HistogramModel: ObservableObject {
    static let binCount = 64

    @Published private(set) var red: [Float] = []
    @Published private(set) var green: [Float] = []
    @Published private(set) var blue: [Float] = []

    private let queue = DispatchQueue(label: "lutcam.histogram", qos: .utility)
    private let lock = NSLock()
    private var busy = false
    private var _enabled = true

    var enabled: Bool {
        get { lock.lock(); defer { lock.unlock() }; return _enabled }
        set { lock.lock(); _enabled = newValue; lock.unlock() }
    }

    /// Called from the capture queue; drops frames while a computation is in flight.
    func submit(_ image: CIImage, context: CIContext) {
        lock.lock()
        guard _enabled, !busy, image.extent.width > 0 else { lock.unlock(); return }
        busy = true
        lock.unlock()

        queue.async {
            defer {
                // Throttle to ~8 Hz: stay busy a little after each computation.
                self.queue.asyncAfter(deadline: .now() + 0.12) {
                    self.lock.lock(); self.busy = false; self.lock.unlock()
                }
            }
            let scale = 192 / image.extent.width
            let small = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
            let filter = CIFilter.areaHistogram()
            filter.inputImage = small
            filter.extent = small.extent
            filter.count = Self.binCount
            filter.scale = 1
            guard let output = filter.outputImage else { return }

            var bins = [Float](repeating: 0, count: Self.binCount * 4)
            bins.withUnsafeMutableBytes { ptr in
                context.render(output, toBitmap: ptr.baseAddress!, rowBytes: Self.binCount * 16,
                               bounds: CGRect(x: 0, y: 0, width: Self.binCount, height: 1),
                               format: .RGBAf, colorSpace: nil)
            }
            var r = [Float](), g = [Float](), b = [Float]()
            for i in 0..<Self.binCount {
                r.append(bins[i * 4]); g.append(bins[i * 4 + 1]); b.append(bins[i * 4 + 2])
            }
            let peak = max(r.max() ?? 0, g.max() ?? 0, b.max() ?? 0, 1e-6)
            r = r.map { min(sqrt($0 / peak), 1) }  // sqrt keeps small populations visible
            g = g.map { min(sqrt($0 / peak), 1) }
            b = b.map { min(sqrt($0 / peak), 1) }
            DispatchQueue.main.async {
                self.red = r
                self.green = g
                self.blue = b
            }
        }
    }
}

// MARK: - Audio meters

final class AudioMeterModel: ObservableObject {
    /// Per channel: (average, peak) in dBFS.
    @Published private(set) var levels: [(average: Float, peak: Float)] = []

    private var timer: Timer?
    private weak var output: AVCaptureAudioDataOutput?

    func start(output: AVCaptureAudioDataOutput) {
        self.output = output
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0 / 15, repeats: true) { [weak self] _ in
            self?.poll()
        }
    }

    private func poll() {
        guard let channels = output?.connection(with: .audio)?.audioChannels, !channels.isEmpty else {
            if !levels.isEmpty { levels = [] }
            return
        }
        levels = channels.prefix(2).map { ($0.averagePowerLevel, $0.peakHoldLevel) }
    }
}

// MARK: - Horizon level

final class HorizonModel: ObservableObject {
    /// Horizon tilt in radians, in screen space (landscape-right UI).
    @Published private(set) var angle: Double = 0
    private let motion = CMMotionManager()

    func start() {
        guard motion.isDeviceMotionAvailable, !motion.isDeviceMotionActive else { return }
        motion.deviceMotionUpdateInterval = 1.0 / 30
        motion.startDeviceMotionUpdates(to: .main) { [weak self] data, _ in
            guard let self, let g = data?.gravity else { return }
            // In landscape-right, screen-right = device −y and screen-up = device +x.
            let a = atan2(g.x, -g.y) + .pi / 2
            if abs(a - self.angle) > 0.002 { self.angle = a }
        }
    }

    func stop() { motion.stopDeviceMotionUpdates() }
}
