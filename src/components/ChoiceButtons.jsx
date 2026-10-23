export function ChoiceButtons({
  choices,
  disabled = false,
  wrongId = null,
  hintId = null,
  correctId = null,
  columns = 3,
  onChoose,
  getId,
  getKey,
  getLabel,
  ariaLabel,
  testIdFor,
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap justify-center gap-2 px-3 pb-2 w-full"
    >
      {choices.map((choice) => {
        const id = getId(choice);
        const wrong = wrongId === id;
        const hinted = hintId === id;
        const correct = correctId === id;
        return (
          <button
            key={getKey ? getKey(choice) : String(id)}
            type="button"
            data-testid={testIdFor ? testIdFor(choice) : undefined}
            disabled={disabled}
            onClick={() => onChoose(choice)}
            className="py-3 px-2 rounded-xl text-sm font-semibold touch-none active:scale-[0.98] disabled:opacity-40"
            style={{
              flex: `1 1 ${columns === 2 ? '42%' : '30%'}`,
              maxWidth: columns === 2 ? '48%' : '32%',
              background: correct
                ? 'rgba(122,220,200,0.22)'
                : wrong
                  ? 'rgba(247,118,142,0.18)'
                  : hinted
                    ? 'rgba(255,215,130,0.16)'
                    : 'rgba(187,154,247,0.1)',
              border: `1px solid ${correct ? 'rgba(122,220,200,0.6)' : wrong ? 'rgba(247,118,142,0.55)' : hinted ? 'rgba(255,215,130,0.55)' : 'rgba(187,154,247,0.35)'}`,
              color: correct ? '#D1FAF4' : wrong ? '#FECACA' : hinted ? '#FDE68A' : '#F0E9FF',
            }}
          >
            <span className="display-font text-lg leading-none">{getLabel(choice)}</span>
          </button>
        );
      })}
    </div>
  );
}
