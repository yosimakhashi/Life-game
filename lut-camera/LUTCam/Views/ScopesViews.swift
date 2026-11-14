import SwiftUI

// MARK: - Histogram

struct HistogramView: View {
    @ObservedObject var model: HistogramModel

    var body: some View {
        Canvas { context, size in
            func draw(_ bins: [Float], _ color: Color) {
                guard bins.count > 1 else { return }
                var path = Path()
                path.move(to: CGPoint(x: 0, y: size.height))
                for (i, v) in bins.enumerated() {
                    let x = size.width * CGFloat(i) / CGFloat(bins.count - 1)
                    path.addLine(to: CGPoint(x: x, y: size.height * (1 - CGFloat(v))))
                }
                path.addLine(to: CGPoint(x: size.width, y: size.height))
                path.closeSubpath()
                context.fill(path, with: .color(color.opacity(0.55)))
            }
            context.blendMode = .plusLighter
            draw(model.red, .red)
            draw(model.green, .green)
            draw(model.blue, .blue)
        }
        .frame(width: 150, height: 56)
        .padding(4)
        .background(Color.black.opacity(0.55), in: RoundedRectangle(cornerRadius: 6))
        .allowsHitTesting(false)
    }
}

// MARK: - Audio meters

struct AudioMeterView: View {
    @ObservedObject var model: AudioMeterModel

    var body: some View {
        if !model.levels.isEmpty {
            HStack(spacing: 3) {
                ForEach(Array(model.levels.enumerated()), id: \.offset) { _, level in
                    bar(average: level.average, peak: level.peak)
                }
            }
            .frame(height: 64)
            .padding(4)
            .background(Color.black.opacity(0.55), in: RoundedRectangle(cornerRadius: 6))
            .allowsHitTesting(false)
        }
    }

    /// Maps -60…0 dBFS to 0…1.
    private func fraction(_ db: Float) -> CGFloat {
        CGFloat(min(max((db + 60) / 60, 0), 1))
    }

    private func bar(average: Float, peak: Float) -> some View {
        GeometryReader { geo in
            let h = geo.size.height
            ZStack(alignment: .bottom) {
                Rectangle().fill(Color.white.opacity(0.12))
                LinearGradient(colors: [.green, .green, .yellow, .red], startPoint: .bottom, endPoint: .top)
                    .mask(alignment: .bottom) {
                        Rectangle().frame(height: h * fraction(average))
                    }
                Rectangle()
                    .fill(peak > -3 ? Color.red : Color.white)
                    .frame(height: 2)
                    .offset(y: -h * fraction(peak) + 1)
            }
        }
        .frame(width: 7)
    }
}

// MARK: - Horizon level

struct HorizonView: View {
    @ObservedObject var model: HorizonModel

    var body: some View {
        let degrees = model.angle * 180 / .pi
        let level = abs(degrees) < 1
        ZStack {
            // Fixed reference ticks
            HStack(spacing: 110) {
                Rectangle().frame(width: 24, height: 2)
                Rectangle().frame(width: 24, height: 2)
            }
            .foregroundStyle(Color.white.opacity(0.6))
            // True horizon
            Rectangle()
                .fill(level ? Color.green : Color.white)
                .frame(width: 100, height: 2)
                .rotationEffect(.radians(-model.angle))
            Text(String(format: "%.1f°", degrees))
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(level ? Color.green : Color.white)
                .offset(y: 14)
        }
        .shadow(color: .black.opacity(0.6), radius: 1)
        .allowsHitTesting(false)
        .onAppear { model.start() }
        .onDisappear { model.stop() }
    }
}

// MARK: - Quick tool toggles

struct ToolChip: View {
    let title: String
    let isOn: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 10, weight: .bold))
                .padding(.horizontal, 7)
                .padding(.vertical, 4)
                .foregroundStyle(isOn ? Color.black : Color.white)
                .background(isOn ? Color.yellow : Color.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 5))
        }
        .buttonStyle(.plain)
    }
}

struct ToolStrip: View {
    @ObservedObject var monitor: MonitorOptions
    @ObservedObject var camera: CameraManager

    var body: some View {
        HStack(spacing: 5) {
            ToolChip(title: "ZEBRA", isOn: monitor.zebras) { monitor.zebras.toggle() }
            ToolChip(title: "PEAK", isOn: monitor.peaking) { monitor.peaking.toggle() }
            ToolChip(title: "FALSE", isOn: monitor.falseColor) { monitor.falseColor.toggle() }
            ToolChip(title: "HIST", isOn: monitor.histogram) { monitor.histogram.toggle() }
            ToolChip(title: "LEVEL", isOn: monitor.horizon) { monitor.horizon.toggle() }
            if monitor.desqueeze != .none {
                ToolChip(title: monitor.desqueeze.label, isOn: true) { monitor.desqueeze = .none }
            }
            if camera.hasTorch {
                Button(action: camera.toggleTorch) {
                    Image(systemName: camera.torchOn ? "flashlight.on.fill" : "flashlight.off.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(camera.torchOn ? Color.yellow : Color.white)
                        .padding(.horizontal, 5)
                }
                .buttonStyle(.plain)
            }
        }
    }
}
