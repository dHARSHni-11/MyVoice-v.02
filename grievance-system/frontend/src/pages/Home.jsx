import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { grievanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { icon: '💧', label: 'Water', color: '#06b6d4' },
  { icon: '🛣️', label: 'Road', color: '#f59e0b' },
  { icon: '⚡', label: 'Electricity', color: '#eab308' },
  { icon: '🗑️', label: 'Garbage', color: '#10b981' },
  { icon: '📋', label: 'Others', color: '#8b5cf6' },
];

const STATS = [
  { num: '12,847', label: 'Complaints Filed', icon: '📋' },
  { num: '11,203', label: 'Resolved', icon: '✅' },
  { num: '2.4h', label: 'Avg Resolution', icon: '⚡' },
];

export default function Home() {
  const [recent, setRecent] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    grievanceAPI.list({ limit: 3 }).then(r => setRecent(r.data.grievances || [])).catch(() => {});
  }, []);

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', minHeight: 'calc(100vh - 64px)' }}>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 32, padding: '48px 40px', position: 'relative', background: 'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 60%,#0f0f1a 100%)', border: '1px solid rgba(139,92,246,0.15)' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.2),transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 560 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI-Powered Grievance System</span>
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 16 }}>
            Your Voice,<br />
            <span style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Our Priority</span>
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.7, marginBottom: 32 }}>
            Submit your grievance and let AI classify, prioritize, and route it to the right authority — ensuring fast, fair resolution.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/submit" style={{ padding: '14px 28px', borderRadius: 14, fontWeight: 800, color: 'white', textDecoration: 'none', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)', fontSize: 15 }}>
              ✍️ Submit Complaint
            </Link>
            <Link to="/track" style={{ padding: '14px 28px', borderRadius: 14, fontWeight: 700, color: '#94a3b8', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', fontSize: 15 }}>
              🔍 Track Status
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
        {STATS.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4, background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.num}</div>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Categories */}
      <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '28px 28px', marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 20 }}>Report by Category</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
          {CATEGORIES.map((c, i) => (
            <motion.div key={c.label} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/submit')}
              style={{ padding: '20px 12px', borderRadius: 18, textAlign: 'center', cursor: 'pointer', background: `${c.color}10`, border: `1px solid ${c.color}30`, transition: 'all 0.2s' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent complaints */}
      {recent.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>Recent Activity</h2>
            <Link to="/track" style={{ fontSize: 13, color: '#8b5cf6', textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recent.map(t => (
              <motion.div key={t.id} whileHover={{ x: 4 }}
                onClick={() => navigate(`/grievance/${t.ticket_id}`)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', fontFamily: 'monospace', marginBottom: 4 }}>{t.ticket_id}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{t.subject}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{t.customer_name} · {new Date(t.created_at).toLocaleDateString()}</div>
                </div>
                <StatusPill status={t.status} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Floating buttons */}
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/submit')}
        style={{ position: 'fixed', bottom: 28, right: 28, width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: 'white', fontSize: 22, boxShadow: '0 4px 24px rgba(139,92,246,0.5)', zIndex: 40 }}
        title="Report Issue">
        ✍️
      </motion.button>
      <motion.button whileHover={{ scale: 1.1 }}
        style={{ position: 'fixed', bottom: 96, right: 28, width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#1a0a2e,#0f0f1a)', color: 'white', fontSize: 22, boxShadow: '0 4px 24px rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.3)', zIndex: 40 }}
        title="AI Assistant">
        🤖
      </motion.button>
    </div>
  );
}

function StatusPill({ status }) {
  const colors = { open: ['#f59e0b', 'rgba(245,158,11,0.12)'], 'in-progress': ['#6366f1', 'rgba(99,102,241,0.12)'], resolved: ['#10b981', 'rgba(16,185,129,0.12)'], closed: ['#64748b', 'rgba(100,116,139,0.12)'] };
  const [color, bg] = colors[status] || colors.open;
  return (
    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: bg, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{status}</span>
  );
}
