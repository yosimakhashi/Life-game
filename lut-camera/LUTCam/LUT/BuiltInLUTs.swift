import Foundation
import simd

/// Creative looks generated procedurally at launch, so the app is useful before any .cube is imported.
enum BuiltInLUTs {
    private static let size = 33

    static let appleLogToRec709 = make("applelog-709", "Apple Log → Rec.709", appleLogTo709)

    static let all: [LUT] = [
        appleLogToRec709,
        make("teal-orange", "Teal & Orange", tealOrange),
        make("warm-film", "Warm Film", warmFilm),
        make("bleach", "Bleach Bypass", bleachBypass),
        make("noir", "Mono Noir", monoNoir),
        make("cool-night", "Cool Night", coolNight),
        make("vivid", "Vivid", vivid),
        make("matte", "Faded Matte", fadedMatte),
        make("golden", "Golden Hour", goldenHour),
    ]

    private static func make(_ id: String, _ name: String, _ f: (SIMD3<Float>) -> SIMD3<Float>) -> LUT {
        let table = CubeTable(size: size, transform: f)
        return LUT(id: "builtin:" + id, name: name, dimension: size, cubeData: table.cubeData, isBuiltIn: true, fileURL: nil)
    }

    // MARK: Helpers

    private static func luma(_ c: SIMD3<Float>) -> Float { simd_dot(c, SIMD3(0.2126, 0.7152, 0.0722)) }

    private static func saturate(_ c: SIMD3<Float>, _ amount: Float) -> SIMD3<Float> {
        let l = SIMD3<Float>(repeating: luma(c))
        return l + (c - l) * amount
    }

    private static func sCurve(_ x: Float, _ k: Float) -> Float {
        let x = clamp01(x)
        let s = x * x * (3 - 2 * x)
        return x + (s - x) * k
    }

    private static func sCurve(_ c: SIMD3<Float>, _ k: Float) -> SIMD3<Float> {
        SIMD3(sCurve(c.x, k), sCurve(c.y, k), sCurve(c.z, k))
    }

    private static func clamp(_ c: SIMD3<Float>) -> SIMD3<Float> {
        SIMD3(clamp01(c.x), clamp01(c.y), clamp01(c.z))
    }

    // MARK: Apple Log → Rec.709

    /// Inverse of Apple's published Apple Log curve (Apple Log Profile white paper).
    private static func appleLogToLinear(_ p: Float) -> Float {
        let r0: Float = -0.05641088, rt: Float = 0.01
        let c: Float = 47.28711236, beta: Float = 0.00964052
        let gamma: Float = 0.08550479, delta: Float = 0.69336945
        let pt = c * (rt - r0) * (rt - r0)
        if p >= pt { return exp2((p - delta) / gamma) - beta }
        if p > 0 { return (p / c).squareRoot() + r0 }
        return r0
    }

    /// ACES-like filmic tone curve (Narkowicz fit).
    private static func filmic(_ x: Float) -> Float {
        let x = max(x, 0)
        return clamp01((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14))
    }

    private static func appleLogTo709(_ c: SIMD3<Float>) -> SIMD3<Float> {
        // Log → scene linear (Rec.2020 primaries)
        let lin2020 = SIMD3(appleLogToLinear(c.x), appleLogToLinear(c.y), appleLogToLinear(c.z))
        // Rec.2020 → Rec.709 primaries
        let m = simd_float3x3(rows: [
            SIMD3(1.6605, -0.5876, -0.0728),
            SIMD3(-0.1246, 1.1329, -0.0083),
            SIMD3(-0.0182, -0.1006, 1.1187),
        ])
        let lin709 = m * lin2020
        let exposed = lin709 * 0.8
        let toned = SIMD3(filmic(exposed.x), filmic(exposed.y), filmic(exposed.z))
        let encoded = SIMD3(powf(toned.x, 1 / 2.2), powf(toned.y, 1 / 2.2), powf(toned.z, 1 / 2.2))
        return clamp(saturate(encoded, 1.05))
    }

    // MARK: Creative looks

    private static func tealOrange(_ c: SIMD3<Float>) -> SIMD3<Float> {
        var c = c
        let l = luma(c)
        c += SIMD3(-0.05, 0.01, 0.07) * (1 - l) * (1 - l)   // teal shadows
        c += SIMD3(0.07, 0.02, -0.06) * l * l              // orange highlights
        c = saturate(c, 1.15)
        return sCurve(c, 0.35)
    }

    private static func warmFilm(_ c: SIMD3<Float>) -> SIMD3<Float> {
        var c = sCurve(c, 0.25)
        c = c * 0.92 + 0.045                               // lifted blacks, soft highlights
        c *= SIMD3(1.05, 1.0, 0.9)
        return clamp(saturate(c, 0.9))
    }

    private static func bleachBypass(_ c: SIMD3<Float>) -> SIMD3<Float> {
        let l = luma(c)
        var c = simd_mix(c, SIMD3(repeating: l), SIMD3(repeating: 0.55))
        c = (c - 0.5) * 1.2 + 0.5
        return sCurve(clamp(c), 0.5)
    }

    private static func monoNoir(_ c: SIMD3<Float>) -> SIMD3<Float> {
        let l = luma(c * SIMD3(1.1, 1.0, 0.85))
        let v = sCurve(l, 0.65) * 0.97 + 0.015
        return SIMD3(repeating: clamp01(v))
    }

    private static func coolNight(_ c: SIMD3<Float>) -> SIMD3<Float> {
        var c = c * 0.85
        c += SIMD3(-0.02, 0.0, 0.05)
        c = saturate(c, 0.7)
        return sCurve(clamp(c), 0.3)
    }

    private static func vivid(_ c: SIMD3<Float>) -> SIMD3<Float> {
        sCurve(clamp(saturate(c, 1.35)), 0.3)
    }

    private static func fadedMatte(_ c: SIMD3<Float>) -> SIMD3<Float> {
        let c = sCurve(c, 0.3)
        return clamp(saturate(c * 0.84 + 0.08, 0.85))
    }

    private static func goldenHour(_ c: SIMD3<Float>) -> SIMD3<Float> {
        var c = c
        let l = luma(c)
        c *= SIMD3(1.08, 1.0, 0.86)
        c += SIMD3(0.04, 0.02, -0.02) * l
        return sCurve(clamp(saturate(c, 1.1)), 0.2)
    }
}
