import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { grievanceAPI, adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';

const DEPARTMENTS = ['All', 'Water', 'Road', 'Electricity', 'Garbage', 'General'];

const DEPT_ICONS = { Water: '💧', Road: '🛣️', Electricity: '⚡', Garbage: '🗑️', General: '📋', All: '🏛️' };

const SENTIMENT_CONFIG = {
  urgent:    { label: 'Urgent',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  angry:     { label: 'Angry',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  frustrated:{ label: 'Frustrated',color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  neutral:   { label: 'Neutral',   color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  positive:  { label: 'Positive',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

function SentimentBadge({ sentiment }) {
  const s = sentiment?.toLowerCase();
  const cfg = SENTIMENT_CONFIG[s] || SENTIMENT_CONFIG.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
      color: cfg.color, background: cfg.bg,
    }}>
      💬 {cfg.label}
    </span>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="glass" style={{ padding: '1.2rem 1.5rem', border: `1px solid ${color}22` }}>
      <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 900, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ComplaintCard({ grievance, onStatusUpdate }) {
  const [updating, setUpdating] = useState(false);
  const { show } = useToast();
  const isUrgent = ['critical', 'high'].includes(grievance.priority) ||
    ['urgent', 'angry'].includes(grievance.sentiment?.toLowerCase());

  const handleStatus = async (status) => {
    setUpdating(true);
    try {
      await grievanceAPI.updateStatus(grievance.ticket_id, { status, note: `Status updated to ${status} by government official` });
      show(`Status → ${status}`, 'success');
      onStatusUpdate();
    } catch (e) {
      show(e.response?.data?.error || 'Update failed', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="glass glass-hover" style={{
      padding: '1.2rem 1.4rem', marginBottom: '0.75rem',
      border: isUrgent ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(255,255,255,0.07)',
      boxShadow: isUrgent ? '0 0 20px rgba(239,68,68,0.1)' : 'none',
      position: 'relative', overflow: 'hidden',
    }}>
      {isUrgent && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: 'rgba(239,68,68,0.15)', padding: '3px 10px',
          borderBottomLeftRadius: 8, fontSize: '0.65rem', fontWeight: 800,
          color: '#ef4444', letterSpacing: '0.05em',
        }}>⚠ URGENT</div>
      )}

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {/* Attachment thumbnail */}
        {grievance.attachment_url ? (
          <img
            src={grievance.attachment_url}
            alt="attachment"
            style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: 10, flexShrink: 0,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>
            {DEPT_ICONS[grievance.department] || '📋'}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#8b5cf6', fontWeight: 700 }}>
              {grievance.ticket_id}
            </span>
            <StatusBadge status={grievance.status} />
            <PriorityBadge priority={grievance.priority} />
            {grievance.sentiment && <SentimentBadge sentiment={grievance.sentiment} />}
          </div>

          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem', marginBottom: 4 }}>
            {grievance.subject}
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 6, lineHeight: 1.5 }}>
            {grievance.description?.slice(0, 120)}{grievance.description?.length > 120 ? '...' : ''}
          </div>

          <div style={{ display: 'flex', gap: '1.2rem', fontSize: '0.75rem', color: '#475569', flexWrap: 'wrap' }}>
            <span>👤 {grievance.customer_name}</span>
            {grievance.customer_phone && <span>📞 {grievance.customer_phone}</span>}
            <span>🏷️ {grievance.category || grievance.department}</span>
            <span>🕐 {new Date(grievance.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Status actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          {grievance.status !== 'in-progress' && (
            <button
              onClick={() => handleStatus('in-progress')} disabled={updating}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.4)',
                background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              🔵 In Progress
            </button>
          )}
          {grievance.status !== 'resolved' && (
            <button
              onClick={() => handleStatus('resolved')} disabled={updating}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.4)',
                background: 'rgba(16,185,129,0.1)', color: '#10b981',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              ✅ Resolved
            </button>
          )}
          {grievance.status !== 'open' && (
            <button
              onClick={() => handleStatus('open')} disabled={updating}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)',
                background: 'rgba(245,158,11,0.08)', color: '#f59e0b',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              🟡 Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GovDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { show } = useToast();
  const [stats, setStats] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [activeTab, setActiveTab] = useState(user?.department || 'All');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // If user has a fixed department, lock the tab
  const isSuperAdmin = !user?.department;
  const availableTabs = isSuperAdmin ? DEPARTMENTS : [user.department];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const dept = activeTab === 'All' ? undefined : activeTab;
      const [statsRes, grievRes] = await Promise.all([
        adminAPI.stats(),
        grievanceAPI.list({ department: dept, status: statusFilter || undefined, priority: priorityFilter || undefined, search: search || undefined, limit: 100 }),
      ]);
      setStats(statsRes.data);
      // Sort: critical first, then high, then by date
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const sorted = [...grievRes.data.grievances].sort((a, b) => {
        const pa = priorityOrder[a.priority] ?? 2;
        const pb = priorityOrder[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setGrievances(sorted);
    } catch {
      show('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, priorityFilter, search]);

  useEffect(() => { loadData(); }, [loadData]);

  // Redirect if not a gov user
  useEffect(() => {
    if (user && !['admin', 'officer'].includes(user.role)) navigate('/home');
    if (!user) navigate('/gov/login');
  }, [user, navigate]);

  const handleLogout = () => { logout(); navigate('/gov/login'); };

  const deptStats = stats?.byDepartment || [];
  const getDeptCount = (dept) => deptStats.find(d => d.department === dept)?.count || 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', backgroundImage: 'radial-gradient(ellipse at top, rgba(99,102,241,0.1) 0%, transparent 60%)' }}>
      {/* Top Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 64,
        background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(99,102,241,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>🏛️</div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>MyVoice Gov</div>
            <div style={{ color: '#6366f1', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' }}>
              {user?.department ? `${user.department} Department` : 'Super Admin'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{user?.name}</div>
            <div style={{ color: '#6366f1', fontSize: 10, fontWeight: 600 }}>ID: {user?.governmentId}</div>
          </div>
          <button onClick={handleLogout} style={{
            padding: '6px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>Logout</button>
        </div>
      </nav>

      <div className="main-content animate-fade">
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f1f5f9', marginBottom: 4 }}>
            Government Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            AI-powered grievance management — complaints auto-segregated by department
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard icon="📋" label="Total" value={stats.total} color="#8b5cf6" />
            <StatCard icon="🟡" label="Open" value={stats.open} color="#f59e0b" />
            <StatCard icon="⏳" label="Pending" value={stats.pending || 0} color="#f97316" />
            <StatCard icon="🔵" label="In Progress" value={stats.inProgress} color="#6366f1" />
            <StatCard icon="✅" label="Resolved" value={stats.resolved} color="#10b981" />
            <StatCard icon="🔴" label="Critical" value={stats.critical} color="#ef4444" />
          </div>
        )}

        {/* Department Tabs */}
        {isSuperAdmin && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {DEPARTMENTS.map(dept => {
              const active = activeTab === dept;
              const count = dept === 'All' ? stats?.total : getDeptCount(dept);
              return (
                <button key={dept} onClick={() => setActiveTab(dept)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 10, fontSize: '0.82rem', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.18s',
                  background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.04)',
                  border: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  color: active ? 'white' : '#64748b',
                  boxShadow: active ? '0 4px 16px rgba(99,102,241,0.3)' : 'none',
                }}>
                  {DEPT_ICONS[dept]} {dept}
                  {count > 0 && (
                    <span style={{
                      background: active ? 'rgba(255,255,255,0.25)' : 'rgba(139,92,246,0.2)',
                      color: active ? 'white' : '#8b5cf6',
                      borderRadius: 20, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 800,
                    }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            placeholder="Search by ID, name, subject..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#f1f5f9', fontSize: '0.85rem', outline: 'none',
            }}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
            padding: '9px 14px', borderRadius: 10, fontSize: '0.85rem',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', outline: 'none',
          }}>
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{
            padding: '9px 14px', borderRadius: 10, fontSize: '0.85rem',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', outline: 'none',
          }}>
            <option value="">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Complaints List */}
        <div>
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 110, borderRadius: 14, marginBottom: 10 }} />
            ))
          ) : grievances.length === 0 ? (
            <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>📭</div>
              <div style={{ fontWeight: 700, color: '#64748b' }}>No complaints found</div>
              <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
                {activeTab !== 'All' ? `No complaints for ${activeTab} department` : 'No complaints match your filters'}
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '0.8rem', fontWeight: 600 }}>
                {grievances.length} complaint{grievances.length !== 1 ? 's' : ''} — sorted by priority
              </div>
              {grievances.map(g => (
                <ComplaintCard key={g.id} grievance={g} onStatusUpdate={loadData} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
