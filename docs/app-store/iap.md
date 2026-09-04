# In-App Purchases (optional tips)

All training features stay free. These are **consumable Support tips**, not donations and not unlocks.

## Product IDs (must match App Store Connect exactly)

| Reference | Product ID | Type | US price |
|-----------|------------|------|----------|
| Support Small | `com.musiceducation.chordtrainer.support.small` | Consumable | USD 0.99 |
| Support Large | `com.musiceducation.chordtrainer.support.large` | Consumable | USD 4.99 |

Display name: **Support Chord Trainer** / **Support Chord Trainer+**  
Reviewer-facing copy: optional tip. Never use the word Donate.

## App Store Connect (required before review)

1. Agreements, Tax, and Banking → sign the **Paid Applications** agreement and complete bank/tax.
2. App → Monetization → In-App Purchases → Create:
   - Type: Consumable
   - Reference names and product IDs from the table above
   - Localization (English + Traditional Chinese)
   - Price: 0.99 and 4.99 USD
   - Review screenshot: settings panel with the two tip buttons (any iPhone size)
3. Submit the IAPs **with the app version** (they must be Ready to Submit).
4. App Privacy can stay **Data Not Collected** (Apple processes payment; we do not store card data or send receipts to a server).

## Local testing

Xcode scheme Run → Options uses `ios/App/App/Products.storekit`. Buy in the simulator without a sandbox Apple ID.

On a device / TestFlight, use a Sandbox Apple ID (Settings → App Store → Sandbox Account).

## Review notes line to paste

- Optional consumable tips in Settings: $0.99 and $4.99. Product IDs `com.musiceducation.chordtrainer.support.small` and `.large`. All features remain free without purchase. No Restore button (consumable tips).
