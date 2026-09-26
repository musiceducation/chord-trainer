# In-App Purchases

Chord Trainer uses StoreKit via `@capgo/native-purchases`. Prices shown in the app come from StoreKit. Do not hardcode a displayed price in the UI.

## Product IDs (must match App Store Connect exactly)

| Reference | Product ID | Type | US price |
|-----------|------------|------|----------|
| Chord Trainer Pro | `com.musiceducation.chordtrainer.pro` | Non-consumable | USD 9.99 |
| Support (Small) | `com.musiceducation.chordtrainer.support.small` | Consumable | USD 0.99 |
| Support (Large) | `com.musiceducation.chordtrainer.support.large` | Consumable | USD 4.99 |

Display names: **Chord Trainer Pro**, **Support (Small)**, **Support (Large)**.

Pro unlocks Sevenths, Extended, Mix, chord progressions, and full stats/history. Support purchases unlock no features. Never use the words Donate or tip.

## Free vs Pro

| | Free | Pro |
|--|------|-----|
| Triads | yes | yes |
| Sevenths, Extended, Mix | locked | yes |
| Identify and Train | yes | yes |
| Today's 5 and miss book | yes | yes |
| First-launch C major flow | yes | yes |
| Stats | today / recent | full history |
| Chord progressions | locked | yes |

Locked rows show a lock badge. Tapping opens a paywall with the StoreKit price, Buy, Restore Purchases, and Close. The paywall does not open on launch.

Restore Purchases is in Settings and on the paywall. It is required for the non-consumable. Consumable Support purchases are not restored as features.

## App Store Connect

Do not change App Store Connect from the repo. When submitting:

1. Agreements, Tax, and Banking → Paid Applications agreement, bank, and tax.
2. Create the three products above (English + Traditional Chinese). Price tiers USD 9.99, 0.99, and 4.99.
3. Review screenshots (any iPhone size):
   - Settings: Chord Trainer Pro row, **Restore Purchases**, and Support the developer with both consumables and the line that they unlock no features.
   - Paywall: StoreKit price (not a typed-in dollar amount), Buy, Restore Purchases, and Close.
4. Submit the IAPs with the app version.
5. App Privacy can stay **Data Not Collected** (Apple processes payment; the app does not store card data or send receipts to a server).

## Local testing

`ios/App/App.xcodeproj` scheme **App** → Run → Options uses `ios/App/App/Products.storekit` (USA storefront). Buy in the simulator without a sandbox Apple ID.

1. Run the App scheme. Confirm the paywall price matches the config (USD 9.99) and is not a hardcoded label.
2. Buy **Chord Trainer Pro**. Sevenths, Extended, Mix, Progress, and full stats unlock. Settings shows **Pro unlocked**.
3. Delete and reinstall, or use Settings → **Restore Purchases**. Pro returns from StoreKit.
4. Buy **Support (Small)** and **Support (Large)**. A thank-you toast appears. No feature unlocks.
5. Cancel a purchase sheet. The app stays quiet and does not unlock.
6. On web, Settings and the paywall say in-app purchases are only in the iOS app.

A dev-only flag simulates Pro in non-production web builds: `localStorage.chordTrainerDevPro = '1'`. It is off unless set, and it is ignored on the iOS binary.

On a device / TestFlight, use a Sandbox Apple ID (Settings → App Store → Sandbox Account).

## Review notes line to paste

- Pro is a non-consumable (`com.musiceducation.chordtrainer.pro`, USD 9.99). It unlocks Sevenths, Extended, Mix, chord progressions, and full stats/history.
- Support (Small) and Support (Large) are consumables (`…support.small` USD 0.99, `…support.large` USD 4.99). They unlock nothing.
- Restore Purchases is in Settings (gear) and on the Pro paywall.
- Free without purchase: Triads, Identify, Train, Today's 5, miss book, first-launch C major flow, and today/recent stats.
