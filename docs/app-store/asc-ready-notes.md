# App Store Connect — Ready-to-Paste Package

Use this when ASC is open. Archive a **new** 1.0 (build **2**) in Xcode. Do **not** upload `build/ChordTrainer.xcarchive` or `build/export/App.ipa`.

## App identity

| Field | Paste value |
|-------|-------------|
| App Name | Chord Trainer |
| Bundle ID | com.musiceducation.chordtrainer |
| SKU | chord-trainer-ios-001 |
| Primary Language | Traditional Chinese (zh-Hant) |
| Primary Category | Music |
| Secondary Category | Education |
| Age Rating | 4+ |
| Version | 1.0 |
| Build | 2 |

## Privacy & compliance

| Field | Paste value |
|-------|-------------|
| App Privacy | Data Not Collected |
| Tracking | No |
| Export Compliance | No (uses only exempt encryption; `ITSAppUsesNonExemptEncryption` = false) |

## URLs & contact

| Field | Paste value |
|-------|-------------|
| Privacy Policy URL | https://chord-trainer-legal.vercel.app/privacy.html |
| Support URL | https://chord-trainer-legal.vercel.app/support.html |
| Support email | kennethchan3868@hotmail.com |

## Screenshots (local, recaptured 4 Sep 2026)

Four-tab UI. Upload `asc-sized/` into the matching slot.

- iPhone 6.7": `docs/app-store/screenshots/iphone-6.7/asc-sized/` (1290×2796)
- iPhone 6.9": `docs/app-store/screenshots/iphone-6.7/` native (1320×2868)
- iPad 12.9": `docs/app-store/screenshots/ipad-12.9/asc-sized/` (2048×2732)

Details: `docs/app-store/screenshots/README.md`

## Metadata source

Full subtitle, description, keywords, and review notes: `docs/app-store/metadata.md`

## Archive (you must do this in Xcode)

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
npm run cap:sync
npm run cap:open
```

Then: Team signing → Archive → Upload to App Store Connect.
