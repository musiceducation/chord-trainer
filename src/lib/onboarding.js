import { questionFromSpec } from './chords.js';

export const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  IDENTIFY: 'identify',
  CELEBRATE: 'celebrate',
  TRAIN: 'train',
  PERFECT: 'perfect',
};

export const ONBOARDING_IDENTIFY_CHORD = { root: 'C', type: '' };
export const ONBOARDING_TRAIN_CHORD = { root: 'C', type: '' };

export const BEGINNER_PACK = [
  { mode: 'test', root: 'C', type: '' },
  { mode: 'test', root: 'G', type: '' },
  { mode: 'test', root: 'A', type: 'm' },
  { mode: 'ear', root: 'C', type: '' },
  { mode: 'ear', root: 'G', type: '' },
];

export function initialGuideState(onboardingDone, { shotActive = false } = {}) {
  if (shotActive) return null;
  if (onboardingDone === true) return null;
  return { kind: 'onboarding', step: ONBOARDING_STEPS.WELCOME };
}

export function tabForOnboardingStep(step) {
  if (step === ONBOARDING_STEPS.TRAIN) return 'ear';
  return 'test';
}

export function tabForPackIndex(index) {
  return BEGINNER_PACK[index]?.mode || 'test';
}

export function packQuestionAt(index) {
  const spec = BEGINNER_PACK[index];
  if (!spec) return null;
  return questionFromSpec(spec.root, spec.type);
}

export function isOnboardingPractice(guide) {
  return guide?.kind === 'onboarding'
    && (guide.step === ONBOARDING_STEPS.IDENTIFY || guide.step === ONBOARDING_STEPS.TRAIN);
}

export function isGuideOverlayStep(guide) {
  if (!guide) return false;
  if (guide.kind === 'packDone') return true;
  return guide.kind === 'onboarding' && (
    guide.step === ONBOARDING_STEPS.WELCOME
    || guide.step === ONBOARDING_STEPS.CELEBRATE
    || guide.step === ONBOARDING_STEPS.PERFECT
  );
}

export function tabsLocked(guide) {
  return isOnboardingPractice(guide) || guide?.kind === 'pack';
}

export function identifyPracticeSpec(guide) {
  if (guide?.kind === 'onboarding' && guide.step === ONBOARDING_STEPS.IDENTIFY) {
    return ONBOARDING_IDENTIFY_CHORD;
  }
  if (guide?.kind === 'pack') {
    const spec = BEGINNER_PACK[guide.index];
    return spec?.mode === 'test' ? spec : null;
  }
  return null;
}

export function earPracticeSpec(guide) {
  if (guide?.kind === 'onboarding' && guide.step === ONBOARDING_STEPS.TRAIN) {
    return ONBOARDING_TRAIN_CHORD;
  }
  if (guide?.kind === 'pack') {
    const spec = BEGINNER_PACK[guide.index];
    return spec?.mode === 'ear' ? spec : null;
  }
  return null;
}

export function markFirstHintUsed(settings, mode) {
  return {
    ...settings.firstHintUsed,
    [mode]: true,
  };
}
