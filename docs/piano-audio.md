# Piano sound

Chord Trainer used to play chords with three oscillators (a triangle plus two
sines). That tone is thin, buzzy, and unlike an acoustic piano, which is a
problem for ear training.

Playback now uses a small set of real grand-piano samples.

## Source and license

**Apple GarageBand / Logic Pro — Steinway Grand Piano** factory samples.

- Instrument: `Steinway Grand Piano 2.exs` (GarageBand patch “Steinway Grand Piano”)
- Sample bank: `Steinway Piano_consolidated.caf` under Logic EXS Factory Samples
- Shipped notice: `public/audio/piano/LICENSE.txt`
- Redistribution of Apple sound-library content is restricted by Apple’s software
  license. These clips are embedded for Chord Trainer drills at the project
  owner’s request.

## What is in the app

| Choice | Why |
| --- | --- |
| First velocity layer of the Steinway bank | Clear hammer attack without the brightest layer. |
| C2–C6, every minor third (17 notes) | Covers the keyboard (`MIDI 36–84`). Neighbors are at most 1–2 semitones away, so pitch-shift stays subtle. A2 uses the Bb2 zone. |
| Trimmed to 6.5 s, 192 kbps AAC | Long enough for a natural decay under the playback envelope (~2 MB total). |
| Web Audio `AudioBufferSource` | Files prefetch at startup and decode as soon as an AudioContext exists. A cached tap calls `resume()` and `source.start()` in the gesture. |
| Warmer playback EQ | See the table below. The samples themselves are unchanged. |
| Per-note loudness trim | Each file is peak-normalized with a small gain map so chord tones sit together. |

## Sustain (chord-practice envelope)

Analysis for chord drills (identify / ear / Roman):

| Event | Target | Rationale |
| --- | --- | --- |
| Attack | keep ~10 ms natural hammer | Pitch and chord quality are judged in the first 50–100 ms. |
| Single-note sustain | **3.0 s** to −60 dB | Hear the body and partials after the attack without dragging the next tap. |
| Chord sustain | **3.5 s** | Inner voices stay audible so players can check voicing. |
| Release fade | **~0.45 s** exponential | Avoids a clipped “tape stop”; still short enough for rapid drills. |
| Sample file length | **≥6.5 s** natural ring | Envelope must not hit a hard file end before the fade finishes. |

Key taps therefore ring about 3.0 s. Chords ring about 3.5 s, with a 15 ms strum.

## Playback EQ

Web Audio biquads, in this order, then a gentle compressor (threshold −14 dB, ratio 2.4) and a master gain of 0.9. Numbers live in `PIANO_TONE` in `src/lib/pianoEngine.js`.

| Filter | Type | Frequency | Q | Gain |
| --- | --- | --- | --- | --- |
| highpass | highpass | 30 Hz | 0.7 | — |
| body | lowshelf | 250 Hz | — | +4.5 dB |
| lowMid | peaking | 400 Hz | 0.7 | +2.5 dB |
| presence | peaking | 3800 Hz | 0.85 | −4.5 dB |
| upper | peaking | 5200 Hz | 1.1 | −3.0 dB |
| air | highshelf | 6400 Hz | — | −6.5 dB |

If a file fails to decode, a short inharmonic synth (hammer noise plus six partials) plays instead, so a missing asset does not silence a drill. The normal path is the sampled piano.
