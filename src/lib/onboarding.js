export const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  IDENTIFY: 'identify',
  CELEBRATE: 'celebrate',
  TRAIN: 'train',
  PERFECT: 'perfect',
};

export const ONBOARDING_IDENTIFY_CHORD = { root: 'C', type: '' };
export const ONBOARDING_TRAIN_CHORD = { root: 'C', type: '' };

export function initialGuideState(onboardingDone, { shotActive = false } = {}) {
  if (shotActive) return null;
  if (onboardingDone === true) return null;
  // Land on the first playable chord. Welcome / celebrate / ready overlays stay
  // available for an explicit replay, but they do not gate the first loop.
  return { kind: 'onboarding', step: ONBOARDING_STEPS.IDENTIFY };
}

export function tabForOnboardingStep(step) {
  if (step === ONBOARDING_STEPS.TRAIN) return 'ear';
  return 'test';
}

export function isOnboardingPractice(guide) {
  return guide?.kind === 'onboarding'
    && (guide.step === ONBOARDING_STEPS.IDENTIFY || guide.step === ONBOARDING_STEPS.TRAIN);
}

export function isGuideOverlayStep(guide) {
  if (!guide) return false;
  return guide.kind === 'onboarding' && (
    guide.step === ONBOARDING_STEPS.WELCOME
    || guide.step === ONBOARDING_STEPS.CELEBRATE
    || guide.step === ONBOARDING_STEPS.PERFECT
  );
}

export function tabsLocked(guide) {
  return isOnboardingPractice(guide);
}

export function identifyPracticeSpec(guide) {
  if (guide?.kind === 'onboarding' && (
    guide.step === ONBOARDING_STEPS.IDENTIFY
    || guide.step === ONBOARDING_STEPS.CELEBRATE
  )) {
    return ONBOARDING_IDENTIFY_CHORD;
  }
  return null;
}

export function earPracticeSpec(guide) {
  if (guide?.kind === 'onboarding' && (
    guide.step === ONBOARDING_STEPS.TRAIN
    || guide.step === ONBOARDING_STEPS.PERFECT
  )) {
    return ONBOARDING_TRAIN_CHORD;
  }
  return null;
}

export function markFirstHintUsed(settings, mode) {
  return {
    ...settings.firstHintUsed,
    [mode]: true,
  };
}
