# Chord Trainer

Interactive chord recognition and ear training for web, iPhone, and iPad.

- **Repo:** [musiceducation/chord-trainer](https://github.com/musiceducation/chord-trainer)
- **Web:** [chord-trainer-roan.vercel.app](https://chord-trainer-roan.vercel.app)

## Features

- **Recognition mode** — read a chord name, play it on the piano
- **Ear training** — listen and reproduce chords
- **Progressions** — hear a diatonic progression and identify I–VII
- **Difficulty levels** — triads, sevenths, extended, all
- **On-device stats** — accuracy, streaks, weak chords, achievements
- **Offline-first** — PWA + Capacitor iOS, no account required
- **Optional tips** — $0.99 / $4.99 Support IAP on iOS; all training stays free

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
