# Chord Trainer — App Store Metadata

## Identity

| Field | Value |
|-------|-------|
| App Name | Chord Trainer |
| Bundle ID | `com.musiceducation.chordtrainer` |
| SKU | `chord-trainer-ios-001` |
| Primary Language | English (en) |
| Category | Music (primary), Education (secondary) |
| Age Rating | 4+ |

The bundle development region is English. A fresh install with no saved language opens in English. 繁體中文 and 简体中文 stay in Settings. Chinese store copy below is additional listing text, not the default UI language.

## Subtitle

**zh-Hant:** 和弦辨識與聽音訓練  
**en:** Chord recognition & ear training

## Promotional Text (170 chars max)

**zh-Hant:** 在互動鋼琴上練習和弦辨識與聽音。所有模式免費。一次購買無廣告（USD $4.99）只移除廣告。

**en:** Practice chord recognition and ear training. All modes are free. One-time Ad-free (USD $4.99) only removes ads.

## Description

### Traditional Chinese

Chord Trainer 是一款專為音樂學習者設計的和弦訓練 App。

**功能特色：**
- 辨識模式：看和弦名稱，在鋼琴上彈出正確音符
- 聽音訓練：聽和弦後在鍵盤上重現
- 錯題本／重練錯題
- 所有難度、和弦進行與完整統計均免費
- 可選一次購買「無廣告」（USD $4.99），只移除廣告
- 可選「支持開發者」USD $0.99，不會解鎖任何功能
- 離線可用：無需帳號，進度儲存在裝置本機

適合鋼琴初學者、音樂 theory 學生，以及想加強和弦聽力的玩家。

### English

Chord Trainer helps musicians practice chord spelling and ear training on a touch piano.

**Features:**
- Recognition mode: read a chord name and play it on the keyboard
- Ear training: listen and reproduce the chord
- Miss book / Retry misses
- All difficulties, chord progressions, and full stats are free
- Optional one-time Ad-free unlock (USD $4.99) removes ads only
- Optional Support purchase (USD $0.99) unlocks nothing. Pro Monthly is not offered to new buyers.
- Works offline with no account required

## Keywords (100 chars max, comma-separated)

```
chord,piano,music,ear training,theory,keyboard,triad,七和弦,聽音,練習
```

## Review Notes

- No login, account, or demo credentials required
- Free without purchase: every mode, every difficulty, chord progressions, and full stats. Banner ads appear only off the practice surface
- Ad-free is a non-consumable (`com.musiceducation.chordtrainer.adfree`, USD 4.99). It removes ads and unlocks no modes. Create this product in App Store Connect before review
- Support (Small) is a consumable (`com.musiceducation.chordtrainer.support.small`, USD 0.99) and unlocks nothing. Support (Large) is not shown
- Pro Monthly is not sold to new buyers. An active subscription, or the legacy non-consumable Pro, still removes ads
- Restore Purchases is in Settings and on the Ad-free paywall. It restores the non-consumable Ad-free unlock
- No mode is locked. The paywall sells Ad-free only and does not appear on launch
- Free version shows a Google AdMob banner on non-practice screens only (Stats, Settings, paywall chrome, and a mode gate before a round). No banner during Identify, Train, Listen, Roman, ABRSM, or while piano audio is playing. Ad-free (one-time purchase, or an existing Pro subscription) removes ads. Screenshot captures stay ad-free.
- Audio is synthesized with Web Audio (no microphone, camera, or location)
- iOS will not play sound until the reviewer taps a piano key or Play / Replay — this is expected
- Tabs include Identify, Train, Listen, Roman, Progress, Lookup, and Stats. None are locked. Settings has language, Ad-free, Restore Purchases, and Support (Small)
- Progress is stored only on-device (no cloud, no analytics)
- Privacy policy: https://chord-trainer-legal.vercel.app/privacy.html
- Support: https://chord-trainer-legal.vercel.app/support.html

## App Privacy (App Store Connect)

| Question | Answer |
|----------|--------|
| Data collection | Device ID, Advertising Data, Product Interaction (Google AdMob banners) |
| Tracking | Yes, for personalized ads when the user allows them (UMP consent) |
| Third-party advertising | Google AdMob. No separate analytics SDK |
| Account required | No |

## Export Compliance

- Uses only exempt encryption (HTTPS/TLS if any network use in future)
- Set **ITSAppUsesNonExemptEncryption** = NO (already in Info.plist)

## Age Rating Questionnaire (expected)

- Cartoon/fantasy violence: None
- Realistic violence: None
- Sexual content: None
- Profanity: None
- Drugs/alcohol/tobacco: None
- Gambling: None
- Horror: None
- Mature themes: None
- Unrestricted web access: No
- User-generated content: No

## URLs (live)

| Field | Value |
|-------|-------|
| Privacy Policy URL | https://chord-trainer-legal.vercel.app/privacy.html |
| Support URL | https://chord-trainer-legal.vercel.app/support.html |
| Support email | kennethchan3868@hotmail.com |
| Marketing URL | optional |

The live privacy and support URLs are the separate `chord-trainer-legal` project, not this app’s Vercel deployment. Publish `docs/app-store/privacy.html` and `docs/app-store/support.html` there before review. Until that deploy, production still describes a no-advertising app.
