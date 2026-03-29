const PRIORITY_CONFIG = {
  low: { label: 'Low', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  high: { label: 'High', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  critical: { label: 'Critical', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
};

export default function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}>
      ▲ {cfg.label}
    </span>
  );
}
