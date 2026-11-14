import SwiftUI

struct SettingsView: View {
    @ObservedObject var camera: CameraManager
    @ObservedObject var monitor: MonitorOptions
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

                Section {
                    Picker("Stabilization", selection: Binding(
                        get: { camera.stabilization },
                        set: { camera.setStabilization($0) })) {
                        ForEach(StabilizationOption.allCases) { Text($0.rawValue).tag($0) }
                    }
                    Picker("Anamorphic desqueeze", selection: $monitor.desqueeze) {
                        ForEach(Desqueeze.allCases) { Text($0.label).tag($0) }
                    }
                } header: {
                    Text("Lens")
                } footer: {
                    Text("Stabilization adds a little preview latency. Desqueeze only affects the monitor; files keep the full sensor image.")
                }

                Section("Exposure tools") {
                    Toggle("Zebras", isOn: $monitor.zebras)
                    if monitor.zebras {
                        HStack {
                            Text("Zebra level")
                            Slider(value: $monitor.zebraThreshold, in: 0.7...1.0, step: 0.01)
                            Text("\(Int((monitor.zebraThreshold * 100).rounded()))%")
                                .font(.system(.body, design: .monospaced))
                                .frame(width: 50, alignment: .trailing)
                        }
                    }
                    Toggle("False color", isOn: $monitor.falseColor)
                    Toggle("Histogram", isOn: $monitor.histogram)
                }

                Section {
                    Toggle("Focus peaking", isOn: $monitor.peaking)
                    if monitor.peaking {
                        Picker("Peaking color", selection: $monitor.peakingColor) {
                            ForEach(PeakingColor.allCases) { Text($0.rawValue).tag($0) }
                        }
                        HStack {
                            Text("Sensitivity")
                            Slider(value: $monitor.peakingSensitivity, in: 0...1)
                        }
                    }
                } header: {
                    Text("Focus tools")
                } footer: {
                    Text("False color: purple = crushed, blue = near black, green = 18% grey, pink = skin (+1 stop), yellow = near clip, red = clipped. It hides zebras and peaking while on.")
                }

                Section("Audio & level") {
                    Toggle("Audio meters", isOn: $monitor.audioMeters)
                    Toggle("Horizon level", isOn: $monitor.horizon)
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
