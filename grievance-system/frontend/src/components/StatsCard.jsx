export default function StatsCard({ icon, label, value, color = '#8b5cf6', trend }) {
  return (
    <div className="glass glass-hover rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: `${color}18` }}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ color: trend >= 0 ? '#10b981' : '#ef4444', background: trend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value ?? '—'}</div>
      <div className="text-xs font-medium" style={{ color: '#64748b' }}>{label}</div>
    </div>
  );
}
