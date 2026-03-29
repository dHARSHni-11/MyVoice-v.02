import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { authAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const DEMO = {
  admin: { email: 'admin@caredesk.in', password: 'Admin@123' },
  officer: { email: 'officer@caredesk.in', password: 'Officer@123' },
};

const S = {
  bg: '#0a0a0f',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(139,92,246,0.2)',
  borderFaint: 'rgba(255,255,255,0.07)',
  purple: '#8b5cf6',
  purpleLight: '#a78bfa',
  muted: '#475569',
  secondary: '#94a3b8',
  input: 'rgba(255,255,255,0.05)',
};

export default function Login() {
  const [userType, setUserType] = useState('citizen');
  const [tab, setTab] = useState('login');
  const [step, setStep] = useState('form'); // form | otp
  const [form, setForm] = useState({ name: '', governmentId: '', email: '', password: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const { login, govLogin } = useAuth();
  const navigate = useNavigate();
  const { show } = useToast();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const fillDemo = () => {
    const creds = userType === 'government' ? DEMO.admin : { email: '', password: '' };
    setForm(f => ({ ...f, ...creds }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let user;
      if (userType === 'government') {
        if (!form.governmentId) {
          show('Government Unique ID is required for government login', 'error');
          setLoading(false);
          return;
        }
        user = await govLogin(form.governmentId, form.email, form.password);
      } else {
        user = await login(form.email, form.password);
      }

      show('Welcome back! 👋', 'success');
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'officer') navigate('/officer');
      else navigate('/home');
    } catch (err) {
      show(err.response?.data?.error || 'Login failed', 'error');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.register({ name: form.name, email: form.email, password: form.password, role: 'customer' });
      show('Account created! Please login.', 'success');
      setTab('login');
    } catch (err) {
      show(err.response?.data?.error || 'Registration failed', 'error');
    } finally { setLoading(false); }
  };

  const handleOTPRequest = (e) => {
    e.preventDefault();
    if (!form.email) { show('Enter your email first', 'error'); return; }
    show('OTP sent to ' + form.email, 'success');
    setStep('otp');
  };

  const handleOTPVerify = (e) => {
    e.preventDefault();
    if (form.otp === '123456' || form.otp.length === 6) {
      show('OTP verified! Logging in...', 'success');
      setTimeout(() => navigate('/home'), 1000);
    } else {
      show('Invalid OTP. Try 123456', 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a0f 0%,#1a0a2e 50%,#0d0d1f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      {/* Bg orbs */}
      <div style={{ position: 'absolute', top: '5%', left: '5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.18),transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '5%', right: '5%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.15),transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        style={{ width: '100%', maxWidth: 460 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>🎙️</div>
            <span style={{ fontSize: 24, fontWeight: 900, background: 'linear-gradient(135deg,#fff,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MyVoice</span>
          </Link>
        </div>

        {/* Card */}
        <div style={{ background: S.card, backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: `1px solid ${S.border}`, borderRadius: 28, padding: '36px 32px', boxShadow: '0 8px 48px rgba(139,92,246,0.12)' }}>

          {/* User type toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 28, padding: 4, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }}>
            {[['citizen', '👤', 'Citizen'], ['government', '🏛️', 'Government']].map(([type, icon, label]) => (
              <button key={type} onClick={() => { setUserType(type); fillDemo(); }}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: userType === type ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'transparent',
                  color: userType === type ? 'white' : S.muted,
                  fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Tab toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28, padding: 4, borderRadius: 14, background: 'rgba(255,255,255,0.03)' }}>
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setStep('form'); }}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: tab === t ? 'rgba(139,92,246,0.2)' : 'transparent',
                  color: tab === t ? S.purpleLight : S.muted,
                  fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
                  borderBottom: tab === t ? `2px solid ${S.purple}` : '2px solid transparent',
                }}>
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab + step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>

              {/* LOGIN */}
              {tab === 'login' && step === 'form' && (
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {userType === 'government' && (
                    <Field label="Government Unique ID" placeholder="GOV-1001" value={form.governmentId} onChange={set('governmentId')} required />
                  )}
                  <Field label="Email Address" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
                  <Field label="Password" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />

                  {userType === 'government' && (
                    <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', fontSize: 12, color: S.purpleLight }}>
                      ✨ Demo: GOV-1001 / govadmin@myvoice.in / Gov@1234
                    </div>
                  )}

                  <GlowButton type="submit" loading={loading}>
                    {loading ? 'Signing in...' : 'Sign In →'}
                  </GlowButton>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
                    <div style={{ flex: 1, height: 1, background: S.borderFaint }} />
                    <span style={{ fontSize: 12, color: S.muted }}>or</span>
                    <div style={{ flex: 1, height: 1, background: S.borderFaint }} />
                  </div>

                  {/* OTP login */}
                  <button type="button" onClick={handleOTPRequest}
                    style={{ width: '100%', padding: '12px 0', borderRadius: 14, border: `1px solid ${S.borderFaint}`, background: 'transparent', color: S.secondary, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.target.style.borderColor = S.purple}
                    onMouseLeave={e => e.target.style.borderColor = S.borderFaint}>
                    📱 Login with OTP
                  </button>

                  {/* Google login */}
                  <button type="button"
                    style={{ width: '100%', padding: '12px 0', borderRadius: 14, border: `1px solid ${S.borderFaint}`, background: 'rgba(255,255,255,0.03)', color: S.secondary, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continue with Google
                  </button>
                </form>
              )}

              {/* OTP step */}
              {tab === 'login' && step === 'otp' && (
                <form onSubmit={handleOTPVerify} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
                    <p style={{ fontSize: 14, color: S.secondary }}>OTP sent to <strong style={{ color: 'white' }}>{form.email}</strong></p>
                    <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>Use <strong style={{ color: S.purpleLight }}>123456</strong> for demo</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    {[...Array(6)].map((_, i) => (
                      <input key={i} maxLength={1} type="text"
                        style={{ width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700, borderRadius: 12, border: `1px solid ${S.border}`, background: S.input, color: 'white', outline: 'none' }}
                        onChange={e => {
                          const val = form.otp.split('');
                          val[i] = e.target.value;
                          setForm(f => ({ ...f, otp: val.join('') }));
                          if (e.target.value && e.target.nextSibling) e.target.nextSibling.focus();
                        }} />
                    ))}
                  </div>
                  <GlowButton type="submit">Verify OTP →</GlowButton>
                  <button type="button" onClick={() => setStep('form')} style={{ background: 'none', border: 'none', color: S.muted, fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>← Back</button>
                </form>
              )}

              {/* REGISTER */}
              {tab === 'register' && (
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Field label="Full Name" placeholder="John Doe" value={form.name} onChange={set('name')} required />
                  <Field label="Email Address" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
                  <Field label="Password" type="password" placeholder="Min 8 characters" value={form.password} onChange={set('password')} required />
                  <GlowButton type="submit" loading={loading}>
                    {loading ? 'Creating...' : 'Create Account →'}
                  </GlowButton>
                  <button type="button"
                    style={{ width: '100%', padding: '12px 0', borderRadius: 14, border: `1px solid ${S.borderFaint}`, background: 'rgba(255,255,255,0.03)', color: S.secondary, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Sign up with Google
                  </button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link to="/submit" style={{ fontSize: 12, color: S.muted, textDecoration: 'none' }}>
              Submit a complaint without account →
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 }}>{label}</label>
      <input {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 14,
          border: `1px solid ${focused ? '#8b5cf6' : 'rgba(255,255,255,0.08)'}`,
          background: 'rgba(255,255,255,0.05)', color: '#f1f5f9',
          fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
          boxSizing: 'border-box',
          boxShadow: focused ? '0 0 0 3px rgba(139,92,246,0.1)' : 'none',
        }} />
    </div>
  );
}

function GlowButton({ children, loading, ...props }) {
  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      {...props}
      disabled={loading}
      style={{
        width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
        color: 'white', fontSize: 15, fontWeight: 800,
        boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
        opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
      }}>
      {children}
    </motion.button>
  );
}
