export function StatCard({ icon, label, value, accent }) {
  const colors = {
    emerald: 'rgba(122,220,200,0.15)',
    blue: 'rgba(122,162,247,0.15)',
    orange: 'rgba(251,146,60,0.15)',
    purple: 'rgba(187,154,247,0.15)',
  };
  return (
    <div className="p-3 rounded-2xl panel-soft" style={{ border: `1px solid ${colors[accent]}` }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="display-font text-3xl font-black tabular-nums text-slate-100">{value}</div>
    </div>
  );
}
