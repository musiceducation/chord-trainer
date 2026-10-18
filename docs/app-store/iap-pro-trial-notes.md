# Chord Trainer Pro — price & trial (ASC)

## Product

- Product ID: `com.musiceducation.chordtrainer.pro`
- Type today: **Non-Consumable** (one-time)
- Target price: **USD $6.99** (set equivalent price points for each storefront)

## Why the trial is app-managed

App Store Connect **introductory free trials** apply to **auto-renewable subscriptions** only.
A Non-Consumable cannot carry a StoreKit introductory offer.

Chord Trainer therefore:

1. Keeps Pro as a Non-Consumable at **$6.99**.
2. Starts a **7-day device trial** on first launch (`chordTrainerTrialStart` in localStorage)
   that unlocks the same features as Pro (chord progressions + full stats).
3. After the trial ends, those features lock again until Pro is purchased. Difficulty tiers
   remain free forever.

## ASC console steps (required for price / listing copy)

1. App Store Connect → app → **Monetization → In-App Purchases** → Chord Trainer Pro.
2. Set price to **$6.99** (or the matching tier) for all storefronts you sell in.
3. Update localization **Description** (example EN):
   > 7-day free trial in the app, then a one-time unlock for chord progressions and full stats. All difficulty tiers are free.
4. Update **Review notes** if needed: explain that the 7-day trial is granted in-app on first launch because the SKU is Non-Consumable.
5. Submit the IAP / metadata with the next binary (1.0.7 build 16+).

## Optional: StoreKit-native trial later

If you want Apple-hosted trial billing UI:

1. Create a new **Auto-Renewable Subscription** (e.g. `…pro.annual` or `…pro.lifetime` is not valid — use a real period such as yearly, or keep Non-Consumable and stay app-managed).
2. Add a **7-day free introductory offer**, then paid period at $6.99 (or yearly equivalent).
3. Ship a code change to purchase that subscription SKU instead of the Non-Consumable.
4. Keep or retire the Non-Consumable for existing buyers (grandfather via `getPurchases`).

Until that migration, **do not** expect Introductory Offers on the current Pro SKU.
