# LUTCam – a LUT video camera for iPhone

A native iOS camera app (Swift, SwiftUI, AVFoundation, Core Image + Metal), in the spirit of
Blackmagic Camera / Filmic-style pro apps, built around **real-time 3D LUTs**.

## Features

- **Live LUT monitoring.** Every frame goes through a GPU `CIColorCube` and is drawn with Metal.
- **LUT library**
  - 9 built-in looks: Apple Log → Rec.709, Teal & Orange, Warm Film, Bleach Bypass, Mono Noir, Cool Night, Vivid, Faded Matte, Golden Hour
  - Import your own `.cube` files (Resolve/Adobe format: 3D or 1D, any size, with `DOMAIN_MIN/MAX`). Cubes larger than 64³ are resampled.
  - Live thumbnails of each LUT on the current shot
  - LUT intensity slider (0–100%)
  - Drop LUTs into **Files › On My iPhone › LUTCam › LUTs** and they appear in the app
- **Monitor-only or baked LUT.** Record the look into the file, or record clean footage
  (e.g. Apple Log) and use the LUT only for monitoring, like Blackmagic Camera.
- **Apple Log** on iPhone 15 Pro and newer (10-bit). Switching to it automatically loads the Apple Log → Rec.709 LUT.
- **Manual controls:** ISO, shutter speed (with a 180° hint), white balance (Kelvin + tint), manual focus, EV compensation. Each has an AUTO toggle. Tap the preview to focus.
- **Formats:** 1080p / 4K at 24, 25, 30, 48, 50 or 60 fps (whatever the lens supports). Codecs: HEVC, H.264, and ProRes 422 / 422 HQ on Pro iPhones.
- Lens switching (0.5× / 1× / tele), rule-of-thirds grid, frame guides (2.39, 1.85, 4:3, 1:1, 9:16), REC timecode
- Clips and stills (with the LUT applied) are saved to Photos

## Build & install

You need a Mac with Xcode 15 or newer and an iPhone running iOS 17+. The camera doesn't work in the Simulator.

```bash
brew install xcodegen
cd lut-camera
xcodegen generate
open LUTCam.xcodeproj
```

In Xcode, select the **LUTCam** target › *Signing & Capabilities*, pick your Team (a free Apple ID works),
change the bundle ID if Xcode asks, choose your iPhone, and press **Run**.

### No Mac?

Every push that touches `lut-camera/` runs the GitHub Actions workflow
`.github/workflows/lutcam-ios.yml`. It compiles the app on macOS and uploads an **unsigned IPA** artifact.
You can sign and sideload that IPA with a tool such as Sideloadly or AltStore and your Apple ID.

## Project layout

```
lut-camera/
├── project.yml                 # XcodeGen spec (generates LUTCam.xcodeproj + Info.plist)
└── LUTCam/
    ├── LUTCamApp.swift
    ├── Camera/
    │   ├── CameraManager.swift   # AVCaptureSession, formats, Apple Log, manual controls, recording
    │   ├── FrameProcessor.swift  # LUT application (CIColorCube), preview frame store, thumbnails
    │   └── Recorder.swift        # AVAssetWriter: baked or clean, HEVC/H.264/ProRes + audio
    ├── LUT/
    │   ├── LUT.swift             # .cube parser, trilinear resampling, cube data
    │   ├── BuiltInLUTs.swift     # procedurally generated looks + Apple Log → Rec.709
    │   └── LUTLibrary.swift      # import/delete, Documents/LUTs storage
    └── Views/
        ├── ContentView.swift     # landscape camera UI, control strip, sliders, guides
        ├── MetalPreviewView.swift
        ├── LUTBrowserView.swift
        └── SettingsView.swift
```

## How the colour pipeline works

1. Camera frames arrive as 8-bit (Rec.709) or 10-bit (Apple Log) YUV.
2. Core Image runs with colour management **off** (`workingColorSpace = NSNull`), so the LUT sees the
   encoded values exactly as a `.cube` built for that camera curve expects.
3. The graded image is drawn to an `MTKView`. If you're recording, it's also either rendered into the
   writer's pixel buffers (baked) or the original sample buffer is written untouched (clean).

## Notes / limitations

- The UI is landscape-only, held with the camera on the left, the way most cinema apps work.
- iOS has no shutter- or ISO-priority mode. When only one of them is manual, the other holds its last auto-metered value.
- The Apple Log → Rec.709 LUT is an approximation (inverse Apple Log curve → Rec.2020→709 gamut → filmic tone map). For exact results, import Apple's official Apple Log LUT.
