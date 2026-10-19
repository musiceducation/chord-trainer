# Chord Trainer

Interactive chord recognition and ear training for web, iPhone, and iPad.

- **Repo:** [musiceducation/chord-trainer](https://github.com/musiceducation/chord-trainer)
- **Web:** [chord-trainer-roan.vercel.app](https://chord-trainer-roan.vercel.app)

## Features

- **Recognition mode** — read a chord name, play it on the piano
- **Ear training** — listen and reproduce chords
- **Progressions** — hear I–IV–V–I, ii–V–I, I–V–vi–IV, or I–vi–IV–V in a random key, major or minor, and name each Roman numeral in order
- **Difficulty levels** — triads, sevenths, extended, and mix are free
- **On-device stats** — this session is free; full stats with Pro
- **Offline-first** — PWA + Capacitor iOS, no account required
- **Chord Trainer Pro** — monthly subscription (`com.musiceducation.chordtrainer.pro.monthly`, $6.99/month, 7-day trial): progressions, full stats
- **Support the developer** — optional consumable purchases that unlock no features

## Piano sound

Chords and keys play a mezzo-forte layer of Salamander Grand Piano V3
(Alexander Holm, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)).
Samples are trimmed and bundled under `public/audio/piano/`. Details:
[docs/piano-audio.md](docs/piano-audio.md).

## Development

```bash
npm install
npm run dev        # web dev server
npm test           # unit tests
npm run build      # production bundle
npm run cap:sync   # build + sync to iOS
npm run cap:open   # open Xcode
```

## iOS / App Store

- Bundle ID: `com.musiceducation.chordtrainer`
- Xcode workspace: `ios/App/App.xcworkspace`
- Submission docs: `docs/app-store/`
- Assets: `resources/`

See [submission checklist](docs/app-store/submission-checklist.md) for full release steps.

## Project structure

```
src/
  App.jsx              Main shell
  components/          UI modes and piano
  hooks/               Audio and timers
  lib/                 Chords, stats, constants
  test/                Vitest unit tests
ios/                   Capacitor native project
docs/app-store/        Metadata, privacy, support pages
public/                PWA manifest, icons, service worker
```

## License

Private — all rights reserved.
