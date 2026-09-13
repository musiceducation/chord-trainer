export function GuideOverlay({
  open,
  title,
  lead,
  items,
  ctaLabel,
  onCta,
  onSkip,
  skipLabel,
  secondaryLabel,
  onSecondary,
}) {
  if (!open) return null;

  return (
    <div
      className="guide-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
    >
      {onSkip && (
        <button type="button" className="guide-skip" onClick={onSkip}>
          {skipLabel}
        </button>
      )}
      <div className="guide-card panel-solid">
        <h2 id="guide-title" className="display-font text-3xl font-black text-slate-100 mb-3 tracking-tight">
          {title}
        </h2>
        {lead && <p className="text-sm text-slate-300 leading-relaxed mb-4">{lead}</p>}
        {items?.length > 0 && (
          <ul className="space-y-2 mb-5">
            {items.map((item) => (
              <li key={item} className="text-sm text-slate-300 leading-relaxed pl-3 border-l-2 border-blue-400/40">
                {item}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2">
          <button type="button" className="guide-cta touch-none active:scale-[0.98]" onClick={onCta}>
            {ctaLabel}
          </button>
          {onSecondary && (
            <button type="button" className="guide-secondary touch-none active:scale-[0.98]" onClick={onSecondary}>
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
