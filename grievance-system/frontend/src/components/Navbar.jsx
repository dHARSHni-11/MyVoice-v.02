import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/'); };

  const navLinks = user?.role === 'admin' && user?.governmentId
    ? [{ to: '/gov/dashboard', label: '🏛️ Gov Dashboard' }]
    : user?.role === 'admin'
    ? [{ to: '/admin', label: 'Dashboard' }]
    : user?.role === 'officer' && user?.governmentId
    ? [{ to: '/gov/dashboard', label: '🏛️ Gov Dashboard' }]
    : user?.role === 'officer'
    ? [{ to: '/officer', label: 'My Tickets' }]
    : [
        { to: '/home', label: 'Home' },
        { to: '/submit', label: 'Submit' },
        { to: '/track', label: 'Track' },
        { to: '/map', label: 'Map' },
        ...(user ? [{ to: '/profile', label: 'Profile' }] : []),
      ];

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 64,
      background: 'rgba(10,10,15,0.9)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <Link to={user ? '/home' : '/'} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 0 16px rgba(139,92,246,0.4)' }}>🎙️</div>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>MyVoice</div>
          <div style={{ color: '#8b5cf6', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' }}>AI Grievance System</div>
        </div>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {navLinks.map(({ to, label }) => {
          const active = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <Link key={to} to={to} style={{
              padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              textDecoration: 'none', transition: 'all 0.2s',
              color: active ? '#a78bfa' : '#94a3b8',
              background: active ? 'rgba(139,92,246,0.12)' : 'transparent',
            }}>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white' }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>{user.name}</div>
                <div style={{ color: '#8b5cf6', fontSize: 10, textTransform: 'capitalize', fontWeight: 600 }}>{user.role}</div>
              </div>
            </div>
            <button onClick={handleLogout} style={{
              padding: '6px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" style={{ padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: 'white', fontWeight: 700, fontSize: 13, textDecoration: 'none', boxShadow: '0 2px 12px rgba(139,92,246,0.3)' }}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
