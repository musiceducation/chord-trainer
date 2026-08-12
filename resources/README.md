# Chord Trainer — App Store Assets

## Required source files (included)

| File | Size | Usage |
|------|------|-------|
| `resources/icon.png` | 1024×1024 | App Store listing + Xcode App Icon |
| `resources/splash.png` | 2732×2732 | Launch/splash reference |

The Xcode project already references:

- `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
- `ios/App/App/Assets.xcassets/Splash.imageset/*.png`

## Screenshot matrix (capture from Simulator)

| Device | Size (px) | Required |
|--------|-----------|----------|
| iPhone 6.7" (15 Pro Max) | 1290 × 2796 | Yes |
| iPhone 6.5" (11 Pro Max) | 1242 × 2688 | Optional fallback |
| iPad Pro 12.9" | 2048 × 2732 | Yes (universal app) |

Suggested scenes:

1. Chord recognition mode with a major triad prompt
2. Ear training mode with play button visible
3. Stats tab with achievements unlocked

Tip: use the Stats tab after a short practice session, or temporarily seed demo stats before capture.

## Before submission

- Replace placeholder support/privacy URLs in App Store Connect with your hosted pages from `docs/app-store/`
- Confirm icon has no alpha channel (PNG, opaque background)
- Re-run `npm run cap:sync` after any web changes
