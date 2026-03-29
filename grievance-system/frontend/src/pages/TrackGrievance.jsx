import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { grievanceAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { key: 'open', label: 'Reported', icon: '📝', desc: 'Complaint received' },
  { key: 'in-progress', label: 'Assigned', icon: '👤', desc: 'Officer assigned' },
  { key: 'in-progress', label: 'In Progress', icon: '🔧', desc: 'Being resolved' },
  { key: 'resolved', label: 'Resolved', icon: '✅', desc: 'Issue fixed' },
];

const STATUS_STEP = { open: 0, 'in-progress': 2, resolved: 3, closed: 3 };

export default function TrackGrievance() {
  const [searchParams] = useSearchParams();
  const [ticketId, setTicketId] = useState(searchParams.get('id') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const search = async (id) => {
    const tid = id || ticketId;
    if (!tid.trim()) return;
    setLoading(true);
    try {
      const res = await grievanceAPI.getById(tid.trim());
      setResult(res.data);
    } catch (err) {
      show(err.response?.data?.error || 'Grievance not found', 'error');
      setResult(null);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) { setTicketId(id); search(id); }
  }, []);

  const currentStep = result ? STATUS_STEP[result.grievance.status] ?? 0 : -1;
  const progress = result ? ((currentStep + 1) / STEPS.length) * 100 : 0;

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', minHeight: 'calc(100vh - 64px)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: 'white', marginBottom: 8 }}>Track Complaint</h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>Enter your Ticket ID to view real-time status and timeline</p>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 24, padding: '24px 28px', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <input value={ticketId} onChange={e => setTicketId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Enter Ticket ID (e.g. GRV-ABC123-XY12)"
              style={{ flex: 1, padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: 14, outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#8b5cf6'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => search()} disabled={loading}
              style={{ padding: '14px 28px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: 'white', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 20px rgba(139,92,246,0.4)', whiteSpace: 'nowrap' }}>
              {loading ? '⏳' : '🔍 Track'}
            </motion.button>
          </div>
        </motion.div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Status card */}
              <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 24, padding: '28px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#8b5cf6', fontWeight: 700, marginBottom: 6 }}>{result.grievance.ticket_id}</div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 10 }}>{result.grievance.subject}</h2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <StatusBadge status={result.grievance.status} />
                      <PriorityBadge priority={result.grievance.priority} />
                      {result.grievance.category && (
                        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.12)' }}>{result.grievance.category}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => window.print()} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>🖨️ Print</button>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Progress</span>
                    <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700 }}>{Math.round(progress)}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 8, background: 'linear-gradient(90deg,#8b5cf6,#ec4899)' }} />
                  </div>
                </div>

                {/* Timeline steps */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                  {STEPS.map((step, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      {/* Connector line */}
                      {i < STEPS.length - 1 && (
                        <div style={{ position: 'absolute', top: 20, left: '50%', width: '100%', height: 2, background: i < currentStep ? 'linear-gradient(90deg,#8b5cf6,#6366f1)' : 'rgba(255,255,255,0.06)', zIndex: 0 }} />
                      )}
                      {/* Circle */}
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.15 }}
                        style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, zIndex: 1, position: 'relative', marginBottom: 10, transition: 'all 0.3s',
                          background: i <= currentStep ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'rgba(255,255,255,0.06)',
                          boxShadow: i <= currentStep ? '0 0 16px rgba(139,92,246,0.5)' : 'none',
                          border: i === currentStep ? '2px solid #a78bfa' : '2px solid transparent',
                        }}>
                        {i < currentStep ? '✓' : step.icon}
                      </motion.div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: i <= currentStep ? '#a78bfa' : '#475569', marginBottom: 2 }}>{step.label}</div>
                        <div style={{ fontSize: 10, color: '#334155' }}>{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  ['👤 Customer', result.grievance.customer_name],
                  ['🏛️ Assigned To', result.grievance.assigned_officer_name || 'Unassigned'],
                  ['📅 Submitted', new Date(result.grievance.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })],
                  ['⏱️ SLA', result.sla?.breached ? '⚠️ Breached' : `✅ ${result.sla?.hoursRemaining?.toFixed(1)}h remaining`],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              {result.grievance.description && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '20px 24px', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Description</div>
                  <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7 }}>{result.grievance.description}</p>
                </div>
              )}

              {/* Timeline */}
              {result.timeline?.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 24, padding: '24px 28px' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 20 }}>Activity Timeline</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {result.timeline.map((item, i) => (
                      <div key={item.id || i} style={{ display: 'flex', gap: 16, paddingBottom: i < result.timeline.length - 1 ? 20 : 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                            {item.action?.includes('resolved') ? '✅' : item.action?.includes('assigned') ? '👤' : item.action?.includes('progress') ? '🔧' : '📝'}
                          </div>
                          {i < result.timeline.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(139,92,246,0.15)', marginTop: 4 }} />}
                        </div>
                        <div style={{ paddingTop: 4, paddingBottom: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 2 }}>{item.action || item.note}</div>
                          <div style={{ fontSize: 11, color: '#475569' }}>{item.author_name || 'System'} · {new Date(item.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { open: ['#f59e0b', 'rgba(245,158,11,0.12)'], 'in-progress': ['#6366f1', 'rgba(99,102,241,0.12)'], resolved: ['#10b981', 'rgba(16,185,129,0.12)'], closed: ['#64748b', 'rgba(100,116,139,0.12)'] };
  const [c, bg] = map[status] || map.open;
  return <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: c, background: bg, textTransform: 'capitalize' }}>{status}</span>;
}

function PriorityBadge({ priority }) {
  const map = { low: ['#10b981', 'rgba(16,185,129,0.12)'], medium: ['#f59e0b', 'rgba(245,158,11,0.12)'], high: ['#ef4444', 'rgba(239,68,68,0.12)'], critical: ['#ec4899', 'rgba(236,72,153,0.12)'] };
  const [c, bg] = map[priority] || map.medium;
  return <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: c, background: bg, textTransform: 'capitalize' }}>{priority}</span>;
}
