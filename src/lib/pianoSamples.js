/**
 * Sample map for the in-app piano.
 *
 * Source: Steinway Grand Piano factory samples shipped with Apple GarageBand /
 * Logic Pro on macOS (Steinway Piano_consolidated.caf via Steinway Grand Piano 2.exs).
 * One mezzo layer, minor thirds from C2 to C6 — the on-screen keyboard range.
 * Trimmed to 6.5 s with a 0.5 s fade. See public/audio/piano/LICENSE.txt.
 */

export const PIANO_SAMPLE_BASE = 'audio/piano/';

/** @type {Array<{ file: string, midi: number, lokey: number, hikey: number, gain: number }>} */
export const PIANO_SAMPLES = [
  { file: 'C2.m4a', midi: 36, lokey: 35, hikey: 37, gain: 0.95 },
  { file: 'Ds2.m4a', midi: 39, lokey: 38, hikey: 40, gain: 0.95 },
  { file: 'Fs2.m4a', midi: 42, lokey: 41, hikey: 43, gain: 0.95 },
  // Zone root is Bb2 (46); pitch-shift covers A2 (45).
  { file: 'A2.m4a', midi: 46, lokey: 44, hikey: 46, gain: 0.95 },
  { file: 'C3.m4a', midi: 48, lokey: 47, hikey: 49, gain: 0.95 },
  { file: 'Ds3.m4a', midi: 51, lokey: 50, hikey: 52, gain: 0.95 },
  { file: 'Fs3.m4a', midi: 54, lokey: 53, hikey: 55, gain: 0.95 },
  { file: 'A3.m4a', midi: 57, lokey: 56, hikey: 58, gain: 0.95 },
  { file: 'C4.m4a', midi: 60, lokey: 59, hikey: 61, gain: 0.95 },
  { file: 'Ds4.m4a', midi: 63, lokey: 62, hikey: 64, gain: 0.95 },
  { file: 'Fs4.m4a', midi: 66, lokey: 65, hikey: 67, gain: 0.95 },
  { file: 'A4.m4a', midi: 69, lokey: 68, hikey: 70, gain: 0.95 },
  { file: 'C5.m4a', midi: 72, lokey: 71, hikey: 73, gain: 0.95 },
  { file: 'Ds5.m4a', midi: 75, lokey: 74, hikey: 76, gain: 0.95 },
  { file: 'Fs5.m4a', midi: 78, lokey: 77, hikey: 79, gain: 0.95 },
  { file: 'A5.m4a', midi: 81, lokey: 80, hikey: 82, gain: 0.95 },
  { file: 'C6.m4a', midi: 84, lokey: 83, hikey: 85, gain: 0.95 },
];

export function pianoSampleUrl(file, base = './') {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${PIANO_SAMPLE_BASE}${file}`;
}

export function sampleForMidi(midi) {
  const hit = PIANO_SAMPLES.find((s) => midi >= s.lokey && midi <= s.hikey);
  if (hit) return hit;
  return PIANO_SAMPLES.reduce((best, s) => (
    Math.abs(s.midi - midi) < Math.abs(best.midi - midi) ? s : best
  ));
}

/** Pitch ratio for playing `midi` from a sample recorded at `sampleMidi`. */
export function playbackRateFor(midi, sampleMidi) {
  return 2 ** ((midi - sampleMidi) / 12);
}

/**
 * Index to skip encoder priming silence.
 * A real hammer onset within ~12ms is left intact. Longer leading silence
 * (typical AAC delay when the decoder does not apply the edit list) is removed,
 * keeping 2ms of pre-roll so the transient is not clipped.
 */
export function attackStartIndex(channels, sampleRate, threshold = 0.0015) {
  if (!channels?.length || !sampleRate) return 0;
  const length = channels[0].length;
  const maxLook = Math.min(length, Math.floor(sampleRate * 0.08));
  let onset = -1;
  for (let i = 0; i < maxLook; i += 1) {
    let peak = 0;
    for (let c = 0; c < channels.length; c += 1) {
      peak = Math.max(peak, Math.abs(channels[c][i]));
    }
    if (peak > threshold) {
      onset = i;
      break;
    }
  }
  if (onset < 0) return 0;
  const start = Math.max(0, onset - Math.floor(sampleRate * 0.002));
  if (start < Math.floor(sampleRate * 0.012)) return 0;
  return start;
}
