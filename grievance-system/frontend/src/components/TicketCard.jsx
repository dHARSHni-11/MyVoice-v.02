import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';

export default function TicketCard({ ticket, onClick, selected }) {
  return (
    <div onClick={onClick}
      className="glass glass-hover cursor-pointer p-4 rounded-xl transition-all"
      style={{
        borderColor: selected ? 'rgba(139,92,246,0.5)' : undefined,
        boxShadow: selected ? '0 0 0 1px rgba(139,92,246,0.3), 0 4px 24px rgba(139,92,246,0.1)' : undefined,
      }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs mb-1" style={{ color: '#8b5cf6' }}>{ticket.ticket_id}</div>
          <div className="font-semibold text-sm text-white truncate mb-2">{ticket.subject}</div>
          <div className="flex items-center gap-3 text-xs" style={{ color: '#64748b' }}>
            <span>{ticket.customer_name}</span>
            {ticket.category && <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>{ticket.category}</span>}
            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>
    </div>
  );
}
