// Core Image kernels for exposure / focus assist overlays.
// Compiled with -fcikernel and linked with -cikernel (see project.yml).
#include <metal_stdlib>
using namespace metal;
#include <CoreImage/CoreImage.h>

extern "C" {
namespace coreimage {

inline float lumaOf(float3 c) {
    return dot(c, float3(0.2126, 0.7152, 0.0722));
}

/// Diagonal black/white stripes over anything at or above `threshold`.
float4 zebraKernel(sample_t s, float threshold, float stripeWidth, destination dest) {
    if (lumaOf(s.rgb) < threshold) { return s; }
    float2 p = dest.coord();
    float band = fmod(floor((p.x + p.y) / stripeWidth), 2.0);
    return band < 1.0 ? float4(0.0, 0.0, 0.0, 1.0) : float4(1.0, 1.0, 1.0, 1.0);
}

/// Exposure false colour on display-referred (Rec.709) values.
float4 falseColorKernel(sample_t s) {
    float l = lumaOf(s.rgb);
    float3 c;
    if (l < 0.02)                    c = float3(0.55, 0.0, 0.65);  // purple: crushed black
    else if (l < 0.10)               c = float3(0.0, 0.35, 1.0);   // blue: near black
    else if (l > 0.99)               c = float3(1.0, 0.0, 0.0);    // red: clipped
    else if (l > 0.94)               c = float3(1.0, 0.9, 0.0);    // yellow: near clip
    else if (l > 0.52 && l < 0.58)   c = float3(1.0, 0.45, 0.7);   // pink: skin (+1 stop)
    else if (l > 0.40 && l < 0.46)   c = float3(0.1, 0.85, 0.2);   // green: 18% grey
    else                             c = float3(l * 0.8 + 0.05);   // everything else in grey
    return float4(c, 1.0);
}

/// Focus peaking: paints `color` where the luma Laplacian exceeds `threshold`.
float4 peakingKernel(sampler src, float threshold, float4 color, destination dest) {
    float2 p = dest.coord();
    float4 base = src.sample(src.transform(p));
    float c = lumaOf(base.rgb);
    float l = lumaOf(src.sample(src.transform(p + float2(-1.0, 0.0))).rgb);
    float r = lumaOf(src.sample(src.transform(p + float2(1.0, 0.0))).rgb);
    float u = lumaOf(src.sample(src.transform(p + float2(0.0, 1.0))).rgb);
    float d = lumaOf(src.sample(src.transform(p + float2(0.0, -1.0))).rgb);
    float edge = fabs(4.0 * c - l - r - u - d);
    return edge > threshold ? color : base;
}

}
}
