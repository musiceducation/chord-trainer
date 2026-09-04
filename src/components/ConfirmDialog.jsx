export function ConfirmDialog({
  open, title, message, confirmLabel, cancelLabel, closeLabel = 'Close dialog', onConfirm, onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label={closeLabel}
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm rounded-2xl p-5 panel-solid">
        <h2 id="confirm-title" className="text-base font-semibold text-slate-100 mb-2">{title}</h2>
        <p className="text-sm text-slate-400 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
