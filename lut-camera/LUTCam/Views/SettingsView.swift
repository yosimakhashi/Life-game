import SwiftUI

struct SettingsView: View {
    @ObservedObject var camera: CameraManager
    @Binding var showGrid: Bool
    @Binding var frameGuideRaw: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Resolution", selection: Binding(
                        get: { camera.resolution },
                        set: { camera.updateFormat(resolution: $0) })) {
                        ForEach(camera.availableResolutions) { Text($0.rawValue).tag($0) }
                    }
                    Picker("Frame rate", selection: Binding(
                        get: { camera.frameRate },
                        set: { camera.updateFormat(fps: $0) })) {
                        ForEach(camera.availableFrameRates, id: \.self) { Text("\($0) fps").tag($0) }
                    }
                    Picker("Codec", selection: $camera.codec) {
                        ForEach(camera.supportedCodecs) { Text($0.rawValue).tag($0) }
                    }
                    Picker("Color profile", selection: Binding(
                        get: { camera.colorProfile },
                        set: { camera.updateFormat(profile: $0) })) {
                        ForEach(ColorProfile.allCases) { profile in
                            Text(profile.rawValue).tag(profile)
                        }
                    }
                    .disabled(!camera.supportsAppleLog)
                } header: {
                    Text("Recording")
                } footer: {
                    if !camera.supportsAppleLog {
                        Text("Apple Log needs iPhone 15 Pro or newer.")
                    } else if camera.colorProfile == .appleLog {
                        Text("Apple Log is flat by design. Use the “Apple Log → Rec.709” LUT (or your own) to monitor, and turn off “Bake LUT” to keep the log footage for grading.")
                    }
                }

                Section("Monitoring") {
                    Toggle("Rule-of-thirds grid", isOn: $showGrid)
                    Picker("Frame guide", selection: $frameGuideRaw) {
                        ForEach(FrameGuide.allCases) { Text($0.rawValue).tag($0.rawValue) }
                    }
                    Toggle("Show LUT on monitor", isOn: $camera.showLUTOnMonitor)
                    Toggle("Bake LUT into recording", isOn: $camera.bakeLUTIntoRecording)
                }

                Section {
                    Text("Tap the preview to focus. Tap ISO, SHUTTER, WB, TINT, FOCUS or EV to adjust; switch AUTO off for full manual control. Clips and stills are saved to Photos.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }.bold()
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
