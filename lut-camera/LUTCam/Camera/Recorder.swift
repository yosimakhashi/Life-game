import AVFoundation
import CoreImage
import VideoToolbox

enum VideoCodec: String, CaseIterable, Identifiable {
    case hevc = "HEVC"
    case h264 = "H.264"
    case proRes422 = "ProRes 422"
    case proRes422HQ = "ProRes 422 HQ"

    var id: String { rawValue }

    var avCodec: AVVideoCodecType {
        switch self {
        case .hevc: return .hevc
        case .h264: return .h264
        case .proRes422: return .proRes422
        case .proRes422HQ: return .proRes422HQ
        }
    }

    var isProRes: Bool { self == .proRes422 || self == .proRes422HQ }

    /// Approximate data rate; ProRes figures follow Apple's ProRes white paper.
    func estimatedBitsPerSecond(width: Int, height: Int, fps: Int) -> Double {
        let bitsPerPixel: Double
        switch self {
        case .hevc: bitsPerPixel = 0.2
        case .h264: bitsPerPixel = 0.3
        case .proRes422: bitsPerPixel = 1.9
        case .proRes422HQ: bitsPerPixel = 2.85
        }
        return Double(width * height * fps) * bitsPerPixel
    }
}

enum RecorderError: LocalizedError {
    case cannotAddInput, cannotStart, noFrames, unknown

    var errorDescription: String? {
        switch self {
        case .cannotAddInput: return "This codec/format combination isn't supported."
        case .cannotStart: return "Couldn't start recording."
        case .noFrames: return "No frames were recorded."
        case .unknown: return "Recording failed."
        }
    }
}

/// Writes a QuickTime file. Either "baked" (LUT rendered into every frame) or
/// "clean" (the untouched camera signal – e.g. Apple Log – with the LUT for monitoring only).
/// All methods except `init` must be called on the capture data queue.
final class Recorder {
    struct Config {
        var width: Int
        var height: Int
        var fps: Int
        var codec: VideoCodec
        var bakeLUT: Bool
        var tenBitSource: Bool
        var audioSettings: [String: Any]?
    }

    let url: URL
    let bakesLUT: Bool
    private let writer: AVAssetWriter
    private let videoInput: AVAssetWriterInput
    private let audioInput: AVAssetWriterInput?
    private let adaptor: AVAssetWriterInputPixelBufferAdaptor
    private let context: CIContext
    private var sessionStarted = false
    private var failed = false

    init(config: Config, context: CIContext) throws {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd_HHmmss"
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("LUTCam_\(formatter.string(from: Date())).mov")
        try? FileManager.default.removeItem(at: url)

        let writer = try AVAssetWriter(outputURL: url, fileType: .mov)

        var video: [String: Any] = [
            AVVideoCodecKey: config.codec.avCodec,
            AVVideoWidthKey: config.width,
            AVVideoHeightKey: config.height,
        ]
        if !config.codec.isProRes {
            // ≈50 Mb/s HEVC, 75 Mb/s H.264 at 4K30
            let bitrate = config.codec.estimatedBitsPerSecond(width: config.width, height: config.height, fps: config.fps)
            var props: [String: Any] = [
                AVVideoAverageBitRateKey: Int(bitrate),
                AVVideoExpectedSourceFrameRateKey: config.fps,
                AVVideoMaxKeyFrameIntervalKey: config.fps,
            ]
            if config.codec == .hevc && config.tenBitSource && !config.bakeLUT {
                props[AVVideoProfileLevelKey] = kVTProfileLevel_HEVC_Main10_AutoLevel as String
            }
            if config.codec == .h264 {
                props[AVVideoProfileLevelKey] = AVVideoProfileLevelH264HighAutoLevel
            }
            video[AVVideoCompressionPropertiesKey] = props
        }
        if config.bakeLUT {
            video[AVVideoColorPropertiesKey] = [
                AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
                AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
                AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
            ]
        }

        let videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: video)
        videoInput.expectsMediaDataInRealTime = true
        guard writer.canAdd(videoInput) else { throw RecorderError.cannotAddInput }
        writer.add(videoInput)

        let attributes: [String: Any]? = config.bakeLUT ? [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: config.width,
            kCVPixelBufferHeightKey as String: config.height,
            kCVPixelBufferIOSurfacePropertiesKey as String: [String: Any](),
            kCVPixelBufferMetalCompatibilityKey as String: true,
        ] : nil
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: videoInput, sourcePixelBufferAttributes: attributes)

        var audioInput: AVAssetWriterInput?
        if let settings = config.audioSettings {
            let input = AVAssetWriterInput(mediaType: .audio, outputSettings: settings)
            input.expectsMediaDataInRealTime = true
            if writer.canAdd(input) {
                writer.add(input)
                audioInput = input
            }
        }

        guard writer.startWriting() else { throw writer.error ?? RecorderError.cannotStart }

        self.url = url
        self.bakesLUT = config.bakeLUT
        self.writer = writer
        self.videoInput = videoInput
        self.audioInput = audioInput
        self.adaptor = adaptor
        self.context = context
    }

    func appendVideo(_ sampleBuffer: CMSampleBuffer, graded: CIImage?) {
        guard !failed, writer.status == .writing else { return }
        let pts = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        if !sessionStarted {
            writer.startSession(atSourceTime: pts)
            sessionStarted = true
        }
        guard videoInput.isReadyForMoreMediaData else { return } // drop frame rather than block capture

        if bakesLUT, let graded {
            guard let pool = adaptor.pixelBufferPool else { return }
            var buffer: CVPixelBuffer?
            CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer)
            guard let buffer else { return }
            context.render(graded, to: buffer, bounds: graded.extent, colorSpace: nil)
            if !adaptor.append(buffer, withPresentationTime: pts) { failed = true }
        } else {
            if !videoInput.append(sampleBuffer) { failed = true }
        }
    }

    func appendAudio(_ sampleBuffer: CMSampleBuffer) {
        guard sessionStarted, !failed, writer.status == .writing,
              let audioInput, audioInput.isReadyForMoreMediaData else { return }
        audioInput.append(sampleBuffer)
    }

    func finish(_ completion: @escaping (Result<URL, Error>) -> Void) {
        guard writer.status == .writing, sessionStarted else {
            writer.cancelWriting()
            completion(.failure(writer.error ?? RecorderError.noFrames))
            return
        }
        videoInput.markAsFinished()
        audioInput?.markAsFinished()
        let writer = self.writer
        let url = self.url
        writer.finishWriting {
            if writer.status == .completed {
                completion(.success(url))
            } else {
                completion(.failure(writer.error ?? RecorderError.unknown))
            }
        }
    }
}
