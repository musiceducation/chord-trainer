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
| Light EQ and a gentle compressor | Lowshelf for body, a small cut near 3.3 kHz and above 8 kHz so the close microphones are less brittle. The compressor keeps chords from clipping. |
| Per-note loudness trim | The raw layers are not equally loud. Each file is scaled so chord tones sit together. |

If a file fails to decode, a short inharmonic synth (hammer noise plus six partials) plays instead, so a missing asset does not silence a drill. The normal path is the sampled piano.

Key taps ring for about 1.85 s. Chords ring for 2.2 s, with a 15 ms strum, matching the previous progression timing.
