# App Store Connect — Ready-to-Paste Package

Use this when ASC is open. This release is **1.0.8 (build 19)**. Do not submit until `ios/App/Secrets.xcconfig` exists locally and `com.musiceducation.chordtrainer.adfree` exists in App Store Connect. Do **not** upload an old archive.

## App identity

| Field | Paste value |
|-------|-------------|
| App Name | Chord Trainer |
| Bundle ID | com.musiceducation.chordtrainer |
| SKU | chord-trainer-ios-001 |
| Primary Language | English (en) |
| Primary Category | Music |
| Secondary Category | Education |
| Age Rating | 4+ |
| Version | 1.0.8 |
| Build | 19 |

## Privacy & compliance

| Field | Paste value |
|-------|-------------|
| App Privacy | Device ID, Advertising Data, and Product Interaction via AdMob banners. Not “Data Not Collected” |
| Tracking | Yes, when the user allows personalized ads (UMP). Ad-free purchases and active Pro subscriptions see no ads |
| Export Compliance | No (uses only exempt encryption; `ITSAppUsesNonExemptEncryption` = false) |

## URLs & contact

| Field | Paste value |
|-------|-------------|
| Privacy Policy URL | https://chord-trainer-legal.vercel.app/privacy.html |
| Support URL | https://chord-trainer-legal.vercel.app/support.html |
| Support email | kennethchan3868@hotmail.com |

## In-app purchases (create in ASC before review)

See `iap.md`. Create Ad-free in App Store Connect before review. Do not offer Pro Monthly or Support (Large) to new buyers.

| Display | Product ID | Type | US price | This release |
|---------|------------|------|----------|--------------|
| Ad-free | `com.musiceducation.chordtrainer.adfree` | Non-consumable | $4.99 | Create in ASC. Removes ads only |
| Support (Small) | `com.musiceducation.chordtrainer.support.small` | Consumable | $0.99 | Shown. Unlocks nothing |
| Support (Large) | `com.musiceducation.chordtrainer.support.large` | Consumable | $4.99 | Hidden |
| Pro Monthly | `com.musiceducation.chordtrainer.pro.monthly` | Auto-renewable | $6.99 | Hidden. Existing subscribers stay ad-free |

IAP review screenshots (product page only, not listing): `docs/app-store/screenshots/iap-review/`.

**Required when submitting:** add the new Ad-free IAP to the same App Review submission as the 1.0.8 binary. Do not submit from this preflight.

## Screenshots (listing — no prices / “free”, Guideline 2.3.7)

Upload **only** `02`–`05` from `asc-sized/` (or native for 6.9"). Do **not** upload `iap-review` or any shot with `$` / 免費.

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

Then: Team signing → confirm In-App Purchase capability → Archive **1.0 (2)** → Upload to App Store Connect.
