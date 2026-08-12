# Release Verification Report

Generated during App Store release preparation.

## Automated checks (passed)

| Check | Result |
|-------|--------|
| Unit tests (`npm test`) | 13/13 passed |
| Production build (`npm run build`) | Success |
| Capacitor web copy (`npx cap copy ios`) | Success |
| Bundle ID | `com.musiceducation.chordtrainer` |
| App icon (1024×1024) | Present in Xcode asset catalog |
| Privacy manifest | `ios/App/App/PrivacyInfo.xcprivacy` |
| Export compliance flag | `ITSAppUsesNonExemptEncryption = false` |
| Portrait-first orientations | Configured in Info.plist |

## Fixes applied from audit

- Stats tab crash (`Trophy` import)
- Unified scoring: wrong attempts and skips update `totalAnswered`
- Ear mode records `chordHistory` and skip stats
- Consistent streak after failure (resets to 0)
- Tab state preserved (modes hidden, not unmounted)
- Timeout cleanup on unmount/difficulty change
- Audio unlock overlay + async `AudioContext.resume()`
- Offline-safe system fonts (no Google Fonts CDN)
- Safe areas, `100dvh`, touch-action, accessibility labels
- In-app reset confirmation dialog
- Stats migration v1 → v2 with validation

## Manual verification still required

Test on a physical device via Xcode + TestFlight:

1. Tap **開始練習** → piano sound plays
2. Recognition mode: correct/wrong/skip scoring
3. Ear mode: replay button, scoring
4. Stats persist after force-quit
5. Airplane mode: app launches offline
6. iPhone SE / iPad layout and safe areas

## Environment blockers on build machine

| Blocker | Status | Action |
|---------|--------|--------|
| Full Xcode | Not active (`xcode-select` → CommandLineTools) | Install Xcode; run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` |
| Archive / upload | Cannot verify without Xcode | Use Xcode Organizer after signing |
| App Store Connect | Requires your Apple Developer account | Register bundle ID, create app, upload build |
| Hosted URLs | Placeholder emails/URLs in support page | Deploy `docs/app-store/*.html` and update email |

## Commands to finish release

```bash
npm run cap:sync
npm run cap:open
# In Xcode: select Team → Archive → Upload
```

See [submission-checklist.md](./submission-checklist.md) for the full App Store Connect workflow.
