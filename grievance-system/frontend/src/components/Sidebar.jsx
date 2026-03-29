import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const adminLinks = [
  { to: '/admin', icon: '▦', label: 'Dashboard' },
  { to: '/admin/grievances', icon: '≡', label: 'All Grievances' },
];
const officerLinks = [
  { to: '/officer', icon: '≡', label: 'My Tickets' },
];
const publicLinks = [
  { to: '/home', icon: '⌂', label: 'Home' },
  { to: '/submit', icon: '+', label: 'Submit Complaint' },
  { to: '/track', icon: '◎', label: 'Track Status' },
  { to: '/map', icon: '⊕', label: 'Map View' },
  { to: '/profile', icon: '◉', label: 'Profile' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user?.role === 'admin' ? adminLinks
    : user?.role === 'officer' ? officerLinks
    : publicLinks;

  return (
    <aside style={{
      width: 220, minHeight: 'calc(100vh - 64px)',
      position: 'sticky', top: 64,
      padding: '16px 12px',
      display: 'flex', flexDirection: 'column', gap: 4,
      background: 'rgba(10,10,15,0.6)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#334155', padding: '0 12px', marginBottom: 8 }}>
        Navigation
      </div>
      {links.map((link) => (
        <NavLink key={link.to} to={link.to}
          end={link.to === '/home' || link.to === '/admin' || link.to === '/officer'}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 12,
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
            transition: 'all 0.2s',
            color: isActive ? 'white' : '#64748b',
            background: isActive ? 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(99,102,241,0.1))' : 'transparent',
            borderLeft: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
          })}>
          <span style={{ width: 18, textAlign: 'center', fontSize: 15 }}>{link.icon}</span>
          {link.label}
        </NavLink>
      ))}

      {user && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#334155', padding: '0 12px', marginTop: 16, marginBottom: 8 }}>
            Account
          </div>
          <button onClick={() => { logout(); navigate('/'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 12,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', border: 'none',
              color: '#64748b', textAlign: 'left', width: '100%',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}>
            <span style={{ width: 18, textAlign: 'center', fontSize: 15 }}>⏻</span>
            Logout
          </button>
        </>
      )}
    </aside>
  );
}
