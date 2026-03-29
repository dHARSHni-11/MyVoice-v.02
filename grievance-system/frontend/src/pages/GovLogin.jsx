import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const inputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: 12,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s',
};

export default function GovLogin() {
  const navigate = useNavigate();
  const { govLogin } = useAuth();
  const { show } = useToast();
  const [form, setForm] = useState({ governmentId: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await govLogin(form.governmentId, form.email, form.password);
      show(`Welcome, ${user.name}!`, 'success');
      navigate('/gov/dashboard');
    } catch (err) {
      show(err.response?.data?.error || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      backgroundImage: 'radial-gradient(ellipse at top, rgba(99,102,241,0.15) 0%, transparent 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
    }}>
      <div className="animate-fade" style={{ maxWidth: 440, width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 1.2rem',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: '0 0 32px rgba(99,102,241,0.4)',
          }}>🏛️</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f1f5f9', marginBottom: '0.4rem' }}>
            Government Portal
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            MyVoice — AI Grievance Redressal System
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ padding: '2.5rem 2rem', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            borderRadius: 10, marginBottom: '1.8rem',
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          }}>
            <span style={{ fontSize: 14 }}>🔐</span>
            <span style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: 600 }}>
              Authorized government officials only
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Government Unique ID *
              </label>
              <input
                value={form.governmentId} onChange={set('governmentId')} required
                placeholder="e.g. GOV-1001"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Official Email *
              </label>
              <input
                type="email" value={form.email} onChange={set('email')} required
                placeholder="official@gov.in"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Password *
              </label>
              <input
                type="password" value={form.password} onChange={set('password')} required
                placeholder="••••••••"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: 'white', fontWeight: 800, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
                transition: 'all 0.2s',
              }}>
              {loading ? '⏳ Verifying...' : '🏛️ Access Government Portal'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/login" style={{ color: '#475569', fontSize: '0.82rem', textDecoration: 'none' }}>
            ← Citizen Portal Login
          </Link>
        </div>
      </div>
    </div>
  );
}
