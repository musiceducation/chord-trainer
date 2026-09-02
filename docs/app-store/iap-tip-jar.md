# Tip Jar — In-App Purchases

Optional, non-blocking tips. **All training features stay free.** There is no paywall.

This document lists product IDs and the App Store Connect (ASC) setup you must complete **before** submitting a build that includes IAP. Products and the Paid Apps Agreement were **not** created by this change; they must be added in your Apple Developer / ASC account.

## Product IDs (exact)

| Tier | Display (zh-Hant) | Price point | Type | Product ID |
|------|-------------------|-------------|------|------------|
| 1 | 請飲杯凍檸茶 | $0.99 | Consumable | `com.musiceducation.chordtrainer.tip.lemontea` |
| 2 | 請飲杯啡 | $4.99 | Consumable | `com.musiceducation.chordtrainer.tip.coffee` |

Source of truth in code: `src/lib/iap.js` (`TIP_PRODUCT_IDS`).

In-app copy:

- Sheet title: **支持一下**
- Restore button: **恢復購買**
- Thank-you: **唔該晒**

## Why this must exist in ASC before review

Apple will reject (or fail to load) IAP if:

1. The **Paid Applications Agreement** is not active in App Store Connect → Agreements, Tax, and Banking.
2. The two consumable products above are missing, or their IDs do not match exactly.
3. Products are not in a state the review build can purchase (Ready to Submit / approved, attached to the app version).
4. The iOS target is missing the **In-App Purchase** capability.

A binary that *contains* StoreKit / IAP code can be reviewed only after those products and the paid-apps contract exist. Creating them in ASC is a manual account step.

## ASC setup checklist (you do this in App Store Connect)

- [ ] Agreements, Tax, and Banking → accept **Paid Applications Agreement**; complete tax and banking if prompted.
- [ ] App Store Connect → this app → **Monetization** → **In-App Purchases** → **Create**.
- [ ] Create **Consumable** `com.musiceducation.chordtrainer.tip.lemontea`
  - Reference name: Lemon Tea Tip (internal)
  - Review screenshot: optional tip sheet
  - Review notes: optional thank-you tip; no unlock
- [ ] Create **Consumable** `com.musiceducation.chordtrainer.tip.coffee`
  - Reference name: Coffee Tip (internal)
- [ ] Localization **zh-Hant** (primary) and **English** for each product:

  | Locale | lemontea display name | lemontea description | coffee display name | coffee description |
  |--------|----------------------|----------------------|---------------------|--------------------|
  | zh-Hant | 請飲杯凍檸茶 | 支持 Chord Trainer 開發。訓練功能仍然全部免費。 | 請飲杯啡 | 支持 Chord Trainer 開發。訓練功能仍然全部免費。 |
  | English | Iced lemon tea | Optional tip to support Chord Trainer. All training features stay free. | Coffee | Optional tip to support Chord Trainer. All training features stay free. |

- [ ] Pricing: lemontea **$0.99** (USD price tier 1, or local equivalent); coffee **$4.99** (USD price tier 5, or local equivalent). Let Apple localize storefront prices.
- [ ] Attach both IAPs to the iOS app version you will submit.
- [ ] In Xcode: target **Signing & Capabilities** → **+ Capability** → **In-App Purchase**.
- [ ] Sandbox: create a Sandbox Apple ID under Users and Access → Sandbox → Testers. Sign out of the real App Store on device before testing.

Do **not** treat this repo change as proof that the products already exist in ASC.

## Native implementation

- Plugin: `@capgo/native-purchases` **v7** (Capacitor 7 / StoreKit 2).
- On **iOS**: `purchaseProduct` with `productType: INAPP` and `isConsumable: true`.
- On **web / Vite dev**: purchases resolve as mock success so the sheet, thank-you, and restore copy can be tested without StoreKit.
- Restore is wired (App Review expects a restore control). Tips are **consumable**, so restore shows: 打賞係消耗型項目，冇嘢可以恢復。

Local StoreKit config for Xcode (optional, not an ASC product): `ios/App/Products.storekit`. In the Run scheme, set **StoreKit Configuration** to this file for simulator purchases.

## After products exist

1. Archive a new build that includes this code.
2. Confirm both product IDs appear under the version’s In-App Purchases.
3. Test on a device with a sandbox account: buy each tip, cancel a sheet, tap 恢復購買.

This checklist does not submit, reply to App Review, or create ASC records.
