import { DIFFICULTY_LEVELS } from '../lib/constants.js';
import { useI18n } from '../hooks/useI18n.jsx';

function difficultyStyle(active) {
  return {
    background: active
      ? 'linear-gradient(135deg, rgba(122,162,247,0.25), rgba(122,162,247,0.1))'
      : 'rgba(255,255,255,0.02)',
    border: `1px solid ${active ? 'rgba(122,162,247,0.5)' : 'rgba(255,255,255,0.05)'}`,
    color: active ? '#C0CAF5' : '#565F89',
    fontWeight: active ? 700 : 500,
  };
}

function inversionStyle(active) {
  return {
    background: active ? 'rgba(187,154,247,0.18)' : 'rgba(255,255,255,0.02)',
    border: `1px solid ${active ? 'rgba(187,154,247,0.5)' : 'rgba(255,255,255,0.05)'}`,
    color: active ? '#E0D4FF' : '#565F89',
  };
}

/**
 * Triad / 7th / extended / mix, on the same row as the inversion toggle
 * for modes that have one. Every tier is free — this row never locks a level.
 */
export function PracticeSetupRow({
  difficulty,
  onDifficultyChange,
  inversions = false,
  onInversionsChange,
  inversionLabel,
}) {
  const { t } = useI18n();
  const showDifficulty = typeof onDifficultyChange === 'function';
  const showInversions = typeof onInversionsChange === 'function';
  if (!showDifficulty && !showInversions) return null;

  return (
    <div
      className="flex flex-wrap justify-center gap-1.5 mb-1 px-1"
      role="group"
      aria-label={t('settings.difficulty')}
      data-testid="practice-setup-row"
    >
      {showDifficulty && Object.keys(DIFFICULTY_LEVELS).map((key) => {
        const active = difficulty === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            data-testid={`difficulty-${key}`}
            onClick={() => onDifficultyChange(key)}
            className="px-3 py-1 rounded-full text-xs font-semibold touch-none active:scale-[0.98]"
            style={difficultyStyle(active)}
          >
            {t(`difficulty.${key}`)}
          </button>
        );
      })}
      {showInversions && (
        <button
          type="button"
          aria-pressed={Boolean(inversions)}
          data-testid="inversion-toggle"
          onClick={() => onInversionsChange(!inversions)}
          className="px-3 py-1 rounded-full text-xs font-semibold touch-none active:scale-[0.98]"
          style={inversionStyle(Boolean(inversions))}
        >
          {inversionLabel || t('identify.inversions')}
        </button>
      )}
    </div>
  );
}
