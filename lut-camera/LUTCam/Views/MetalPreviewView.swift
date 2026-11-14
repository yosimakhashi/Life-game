import CoreImage
import MetalKit
import SwiftUI

/// Draws the latest monitor frame (with LUT) via Core Image + Metal at display rate.
struct MetalPreviewView: UIViewRepresentable {
    let store: PreviewStore
    let processor: FrameProcessor
    let monitor: MonitorOptions
    var onTap: (CGPoint) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(store: store, processor: processor, monitor: monitor)
    }

    func makeUIView(context: Context) -> MTKView {
        let view = MTKView(frame: .zero, device: processor.device)
        view.framebufferOnly = false
        view.colorPixelFormat = .bgra8Unorm
        view.preferredFramesPerSecond = 60
        view.clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 1)
        view.isOpaque = true
        view.backgroundColor = .black
        view.delegate = context.coordinator
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        view.addGestureRecognizer(tap)
        context.coordinator.onTap = onTap
        return view
    }

    func updateUIView(_ uiView: MTKView, context: Context) {
        context.coordinator.onTap = onTap
    }

    final class Coordinator: NSObject, MTKViewDelegate {
        private let store: PreviewStore
        private let processor: FrameProcessor
        private let monitor: MonitorOptions
        private let commandQueue: MTLCommandQueue?
        var onTap: ((CGPoint) -> Void)?

        init(store: PreviewStore, processor: FrameProcessor, monitor: MonitorOptions) {
            self.store = store
            self.processor = processor
            self.monitor = monitor
            self.commandQueue = processor.device.makeCommandQueue()
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard let view = gesture.view, view.bounds.width > 0, view.bounds.height > 0 else { return }
            let p = gesture.location(in: view)
            var y = p.y / view.bounds.height
            // The view is 16:9 like the sensor; a desqueezed image fills its width and 1/squeeze of its height.
            let squeeze = CGFloat(monitor.snapshot.desqueeze)
            if squeeze > 1 { y = min(max(0.5 + (y - 0.5) * squeeze, 0), 1) }
            onTap?(CGPoint(x: p.x / view.bounds.width, y: y))
        }

        func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

        func draw(in view: MTKView) {
            guard let image = store.monitor,
                  image.extent.width > 0,
                  let drawable = view.currentDrawable,
                  let commandBuffer = commandQueue?.makeCommandBuffer() else { return }

            let options = monitor.snapshot
            let size = view.drawableSize
            // Anamorphic desqueeze stretches horizontally, then everything is fitted to the view.
            let squeeze = CGFloat(options.desqueeze)
            let scale = min(size.width / (image.extent.width * squeeze), size.height / image.extent.height)
            let scaled = image.transformed(by: CGAffineTransform(scaleX: scale * squeeze, y: scale))
            let dx = (size.width - scaled.extent.width) / 2 - scaled.extent.origin.x
            let dy = (size.height - scaled.extent.height) / 2 - scaled.extent.origin.y
            let fitted = scaled.transformed(by: CGAffineTransform(translationX: dx, y: dy))
            let positioned = MonitorKernels.apply(options, to: fitted, pixelScale: view.contentScaleFactor)
            let background = CIImage(color: .black).cropped(to: CGRect(origin: .zero, size: size))
            let output = positioned.composited(over: background)

            let destination = CIRenderDestination(
                width: Int(size.width), height: Int(size.height),
                pixelFormat: view.colorPixelFormat, commandBuffer: commandBuffer,
                mtlTextureProvider: { drawable.texture })
            destination.colorSpace = nil
            _ = try? processor.context.startTask(toRender: output, to: destination)

            commandBuffer.present(drawable)
            commandBuffer.commit()
        }
    }
}
