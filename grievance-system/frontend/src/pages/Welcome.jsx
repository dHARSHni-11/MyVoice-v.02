import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0d0d1f 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute', top: '10%', left: '15%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '10%',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '50%', right: '20%',
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(236,72,153,0.1), transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div key={i}
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
          style={{
            position: 'absolute',
            width: 4 + i * 2, height: 4 + i * 2,
            borderRadius: '50%',
            background: `rgba(139,92,246,${0.3 + i * 0.1})`,
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
            pointerEvents: 'none',
          }} />
      ))}

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: 32,
          padding: '60px 56px',
          textAlign: 'center',
          maxWidth: 480,
          width: '90%',
          boxShadow: '0 8px 64px rgba(139,92,246,0.15), 0 0 0 1px rgba(139,92,246,0.1)',
          position: 'relative',
        }}>

        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          style={{ marginBottom: 28 }}>
          <div style={{
            width: 88, height: 88,
            borderRadius: 24,
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1, #ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
            boxShadow: '0 0 40px rgba(139,92,246,0.5), 0 0 80px rgba(139,92,246,0.2)',
            fontSize: 40,
          }}>
            🎙️
          </div>
        </motion.div>

        {/* App name */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h1 style={{
            fontSize: 48, fontWeight: 900, letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #ec4899 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', marginBottom: 8, lineHeight: 1.1,
          }}>
            MyVoice
          </h1>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 14px', borderRadius: 20,
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.25)',
            marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              AI Powered Grievance Redressal
            </span>
          </div>
          <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, marginBottom: 40 }}>
            Raise your voice. Let AI route your complaint to the right authority — fast, fair, and transparent.
          </p>
        </motion.div>

        {/* Features row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          style={{ display: 'flex', gap: 12, marginBottom: 40, justifyContent: 'center' }}>
          {[['🤖', 'AI Priority'], ['📍', 'Auto Locate'], ['📊', 'Live Track']].map(([icon, label]) => (
            <div key={label} style={{
              flex: 1, padding: '10px 8px', borderRadius: 14,
              background: 'rgba(139,92,246,0.07)',
              border: '1px solid rgba(139,92,246,0.15)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Sign In button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
          whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(139,92,246,0.6)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/login')}
          style={{
            width: '100%', padding: '16px 0',
            borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            color: 'white', fontSize: 16, fontWeight: 800,
            letterSpacing: '0.02em',
            boxShadow: '0 4px 24px rgba(139,92,246,0.4)',
            transition: 'all 0.2s',
          }}>
          Get Started →
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/gov/login')}
          style={{
            width: '100%', padding: '13px 0', marginTop: 10,
            borderRadius: 16, cursor: 'pointer',
            background: 'transparent',
            border: '1px solid rgba(99,102,241,0.35)',
            color: '#818cf8', fontSize: 14, fontWeight: 700,
            transition: 'all 0.2s',
          }}>
          🏛️ Government Portal
        </motion.button>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
          style={{ marginTop: 20, fontSize: 12, color: '#475569' }}>
          Trusted by 10,000+ citizens · Powered by AI
        </motion.p>
      </motion.div>
    </div>
  );
}
