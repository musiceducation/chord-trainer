/**
 * Sample maps for the in-app piano.
 *
 * acoustic — Salamander Grand Piano V3 by Alexander Holm (CC BY 3.0).
 * electric — FreePats FM Piano 1 (CC0). See public/audio/piano(-ep)/LICENSE.txt.
 */

export const PIANO_SOUND_ACOUSTIC = 'acoustic';
export const PIANO_SOUND_ELECTRIC = 'electric';
export const PIANO_SOUND_IDS = Object.freeze([PIANO_SOUND_ACOUSTIC, PIANO_SOUND_ELECTRIC]);
export const DEFAULT_PIANO_SOUND = PIANO_SOUND_ACOUSTIC;

/** @deprecated Prefer getPianoPack(DEFAULT_PIANO_SOUND).base */
export const PIANO_SAMPLE_BASE = 'audio/piano/';

/** Acoustic: minor thirds C2–C6 (≤2 semitone pitch-shift). */
export const ACOUSTIC_SAMPLES = Object.freeze([
  { file: 'C2.m4a', midi: 36, lokey: 35, hikey: 37, gain: 0.93 },
  { file: 'Ds2.m4a', midi: 39, lokey: 38, hikey: 40, gain: 0.87 },
  { file: 'Fs2.m4a', midi: 42, lokey: 41, hikey: 43, gain: 0.76 },
  { file: 'A2.m4a', midi: 45, lokey: 44, hikey: 46, gain: 1.12 },
  { file: 'C3.m4a', midi: 48, lokey: 47, hikey: 49, gain: 0.99 },
  { file: 'Ds3.m4a', midi: 51, lokey: 50, hikey: 52, gain: 0.95 },
  { file: 'Fs3.m4a', midi: 54, lokey: 53, hikey: 55, gain: 1.22 },
  { file: 'A3.m4a', midi: 57, lokey: 56, hikey: 58, gain: 1.36 },
  { file: 'C4.m4a', midi: 60, lokey: 59, hikey: 61, gain: 0.83 },
  { file: 'Ds4.m4a', midi: 63, lokey: 62, hikey: 64, gain: 1.25 },
  { file: 'Fs4.m4a', midi: 66, lokey: 65, hikey: 67, gain: 1.18 },
  { file: 'A4.m4a', midi: 69, lokey: 68, hikey: 70, gain: 1.11 },
  { file: 'C5.m4a', midi: 72, lokey: 71, hikey: 73, gain: 1.15 },
  { file: 'Ds5.m4a', midi: 75, lokey: 74, hikey: 76, gain: 1.38 },
  { file: 'Fs5.m4a', midi: 78, lokey: 77, hikey: 79, gain: 1.11 },
  { file: 'A5.m4a', midi: 81, lokey: 80, hikey: 82, gain: 1.93 },
  { file: 'C6.m4a', midi: 84, lokey: 83, hikey: 85, gain: 1.77 },
]);

/**
 * Electric (FreePats FM Piano 1 v80): tritones C/F# per SFZ regions.
 * Pitch-shift at most ±3 semitones across the on-screen keyboard.
 */
export const ELECTRIC_SAMPLES = Object.freeze([
  { file: 'C2.m4a', midi: 36, lokey: 33, hikey: 38, gain: 1.0 },
  { file: 'Fs2.m4a', midi: 42, lokey: 39, hikey: 44, gain: 1.0 },
  { file: 'C3.m4a', midi: 48, lokey: 45, hikey: 50, gain: 1.0 },
  { file: 'Fs3.m4a', midi: 54, lokey: 51, hikey: 56, gain: 1.0 },
  { file: 'C4.m4a', midi: 60, lokey: 57, hikey: 62, gain: 1.0 },
  { file: 'Fs4.m4a', midi: 66, lokey: 63, hikey: 68, gain: 1.0 },
  { file: 'C5.m4a', midi: 72, lokey: 69, hikey: 74, gain: 1.0 },
  { file: 'Fs5.m4a', midi: 78, lokey: 75, hikey: 80, gain: 1.0 },
  { file: 'C6.m4a', midi: 84, lokey: 81, hikey: 85, gain: 1.0 },
]);

/** @deprecated Alias for acoustic samples (tests + older imports). */
export const PIANO_SAMPLES = ACOUSTIC_SAMPLES;

export const PIANO_PACKS = Object.freeze({
  [PIANO_SOUND_ACOUSTIC]: Object.freeze({
    id: PIANO_SOUND_ACOUSTIC,
    base: 'audio/piano/',
    samples: ACOUSTIC_SAMPLES,
    labelKey: 'sound.acoustic',
    creditKey: 'about.pianoCreditAcoustic',
  }),
  [PIANO_SOUND_ELECTRIC]: Object.freeze({
    id: PIANO_SOUND_ELECTRIC,
    base: 'audio/piano-ep/',
    samples: ELECTRIC_SAMPLES,
    labelKey: 'sound.electric',
    creditKey: 'about.pianoCreditElectric',
  }),
});

export function normalizePianoSound(value) {
  return PIANO_SOUND_IDS.includes(value) ? value : DEFAULT_PIANO_SOUND;
}

export function getPianoPack(soundId = DEFAULT_PIANO_SOUND) {
  return PIANO_PACKS[normalizePianoSound(soundId)];
}

export function pianoSampleUrl(file, assetBase = './', packBase = PIANO_SAMPLE_BASE) {
  const prefix = assetBase.endsWith('/') ? assetBase : `${assetBase}/`;
  const folder = packBase.endsWith('/') ? packBase : `${packBase}/`;
  return `${prefix}${folder}${file}`;
}

export function sampleForMidi(midi, samples = ACOUSTIC_SAMPLES) {
  const list = samples?.length ? samples : ACOUSTIC_SAMPLES;
  const hit = list.find((s) => midi >= s.lokey && midi <= s.hikey);
  if (hit) return hit;
  return list.reduce((best, s) => (
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
