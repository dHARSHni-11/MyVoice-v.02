import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { grievanceAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../components/Toast';

export default function Profile() {
  const { user, logout } = useAuth();
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ language: 'English', notifications: true, emailUpdates: true });
  const navigate = useNavigate();
  const location = useLocation();
  const { show } = useToast();

  const fetchGrievances = useCallback(() => {
    setLoading(true);
    grievanceAPI.list({ limit: 50 })
      .then(r => setGrievances(r.data.grievances || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchGrievances();
  }, [fetchGrievances, location.key]);

  const stats = {
    total: grievances.length,
    resolved: grievances.filter(g => g.status === 'resolved').length,
    pending: grievances.filter(g => g.status === 'open' || g.status === 'in-progress').length,
  };

  if (!user) { navigate('/login'); return null; }

  return (
    <div style={{ minHeight: '100vh', padding: '2.5rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 760, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Profile Header */}
        <div className="glass" style={{ borderRadius: 20, padding: '2rem', border: '1px solid rgba(139,92,246,0.2)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.15),transparent)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 900, color: 'white', flexShrink: 0 }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f1f5f9', margin: 0 }}>{user.name}</h1>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '4px 0 10px' }}>{user.email}</p>
              <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                {user.role}
              </span>
            </div>
            <button
              onClick={fetchGrievances}
              title="Refresh"
              style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Total Filed', value: stats.total, color: '#8b5cf6', icon: '📋' },
            { label: 'Resolved', value: stats.resolved, color: '#10b981', icon: '✅' },
            { label: 'Pending', value: stats.pending, color: '#f59e0b', icon: '⏳' },
          ].map(s => (
            <div key={s.label} className="glass" style={{ borderRadius: 16, padding: '1.5rem 1rem', textAlign: 'center', border: `1px solid ${s.color}22` }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 6, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="glass" style={{ borderRadius: 20, padding: '1.5rem', border: '1px solid rgba(139,92,246,0.15)' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/submit')}
              style={{ flex: '1 1 160px', padding: '14px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              ✍️ New Complaint
            </button>
            <button onClick={() => navigate('/track')}
              style={{ flex: '1 1 160px', padding: '14px 20px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10b981', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              🔍 Track Complaint
            </button>
            <button onClick={() => { logout(); navigate('/login'); }}
              style={{ flex: '1 1 160px', padding: '14px 20px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              🚪 Sign Out
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="glass" style={{ borderRadius: 20, padding: '1.5rem', border: '1px solid rgba(139,92,246,0.15)' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Settings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0' }}>Language</div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>Interface language</div>
              </div>
              <select value={settings.language} onChange={e => setSettings(s => ({ ...s, language: e.target.value }))}
                style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.8rem', outline: 'none' }}>
                {['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            {[
              { key: 'notifications', label: 'Push Notifications', desc: 'Get notified on status changes' },
              { key: 'emailUpdates', label: 'Email Updates', desc: 'Receive email on every update' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0' }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>{desc}</div>
                </div>
                <button onClick={() => setSettings(s => ({ ...s, [key]: !s[key] }))}
                  style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', background: settings[key] ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'rgba(255,255,255,0.1)' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 4, transition: 'left 0.2s', left: settings[key] ? 24 : 4 }} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => show('Settings saved!', 'success')}
            style={{ marginTop: '1rem', padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
            Save Settings
          </button>
        </div>

        {/* Complaint History */}
        <div className="glass" style={{ borderRadius: 20, padding: '1.5rem', border: '1px solid rgba(139,92,246,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              Complaint History {!loading && grievances.length > 0 && <span style={{ color: '#8b5cf6' }}>({grievances.length})</span>}
            </h2>
            <button onClick={fetchGrievances} style={{ fontSize: '0.75rem', color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : grievances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📋</div>
              <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1rem' }}>No complaints filed yet</p>
              <button onClick={() => navigate('/submit')}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                File Your First Complaint
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grievances.map(g => (
                <button key={g.id} onClick={() => navigate(`/grievance/${g.ticket_id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s', width: '100%' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#8b5cf6', marginBottom: 3, fontWeight: 700 }}>{g.ticket_id}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.subject}</div>
                    <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 3 }}>{new Date(g.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div style={{ marginLeft: 12, flexShrink: 0 }}>
                    <StatusBadge status={g.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
