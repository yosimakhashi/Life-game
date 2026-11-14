import Foundation
import simd

/// A 3D colour lookup table ready to hand to `CIColorCube`.
struct LUT: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let dimension: Int
    /// RGBA Float32 values, red varying fastest, then green, then blue
    /// (the layout `.cube` files use and `CIColorCube` expects).
    let cubeData: Data
    let isBuiltIn: Bool
    let fileURL: URL?

    static func == (lhs: LUT, rhs: LUT) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }

    static func load(from url: URL) throws -> LUT {
        let data = try Data(contentsOf: url)
        guard let text = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .isoLatin1) else {
            throw LUTError.unreadable
        }
        let table = try CubeParser.parse(text)
        return LUT(
            id: "file:" + url.lastPathComponent,
            name: url.deletingPathExtension().lastPathComponent,
            dimension: table.size,
            cubeData: table.cubeData,
            isBuiltIn: false,
            fileURL: url
        )
    }
}

enum LUTError: LocalizedError {
    case unreadable
    case missingSize
    case wrongEntryCount(expected: Int, found: Int)

    var errorDescription: String? {
        switch self {
        case .unreadable: return "The file isn't readable text."
        case .missingSize: return "No LUT_3D_SIZE or LUT_1D_SIZE found – is this a .cube file?"
        case let .wrongEntryCount(expected, found): return "Expected \(expected) colour entries but found \(found)."
        }
    }
}

// MARK: - Cube table

@inline(__always) func clamp01(_ x: Float) -> Float { min(max(x, 0), 1) }

struct CubeTable {
    let size: Int
    /// index = r + g * size + b * size * size
    var values: [SIMD3<Float>]

    init(size: Int, values: [SIMD3<Float>]) {
        self.size = size
        self.values = values
    }

    init(size: Int, transform: (SIMD3<Float>) -> SIMD3<Float>) {
        var v: [SIMD3<Float>] = []
        v.reserveCapacity(size * size * size)
        let step = 1 / Float(size - 1)
        for b in 0..<size {
            for g in 0..<size {
                for r in 0..<size {
                    v.append(transform(SIMD3(Float(r) * step, Float(g) * step, Float(b) * step)))
                }
            }
        }
        self.size = size
        self.values = v
    }

    @inline(__always) private func at(_ r: Int, _ g: Int, _ b: Int) -> SIMD3<Float> {
        values[r + g * size + b * size * size]
    }

    /// Trilinear sample; `p` is in 0...1.
    func sample(_ p: SIMD3<Float>) -> SIMD3<Float> {
        let n = Float(size - 1)
        let c = SIMD3(clamp01(p.x), clamp01(p.y), clamp01(p.z)) * n
        let r0 = Int(c.x), g0 = Int(c.y), b0 = Int(c.z)
        let r1 = min(r0 + 1, size - 1), g1 = min(g0 + 1, size - 1), b1 = min(b0 + 1, size - 1)
        let f = c - SIMD3(Float(r0), Float(g0), Float(b0))

        let c00 = simd_mix(at(r0, g0, b0), at(r1, g0, b0), SIMD3(repeating: f.x))
        let c10 = simd_mix(at(r0, g1, b0), at(r1, g1, b0), SIMD3(repeating: f.x))
        let c01 = simd_mix(at(r0, g0, b1), at(r1, g0, b1), SIMD3(repeating: f.x))
        let c11 = simd_mix(at(r0, g1, b1), at(r1, g1, b1), SIMD3(repeating: f.x))
        let c0 = simd_mix(c00, c10, SIMD3(repeating: f.y))
        let c1 = simd_mix(c01, c11, SIMD3(repeating: f.y))
        return simd_mix(c0, c1, SIMD3(repeating: f.z))
    }

    var cubeData: Data {
        var floats: [Float] = []
        floats.reserveCapacity(values.count * 4)
        for v in values {
            floats.append(clamp01(v.x))
            floats.append(clamp01(v.y))
            floats.append(clamp01(v.z))
            floats.append(1)
        }
        return floats.withUnsafeBufferPointer { Data(buffer: $0) }
    }
}

// MARK: - .cube parser (Adobe / Resolve format)

enum CubeParser {
    /// Larger cubes are resampled down; 64³ is plenty for monitoring and keeps GPU upload cheap.
    static let maxSize = 64

    static func parse(_ text: String) throws -> CubeTable {
        var size3D = 0
        var size1D = 0
        var domainMin = SIMD3<Float>(0, 0, 0)
        var domainMax = SIMD3<Float>(1, 1, 1)
        var entries: [SIMD3<Float>] = []

        for rawLine in text.split(whereSeparator: \.isNewline) {
            let line = rawLine.trimmingCharacters(in: .whitespaces)
            guard let first = line.first, first != "#" else { continue }
            let parts = line.split(whereSeparator: { $0 == " " || $0 == "\t" })

            if first.isNumber || first == "-" || first == "." || first == "+" {
                if parts.count >= 3, let r = Float(parts[0]), let g = Float(parts[1]), let b = Float(parts[2]) {
                    entries.append(SIMD3(r, g, b))
                }
                continue
            }

            switch parts[0].uppercased() {
            case "LUT_3D_SIZE":
                size3D = parts.count > 1 ? Int(parts[1]) ?? 0 : 0
            case "LUT_1D_SIZE":
                size1D = parts.count > 1 ? Int(parts[1]) ?? 0 : 0
            case "DOMAIN_MIN":
                if let v = vector(parts.dropFirst()) { domainMin = v }
            case "DOMAIN_MAX":
                if let v = vector(parts.dropFirst()) { domainMax = v }
            case "LUT_3D_INPUT_RANGE", "LUT_1D_INPUT_RANGE":
                if parts.count >= 3, let lo = Float(parts[1]), let hi = Float(parts[2]) {
                    domainMin = SIMD3(repeating: lo)
                    domainMax = SIMD3(repeating: hi)
                }
            default:
                continue // TITLE and unknown keywords
            }
        }

        // Guard against degenerate domains.
        for i in 0..<3 where domainMax[i] <= domainMin[i] {
            domainMin[i] = 0
            domainMax[i] = 1
        }
        let span = domainMax - domainMin
        let isDefaultDomain = domainMin == SIMD3(0, 0, 0) && domainMax == SIMD3(1, 1, 1)

        if size3D > 1 {
            let expected = size3D * size3D * size3D
            guard entries.count >= expected else {
                throw LUTError.wrongEntryCount(expected: expected, found: entries.count)
            }
            let table = CubeTable(size: size3D, values: Array(entries.prefix(expected)))
            if isDefaultDomain && size3D <= maxSize { return table }
            return CubeTable(size: min(size3D, maxSize)) { p in
                table.sample((p - domainMin) / span)
            }
        }

        if size1D > 1 {
            guard entries.count >= size1D else {
                throw LUTError.wrongEntryCount(expected: size1D, found: entries.count)
            }
            let curve = Array(entries.prefix(size1D))
            let last = size1D - 1
            func lookup(_ x: Float, _ ch: Int) -> Float {
                let t = clamp01((x - domainMin[ch]) / span[ch]) * Float(last)
                let i0 = min(Int(t), last)
                let i1 = min(i0 + 1, last)
                let f = t - Float(i0)
                return curve[i0][ch] * (1 - f) + curve[i1][ch] * f
            }
            return CubeTable(size: 33) { p in
                SIMD3(lookup(p.x, 0), lookup(p.y, 1), lookup(p.z, 2))
            }
        }

        throw LUTError.missingSize
    }

    private static func vector<S: Sequence>(_ parts: S) -> SIMD3<Float>? where S.Element == Substring {
        let nums = parts.compactMap { Float($0) }
        guard nums.count >= 3 else { return nil }
        return SIMD3(nums[0], nums[1], nums[2])
    }
}
