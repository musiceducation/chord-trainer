# Chord Trainer — App Store Metadata

## Identity

| Field | Value |
|-------|-------|
| App Name | Chord Trainer |
| Bundle ID | `com.musiceducation.chordtrainer` |
| SKU | `chord-trainer-ios-001` |
| Primary Language | Traditional Chinese (zh-Hant) |
| Category | Music (primary), Education (secondary) |
| Age Rating | 4+ |

## Subtitle

**zh-Hant:** 和弦辨識與聽音訓練  
**en:** Chord recognition & ear training

## Promotional Text (170 chars max)

**zh-Hant:** 在互動鋼琴上練習和弦辨識與聽音。三和弦免費；可選一次買斷 Pro，解鎖七和弦、進行與完整統計。

**en:** Practice chord recognition and ear training. Triads are free. Optional one-time Pro unlocks sevenths, progressions, and full stats.

## Description

### Traditional Chinese

Chord Trainer 是一款專為音樂學習者設計的和弦訓練 App。

**功能特色：**
- 辨識模式：看和弦名稱，在鋼琴上彈出正確音符
- 聽音訓練：聽和弦後在鍵盤上重現
- 今日 5 題與錯題本
- 免費難度：三和弦，以及今日／近期統計
- 可選 Chord Trainer Pro（一次買斷，$9.99）：七和弦、延伸、全混合、和弦進行，以及完整統計
- 可選「支持開發者」購買（$0.99 / $4.99），不會解鎖任何功能
- 離線可用：無需帳號，進度儲存在裝置本機

適合鋼琴初學者、音樂 theory 學生，以及想加強和弦聽力的玩家。

### English

Chord Trainer helps musicians practice chord spelling and ear training on a touch piano.

**Features:**
- Recognition mode: read a chord name and play it on the keyboard
- Ear training: listen and reproduce the chord
- Today's 5 and a miss book
- Free: triads, plus today and recent stats
- Optional Chord Trainer Pro (one-time unlock, $9.99): Sevenths, Extended, Mix, chord progressions, and full stats
- Optional Support purchases in Settings ($0.99 and $4.99). They unlock no features
- Works offline with no account required

## Keywords (100 chars max, comma-separated)

```
chord,piano,music,ear training,theory,keyboard,triad,七和弦,聽音,練習
```

## Review Notes

- No login, account, or demo credentials required
- Free without purchase: Triads difficulty, Identify, Train, Today's 5, miss book / Retry misses, first-launch C major flow, and today/recent stats
- Pro is a non-consumable one-time unlock (`com.musiceducation.chordtrainer.pro`, USD 9.99). It unlocks Sevenths, Extended, Mix, chord progressions, and full stats/history
- Support purchases are consumables and unlock nothing:
  - `com.musiceducation.chordtrainer.support.small` — USD 0.99
  - `com.musiceducation.chordtrainer.support.large` — USD 4.99
- Restore Purchases is in Settings (gear icon) and on the Pro paywall. It restores the non-consumable Pro unlock
- Locked items show a lock badge. Tapping opens the paywall. The paywall does not appear on launch
- No ads or tracking
- Audio is synthesized with Web Audio (no microphone, camera, or location)
- iOS will not play sound until the reviewer taps a piano key or Play / Replay — this is expected
- Four tabs: Identify, Train, Progress (Pro), Stats (gear icon: difficulty, language, Chord Trainer Pro, Restore Purchases, and Support the developer)
- Progress is stored only on-device (no cloud, no analytics)
- Privacy policy: https://chord-trainer-legal.vercel.app/privacy.html
- Support: https://chord-trainer-legal.vercel.app/support.html

## App Privacy (App Store Connect)

| Question | Answer |
|----------|--------|
| Data collection | Data Not Collected |
| Tracking | No |
| Third-party analytics | No |
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

Hosted on Vercel (`chord-trainer-legal`). Local HTML copies remain in `docs/app-store/` for reference.
