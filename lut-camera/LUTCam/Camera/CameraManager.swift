import AVFoundation
import CoreImage
import Photos
import UIKit

enum CaptureResolution: String, CaseIterable, Identifiable {
    case hd1080 = "1080p"
    case uhd4K = "4K"

    var id: String { rawValue }
    var width: Int32 { self == .hd1080 ? 1920 : 3840 }
    var height: Int32 { self == .hd1080 ? 1080 : 2160 }
}

enum ColorProfile: String, CaseIterable, Identifiable {
    case standard = "Rec.709"
    case appleLog = "Apple Log"
    var id: String { rawValue }
}

enum ControlKind: String, CaseIterable, Identifiable {
    case iso, shutter, whiteBalance, tint, focus, exposure
    var id: String { rawValue }

    var title: String {
        switch self {
        case .iso: return "ISO"
        case .shutter: return "SHUTTER"
        case .whiteBalance: return "WB"
        case .tint: return "TINT"
        case .focus: return "FOCUS"
        case .exposure: return "EV"
        }
    }
}

enum StabilizationOption: String, CaseIterable, Identifiable {
    case off = "Off", standard = "Standard", cinematic = "Cinematic"
    var id: String { rawValue }
    var mode: AVCaptureVideoStabilizationMode {
        switch self {
        case .off: return .off
        case .standard: return .standard
        case .cinematic: return .cinematic
        }
    }
}

struct LensOption: Identifiable, Hashable {
    let id: String
    let label: String
}

private struct ActiveFormat {
    var width = 3840
    var height = 2160
    var fps = 30
    var tenBit = false
}

final class CameraManager: NSObject, ObservableObject {
    // MARK: Published state (main thread)

    @Published var authorizationDenied = false
    @Published private(set) var isRecording = false
    @Published private(set) var recordingTime: TimeInterval = 0
    @Published var statusMessage: String?

    @Published private(set) var lenses: [LensOption] = []
    @Published private(set) var currentLensID = ""

    @Published private(set) var resolution: CaptureResolution = .uhd4K
    @Published private(set) var frameRate = 30
    @Published private(set) var colorProfile: ColorProfile = .standard
    @Published var codec: VideoCodec = .hevc
    @Published private(set) var supportsAppleLog = false
    @Published private(set) var supportedCodecs: [VideoCodec] = [.hevc, .h264]
    @Published private(set) var availableFrameRates: [Int] = [24, 25, 30]
    @Published private(set) var availableResolutions: [CaptureResolution] = CaptureResolution.allCases

    @Published private(set) var isoAuto = true
    @Published private(set) var iso: Float = 100
    @Published private(set) var isoRange: ClosedRange<Float> = 25...3200
    @Published private(set) var shutterAuto = true
    @Published private(set) var shutterDenominator: Double = 60
    @Published private(set) var shutterRange: ClosedRange<Double> = 24...8000
    @Published private(set) var exposureBias: Float = 0
    @Published private(set) var wbAuto = true
    @Published private(set) var temperature: Float = 5600
    @Published private(set) var tint: Float = 0
    @Published private(set) var focusAuto = true
    @Published private(set) var lensPosition: Float = 0.5

    @Published var selectedLUT: LUT? { didSet { syncProcessor() } }
    @Published var lutIntensity: Float = 1 { didSet { syncProcessor() } }
    @Published var showLUTOnMonitor = true {
        didSet {
            let value = showLUTOnMonitor
            dataQueue.async { self.monitorShowsLUT = value }
        }
    }
    @Published var bakeLUTIntoRecording = true

    @Published private(set) var hasTorch = false
    @Published private(set) var torchOn = false
    @Published private(set) var stabilization: StabilizationOption = .off
    @Published private(set) var freeBytes: Int64 = 0

    /// Rough minutes of recording left at the current format and codec.
    var minutesRemaining: Int {
        let bits = codec.estimatedBitsPerSecond(
            width: Int(resolution.width), height: Int(resolution.height), fps: frameRate) + 256_000
        return Int(Double(freeBytes) * 8 / bits / 60)
    }

    // MARK: Pipeline

    let session = AVCaptureSession()
    let processor = FrameProcessor()
    let previewStore = PreviewStore()
    let histogram = HistogramModel()
    let audioMeter = AudioMeterModel()

    private let sessionQueue = DispatchQueue(label: "lutcam.session")
    private let dataQueue = DispatchQueue(label: "lutcam.data", qos: .userInitiated)
    private let videoOutput = AVCaptureVideoDataOutput()
    private let audioOutput = AVCaptureAudioDataOutput()
    private var videoInput: AVCaptureDeviceInput?
    private var device: AVCaptureDevice?
    private var isConfigured = false
    private var hasAudio = false
    private let activeFormatLock = NSLock()
    private var _activeFormat = ActiveFormat()
    private var activeFormat: ActiveFormat {
        get { activeFormatLock.lock(); defer { activeFormatLock.unlock() }; return _activeFormat }
        set { activeFormatLock.lock(); _activeFormat = newValue; activeFormatLock.unlock() }
    }

    // dataQueue-confined
    private var recorder: Recorder?
    private var monitorShowsLUT = true

    // sessionQueue-confined
    private var stabilizationMode: AVCaptureVideoStabilizationMode = .off
    private var pollCount = 0

    // main-thread
    private var pollTimer: Timer?
    private var recordTimer: Timer?
    private var recordStart: Date?

    static let standardShutterStops: [Double] = [
        24, 25, 30, 40, 48, 50, 60, 80, 96, 100, 120, 125, 160, 180, 200, 240, 250,
        320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000,
    ]

    var shutterStops: [Double] {
        let stops = Self.standardShutterStops.filter { shutterRange.contains($0) }
        return stops.isEmpty ? [shutterRange.lowerBound] : stops
    }

    override init() {
        super.init()
        NotificationCenter.default.addObserver(
            self, selector: #selector(sessionRuntimeError),
            name: AVCaptureSession.runtimeErrorNotification, object: session)
    }

    // MARK: Lifecycle

    func start() {
        Task {
            let videoOK = await AVCaptureDevice.requestAccess(for: .video)
            let audioOK = await AVCaptureDevice.requestAccess(for: .audio)
            guard videoOK else {
                DispatchQueue.main.async { self.authorizationDenied = true }
                return
            }
            let settings = await MainActor.run { (self.resolution, self.frameRate, self.colorProfile) }
            sessionQueue.async {
                self.configureSession(audio: audioOK, resolution: settings.0, fps: settings.1, profile: settings.2)
                if !self.session.isRunning { self.session.startRunning() }
                DispatchQueue.main.async {
                    self.startPolling()
                    self.reapplyManualControls()
                }
            }
        }
    }

    @objc private func sessionRuntimeError(_ note: Notification) {
        sessionQueue.async {
            if !self.session.isRunning { self.session.startRunning() }
        }
    }

    private func configureSession(audio: Bool, resolution: CaptureResolution, fps: Int, profile: ColorProfile) {
        guard !isConfigured else { return }
        session.beginConfiguration()
        defer { session.commitConfiguration() }

        session.automaticallyConfiguresCaptureDeviceForWideColor = false

        let discovery = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInUltraWideCamera, .builtInWideAngleCamera, .builtInTelephotoCamera],
            mediaType: .video, position: .back)
        let devices = discovery.devices.sorted { rank($0) < rank($1) }

        guard let device = devices.first(where: { $0.deviceType == .builtInWideAngleCamera }) ?? devices.first,
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else {
            report("No camera available")
            return
        }
        session.addInput(input)
        videoInput = input
        self.device = device

        if audio, let mic = AVCaptureDevice.default(for: .audio),
           let micInput = try? AVCaptureDeviceInput(device: mic),
           session.canAddInput(micInput) {
            session.addInput(micInput)
            hasAudio = true
        }

        videoOutput.alwaysDiscardsLateVideoFrames = true
        videoOutput.setSampleBufferDelegate(self, queue: dataQueue)
        if session.canAddOutput(videoOutput) { session.addOutput(videoOutput) }

        if hasAudio {
            audioOutput.setSampleBufferDelegate(self, queue: dataQueue)
            if session.canAddOutput(audioOutput) { session.addOutput(audioOutput) } else { hasAudio = false }
        }

        if !applyFormat(resolution: resolution, fps: fps, profile: profile) {
            _ = applyFormat(resolution: .hd1080, fps: 30, profile: .standard)
        }
        isConfigured = true

        let options = devices.map { LensOption(id: $0.uniqueID, label: lensLabel($0)) }
        let currentID = device.uniqueID
        DispatchQueue.main.async {
            self.lenses = options
            self.currentLensID = currentID
        }
    }

    private func rank(_ d: AVCaptureDevice) -> Int {
        switch d.deviceType {
        case .builtInUltraWideCamera: return 0
        case .builtInWideAngleCamera: return 1
        default: return 2
        }
    }

    private func lensLabel(_ d: AVCaptureDevice) -> String {
        switch d.deviceType {
        case .builtInUltraWideCamera: return "0.5×"
        case .builtInWideAngleCamera: return "1×"
        case .builtInTelephotoCamera: return "Tele"
        default: return d.localizedName
        }
    }

    // MARK: Format

    private func dims(_ f: AVCaptureDevice.Format) -> CMVideoDimensions {
        CMVideoFormatDescriptionGetDimensions(f.formatDescription)
    }

    private func supports(_ f: AVCaptureDevice.Format, fps: Int) -> Bool {
        f.videoSupportedFrameRateRanges.contains {
            Double(fps) >= $0.minFrameRate - 0.01 && Double(fps) <= $0.maxFrameRate + 0.01
        }
    }

    /// Must be called on `sessionQueue` inside begin/commitConfiguration.
    @discardableResult
    private func applyFormat(resolution: CaptureResolution, fps: Int, profile: ColorProfile) -> Bool {
        guard let device else { return false }
        let wantLog = profile == .appleLog
        let candidates = device.formats.filter { f in
            let d = dims(f)
            return d.width == resolution.width && d.height == resolution.height
                && supports(f, fps: fps)
                && (!wantLog || f.supportedColorSpaces.contains(.appleLog))
        }
        let preferred: FourCharCode = wantLog
            ? kCVPixelFormatType_420YpCbCr10BiPlanarVideoRange
            : kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange
        guard let format = candidates.first(where: { CMFormatDescriptionGetMediaSubType($0.formatDescription) == preferred })
                ?? candidates.first else {
            report("\(resolution.rawValue) \(fps)fps\(wantLog ? " Apple Log" : "") isn't supported on this lens")
            return false
        }

        do {
            try device.lockForConfiguration()
            device.activeFormat = format
            if wantLog {
                device.activeColorSpace = .appleLog
            } else if format.supportedColorSpaces.contains(.sRGB) {
                device.activeColorSpace = .sRGB
            }
            let duration = CMTime(value: 1, timescale: CMTimeScale(fps))
            device.activeVideoMinFrameDuration = duration
            device.activeVideoMaxFrameDuration = duration
            device.unlockForConfiguration()
        } catch {
            report("Couldn't configure camera: \(error.localizedDescription)")
            return false
        }

        let tenBit = wantLog && videoOutput.availableVideoPixelFormatTypes.contains(kCVPixelFormatType_420YpCbCr10BiPlanarVideoRange)
        videoOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: tenBit
                ? kCVPixelFormatType_420YpCbCr10BiPlanarVideoRange
                : kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
        ]
        if let connection = videoOutput.connection(with: .video) {
            // The UI is locked to landscape-right, which is the sensor's native orientation.
            if connection.isVideoRotationAngleSupported(0) { connection.videoRotationAngle = 0 }
            if connection.isVideoStabilizationSupported { connection.preferredVideoStabilizationMode = stabilizationMode }
        }

        activeFormat = ActiveFormat(width: Int(resolution.width), height: Int(resolution.height), fps: fps, tenBit: tenBit)
        publishCapabilities(format: format, resolution: resolution, fps: fps, profile: profile)
        return true
    }

    private func publishCapabilities(format: AVCaptureDevice.Format, resolution: CaptureResolution, fps: Int, profile: ColorProfile) {
        guard let device else { return }
        let isoRange = format.minISO...max(format.maxISO, format.minISO + 1)
        let fastest = min(8000, 1 / max(format.minExposureDuration.seconds, 1.0 / 8000))
        let shutterRange = Double(fps)...max(fastest, Double(fps))
        let logOK = device.formats.contains { $0.supportedColorSpaces.contains(.appleLog) }
        let rates = [24, 25, 30, 48, 50, 60, 120].filter { r in
            device.formats.contains { f in
                let d = dims(f)
                return d.width == resolution.width && d.height == resolution.height && supports(f, fps: r)
                    && (profile != .appleLog || f.supportedColorSpaces.contains(.appleLog))
            }
        }
        let resolutions = CaptureResolution.allCases.filter { res in
            device.formats.contains { dims($0).width == res.width && dims($0).height == res.height }
        }
        let writerCodecs = videoOutput.availableVideoCodecTypesForAssetWriter(writingTo: .mov)
        let codecs = VideoCodec.allCases.filter { writerCodecs.contains($0.avCodec) }

        let torch = device.hasTorch && device.isTorchModeSupported(.on)
        DispatchQueue.main.async {
            self.hasTorch = torch
            if !torch { self.torchOn = false }
            self.resolution = resolution
            self.frameRate = fps
            self.colorProfile = profile
            self.isoRange = isoRange
            self.shutterRange = shutterRange
            self.supportsAppleLog = logOK
            self.availableFrameRates = rates.isEmpty ? [fps] : rates
            self.availableResolutions = resolutions
            self.supportedCodecs = codecs.isEmpty ? [.hevc] : codecs
            if !self.supportedCodecs.contains(self.codec) { self.codec = self.supportedCodecs[0] }
            self.iso = min(max(self.iso, isoRange.lowerBound), isoRange.upperBound)
            self.shutterDenominator = min(max(self.shutterDenominator, shutterRange.lowerBound), shutterRange.upperBound)
        }
    }

    func updateFormat(resolution: CaptureResolution? = nil, fps: Int? = nil, profile: ColorProfile? = nil) {
        guard !isRecording else { return }
        let res = resolution ?? self.resolution
        let rate = fps ?? frameRate
        let prof = profile ?? colorProfile
        if prof == .appleLog && colorProfile != .appleLog && selectedLUT == nil {
            selectedLUT = BuiltInLUTs.appleLogToRec709
        }
        sessionQueue.async {
            self.session.beginConfiguration()
            self.applyFormat(resolution: res, fps: rate, profile: prof)
            self.session.commitConfiguration()
            DispatchQueue.main.async { self.reapplyManualControls() }
        }
    }

    func selectLens(_ id: String) {
        guard !isRecording, id != currentLensID else { return }
        let res = resolution, rate = frameRate, prof = colorProfile
        sessionQueue.async {
            guard let newDevice = AVCaptureDevice(uniqueID: id),
                  let newInput = try? AVCaptureDeviceInput(device: newDevice) else { return }
            self.session.beginConfiguration()
            let oldInput = self.videoInput
            let oldDevice = self.device
            if let oldInput { self.session.removeInput(oldInput) }
            if self.session.canAddInput(newInput) {
                self.session.addInput(newInput)
                self.videoInput = newInput
                self.device = newDevice
                if !self.applyFormat(resolution: res, fps: rate, profile: prof) {
                    self.applyFormat(resolution: .hd1080, fps: 30, profile: .standard)
                }
            } else if let oldInput {
                self.session.addInput(oldInput)
                self.device = oldDevice
            }
            self.session.commitConfiguration()
            let current = self.device?.uniqueID ?? id
            DispatchQueue.main.async {
                self.currentLensID = current
                self.reapplyManualControls()
            }
        }
    }

    func toggleTorch() {
        let on = !torchOn
        torchOn = on
        sessionQueue.async {
            guard let d = self.device, d.hasTorch else { return }
            do { try d.lockForConfiguration() } catch { return }
            if on {
                try? d.setTorchModeOn(level: AVCaptureDevice.maxAvailableTorchLevel)
            } else {
                d.torchMode = .off
            }
            d.unlockForConfiguration()
        }
    }

    func setStabilization(_ option: StabilizationOption) {
        guard !isRecording else { return }
        stabilization = option
        sessionQueue.async {
            self.stabilizationMode = option.mode
            if let c = self.videoOutput.connection(with: .video), c.isVideoStabilizationSupported {
                c.preferredVideoStabilizationMode = option.mode
            }
        }
    }

    private func refreshFreeSpace() {
        let url = FileManager.default.temporaryDirectory
        DispatchQueue.global(qos: .utility).async {
            let values = try? url.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
            let bytes = values?.volumeAvailableCapacityForImportantUsage ?? 0
            DispatchQueue.main.async { self.freeBytes = bytes }
        }
    }

    func cycleLens() {
        guard !lenses.isEmpty else { return }
        let index = lenses.firstIndex { $0.id == currentLensID } ?? 0
        selectLens(lenses[(index + 1) % lenses.count].id)
    }

    // MARK: Manual controls (call from main)

    func setISO(_ value: Float) { iso = value; isoAuto = false; applyExposure() }
    func setShutter(_ denominator: Double) { shutterDenominator = denominator; shutterAuto = false; applyExposure() }
    func setExposureBias(_ value: Float) { exposureBias = value; applyExposure() }
    func setTemperature(_ value: Float) { temperature = value; wbAuto = false; applyWhiteBalance() }
    func setTint(_ value: Float) { tint = value; wbAuto = false; applyWhiteBalance() }
    func setLensPosition(_ value: Float) { lensPosition = value; focusAuto = false; applyFocus() }

    func isAuto(_ kind: ControlKind) -> Bool {
        switch kind {
        case .iso: return isoAuto
        case .shutter: return shutterAuto
        case .whiteBalance, .tint: return wbAuto
        case .focus: return focusAuto
        case .exposure: return isoAuto && shutterAuto
        }
    }

    func setAuto(_ kind: ControlKind, _ auto: Bool) {
        switch kind {
        case .iso: isoAuto = auto; applyExposure()
        case .shutter: shutterAuto = auto; applyExposure()
        case .whiteBalance, .tint: wbAuto = auto; applyWhiteBalance()
        case .focus: focusAuto = auto; applyFocus()
        case .exposure: isoAuto = auto; shutterAuto = auto; applyExposure()
        }
    }

    func displayValue(for kind: ControlKind) -> String {
        switch kind {
        case .iso: return "\(Int(iso.rounded()))"
        case .shutter: return "1/\(Int(shutterDenominator.rounded()))"
        case .whiteBalance: return "\(Int((temperature / 50).rounded() * 50))K"
        case .tint: return String(format: "%+d", Int(tint.rounded()))
        case .focus: return focusAuto ? "AF" : String(format: "%.2f", lensPosition)
        case .exposure: return String(format: "%+.1f", exposureBias)
        }
    }

    private func reapplyManualControls() {
        applyExposure()
        applyWhiteBalance()
        applyFocus()
    }

    private func applyExposure() {
        let isoAuto = self.isoAuto, shutterAuto = self.shutterAuto
        let iso = self.iso, denominator = self.shutterDenominator, bias = self.exposureBias
        sessionQueue.async {
            guard let d = self.device else { return }
            do { try d.lockForConfiguration() } catch { return }
            defer { d.unlockForConfiguration() }

            if isoAuto && shutterAuto {
                if d.isExposureModeSupported(.continuousAutoExposure) { d.exposureMode = .continuousAutoExposure }
                let b = min(max(bias, d.minExposureTargetBias), d.maxExposureTargetBias)
                d.setExposureTargetBias(b, completionHandler: nil)
            } else if d.isExposureModeSupported(.custom) {
                // iOS has no shutter/ISO priority: the non-manual value is held at its last metered reading.
                let format = d.activeFormat
                let duration: CMTime
                if shutterAuto {
                    duration = AVCaptureDevice.currentExposureDuration
                } else {
                    let longest = min(format.maxExposureDuration.seconds, d.activeVideoMaxFrameDuration.seconds)
                    let seconds = min(max(1 / denominator, format.minExposureDuration.seconds), longest)
                    duration = CMTime(seconds: seconds, preferredTimescale: 1_000_000)
                }
                let isoValue = isoAuto ? AVCaptureDevice.currentISO : min(max(iso, format.minISO), format.maxISO)
                d.setExposureModeCustom(duration: duration, iso: isoValue, completionHandler: nil)
            }
        }
    }

    private func applyWhiteBalance() {
        let auto = wbAuto, temperature = self.temperature, tint = self.tint
        sessionQueue.async {
            guard let d = self.device else { return }
            do { try d.lockForConfiguration() } catch { return }
            defer { d.unlockForConfiguration() }
            if auto {
                if d.isWhiteBalanceModeSupported(.continuousAutoWhiteBalance) {
                    d.whiteBalanceMode = .continuousAutoWhiteBalance
                }
            } else if d.isWhiteBalanceModeSupported(.locked) {
                var gains = d.deviceWhiteBalanceGains(for: .init(temperature: temperature, tint: tint))
                let maxGain = d.maxWhiteBalanceGain
                gains.redGain = min(max(gains.redGain, 1), maxGain)
                gains.greenGain = min(max(gains.greenGain, 1), maxGain)
                gains.blueGain = min(max(gains.blueGain, 1), maxGain)
                d.setWhiteBalanceModeLocked(with: gains, completionHandler: nil)
            }
        }
    }

    private func applyFocus() {
        let auto = focusAuto, position = lensPosition
        sessionQueue.async {
            guard let d = self.device else { return }
            do { try d.lockForConfiguration() } catch { return }
            defer { d.unlockForConfiguration() }
            if auto {
                if d.isFocusModeSupported(.continuousAutoFocus) { d.focusMode = .continuousAutoFocus }
            } else if d.isLockingFocusWithCustomLensPositionSupported {
                d.setFocusModeLocked(lensPosition: min(max(position, 0), 1), completionHandler: nil)
            }
        }
    }

    /// `point` is normalised (0...1) in landscape-right coordinates, matching the device's point of interest.
    func focus(at point: CGPoint) {
        focusAuto = true
        let meter = isoAuto && shutterAuto
        sessionQueue.async {
            guard let d = self.device else { return }
            do { try d.lockForConfiguration() } catch { return }
            defer { d.unlockForConfiguration() }
            if d.isFocusPointOfInterestSupported {
                d.focusPointOfInterest = point
                if d.isFocusModeSupported(.continuousAutoFocus) { d.focusMode = .continuousAutoFocus }
            }
            if meter, d.isExposurePointOfInterestSupported {
                d.exposurePointOfInterest = point
                if d.isExposureModeSupported(.continuousAutoExposure) { d.exposureMode = .continuousAutoExposure }
            }
        }
    }

    /// Keeps the readouts of auto values live.
    private func startPolling() {
        pollTimer?.invalidate()
        audioMeter.start(output: audioOutput)
        pollTimer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            self?.poll()
        }
    }

    private func poll() {
        pollCount += 1
        if pollCount % 20 == 1 { refreshFreeSpace() }
        guard let d = device else { return }
        if isoAuto, abs(d.iso - iso) > 0.5 { iso = d.iso }
        if shutterAuto {
            let s = d.exposureDuration.seconds
            if s > 0, abs(1 / s - shutterDenominator) > 0.5 { shutterDenominator = 1 / s }
        }
        if wbAuto {
            let values = d.temperatureAndTintValues(for: d.deviceWhiteBalanceGains)
            if abs(values.temperature - temperature) > 25 { temperature = values.temperature }
            if abs(values.tint - tint) > 0.5 { tint = values.tint }
        }
        if focusAuto, abs(d.lensPosition - lensPosition) > 0.005 { lensPosition = d.lensPosition }
    }

    // MARK: LUT

    private func syncProcessor() {
        processor.configure(lut: selectedLUT, intensity: lutIntensity)
    }

    // MARK: Recording

    func toggleRecording() {
        isRecording ? stopRecording() : startRecording()
    }

    private func startRecording() {
        let format = activeFormat
        let codec = self.codec
        let bake = bakeLUTIntoRecording && selectedLUT != nil
        let audioSettings = hasAudio
            ? audioOutput.recommendedAudioSettingsForAssetWriter(writingTo: .mov)
            : nil
        isRecording = true
        dataQueue.async {
            do {
                let config = Recorder.Config(
                    width: format.width, height: format.height, fps: format.fps, codec: codec,
                    bakeLUT: bake, tenBitSource: format.tenBit, audioSettings: audioSettings)
                self.recorder = try Recorder(config: config, context: self.processor.context)
                self.videoOutput.alwaysDiscardsLateVideoFrames = false
                DispatchQueue.main.async {
                    self.recordStart = Date()
                    self.recordingTime = 0
                    self.recordTimer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
                        guard let self, let start = self.recordStart else { return }
                        self.recordingTime = Date().timeIntervalSince(start)
                    }
                }
            } catch {
                DispatchQueue.main.async { self.isRecording = false }
                self.report("Can't record: \(error.localizedDescription)")
            }
        }
    }

    private func stopRecording() {
        isRecording = false
        recordTimer?.invalidate()
        recordTimer = nil
        recordStart = nil
        dataQueue.async {
            guard let recorder = self.recorder else { return }
            self.recorder = nil
            self.videoOutput.alwaysDiscardsLateVideoFrames = true
            recorder.finish { result in
                switch result {
                case .success(let url): self.saveVideo(url)
                case .failure(let error): self.report("Recording failed: \(error.localizedDescription)")
                }
            }
        }
    }

    private func saveVideo(_ url: URL) {
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                self.report("Allow Photos access in Settings to save clips")
                return
            }
            PHPhotoLibrary.shared().performChanges({
                let request = PHAssetCreationRequest.forAsset()
                let options = PHAssetResourceCreationOptions()
                options.shouldMoveFile = true
                request.addResource(with: .video, fileURL: url, options: options)
            }) { ok, error in
                self.report(ok ? "Clip saved to Photos" : "Save failed: \(error?.localizedDescription ?? "unknown")")
            }
        }
    }

    // MARK: Stills

    /// Saves the current graded frame (what the LUT produces) as a JPEG.
    func captureStill() {
        guard let image = previewStore.graded else { return }
        let context = processor.context
        DispatchQueue.global(qos: .userInitiated).async {
            guard let cs = CGColorSpace(name: CGColorSpace.sRGB),
                  let data = context.jpegRepresentation(of: image, colorSpace: cs, options: [:]) else {
                self.report("Couldn't capture still")
                return
            }
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
                guard status == .authorized || status == .limited else {
                    self.report("Allow Photos access in Settings to save stills")
                    return
                }
                PHPhotoLibrary.shared().performChanges({
                    PHAssetCreationRequest.forAsset().addResource(with: .photo, data: data, options: nil)
                }) { ok, _ in
                    self.report(ok ? "Still saved to Photos" : "Couldn't save still")
                }
            }
        }
    }

    private func report(_ message: String) {
        DispatchQueue.main.async { self.statusMessage = message }
    }
}

// MARK: - Sample buffers

extension CameraManager: AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        if output === videoOutput {
            guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
            let source = CIImage(cvPixelBuffer: pixelBuffer)
            let graded = processor.grade(source)
            let monitor = monitorShowsLUT ? graded : source
            previewStore.update(source: source, graded: graded, monitor: monitor)
            histogram.submit(monitor, context: processor.context)
            if let recorder {
                recorder.appendVideo(sampleBuffer, graded: recorder.bakesLUT ? graded : nil)
            }
        } else if output === audioOutput {
            recorder?.appendAudio(sampleBuffer)
        }
    }
}
