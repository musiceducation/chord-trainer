# In-App Purchases

Chord Trainer uses StoreKit via `@capgo/native-purchases`. Prices shown in the app come from StoreKit. Do not hardcode a displayed price in the UI.

## Product IDs (must match App Store Connect exactly)

| Reference | Product ID | Type | US price | Offered now |
|-----------|------------|------|----------|-------------|
| Ad-free | `com.musiceducation.chordtrainer.adfree` | Non-consumable | USD 4.99 | Yes. Removes ads only. Create this in App Store Connect before review. |
| Support (Small) | `com.musiceducation.chordtrainer.support.small` | Consumable | USD 0.99 | Yes. Unlocks nothing. |
| Support (Large) | `com.musiceducation.chordtrainer.support.large` | Consumable | USD 4.99 | Hidden. Not the Ad-free unlock. |
| Pro Monthly | `com.musiceducation.chordtrainer.pro.monthly` | Auto-renewable | USD 6.99 | Hidden. Existing subscribers stay ad-free. |
| Legacy Pro | `com.musiceducation.chordtrainer.pro` | Non-consumable | (historical) | Not sold. Existing buyers stay ad-free. |

All modes, difficulties, chord progressions, and full stats are free. The only paid feature is removing ads. Never use the words Donate or tip.

## Free vs Ad-free

| | Free | Ad-free |
|--|------|---------|
| Identify, Train, Listen, Roman, ABRSM, Lookup | yes | yes |
| Sevenths, Extended, Mix | yes | yes |
| Chord progressions and full stats | yes | yes |
| Banner ads on non-practice screens | yes | no |

The paywall sells the one-time Ad-free unlock. It does not offer Pro Monthly. It does not open on launch.

Restore Purchases is in Settings and on the paywall. It is required for the non-consumable. Consumable Support purchases are not restored as features.

## App Store Connect

Do not change App Store Connect from the repo. When submitting:

1. Agreements, Tax, and Banking → Paid Applications agreement, bank, and tax.
2. Create **Ad-free** `com.musiceducation.chordtrainer.adfree` as a non-consumable at USD 4.99 (English + Traditional Chinese) if it is not in App Store Connect yet. Keep Support (Small) at USD 0.99. Do not offer Pro Monthly or Support (Large) to new buyers.
3. Review screenshots (any iPhone size):
   - Settings: Ad-free row, **Restore Purchases**, and Support (Small) with the line that it unlocks no features. No monthly subscription and no second $4.99 button.
   - Paywall: all modes are free, $4.99 removes ads, StoreKit price, Unlock, Restore Purchases, and Close.
4. **Submit the new Ad-free IAP with the app version** when you are ready to submit. This PR does not submit.
5. App Privacy must disclose AdMob banner data. Apple processes payment. Ad-free removes ads only.

## Local testing

`ios/App/App.xcodeproj` scheme **App** → Run → Options uses `ios/App/App/Products.storekit` (USA storefront). Buy in the simulator without a sandbox Apple ID.

1. Run the App scheme. Roman, full stats, and every difficulty are available with no purchase.
2. Buy **Ad-free**. The banner disappears. Settings shows **Ad-free**. Modes were already available.
3. Delete and reinstall, or use Settings → **Restore Purchases**. Ad-free returns from StoreKit.
4. Buy **Support (Small)**. A thank-you toast appears. Ads stay. Support (Large) is not on screen.
5. Cancel a purchase sheet. The app stays quiet and does not remove ads.
6. On web, Settings and the paywall say in-app purchases are only in the iOS app.

A dev-only flag simulates Pro in non-production web builds: `localStorage.chordTrainerDevPro = '1'`. It is off unless set, and it is ignored on the iOS binary.

On a device / TestFlight, use a Sandbox Apple ID (Settings → App Store → Sandbox Account).

## Review notes line to paste

- All modes are free. Ad-free is a non-consumable (`com.musiceducation.chordtrainer.adfree`, USD 4.99). It only removes ads.
- Support (Small) is a consumable (`…support.small`, USD 0.99) and unlocks nothing. Support (Large) is hidden.
- Pro Monthly is not sold to new buyers. An active subscription, or the legacy non-consumable Pro, still removes ads.
- Restore Purchases is in Settings (gear) and on the Ad-free paywall.
