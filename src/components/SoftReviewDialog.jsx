export function SoftReviewDialog({
  open,
  title,
  message,
  yesLabel,
  noLabel,
  closeLabel = 'Close dialog',
  onYes,
  onNo,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="soft-review-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label={closeLabel}
        onClick={onNo}
      />
      <div className="relative w-full max-w-sm rounded-2xl p-5 panel-solid">
        <h2 id="soft-review-title" className="text-base font-semibold text-slate-100 mb-2">{title}</h2>
        <p className="text-sm text-slate-400 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-secondary" onClick={onNo}>{noLabel}</button>
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm font-semibold touch-none active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(122,162,247,0.35), rgba(187,154,247,0.25))',
              border: '1px solid rgba(122,162,247,0.5)',
              color: '#E8EEFF',
            }}
            onClick={onYes}
          >
            {yesLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
