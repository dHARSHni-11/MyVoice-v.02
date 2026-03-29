import { useState, useEffect } from 'react';
import { grievanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TicketCard from '../components/TicketCard';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import Timeline from '../components/Timeline';
import AIResponsePanel from '../components/AIResponsePanel';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfficerView() {
  const { user } = useAuth();
  const [grievances, setGrievances] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '' });
  const { show } = useToast();

  useEffect(() => { loadGrievances(); }, []);

  const loadGrievances = async (f = {}) => {
    try { const res = await grievanceAPI.list(f); setGrievances(res.data.grievances); } catch {}
  };

  const openDetail = async (ticket) => {
    setSelected(ticket);
    try { const res = await grievanceAPI.getById(ticket.ticket_id); setDetail(res.data); } catch {}
  };

  const updateStatus = async (status) => {
    if (!selected) return;
    try {
      await grievanceAPI.updateStatus(selected.ticket_id, { status, note: `Status updated to ${status}` });
      show(`Status → ${status}`, 'success');
      loadGrievances(filters);
      const res = await grievanceAPI.getById(selected.ticket_id);
      setDetail(res.data); setSelected(res.data.grievance);
    } catch (e) { show(e.response?.data?.error || 'Failed', 'error'); }
  };

  const addNote = async () => {
    if (!noteText.trim() || !selected) return;
    try {
      await grievanceAPI.addNote(selected.ticket_id, { note: noteText });
      setNoteText(''); show('Note added', 'success');
      const res = await grievanceAPI.getById(selected.ticket_id);
      setDetail(res.data);
    } catch (e) { show(e.response?.data?.error || 'Failed', 'error'); }
  };

  const applyFilters = (newF) => {
    const f = { ...filters, ...newF }; setFilters(f); loadGrievances(f);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="main-content animate-fade">
          <div className="mb-6">
            <h1 className="text-3xl font-black text-white">My Assigned Tickets</h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Welcome, {user?.name}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Assigned', value: grievances.length, color: '#8b5cf6' },
              { label: 'Open', value: grievances.filter(g => g.status === 'open').length, color: '#f59e0b' },
              { label: 'Resolved', value: grievances.filter(g => g.status === 'resolved').length, color: '#10b981' },
            ].map(s => (
              <div key={s.label} className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs" style={{ color: '#475569' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <input placeholder="Search tickets..." value={filters.search}
              onChange={e => applyFilters({ search: e.target.value })}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9' }} />
            <select value={filters.status} onChange={e => applyFilters({ status: e.target.value })}
              className="px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
              <option value="">All Status</option>
              {['open', 'in-progress', 'resolved', 'closed'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            {grievances.length === 0
              ? <div className="glass rounded-xl p-8 text-center text-sm" style={{ color: '#475569' }}>No tickets assigned yet.</div>
              : grievances.map(t => <TicketCard key={t.id} ticket={t} selected={selected?.id === t.id} onClick={() => openDetail(t)} />)
            }
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && detail && (
          <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
            className="w-[420px] flex-shrink-0 overflow-y-auto border-l"
            style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)', borderColor: 'rgba(139,92,246,0.15)' }}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-mono text-xs mb-1" style={{ color: '#8b5cf6' }}>{selected.ticket_id}</div>
                  <h3 className="text-base font-bold text-white">{selected.subject}</h3>
                </div>
                <button onClick={() => { setSelected(null); setDetail(null); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}>✕</button>
              </div>

              <div className="flex gap-2 mb-4">
                <StatusBadge status={selected.status} />
                <PriorityBadge priority={selected.priority} />
              </div>

              <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>Description</div>
                <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{detail.grievance.description}</p>
              </div>

              <div className="flex gap-2 mb-4 flex-wrap">
                {['in-progress', 'resolved', 'closed'].map(s => (
                  <button key={s} onClick={() => updateStatus(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                    style={s === 'resolved'
                      ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                      : s === 'in-progress'
                      ? { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
                      : { background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {s}
                  </button>
                ))}
              </div>

              <AIResponsePanel grievance={detail.grievance} initialResponse={detail.grievance.ai_response} />

              <div className="mt-4">
                <h4 className="text-sm font-bold text-white mb-3">Internal Notes</h4>
                {detail.notes?.map(n => (
                  <div key={n.id} className="p-3 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-xs mb-1" style={{ color: '#475569' }}>{n.author_name} · {new Date(n.created_at).toLocaleString()}</div>
                    <div className="text-sm" style={{ color: '#94a3b8' }}>{n.note}</div>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input value={noteText} onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addNote()}
                    placeholder="Add note..."
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9' }} />
                  <button onClick={addNote}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>Add</button>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-bold text-white mb-3">Timeline</h4>
                <Timeline items={detail.timeline} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
