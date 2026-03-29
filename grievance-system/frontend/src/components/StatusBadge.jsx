const STATUS_CONFIG = {
  open: { label: 'Open', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: '#f59e0b' },
  'in-progress': { label: 'In Progress', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', dot: '#6366f1' },
  resolved: { label: 'Resolved', color: '#10b981', bg: 'rgba(16,185,129,0.12)', dot: '#10b981' },
  closed: { label: 'Closed', color: '#64748b', bg: 'rgba(100,116,139,0.12)', dot: '#64748b' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}
