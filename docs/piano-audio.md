# Piano sound

Chord Trainer used to play chords with three oscillators (a triangle plus two
sines). That tone is thin, buzzy, and unlike an acoustic piano, which is a
problem for ear training.

Playback now uses a small set of real grand-piano samples.

## Source and license

**Salamander Grand Piano V3** by Alexander Holm.

- License: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
  (commercial use is allowed with attribution)
- Original recording: Yamaha C5, 48 kHz (Ogg pack used for this build)
- Repository: https://github.com/sfzinstruments/SalamanderGrandPiano
- Archive: https://archive.org/details/SalamanderGrandPianoV3
- Shipped notice: `public/audio/piano/LICENSE.txt`

These samples replace an earlier GarageBand/Logic Steinway bank that could not
be redistributed under Apple’s software license.

## What is in the app

| Choice | Why |
| --- | --- |
| Velocity layer v10 (MIDI 73–80) | Mezzo-forte. Clear chord tones without the harsh top layers. |
| C2–C6, every minor third (17 notes) | Covers the keyboard (`MIDI 36–84`). Neighbors are at most 1–2 semitones away. |
| Trimmed to ~6.5 s, 192 kbps AAC | Long enough for the 3.0 / 3.5 s playback envelope (~1.8 MB total). C6 keeps its natural ~6.1 s. |
| Web Audio `AudioBufferSource` | Prefetch + decode; taps start inside the key gesture. |
| Steinway-leaning warm EQ | See below. Samples themselves are unchanged. |
| Per-note loudness trim | Raw layers are not equally loud; each file is scaled so chord tones sit together. |

## Sustain (chord-practice envelope)

| Event | Target |
| --- | --- |
| Single-note sustain | **3.0 s** |
| Chord sustain | **3.5 s** |
| Release fade | **~0.45 s** exponential |
| Sample file length | **≥6.5 s** when the source allows |

## Playback EQ

Tuned to approximate the GarageBand Steinway body we evaluated on Mac: more low
shelf and low-mid, deeper presence/air cuts than the first Salamander warm pass.
Numbers live in `PIANO_TONE` in `src/lib/pianoEngine.js`.

| Filter | Type | Frequency | Q | Gain |
| --- | --- | --- | --- | --- |
| highpass | highpass | 30 Hz | 0.7 | — |
| body | lowshelf | 240 Hz | — | +5.2 dB |
| lowMid | peaking | 380 Hz | 0.75 | +3.0 dB |
| presence | peaking | 3600 Hz | 0.9 | −5.2 dB |
| upper | peaking | 5000 Hz | 1.1 | −3.5 dB |
| air | highshelf | 6200 Hz | — | −7.0 dB |

Master gain 0.88, then a gentle compressor (threshold −14 dB, ratio 2.4).

If a file fails to decode, a short inharmonic synth plays instead so a missing
asset does not silence a drill.
