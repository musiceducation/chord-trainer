export function ChoiceButtons({
  choices,
  disabled = false,
  wrongId = null,
  hintId = null,
  columns = 3,
  onChoose,
  getId,
  getLabel,
  ariaLabel,
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap justify-center gap-2 px-3 w-full"
    >
      {choices.map((choice) => {
        const id = getId(choice);
        const wrong = wrongId === id;
        const hinted = hintId === id;
        return (
          <button
            key={String(id)}
            type="button"
            disabled={disabled}
            onClick={() => onChoose(choice)}
            className="py-3 px-2 rounded-xl text-sm font-semibold touch-none active:scale-[0.98] disabled:opacity-40"
            style={{
              flex: `1 1 ${columns === 2 ? '42%' : '30%'}`,
              maxWidth: columns === 2 ? '48%' : '32%',
              background: wrong
                ? 'rgba(247,118,142,0.18)'
                : hinted
                  ? 'rgba(255,215,130,0.16)'
                  : 'rgba(187,154,247,0.1)',
              border: `1px solid ${wrong ? 'rgba(247,118,142,0.55)' : hinted ? 'rgba(255,215,130,0.55)' : 'rgba(187,154,247,0.35)'}`,
              color: wrong ? '#FECACA' : hinted ? '#FDE68A' : '#F0E9FF',
            }}
          >
            <span className="display-font text-lg leading-none">{getLabel(choice)}</span>
          </button>
        );
      })}
    </div>
  );
}
