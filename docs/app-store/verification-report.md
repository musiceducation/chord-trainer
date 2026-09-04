# Release Verification Report

Generated during App Store release preparation. Updated 4 Sep 2026.

## Automated checks (passed)

| Check | Result |
|-------|--------|
| Unit tests (`npm test`) | 38 tests / 7 files |
| Production build (`npm run build`) | Success |
| Capacitor web copy (`npx cap copy ios`) | Success |
| Bundle ID | `com.musiceducation.chordtrainer` |
| App icon (1024×1024 RGB, no alpha) | Present in Xcode asset catalog |
| Privacy manifest | `ios/App/App/PrivacyInfo.xcprivacy` |
| Export compliance flag | `ITSAppUsesNonExemptEncryption = false` |
| Portrait orientations | iPhone + iPad portrait in Info.plist |
| IAP product IDs | `support.small` / `support.large` in code + StoreKit config |
| Service worker | Registers on web only (`!Capacitor.isNativePlatform()`) |
| Screenshots | Four-tab set + settings Support tips (iPhone + iPad) |

## Fixes applied from audit

- Stats tab crash (`Trophy` import)
- Unified scoring: wrong attempts and skips update `totalAnswered`
- Ear mode records `chordHistory` and skip stats
- Consistent streak after failure (resets to 0)
- Tab state preserved (modes hidden, not unmounted)
- Timeout cleanup on unmount/difficulty change
- Audio starts on first piano-key or Play tap (no overlay)
- Offline-safe system fonts (no Google Fonts CDN)
- Safe areas, `100dvh`, touch-action, accessibility labels
- In-app reset confirmation dialog
- Stats migration v1 → v2 with validation
- Support/privacy pages match the four-tab UI and IAP copy
- iPad locked to portrait
- Optional consumable Support tips in Settings ($0.99 / $4.99)

## Manual verification still required (physical device / TestFlight)

1. Tap a piano key or Play → sound plays (no 「開始練習」 overlay)
2. All four tabs: 辨識 / 訓練 / 進行 / 統計
3. Recognition, ear, and progression scoring
4. Settings: language + Support tips (Sandbox Apple ID)
5. Stats persist after force-quit
6. Airplane mode: app launches offline
7. iPhone SE / iPad layout and safe areas

## Environment notes on this machine

Xcode 26.6 is installed at `/Applications/Xcode.app`. `xcode-select` may still point at Command Line Tools. `npm run cap:sync` now sets `DEVELOPER_DIR` so `pod install` works without `sudo xcode-select`.

| Blocker | Status | Action |
|---------|--------|--------|
| Archive / upload | Requires your Apple Team | Xcode Organizer after signing |
| App Store Connect | Requires your Apple Developer account | Listing, IAP products, Paid Apps agreement |
| Paid Applications agreement | You must sign | Bank + tax; IAP will fail review without this |

## Commands to finish release

```bash
npm run cap:sync
npm run cap:open
# In Xcode: select Team → Archive 1.0 (2) → Upload
```

See [submission-checklist.md](./submission-checklist.md) for the full App Store Connect workflow.
