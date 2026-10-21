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

## App behaviour (1.0.7 build 18)

Build 18 is the App Review resubmission for submission `b8f082ec-a90c-4023-8817-6b810c508ba8` (1.0.7 build 17).

- **Purchase:** `@capgo/native-purchases` 7.19.3 always passed `Product.PurchaseOption.quantity` (default 1). StoreKit throws `PurchaseError.invalidQuantity` for that option on an auto-renewable subscription, so Pro Monthly failed before the sheet could complete. `scripts/patch-native-purchases.mjs` (postinstall and `cap:sync`) omits `.quantity` unless the product is a consumable or non-renewing subscription and the quantity is greater than 1. The JS purchase call also omits `quantity` for `…pro.monthly`.
- **Missing products:** Support and subscription queries are separate. A missing tip SKU does not hide Pro. An empty subscription response is retried. If Pro Monthly still has no StoreKit price, Subscribe stays disabled and the paywall shows **Try again** (it reloads products). A “product not found” rejection uses that same path instead of a one-line dead end. A failed charge says nothing was charged and leaves Subscribe enabled.
- **Paywall (en, zh-Hant, zh-Hans):** subscription title (StoreKit `title`, or “Chord Trainer Pro Monthly” / 「Chord Trainer Pro 月費」), length **1 month, auto-renews**, StoreKit price **per month**, Privacy Policy, and Apple’s standard EULA. The price is never typed in as $6.99.
- Privacy: https://chord-trainer-legal.vercel.app/privacy.html
- Terms (standard EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

Paid Apps Agreement, tax, and banking stay an App Store Connect step. This build only makes the app recover when products are missing.

## App behaviour (1.0.7 build 17+)

- Purchase button buys **`…pro.monthly`** via Capgo `PURCHASE_TYPE.SUBS`.
- Entitlement = active subscription **or** legacy Non-Consumable purchase.
- Difficulty tiers remain free. Pro still gates **progressions** + **full stats**.
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
