# Piano sound

Chord Trainer used to play chords with three oscillators (a triangle plus two
sines). That tone is thin, buzzy, and unlike an acoustic piano, which is a
problem for ear training.

Playback now uses a small set of real grand-piano samples.

## Source and license

**Salamander Grand Piano V3** by Alexander Holm.

- License: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
  (commercial use is allowed with attribution)
- Original recording: Yamaha C5, 48 kHz, 24-bit
- Repository: https://github.com/sfzinstruments/SalamanderGrandPiano
- Shipped notice: `public/audio/piano/LICENSE.txt`

## What is in the app

| Choice | Why |
| --- | --- |
| Velocity layer v10 (MIDI 73–80) | Mezzo-forte. Clear enough to hear chord tones, not the harsh top layers. |
| C2–C6, every minor third (17 notes) | Covers the keyboard (`MIDI 36–84`). Neighbors are at most 1–2 semitones away, so pitch-shift stays subtle. |
| Trimmed to 4.0 s, 192 kbps AAC | About 1.6 MB total. The attack is intact; drills do not need a 16-second ring. |
| Web Audio `AudioBufferSource` | Notes start on the next audio block once the buffer is decoded. Samples are decoded when the screen mounts, before the first tap. |
| Warmer playback EQ | See the table below. The samples themselves are unchanged. |
| Per-note loudness trim | The raw layers are not equally loud. Each file is scaled so chord tones sit together. |

## Playback EQ

Web Audio biquads, in this order, then a gentle compressor (threshold −14 dB, ratio 2.4) and a master gain of 0.9. Numbers live in `PIANO_TONE` in `src/lib/pianoEngine.js`.

The first pass (lowshelf +2.4 dB at 190 Hz, −2.4 dB at 3.3 kHz, highshelf −3 dB at 7.8 kHz) still sounded bright on a C4 and C-major listen. The curve below adds low-mid body and softens the top.

| Filter | Type | Frequency | Q | Gain |
| --- | --- | --- | --- | --- |
| highpass | highpass | 30 Hz | 0.7 | — |
| body | lowshelf | 250 Hz | — | +4.5 dB |
| lowMid | peaking | 400 Hz | 0.7 | +2.5 dB |
| presence | peaking | 3800 Hz | 0.85 | −4.5 dB |
| upper | peaking | 5200 Hz | 1.1 | −3.0 dB |
| air | highshelf | 6400 Hz | — | −6.5 dB |

The 3.8 kHz cut is broad enough to ease 3–5 kHz. The highshelf now starts at 6.4 kHz instead of 7.8 kHz, and it is deeper, so the close-mic string noise sits further back.

If a file fails to decode, a short inharmonic synth (hammer noise plus six partials) plays instead, so a missing asset does not silence a drill. The normal path is the sampled piano.

Key taps ring for about 1.85 s. Chords ring for 2.2 s, with a 15 ms strum, matching the previous progression timing.
