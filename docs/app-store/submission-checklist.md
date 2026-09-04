# Chord Trainer — App Store Submission Checklist

## Prerequisites (your Apple account)

- [ ] Apple Developer Program membership ($99/year)
- [ ] Register bundle ID `com.musiceducation.chordtrainer` in Certificates, Identifiers & Profiles
- [ ] Create App Store Connect app record
- [x] Host privacy policy and support pages — **DONE** (live): Privacy https://chord-trainer-legal.vercel.app/privacy.html · Support https://chord-trainer-legal.vercel.app/support.html · email kennethchan3868@hotmail.com
- [ ] Sign **Paid Applications** agreement + bank/tax (required for IAP)
- [ ] Create two consumable IAPs — see `iap.md`

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
- [ ] Add **In-App Purchase** capability if Xcode does not show it
- [ ] Confirm bundle ID `com.musiceducation.chordtrainer`
- [ ] Set version (Marketing) = 1.0, build = 2
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
- [ ] Attach IAP products to the version and submit them with the app

## TestFlight

- [ ] Upload build via Xcode Organizer
- [ ] Add internal testers
- [ ] Verify on physical iPhone and iPad:
  - Tap a piano key or Play — sound starts (no overlay)
  - All four tabs: Identify, Train, Progress, Stats
  - Piano keys respond to touch
  - Stats persist after force-quit
  - Airplane mode works (offline)
  - Safe areas on notched devices

## Known environment blockers on this machine

If `pod install` or archive fails:

1. Install full **Xcode** from the Mac App Store (not only Command Line Tools)
2. `npm run cap:sync` already sets `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`. If a tool still fails, run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
3. Re-run `npm run cap:sync`

Do **not** upload `build/ChordTrainer.xcarchive` — Archive a fresh 1.0 (build 2).

## Post-approval

- [ ] Monitor crash reports in App Store Connect
- [ ] Tag release in git
- [ ] Increment build number for next submission
