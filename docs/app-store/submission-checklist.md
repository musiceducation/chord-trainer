# Chord Trainer — App Store Submission Checklist

## Prerequisites (your Apple account)

- [ ] Apple Developer Program membership ($99/year)
- [ ] Register bundle ID `com.musiceducation.chordtrainer` in Certificates, Identifiers & Profiles
- [ ] Create App Store Connect app record
- [ ] Host privacy policy and support pages (see `privacy-policy.html`, `support.html`)
- [ ] Before any IAP-enabled build can be reviewed: Paid Apps Agreement + consumable products in ASC (see `iap-tip-jar.md`). This repo does not create those ASC records.

## Local build steps

```bash
cd "/Users/kenneth/Desktop/chord training"
npm install
npm test
npm run build
npm run cap:sync
npm run cap:open
```

In Xcode (`ios/App/App.xcworkspace`):

- [ ] Select your Team under Signing & Capabilities
- [ ] Confirm bundle ID `com.musiceducation.chordtrainer`
- [ ] Set version (Marketing) = 1.0, build = 1
- [ ] Build for Any iOS Device (arm64)
- [ ] Product → Archive → Distribute App → App Store Connect

## App Store Connect listing

- [ ] Upload 1024×1024 app icon (from `resources/icon.png`)
- [ ] iPhone 6.7" screenshots (1290×2796)
- [ ] iPad 12.9" screenshots (2048×2732)
- [ ] Copy metadata from `metadata.md`
- [ ] Set category: Music
- [ ] Complete App Privacy: **Data Not Collected**
- [ ] Complete age rating questionnaire
- [ ] Add support and privacy URLs
- [ ] Export compliance: No non-exempt encryption

## TestFlight

- [ ] Upload build via Xcode Organizer
- [ ] Add internal testers
- [ ] Verify on physical iPhone and iPad:
  - Audio unlock overlay → tap to start
  - Piano keys respond to touch
  - Stats persist after force-quit
  - Airplane mode works (offline)
  - Safe areas on notched devices

## Known environment blockers on this machine

If `pod install` or archive fails:

1. Install full **Xcode** from the Mac App Store (not only Command Line Tools)
2. Run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
3. Re-run `npm run cap:sync`

## Post-approval

- [ ] Monitor crash reports in App Store Connect
- [ ] Tag release in git
- [ ] Increment build number for next submission
