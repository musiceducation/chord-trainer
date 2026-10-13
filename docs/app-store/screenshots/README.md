# App Store Screenshots (local prep)

Generated via iOS Simulator (Debug). Upload the `asc-sized/` copies into the matching ASC slots.

## Guideline 2.3.7 (prices / “free”)

**Do not upload** any screenshot that shows dollar amounts, StoreKit prices, or the word free / 免費.

- Listing set: `02`–`05` only (and optional `06-settings.png` with IAP hidden).
- Price / Support UI shots belong in `iap-review/` for **In-App Purchase product** review only — never in App Previews / Screenshots.

## Devices used

| Slot | Simulator used | Reason |
|------|----------------|--------|
| iPhone 6.7" | **iPhone 17 Pro Max** (iOS 26.5) | Closest 6.7" class installed |
| iPad 12.9" | **iPad Pro 13-inch (M5)** (iOS 26.5) | Closest to 12.9" / current Pro large tablet |

## Actual pixel sizes

| Folder | Native capture size | Use this ASC slot | ASC-sized copy |
|--------|---------------------|-------------------|----------------|
| `iphone-6.7/` | **1320 × 2868** | **6.9"** | `asc-sized/` **1290 × 2796** for **6.7"** |
| `ipad-12.9/` | **2064 × 2752** | native is close | `asc-sized/` **2048 × 2732** for **12.9"** |

## Files (both iPhone and iPad)

All shots use Traditional Chinese and show **four tabs**: 辨識 / 訓練 / 進行 / 統計.

| File | Screen |
|------|--------|
| `02-recognition-piano.png` | 辨識 + piano |
| `03-ear-training.png` | 訓練 (ear) + piano |
| `05-progression.png` | 進行 (I–VII) |
| `04-stats-achievements.png` | 統計 + 成就 (seeded sample stats) |
| `06-settings.png` (optional) | Settings: difficulty + language only (`hideIap`) |

IAP review (not for listing): `iap-review/*/06-settings-support.png`.

Recapture listing set: `npm run cap:screenshots` (requires full Xcode; the script sets `DEVELOPER_DIR`).

## Support / legal (for listing)

- Privacy: https://chord-trainer-legal.vercel.app/privacy.html
- Support: https://chord-trainer-legal.vercel.app/support.html
- Email: kennethchan3868@hotmail.com
