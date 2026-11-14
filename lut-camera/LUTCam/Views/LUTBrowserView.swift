import SwiftUI
import UniformTypeIdentifiers

struct LUTBrowserView: View {
    @ObservedObject var camera: CameraManager
    @ObservedObject var library: LUTLibrary
    @Environment(\.dismiss) private var dismiss

    @State private var importing = false
    @State private var importErrors: [String] = []
    @State private var thumbnails: [String: UIImage] = [:]

    private let columns = [GridItem(.adaptive(minimum: 150), spacing: 12)]
    private static let cubeType = UTType(filenameExtension: "cube") ?? .data

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    options

                    Text("Built-in").font(.headline)
                    LazyVGrid(columns: columns, spacing: 12) {
                        tile(nil)
                        ForEach(library.builtIn) { tile($0) }
                    }

                    HStack {
                        Text("Imported").font(.headline)
                        Spacer()
                        Button {
                            importing = true
                        } label: {
                            Label("Import .cube", systemImage: "plus")
                        }
                    }
                    if library.imported.isEmpty {
                        Text("Import .cube LUTs from Files, or copy them into Files › On My iPhone › LUTCam › LUTs. 1D and 3D cubes up to 65³ are supported.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    } else {
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(library.imported) { lut in
                                tile(lut).contextMenu {
                                    Button("Delete", systemImage: "trash", role: .destructive) {
                                        if camera.selectedLUT == lut { camera.selectedLUT = nil }
                                        library.delete(lut)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("LUTs")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }.bold()
                }
            }
            .fileImporter(isPresented: $importing,
                          allowedContentTypes: [Self.cubeType, .plainText, .data],
                          allowsMultipleSelection: true) { result in
                switch result {
                case .success(let urls): importErrors = library.importFiles(urls)
                case .failure(let error): importErrors = [error.localizedDescription]
                }
            }
            .alert("Some LUTs couldn't be imported",
                   isPresented: Binding(get: { !importErrors.isEmpty }, set: { if !$0 { importErrors = [] } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(importErrors.joined(separator: "\n"))
            }
            .onAppear { library.reload() }
            .task(id: library.imported.map(\.id)) { await renderThumbnails() }
        }
        .preferredColorScheme(.dark)
    }

    private var options: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Intensity")
                Slider(value: $camera.lutIntensity, in: 0...1)
                Text("\(Int((camera.lutIntensity * 100).rounded()))%")
                    .font(.system(.body, design: .monospaced))
                    .frame(width: 52, alignment: .trailing)
            }
            Toggle("Show LUT on monitor", isOn: $camera.showLUTOnMonitor)
            Toggle("Bake LUT into recording", isOn: $camera.bakeLUTIntoRecording)
                .disabled(camera.isRecording)
            Text(camera.bakeLUTIntoRecording
                 ? "Clips are recorded with the look applied."
                 : "Clips are recorded clean (e.g. Apple Log); the LUT is for monitoring only – grade later.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
    }

    private func tile(_ lut: LUT?) -> some View {
        let key = lut?.id ?? "none"
        let selected = camera.selectedLUT?.id == lut?.id
        return Button {
            camera.selectedLUT = lut
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                Color.gray.opacity(0.25)
                    .aspectRatio(16.0 / 9.0, contentMode: .fit)
                    .overlay {
                        if let image = thumbnails[key] {
                            Image(uiImage: image).resizable().scaledToFill()
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(selected ? Color.yellow : Color.clear, lineWidth: 2.5))
                Text(lut?.name ?? "None")
                    .font(.caption.weight(selected ? .bold : .regular))
                    .foregroundStyle(selected ? Color.yellow : Color.primary)
                    .lineLimit(1)
            }
        }
        .buttonStyle(.plain)
    }

    private func renderThumbnails() async {
        guard let source = camera.previewStore.source else { return }
        let luts = library.builtIn + library.imported
        let context = camera.processor.context
        let result = await Task.detached(priority: .userInitiated) {
            LUTThumbnailer.render(source: source, luts: luts, context: context)
        }.value
        thumbnails = result
    }
}
