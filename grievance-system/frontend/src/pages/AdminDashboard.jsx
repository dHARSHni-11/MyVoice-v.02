import { useState, useEffect } from 'react';
import { grievanceAPI, adminAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import StatsCard from '../components/StatsCard';
import TicketCard from '../components/TicketCard';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import Timeline from '../components/Timeline';
import AIResponsePanel from '../components/AIResponsePanel';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const PIE_COLORS = ['#8b5cf6', '#6366f1', '#10b981', '#f59e0b', '#ef4444'];

const CHART_STYLE = {
  tooltip: { contentStyle: { background: '#0f0f1a', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 } },
  axis: { tick: { fill: '#475569', fontSize: 11 } },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' });
  const [noteText, setNoteText] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const { show } = useToast();

  useEffect(() => {
    adminAPI.stats().then(r => setStats(r.data)).catch(() => {});
    adminAPI.officers().then(r => setOfficers(r.data.officers)).catch(() => {});
    loadGrievances();
  }, []);

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

  const assignOfficer = async (officerId) => {
    if (!selected) return;
    try {
      await grievanceAPI.assign(selected.ticket_id, { officerId });
      show('Officer assigned', 'success');
      loadGrievances(filters);
    } catch (e) { show(e.response?.data?.error || 'Failed', 'error'); }
  };

  const addNote = async () => {
    if (!noteText.trim() || !selected) return;
    try {
      await grievanceAPI.addNote(selected.ticket_id, { note: noteText });
      setNoteText('');
      show('Note added', 'success');
      const res = await grievanceAPI.getById(selected.ticket_id);
      setDetail(res.data);
    } catch (e) { show(e.response?.data?.error || 'Failed', 'error'); }
  };

  const handleExport = async () => {
    try {
      const res = await adminAPI.export();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'grievances.csv'; a.click();
    } catch { show('Export failed', 'error'); }
  };

  const applyFilters = (newF) => {
    const f = { ...filters, ...newF }; setFilters(f); loadGrievances(f);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto" style={{ paddingRight: selected ? 0 : 0 }}>
        <div className="main-content animate-fade">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black text-white">Admin Dashboard</h1>
              <p className="text-sm mt-1" style={{ color: '#64748b' }}>System overview and grievance management</p>
            </div>
            <button onClick={handleExport}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
              📥 Export CSV
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {['overview', 'grievances'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className="px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
                style={activeTab === t ? { background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: 'white' } : { color: '#64748b' }}>
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <>
              {/* Stats */}
              {stats ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                  <StatsCard icon="📋" label="Total" value={stats.total} color="#8b5cf6" />
                  <StatsCard icon="🟡" label="Open" value={stats.open} color="#f59e0b" />
                  <StatsCard icon="🔵" label="In Progress" value={stats.inProgress} color="#6366f1" />
                  <StatsCard icon="✅" label="Resolved" value={stats.resolved} color="#10b981" />
                  <StatsCard icon="🔴" label="Critical" value={stats.critical} color="#ef4444" />
                  <StatsCard icon="⏱️" label="Avg Hrs" value={stats.avgResolutionHours} color="#06b6d4" />
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-4 mb-6">
                  {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
                </div>
              )}

              {/* Charts */}
              {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  <div className="lg:col-span-2 glass rounded-2xl p-5" style={{ border: '1px solid rgba(139,92,246,0.1)' }}>
                    <h3 className="text-sm font-bold text-white mb-4">Grievances by Category</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={stats.byCategory}>
                        <XAxis dataKey="category" {...CHART_STYLE.axis} />
                        <YAxis {...CHART_STYLE.axis} />
                        <Tooltip {...CHART_STYLE.tooltip} />
                        <Bar dataKey="count" fill="url(#barGrad)" radius={[4,4,0,0]} />
                        <defs>
                          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(139,92,246,0.1)' }}>
                    <h3 className="text-sm font-bold text-white mb-4">By Status</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={stats.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                          {stats.byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip {...CHART_STYLE.tooltip} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {stats?.byDay?.length > 0 && (
                <div className="glass rounded-2xl p-5 mb-6" style={{ border: '1px solid rgba(139,92,246,0.1)' }}>
                  <h3 className="text-sm font-bold text-white mb-4">Last 30 Days</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={stats.byDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="day" {...CHART_STYLE.axis} tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                      <YAxis {...CHART_STYLE.axis} />
                      <Tooltip {...CHART_STYLE.tooltip} />
                      <defs>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                      <Line type="monotone" dataKey="count" stroke="url(#lineGrad)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {activeTab === 'grievances' && (
            <>
              {/* Filters */}
              <div className="flex gap-3 mb-4 flex-wrap">
                <input placeholder="Search by ID, name, subject..."
                  value={filters.search} onChange={e => applyFilters({ search: e.target.value })}
                  className="flex-1 min-w-48 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9' }} />
                {[
                  { key: 'status', opts: ['open', 'in-progress', 'resolved', 'closed'], label: 'Status' },
                  { key: 'priority', opts: ['low', 'medium', 'high', 'critical'], label: 'Priority' },
                ].map(({ key, opts, label }) => (
                  <select key={key} value={filters[key]} onChange={e => applyFilters({ [key]: e.target.value })}
                    className="px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                    <option value="">All {label}</option>
                    {opts.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                  </select>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {grievances.length === 0
                  ? <div className="glass rounded-xl p-8 text-center text-sm" style={{ color: '#475569' }}>No grievances found.</div>
                  : grievances.map(t => <TicketCard key={t.id} ticket={t} selected={selected?.id === t.id} onClick={() => openDetail(t)} />)
                }
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail panel */}
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
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}>✕</button>
              </div>

              <div className="flex gap-2 mb-4">
                <StatusBadge status={selected.status} />
                <PriorityBadge priority={selected.priority} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ['Customer', detail.grievance.customer_name],
                  ['Email', detail.grievance.customer_email],
                  ['Category', detail.grievance.category || '—'],
                  ['Submitted', new Date(detail.grievance.created_at).toLocaleDateString()],
                ].map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>{k}</div>
                    <div className="text-sm text-white font-medium truncate">{v}</div>
                  </div>
                ))}
              </div>

              {/* Status actions */}
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

              {/* Assign officer */}
              <select onChange={e => e.target.value && assignOfficer(e.target.value)} defaultValue=""
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-4"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                <option value="">Assign to officer...</option>
                {officers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>

              <AIResponsePanel grievance={detail.grievance} initialResponse={detail.grievance.ai_response} />

              {/* Notes */}
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
                    placeholder="Add internal note..."
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9' }} />
                  <button onClick={addNote}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>Add</button>
                </div>
              </div>

              {/* Timeline */}
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
