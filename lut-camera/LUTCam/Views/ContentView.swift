import SwiftUI
import UIKit

enum FrameGuide: String, CaseIterable, Identifiable {
    case off = "Off"
    case scope = "2.39:1"
    case flat = "1.85:1"
    case fourThree = "4:3"
    case square = "1:1"
    case vertical = "9:16"

    var id: String { rawValue }

    var ratio: CGFloat? {
        switch self {
        case .off: return nil
        case .scope: return 2.39
        case .flat: return 1.85
        case .fourThree: return 4.0 / 3.0
        case .square: return 1
        case .vertical: return 9.0 / 16.0
        }
    }
}

struct ContentView: View {
    @StateObject private var camera = CameraManager()
    @StateObject private var library = LUTLibrary()
    @Environment(\.scenePhase) private var scenePhase

    @State private var activeControl: ControlKind?
    @State private var showLUTBrowser = false
    @State private var showSettings = false
    @State private var focusPoint: CGPoint?
    @State private var flash = false

    @AppStorage("showGrid") private var showGrid = false
    @AppStorage("frameGuide") private var frameGuideRaw = FrameGuide.off.rawValue
    @AppStorage("lastLUTID") private var lastLUTID = ""

    var body: some View {
        HStack(spacing: 0) {
            VStack(spacing: 6) {
                StatusBar(camera: camera)
                preview
                ControlBar(camera: camera, active: $activeControl)
            }
            .padding(.leading, 8)

            SideBar(
                camera: camera,
                onLUTs: { showLUTBrowser = true },
                onSettings: { showSettings = true },
                onStill: takeStill)
        }
        .background(Color.black.ignoresSafeArea())
        .overlay(alignment: .bottom) {
            if let kind = activeControl {
                ControlPanel(camera: camera, kind: kind)
                    .padding(.bottom, 70)
                    .padding(.trailing, 100)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .overlay(alignment: .top) { toast }
        .animation(.easeOut(duration: 0.18), value: activeControl)
        .preferredColorScheme(.dark)
        .statusBarHidden(true)
        .persistentSystemOverlays(.hidden)
        .onAppear {
            UIApplication.shared.isIdleTimerDisabled = true
            camera.selectedLUT = library.lut(withID: lastLUTID)
            camera.start()
        }
        .onChange(of: library.isLoaded) { _, loaded in
            if loaded, camera.selectedLUT == nil, !lastLUTID.isEmpty {
                camera.selectedLUT = library.lut(withID: lastLUTID)
            }
        }
        .onChange(of: camera.selectedLUT) { _, lut in lastLUTID = lut?.id ?? "" }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active && camera.isRecording { camera.toggleRecording() }
        }
        .sheet(isPresented: $showLUTBrowser) {
            LUTBrowserView(camera: camera, library: library)
        }
        .sheet(isPresented: $showSettings) {
            SettingsView(camera: camera, showGrid: $showGrid, frameGuideRaw: $frameGuideRaw)
        }
        .alert("Camera access needed", isPresented: $camera.authorizationDenied) {
            Button("Open Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Allow camera access in Settings to use LUTCam.")
        }
    }

    private var preview: some View {
        ZStack {
            MetalPreviewView(store: camera.previewStore, processor: camera.processor) { point in
                camera.focus(at: point)
                activeControl = nil
                focusPoint = point
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                    if focusPoint == point { focusPoint = nil }
                }
            }

            GuideOverlay(showGrid: showGrid, guide: FrameGuide(rawValue: frameGuideRaw) ?? .off)

            GeometryReader { geo in
                if let p = focusPoint {
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(Color.yellow, lineWidth: 1.5)
                        .frame(width: 70, height: 70)
                        .position(x: p.x * geo.size.width, y: p.y * geo.size.height)
                }
            }
            .allowsHitTesting(false)

            if camera.isRecording {
                Rectangle().stroke(Color.red, lineWidth: 3).allowsHitTesting(false)
            }

            Color.white.opacity(flash ? 0.8 : 0).allowsHitTesting(false)
        }
        .aspectRatio(16.0 / 9.0, contentMode: .fit)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
    }

    @ViewBuilder private var toast: some View {
        if let message = camera.statusMessage {
            Text(message)
                .font(.footnote.weight(.semibold))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial, in: Capsule())
                .padding(.top, 36)
                .transition(.opacity)
                .task(id: message) {
                    try? await Task.sleep(nanoseconds: 2_500_000_000)
                    if camera.statusMessage == message { camera.statusMessage = nil }
                }
        }
    }

    private func takeStill() {
        camera.captureStill()
        flash = true
        withAnimation(.easeOut(duration: 0.3)) { flash = false }
    }
}

// MARK: - Status bar

struct StatusBar: View {
    @ObservedObject var camera: CameraManager

    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 6) {
                Circle()
                    .fill(camera.isRecording ? Color.red : Color.gray.opacity(0.5))
                    .frame(width: 9, height: 9)
                Text(timecode(camera.recordingTime))
                    .font(.system(size: 15, weight: .semibold, design: .monospaced))
                    .foregroundStyle(camera.isRecording ? Color.red : Color.white)
            }
            Spacer()
            Text("\(camera.resolution.rawValue) · \(camera.frameRate)p · \(camera.codec.rawValue) · \(camera.colorProfile.rawValue)")
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .foregroundStyle(.secondary)
            Spacer()
            Label(camera.selectedLUT?.name ?? "No LUT", systemImage: "cube.transparent")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(camera.selectedLUT == nil ? Color.secondary : Color.yellow)
                .lineLimit(1)
        }
        .padding(.horizontal, 6)
        .padding(.top, 6)
    }

    private func timecode(_ t: TimeInterval) -> String {
        let total = Int(t)
        return String(format: "%02d:%02d:%02d", total / 3600, (total / 60) % 60, total % 60)
    }
}

// MARK: - Bottom control strip

struct ControlBar: View {
    @ObservedObject var camera: CameraManager
    @Binding var active: ControlKind?

    var body: some View {
        HStack(spacing: 4) {
            ForEach(ControlKind.allCases) { kind in
                Button {
                    active = active == kind ? nil : kind
                } label: {
                    VStack(spacing: 2) {
                        HStack(spacing: 3) {
                            Text(kind.title)
                            if camera.isAuto(kind) && kind != .exposure {
                                Text("A").foregroundStyle(Color.yellow)
                            }
                        }
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.secondary)
                        Text(camera.displayValue(for: kind))
                            .font(.system(size: 15, weight: .semibold, design: .monospaced))
                            .foregroundStyle(active == kind ? Color.yellow : Color.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(active == kind ? Color.white.opacity(0.12) : Color.clear,
                                in: RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.bottom, 4)
    }
}

// MARK: - Right-hand side bar

struct SideBar: View {
    @ObservedObject var camera: CameraManager
    var onLUTs: () -> Void
    var onSettings: () -> Void
    var onStill: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Button(action: onSettings) {
                Image(systemName: "gearshape.fill").font(.title3)
            }
            .disabled(camera.isRecording)

            Button(action: onLUTs) {
                VStack(spacing: 2) {
                    Image(systemName: "cube.transparent.fill").font(.title3)
                    Text("LUT").font(.system(size: 10, weight: .bold))
                }
                .foregroundStyle(camera.selectedLUT == nil ? Color.white : Color.yellow)
            }

            Spacer()

            Button(action: camera.toggleRecording) {
                ZStack {
                    Circle().stroke(Color.white, lineWidth: 3).frame(width: 70, height: 70)
                    RoundedRectangle(cornerRadius: camera.isRecording ? 6 : 29)
                        .fill(Color.red)
                        .frame(width: camera.isRecording ? 28 : 58, height: camera.isRecording ? 28 : 58)
                }
                .animation(.easeInOut(duration: 0.2), value: camera.isRecording)
            }
            .accessibilityLabel(camera.isRecording ? "Stop recording" : "Start recording")

            Button(action: onStill) {
                Image(systemName: "camera.fill")
                    .font(.body)
                    .frame(width: 44, height: 44)
                    .background(Color.white.opacity(0.15), in: Circle())
            }
            .accessibilityLabel("Capture still")

            Spacer()

            if camera.lenses.count > 1 {
                Button(action: camera.cycleLens) {
                    Text(camera.lenses.first { $0.id == camera.currentLensID }?.label ?? "1×")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .frame(width: 44, height: 44)
                        .background(Color.white.opacity(0.15), in: Circle())
                }
                .disabled(camera.isRecording)
            }
        }
        .foregroundStyle(Color.white)
        .padding(.vertical, 12)
        .frame(width: 96)
    }
}

// MARK: - Slider panel

struct ControlPanel: View {
    @ObservedObject var camera: CameraManager
    let kind: ControlKind

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Text(kind.title)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
                Text(camera.displayValue(for: kind))
                    .font(.system(.title3, design: .monospaced).weight(.semibold))
                if let hint {
                    Text(hint).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                if kind == .exposure {
                    Button("Reset") { camera.setExposureBias(0) }
                        .buttonStyle(.bordered)
                } else {
                    Toggle("AUTO", isOn: Binding(
                        get: { camera.isAuto(kind) },
                        set: { camera.setAuto(kind, $0) }))
                        .toggleStyle(.button)
                        .tint(.yellow)
                }
            }
            slider
        }
        .padding(14)
        .frame(maxWidth: 560)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private var hint: String? {
        switch kind {
        case .shutter: return "180° = 1/\(camera.frameRate * 2)"
        case .exposure: return camera.isAuto(.exposure) ? nil : "auto exposure only"
        default: return nil
        }
    }

    @ViewBuilder private var slider: some View {
        switch kind {
        case .iso:
            // Logarithmic so low ISOs get as much travel as high ones.
            let lo = camera.isoRange.lowerBound, hi = camera.isoRange.upperBound
            Slider(value: Binding(
                get: { Double(log(camera.iso / lo) / log(hi / lo)) },
                set: { camera.setISO(lo * pow(hi / lo, Float($0))) }), in: 0...1)
        case .shutter:
            let stops = camera.shutterStops
            Slider(value: Binding(
                get: {
                    let current = camera.shutterDenominator
                    let index = stops.indices.min { abs(stops[$0] - current) < abs(stops[$1] - current) } ?? 0
                    return Double(index)
                },
                set: { camera.setShutter(stops[min(max(Int($0.rounded()), 0), stops.count - 1)]) }),
                in: 0...Double(max(stops.count - 1, 1)), step: 1)
        case .whiteBalance:
            Slider(value: Binding(get: { camera.temperature }, set: { camera.setTemperature($0) }),
                   in: 2000...10000, step: 50)
        case .tint:
            Slider(value: Binding(get: { camera.tint }, set: { camera.setTint($0) }),
                   in: -150...150, step: 1)
        case .focus:
            HStack {
                Image(systemName: "camera.macro").foregroundStyle(.secondary)
                Slider(value: Binding(get: { camera.lensPosition }, set: { camera.setLensPosition($0) }),
                       in: 0...1)
                Image(systemName: "mountain.2").foregroundStyle(.secondary)
            }
        case .exposure:
            Slider(value: Binding(get: { camera.exposureBias }, set: { camera.setExposureBias($0) }),
                   in: -3...3, step: 0.1)
                .disabled(!camera.isAuto(.exposure))
        }
    }
}

// MARK: - Grid & frame guides

struct GuideOverlay: View {
    let showGrid: Bool
    let guide: FrameGuide

    var body: some View {
        GeometryReader { geo in
            let size = geo.size
            ZStack {
                if let ratio = guide.ratio {
                    let rect = guideRect(in: size, ratio: ratio)
                    Path { p in
                        p.addRect(CGRect(origin: .zero, size: size))
                        p.addRect(rect)
                    }
                    .fill(Color.black.opacity(0.55), style: FillStyle(eoFill: true))
                    Path { $0.addRect(rect) }
                        .stroke(Color.white.opacity(0.7), lineWidth: 1)
                }
                if showGrid {
                    Path { p in
                        for i in 1...2 {
                            let x = size.width * CGFloat(i) / 3
                            let y = size.height * CGFloat(i) / 3
                            p.move(to: CGPoint(x: x, y: 0))
                            p.addLine(to: CGPoint(x: x, y: size.height))
                            p.move(to: CGPoint(x: 0, y: y))
                            p.addLine(to: CGPoint(x: size.width, y: y))
                        }
                    }
                    .stroke(Color.white.opacity(0.35), lineWidth: 0.5)
                }
            }
        }
        .allowsHitTesting(false)
    }

    private func guideRect(in size: CGSize, ratio: CGFloat) -> CGRect {
        guard size.height > 0 else { return .zero }
        let frameRatio = size.width / size.height
        let w = ratio > frameRatio ? size.width : size.height * ratio
        let h = ratio > frameRatio ? size.width / ratio : size.height
        return CGRect(x: (size.width - w) / 2, y: (size.height - h) / 2, width: w, height: h)
    }
}
