import Foundation

/// Built-in looks plus user .cube files stored in Documents/LUTs
/// (also reachable through the Files app: On My iPhone › LUTCam › LUTs).
@MainActor
final class LUTLibrary: ObservableObject {
    @Published private(set) var imported: [LUT] = []
    @Published private(set) var isLoaded = false

    let builtIn: [LUT] = BuiltInLUTs.all
    let directory: URL

    init() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        directory = docs.appendingPathComponent("LUTs", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        reload()
    }

    func reload() {
        let dir = directory
        Task.detached(priority: .userInitiated) {
            let luts = LUTLibrary.scan(dir)
            await MainActor.run {
                self.imported = luts
                self.isLoaded = true
            }
        }
    }

    func lut(withID id: String) -> LUT? {
        builtIn.first { $0.id == id } ?? imported.first { $0.id == id }
    }

    /// Copies the picked files into the library. Returns error messages for files that failed.
    func importFiles(_ urls: [URL]) -> [String] {
        var errors: [String] = []
        for url in urls {
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }

            var name = url.lastPathComponent
            if url.pathExtension.lowercased() != "cube" { name += ".cube" }
            let destination = directory.appendingPathComponent(name)
            do {
                let tmp = directory.appendingPathComponent(".import-\(UUID().uuidString)")
                try FileManager.default.copyItem(at: url, to: tmp)
                do {
                    _ = try LUT.load(from: tmp) // validate before keeping it
                } catch {
                    try? FileManager.default.removeItem(at: tmp)
                    throw error
                }
                try? FileManager.default.removeItem(at: destination)
                try FileManager.default.moveItem(at: tmp, to: destination)
                let lut = try LUT.load(from: destination)
                imported.removeAll { $0.id == lut.id }
                imported.append(lut)
                imported.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            } catch {
                errors.append("\(url.lastPathComponent): \(error.localizedDescription)")
            }
        }
        return errors
    }

    func delete(_ lut: LUT) {
        guard let url = lut.fileURL else { return }
        try? FileManager.default.removeItem(at: url)
        imported.removeAll { $0.id == lut.id }
    }

    nonisolated private static func scan(_ dir: URL) -> [LUT] {
        let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)) ?? []
        return files
            .filter { $0.pathExtension.lowercased() == "cube" }
            .compactMap { try? LUT.load(from: $0) }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }
}
