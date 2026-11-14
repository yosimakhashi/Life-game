import CoreImage
import CoreImage.CIFilterBuiltins
import Metal
import UIKit

/// Applies the active LUT to camera frames. Colour management is disabled so the
/// LUT sees the raw encoded values (Rec.709 or Apple Log), like a hardware monitor LUT.
final class FrameProcessor {
    let device: MTLDevice
    let context: CIContext

    private let lock = NSLock()
    private var lut: LUT?
    private var intensity: Float = 1

    init() {
        guard let device = MTLCreateSystemDefaultDevice() else {
            fatalError("Metal is required")
        }
        self.device = device
        context = CIContext(mtlDevice: device, options: [
            .workingColorSpace: NSNull(),
            .outputColorSpace: NSNull(),
            .cacheIntermediates: false,
        ])
    }

    func configure(lut: LUT?, intensity: Float) {
        lock.lock()
        self.lut = lut
        self.intensity = intensity
        lock.unlock()
    }

    func grade(_ image: CIImage) -> CIImage {
        lock.lock()
        let lut = self.lut
        let k = intensity
        lock.unlock()
        return Self.apply(lut, intensity: k, to: image)
    }

    static func apply(_ lut: LUT?, intensity: Float = 1, to image: CIImage) -> CIImage {
        guard let lut, intensity > 0.001 else { return image }
        let cube = CIFilter.colorCube()
        cube.cubeDimension = Float(lut.dimension)
        cube.cubeData = lut.cubeData
        cube.inputImage = image
        guard let graded = cube.outputImage else { return image }
        if intensity >= 0.999 { return graded }
        let mix = CIFilter.dissolveTransition()
        mix.inputImage = image
        mix.targetImage = graded
        mix.time = intensity
        return mix.outputImage ?? graded
    }
}

/// Latest frames, shared between the capture queue and the preview's draw loop.
final class PreviewStore {
    private let lock = NSLock()
    private var _source: CIImage?
    private var _graded: CIImage?
    private var _monitor: CIImage?

    func update(source: CIImage, graded: CIImage, monitor: CIImage) {
        lock.lock()
        _source = source
        _graded = graded
        _monitor = monitor
        lock.unlock()
    }

    var source: CIImage? { lock.lock(); defer { lock.unlock() }; return _source }
    var graded: CIImage? { lock.lock(); defer { lock.unlock() }; return _graded }
    var monitor: CIImage? { lock.lock(); defer { lock.unlock() }; return _monitor }
}

enum LUTThumbnailer {
    static func render(source: CIImage, luts: [LUT], context: CIContext) -> [String: UIImage] {
        guard source.extent.width > 0, let cs = CGColorSpace(name: CGColorSpace.sRGB) else { return [:] }
        let scale = 240 / source.extent.width
        let small = source.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        let rect = small.extent.integral
        var out: [String: UIImage] = [:]
        if let cg = context.createCGImage(small, from: rect, format: .RGBA8, colorSpace: cs) {
            out["none"] = UIImage(cgImage: cg)
        }
        for lut in luts {
            let img = FrameProcessor.apply(lut, to: small)
            if let cg = context.createCGImage(img, from: rect, format: .RGBA8, colorSpace: cs) {
                out[lut.id] = UIImage(cgImage: cg)
            }
        }
        return out
    }
}
