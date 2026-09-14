import { PC_TO_NOTE } from './constants.js';

function normalizePc(pc) {
  return ((Number(pc) % 12) + 12) % 12;
}

function toPcSet(pcs) {
  return new Set([...pcs].map(normalizePc));
}

export function formatPitchClasses(pcs) {
  return [...pcs].map((pc) => PC_TO_NOTE[normalizePc(pc)]).join(', ');
}

export function diffPitchClasses(playedPcs, targetPcs) {
  const played = toPcSet(playedPcs);
  const target = toPcSet(targetPcs);
  const extra = [...played].filter((pc) => !target.has(pc)).sort((a, b) => a - b);
  const missing = [...target].filter((pc) => !played.has(pc)).sort((a, b) => a - b);
  const correct = [...played].filter((pc) => target.has(pc)).sort((a, b) => a - b);
  return { extra, missing, correct };
}

export function noteDiffMessageKey(diff) {
  const hasExtra = diff.extra.length > 0;
  const hasMissing = diff.missing.length > 0;
  const hasCorrect = diff.correct.length > 0;
  if (hasCorrect && hasExtra && hasMissing) return 'live.wrongPartial';
  if (hasExtra && hasMissing) return 'live.wrongExtraMissing';
  if (hasCorrect && hasMissing) return 'live.wrongMissing';
  if (hasExtra) return 'live.wrongExtra';
  return 'live.wrongNote';
}

export function formatNoteDiff(diff, translate) {
  const key = noteDiffMessageKey(diff);
  return translate(key, {
    extra: formatPitchClasses(diff.extra),
    missing: formatPitchClasses(diff.missing),
    correct: formatPitchClasses(diff.correct),
  });
}

/** Wrong-key press vs the target chord, including already-locked correct notes. */
export function describeWrongNote(wrongMidi, lockedCorrectPcs, targetPcs, translate) {
  const played = new Set([...lockedCorrectPcs, wrongMidi % 12]);
  return formatNoteDiff(diffPitchClasses(played, targetPcs), translate);
}
