import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { mapAPI, grievanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';

// ── Department Config ──
const DEPT_CONFIG = {
  Water:       { icon: '💧', color: '#3b82f6', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', label: 'Water Supply' },
  Road:        { icon: '🛣️', color: '#f59e0b', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', label: 'Road & Transport' },
  Electricity: { icon: '⚡', color: '#eab308', gradient: 'linear-gradient(135deg,#eab308,#ca8a04)', label: 'Electricity' },
  Garbage:     { icon: '🗑️', color: '#10b981', gradient: 'linear-gradient(135deg,#10b981,#059669)', label: 'Sanitation & Garbage' },
  General:     { icon: '📋', color: '#8b5cf6', gradient: 'linear-gradient(135deg,#8b5cf6,#6366f1)', label: 'General / Common' },
};

const PRIORITY_COLORS = {
  critical: '#ec4899', high: '#ef4444', medium: '#f59e0b', low: '#10b981',
};
const STATUS_COLORS = {
  open: '#f59e0b', 'in-progress': '#6366f1', resolved: '#10b981', closed: '#64748b',
};
const CATEGORY_ICONS = {
  'Road Damage': '🛣️', 'Water Supply': '💧', Electricity: '⚡',
  Sanitation: '🗑️', Delivery: '📦', Refund: '💰', Technical: '💻', Other: '📋',
};

const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

// ── Stat mini-card ──
function MiniStat({ icon, label, value, color }) {
  return (
    <div style={{
      padding: '14px 18px', borderRadius: 14,
      background: `${color}0a`, border: `1px solid ${color}25`,
      backdropFilter: 'blur(8px)', textAlign: 'center', minWidth: 110,
    }}>
      <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── Main Component ──
export default function GovMapView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [markers, setMarkers] = useState([]);
  const [allMarkers, setAllMarkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [colorBy, setColorBy] = useState('department');
  const [loading, setLoading] = useState(true);
  const [activeLayers, setActiveLayers] = useState(new Set(['Water', 'Road', 'Electricity', 'Garbage', 'General']));
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const isSuperAdmin = !user?.department;
  const userDept = user?.department || null;
  const deptConfig = userDept ? DEPT_CONFIG[userDept] : null;
  const themeColor = deptConfig?.color || '#8b5cf6';

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await mapAPI.getMapData();
      const data = res.data.markers || [];
      setAllMarkers(data);
    } catch {
      // Fallback
      try {
        const res = await grievanceAPI.list({ limit: 200 });
        const data = (res.data.grievances || [])
          .filter(g => g.latitude && g.longitude)
          .map(g => ({
            ...g, ticket_id: g.ticket_id,
            latitude: parseFloat(g.latitude), longitude: parseFloat(g.longitude),
            priority_score: g.priority_score || 50,
          }));
        setAllMarkers(data);
      } catch { /* empty */ }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Apply department + status + layer filters ──
  useEffect(() => {
    let filtered = [...allMarkers];

    // Department filter (non-superadmin sees only their dept)
    if (!isSuperAdmin && userDept) {
      filtered = filtered.filter(m =>
        (m.department || '').toLowerCase() === userDept.toLowerCase() ||
        (m.category || '').toLowerCase().includes(userDept.toLowerCase())
      );
    }

    // SuperAdmin layer toggles
    if (isSuperAdmin) {
      filtered = filtered.filter(m => {
        const dept = m.department || 'General';
        return activeLayers.has(dept);
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    setMarkers(filtered);
  }, [allMarkers, isSuperAdmin, userDept, activeLayers, statusFilter]);

  // ── Redirect non-gov users ──
  useEffect(() => {
    if (user && !['admin', 'officer'].includes(user.role)) navigate('/home');
    if (!user) navigate('/gov/login');
  }, [user, navigate]);

  // ── Init Leaflet ──
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;

    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      const map = L.map(mapRef.current, {
        center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM,
        zoomControl: false, attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
    };

    initMap();
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  // ── Update markers on map ──
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const updateMarkers = async () => {
      const L = await import('leaflet');
      markersLayerRef.current.clearLayers();

      if (markers.length === 0) return;

      markers.forEach(m => {
        const dept = m.department || 'General';
        const cfg = DEPT_CONFIG[dept] || DEPT_CONFIG.General;

        let color;
        if (colorBy === 'department') color = cfg.color;
        else if (colorBy === 'priority') color = PRIORITY_COLORS[m.priority] || '#8b5cf6';
        else color = STATUS_COLORS[m.status] || '#64748b';

        const isUrgent = m.priority === 'critical' || m.priority === 'high';

        const icon = L.divIcon({
          className: 'gov-marker',
          html: `
            <div style="
              width: 38px; height: 38px; border-radius: 50%;
              background: ${color}22; border: 2.5px solid ${color};
              display: flex; align-items: center; justify-content: center;
              font-size: 17px; cursor: pointer; position: relative;
              box-shadow: 0 0 14px ${color}50, 0 2px 8px rgba(0,0,0,0.5);
              transition: all 0.2s;
            ">
              <span style="filter: drop-shadow(0 0 3px ${color})">${cfg.icon}</span>
              ${isUrgent ? `<div style="
                position:absolute;top:-3px;right:-3px;width:11px;height:11px;
                border-radius:50%;background:${PRIORITY_COLORS[m.priority]};
                animation:gov-pulse 1.5s infinite;
              "></div>` : ''}
            </div>`,
          iconSize: [38, 38], iconAnchor: [19, 19],
        });

        const marker = L.marker([m.latitude, m.longitude], { icon })
          .on('click', () => setSelected(m));

        marker.bindTooltip(`
          <div style="
            background:rgba(15,15,26,0.95);border:1px solid ${color}40;
            border-radius:10px;padding:10px 14px;color:#f1f5f9;
            font-size:12px;max-width:220px;backdrop-filter:blur(8px);
          ">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <span style="font-size:16px">${cfg.icon}</span>
              <span style="font-size:10px;font-weight:700;color:${cfg.color};text-transform:uppercase;letter-spacing:0.04em">${dept}</span>
            </div>
            <div style="font-weight:700;margin-bottom:4px">${m.subject || 'Untitled'}</div>
            <div style="color:${PRIORITY_COLORS[m.priority] || '#8b5cf6'};font-size:11px;font-weight:600;text-transform:uppercase">
              ${m.priority} · ${m.status}
            </div>
            ${m.district ? `<div style="color:#64748b;font-size:10px;margin-top:3px">📍 ${m.district}${m.state ? ', ' + m.state : ''}</div>` : ''}
          </div>`, { direction: 'top', offset: [0, -22], className: 'gov-tooltip', permanent: false });

        markersLayerRef.current.addLayer(marker);
      });

      // Fit bounds
      if (markers.length > 0) {
        const bounds = L.latLngBounds(markers.map(m => [m.latitude, m.longitude]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    };

    updateMarkers();
  }, [markers, colorBy]);

  // ── Stats ──
  const stats = {
    total: markers.length,
    critical: markers.filter(m => m.priority === 'critical' || m.priority === 'high').length,
    open: markers.filter(m => m.status === 'open').length,
    resolved: markers.filter(m => m.status === 'resolved').length,
  };

  // ── Layer toggle (SuperAdmin only) ──
  const toggleLayer = (dept) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept); else next.add(dept);
      return next;
    });
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      backgroundImage: `radial-gradient(ellipse at top, ${themeColor}12 0%, transparent 60%)`,
    }}>
      {/* ── Inline styles ── */}
      <style>{`
        .gov-marker { background: none !important; border: none !important; }
        .gov-tooltip { background: none !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .gov-tooltip .leaflet-tooltip-arrow { display: none; }
        .leaflet-container { background: #0a0a0f !important; }
        @keyframes gov-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.6); }
        }
        .gov-map-btn { transition: all 0.2s !important; }
        .gov-map-btn:hover { transform: translateY(-1px); }
      `}</style>

      {/* ── Top Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 64,
        background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${themeColor}25`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: deptConfig?.gradient || 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: `0 0 16px ${themeColor}40`,
          }}>{deptConfig?.icon || '🏛️'}</div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>MyVoice Gov Map</div>
            <div style={{ color: themeColor, fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' }}>
              {isSuperAdmin ? 'Super Admin — All Departments' : `${userDept} Department`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/gov/dashboard')} className="gov-map-btn" style={{
            padding: '7px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>← Dashboard</button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{user?.name}</div>
            <div style={{ color: themeColor, fontSize: 10, fontWeight: 600 }}>ID: {user?.governmentId}</div>
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f1f5f9', marginBottom: 4 }}>
            {isSuperAdmin ? '🗺️ All Departments — Geo Intelligence' : `${deptConfig?.icon || '📍'} ${deptConfig?.label || userDept} — Geo Intelligence`}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            {isSuperAdmin
              ? 'Interactive map showing all grievances across every department with layer controls'
              : `Real-time map of all ${userDept} department grievances with NLP-powered geocoding`}
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
          <MiniStat icon="📍" label="Total Markers" value={stats.total} color={themeColor} />
          <MiniStat icon="🔴" label="High Priority" value={stats.critical} color="#ef4444" />
          <MiniStat icon="🟡" label="Open Issues" value={stats.open} color="#f59e0b" />
          <MiniStat icon="✅" label="Resolved" value={stats.resolved} color="#10b981" />
        </div>

        {/* ── SuperAdmin Layer Toggle Panel ── */}
        {isSuperAdmin && (
          <div style={{
            marginBottom: '1.5rem', padding: '16px 20px', borderRadius: 14,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8b5cf6', marginBottom: 12 }}>
              🗂️ Department Layers
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(DEPT_CONFIG).map(([dept, cfg]) => {
                const active = activeLayers.has(dept);
                const count = allMarkers.filter(m => (m.department || 'General') === dept).length;
                return (
                  <button key={dept} onClick={() => toggleLayer(dept)} className="gov-map-btn" style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                    background: active ? `${cfg.color}18` : 'rgba(255,255,255,0.02)',
                    border: active ? `1.5px solid ${cfg.color}50` : '1.5px solid rgba(255,255,255,0.06)',
                    color: active ? cfg.color : '#475569',
                    boxShadow: active ? `0 0 12px ${cfg.color}20` : 'none',
                    opacity: active ? 1 : 0.5,
                  }}>
                    <span style={{ fontSize: '1rem' }}>{cfg.icon}</span>
                    {dept}
                    <span style={{
                      padding: '1px 7px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 800,
                      background: active ? `${cfg.color}25` : 'rgba(255,255,255,0.05)',
                      color: active ? cfg.color : '#475569',
                    }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Filter Row ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'open', 'in-progress', 'resolved'].map(f => {
              const active = statusFilter === f;
              const lbl = f === 'all' ? 'All' : f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1);
              return (
                <button key={f} onClick={() => setStatusFilter(f)} className="gov-map-btn" style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                  background: active ? `${themeColor}20` : 'rgba(255,255,255,0.03)',
                  border: active ? `1.5px solid ${themeColor}50` : '1.5px solid rgba(255,255,255,0.06)',
                  color: active ? themeColor : '#64748b',
                }}>{lbl}</button>
              );
            })}
          </div>

          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />

          {/* Color by */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>COLOR BY:</span>
            {['department', 'priority', 'status'].map(c => {
              const active = colorBy === c;
              return (
                <button key={c} onClick={() => setColorBy(c)} className="gov-map-btn" style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  textTransform: 'capitalize',
                  background: active ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                  border: active ? '1.5px solid rgba(139,92,246,0.4)' : '1.5px solid rgba(255,255,255,0.06)',
                  color: active ? '#a78bfa' : '#64748b',
                }}>{c}</button>
              );
            })}
          </div>
        </div>

        {/* ── Map + Side Panel Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem' }}>
          {/* Leaflet Map */}
          <div style={{
            height: 560, borderRadius: 16, overflow: 'hidden', position: 'relative',
            background: 'rgba(255,255,255,0.02)', border: `1px solid ${themeColor}20`,
          }}>
            {loading && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, background: 'rgba(10,10,15,0.85)',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8, animation: 'gov-pulse 1.5s infinite' }}>🗺️</div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: themeColor }}>Loading map data...</p>
                </div>
              </div>
            )}

            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

            {/* Legend overlay */}
            <div style={{
              position: 'absolute', top: 16, left: 16, zIndex: 800,
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(10,10,15,0.88)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a78bfa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {colorBy === 'department' ? '🏢 Department' : colorBy === 'priority' ? '⚡ Priority' : '📊 Status'}
              </div>
              {colorBy === 'department'
                ? Object.entries(DEPT_CONFIG).map(([dept, cfg]) => (
                    <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}80` }} />
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{cfg.icon} {dept}</span>
                    </div>
                  ))
                : colorBy === 'priority'
                ? [['critical', '#ec4899'], ['high', '#ef4444'], ['medium', '#f59e0b'], ['low', '#10b981']].map(([l, c]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}80` }} />
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'capitalize' }}>{l}</span>
                    </div>
                  ))
                : [['open', '#f59e0b'], ['in-progress', '#6366f1'], ['resolved', '#10b981'], ['closed', '#64748b']].map(([l, c]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}80` }} />
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'capitalize' }}>{l}</span>
                    </div>
                  ))
              }
            </div>

            {/* Marker count badge */}
            <div style={{
              position: 'absolute', top: 16, right: 16, zIndex: 800,
              padding: '6px 14px', borderRadius: 10,
              background: 'rgba(10,10,15,0.88)', backdropFilter: 'blur(12px)',
              border: `1px solid ${themeColor}30`,
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: themeColor }}>
                📍 {markers.length} markers
              </span>
            </div>

            {/* Empty state */}
            {markers.length === 0 && !loading && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 800, background: 'rgba(10,10,15,0.65)',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🗺️</div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>No geocoded grievances found</p>
                  <p style={{ fontSize: '0.75rem', color: '#334155', marginTop: 4 }}>
                    {isSuperAdmin ? 'Toggle department layers above or change filters' : `No ${userDept} complaints with location data`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Side Panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 560, overflowY: 'auto' }}>
            {/* Selected detail card */}
            {selected ? (
              <div style={{
                padding: '18px', borderRadius: 14,
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${themeColor}25`,
                backdropFilter: 'blur(8px)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700, color: themeColor, marginBottom: 4 }}>{selected.ticket_id}</div>
                    <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.4, margin: 0 }}>{selected.subject}</h3>
                  </div>
                  <button onClick={() => setSelected(null)} style={{
                    background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16,
                  }}>✕</button>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700,
                    background: `${(DEPT_CONFIG[selected.department] || DEPT_CONFIG.General).color}15`,
                    color: (DEPT_CONFIG[selected.department] || DEPT_CONFIG.General).color,
                    border: `1px solid ${(DEPT_CONFIG[selected.department] || DEPT_CONFIG.General).color}30`,
                  }}>
                    {(DEPT_CONFIG[selected.department] || DEPT_CONFIG.General).icon} {selected.department || 'General'}
                  </span>
                  <PriorityBadge priority={selected.priority} />
                  <StatusBadge status={selected.status} />
                </div>

                {/* Description */}
                <div style={{
                  padding: '10px 12px', borderRadius: 10, marginBottom: 12,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                    {selected.description?.slice(0, 200)}{selected.description?.length > 200 ? '...' : ''}
                  </p>
                </div>

                {/* Location */}
                {(selected.district || selected.state) && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, marginBottom: 12,
                    background: `${themeColor}08`, border: `1px solid ${themeColor}15`,
                  }}>
                    <span style={{ fontSize: 16 }}>📍</span>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: themeColor }}>
                      {selected.district}{selected.state ? ', ' + selected.state : ''}
                    </div>
                  </div>
                )}

                {/* Coords */}
                <div style={{
                  fontFamily: 'monospace', fontSize: '0.7rem', color: '#64748b',
                  padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', marginBottom: 12,
                }}>
                  Lat: <span style={{ color: '#94a3b8' }}>{selected.latitude?.toFixed(4)}</span> &nbsp;|&nbsp;
                  Lng: <span style={{ color: '#94a3b8' }}>{selected.longitude?.toFixed(4)}</span>
                </div>

                {/* View Details button */}
                <button onClick={() => navigate(`/grievance/${selected.ticket_id}`)} className="gov-map-btn" style={{
                  width: '100%', padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: deptConfig?.gradient || 'linear-gradient(135deg,#8b5cf6,#6366f1)',
                  color: 'white', fontWeight: 800, fontSize: '0.82rem',
                  boxShadow: `0 4px 16px ${themeColor}30`,
                }}>View Full Details →</button>
              </div>
            ) : (
              <div style={{
                padding: '24px', borderRadius: 14, textAlign: 'center',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📍</div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', margin: '0 0 4px' }}>Select a marker</p>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0 }}>Click any marker on the map to view details</p>
              </div>
            )}

            {/* Grievance List */}
            <div style={{
              fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: themeColor, padding: '6px 4px', borderBottom: `1px solid ${themeColor}20`,
            }}>
              📍 {markers.length} Geocoded Grievances
            </div>

            {markers.slice(0, 12).map(g => {
              const gCfg = DEPT_CONFIG[g.department] || DEPT_CONFIG.General;
              const isSelected = selected?.id === g.id;
              return (
                <button key={g.id || g.ticket_id} onClick={() => {
                  setSelected(g);
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([g.latitude, g.longitude], 14, { duration: 1 });
                  }
                }} style={{
                  display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '12px 14px', borderRadius: 12,
                  background: isSelected ? `${themeColor}10` : 'rgba(255,255,255,0.02)',
                  border: isSelected ? `1.5px solid ${themeColor}40` : '1px solid rgba(255,255,255,0.05)',
                  transition: 'all 0.18s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700, color: themeColor }}>{g.ticket_id}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                        background: `${gCfg.color}15`, color: gCfg.color,
                      }}>{gCfg.icon}</span>
                      <PriorityBadge priority={g.priority} />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 4, lineHeight: 1.4 }}>
                    {g.subject?.length > 50 ? g.subject.slice(0, 50) + '...' : g.subject}
                  </div>
                  {g.district && (
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      📍 {g.district}{g.state ? ', ' + g.state : ''}
                    </div>
                  )}
                </button>
              );
            })}

            {markers.length > 12 && (
              <div style={{ fontSize: '0.72rem', textAlign: 'center', padding: 8, color: '#475569' }}>
                + {markers.length - 12} more on map
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
