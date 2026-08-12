export function AudioUnlockOverlay({ onUnlock }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070912]/95 p-6">
      <div className="max-w-sm text-center">
        <h1 className="display-font text-3xl font-black text-slate-100 mb-3">Chord Trainer</h1>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          輕觸開始以啟用鋼琴音效。所有練習進度僅儲存在本機裝置。
        </p>
        <button
          type="button"
          className="w-full py-3.5 rounded-2xl font-semibold text-slate-900 bg-gradient-to-r from-emerald-200 to-teal-300 active:scale-[0.98] transition-transform touch-none"
          onClick={onUnlock}
        >
          開始練習
        </button>
      </div>
    </div>
  );
}
