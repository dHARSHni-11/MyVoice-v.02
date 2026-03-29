const STATUS_COLORS = {
  open: '#f59e0b',
  'in-progress': '#6366f1',
  resolved: '#10b981',
  closed: '#64748b',
};

export default function Timeline({ items = [] }) {
  if (!items.length) return <p className="text-sm" style={{ color: '#475569' }}>No timeline events yet.</p>;
  return (
    <div className="flex flex-col gap-0">
      {items.map((item, i) => (
        <div key={item.id || i} className="flex gap-4 relative pb-5 last:pb-0">
          {i < items.length - 1 && (
            <div className="absolute left-[7px] top-4 bottom-0 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          )}
          <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1 ring-2 ring-offset-2"
            style={{
              background: STATUS_COLORS[item.status] || '#8b5cf6',
              ringColor: STATUS_COLORS[item.status] || '#8b5cf6',
              boxShadow: `0 0 8px ${STATUS_COLORS[item.status] || '#8b5cf6'}60`,
              ringOffsetColor: '#0a0a0f',
            }} />
          <div>
            <div className="text-sm font-medium text-white">{item.note}</div>
            <div className="text-xs mt-0.5" style={{ color: '#475569' }}>
              {item.author_name && <span className="mr-2">{item.author_name} ·</span>}
              {new Date(item.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
