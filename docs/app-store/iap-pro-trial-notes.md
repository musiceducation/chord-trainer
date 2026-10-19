# Chord Trainer Pro — monthly subscription + 7-day free trial (ASC)

## Products

| Role | Product ID | Type | Price |
| --- | --- | --- | --- |
| **Current Pro** | `com.musiceducation.chordtrainer.pro.monthly` | Auto-Renewable Subscription (1 month) | **USD $6.99 / month** |
| Legacy Pro (grandfather) | `com.musiceducation.chordtrainer.pro` | Non-Consumable (existing buyers only) | — do not sell new |
| Support Small | `com.musiceducation.chordtrainer.support.small` | Consumable tip | stays tip |
| Support Large | `com.musiceducation.chordtrainer.support.large` | Consumable tip | stays tip |

Subscription group (StoreKit / ASC): **Chord Trainer Pro**

Introductory offer: **1× P1W free** (7-day free trial), then recurring **P1M** at $6.99.

Local StoreKit config: `ios/App/App/Products.storekit`.

## App behaviour (1.0.8 build 20+)

- Purchase button buys **`…pro.monthly`** via Capgo `PURCHASE_TYPE.SUBS`.
- Entitlement = active subscription **or** legacy Non-Consumable purchase.
- Difficulty tiers remain free. Every progression (I–IV–V–I, ii–V–I, I–V–vi–IV, I–vi–IV–V, major and minor) is Pro. Free users can open the mode, see the locked patterns, and read an example of hear → pick degrees. Tapping a pattern or the Pro button opens the paywall. No scored round plays until Pro. Pro: **Progressions, full stats**.
- App-managed localStorage trial was removed in favour of Apple’s introductory offer.

## ASC console steps (create SKU if missing)

1. App Store Connect → app → **Monetization → Subscriptions**.
2. Create subscription group **Chord Trainer Pro** (if none).
3. Add subscription:
   - Reference name: `Pro Monthly`
   - Product ID: `com.musiceducation.chordtrainer.pro.monthly`
   - Duration: **1 Month**
   - Price: **$6.99** (set all storefronts)
4. **Introductory Offers** → Free → Duration **1 Week** → 1 period.
5. Localization EN / 繁中: name + description matching `Products.storekit`.
6. Leave legacy `…pro` Non-Consumable **Cleared for Sale = No** (or keep for restore only); do not delete if buyers exist.
7. Submit subscription with next binary review notes: “Pro is now a monthly auto-renewable subscription with a 7-day free introductory offer. Legacy one-time Pro purchases remain honored.”

## API note

Creating subscriptions via App Store Connect API requires Admin + Agreements signed. If API/browser automation is unavailable from the agent, complete the steps above in ASC manually before TestFlight external / App Review.
