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

**zh-Hant:** 在互動鋼琴上練習三和弦、七和弦與延伸和弦。支援辨識模式、聽音訓練與本機進度統計。

**en:** Practice triads, sevenths, and extensions on an interactive piano. Recognition, ear training, and on-device stats.

## Description

### Traditional Chinese

Chord Trainer 是一款專為音樂學習者設計的和弦訓練 App。

**功能特色：**
- 辨識模式：看和弦名稱，在鋼琴上彈出正確音符
- 聽音訓練：聽和弦後在鍵盤上重現
- 難度分級：三和弦、七和弦、延伸和弦、全混合
- 本機統計：正確率、連勝紀錄、弱項分析和成就
- 離線可用：無需帳號，進度儲存在裝置本機

適合鋼琴初學者、音樂 theory 學生，以及想加強和弦聽力的玩家。

### English

Chord Trainer helps musicians practice chord spelling and ear training on a touch piano.

**Features:**
- Recognition mode: read a chord name and play it on the keyboard
- Ear training: listen and reproduce the chord
- Difficulty levels from triads to extended chords
- On-device stats, streaks, weak-chord insights, and achievements
- Works offline with no account required

## Keywords (100 chars max, comma-separated)

```
chord,piano,music,ear training,theory,keyboard,triad,七和弦,聽音,練習
```

## Review Notes

- No login required
- No in-app purchases
- No ads or tracking
- Audio uses synthesized Web Audio (no microphone)
- Progress stored locally only in `localStorage`
- First launch shows “開始練習” to unlock audio (iOS requirement)

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

## URLs (replace before submission)

| Field | Placeholder |
|-------|-------------|
| Support URL | `https://YOUR-DOMAIN/support` |
| Privacy Policy URL | `https://YOUR-DOMAIN/privacy` |
| Marketing URL | optional |

Host the HTML files in `docs/app-store/` on any static host (GitHub Pages, Vercel, etc.).
