import { useState, useEffect, useRef } from 'react';
import { mapAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import HeatMapContainer from '../components/HeatMapContainer';
import { useNavigate } from 'react-router-dom';

const CATEGORY_ICONS = {
  'Road Damage': '🛣️', 'Water Supply': '💧', 'Electricity': '⚡',
  'Sanitation': '🗑️', 'Delivery': '📦', 'Refund': '💰',
  'Technical': '💻', 'Other': '📋',
};

const PRIORITY_COLORS = {
  critical: '#ec4899',
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

const STATUS_COLORS = {
  open: '#f59e0b',
  'in-progress': '#6366f1',
  resolved: '#10b981',
  closed: '#64748b',
};

// Default center: India
const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

export default function MapView() {
  const { user } = useAuth();
  const [markers, setMarkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [colorBy, setColorBy] = useState('priority'); // 'priority' or 'status'
  const [loading, setLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [upvoted, setUpvoted] = useState(new Set());
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const navigate = useNavigate();

  // Load map data from backend (auth token is auto-attached by api interceptor)
  useEffect(() => {
    mapAPI.getMapData()
      .then(r => {
        setMarkers(r.data.markers || []);
        setDepartmentFilter(r.data.filteredByDepartment || null);
      })
      .catch(() => {
        // Fallback: load from grievance list
        import('../services/api').then(({ grievanceAPI }) => {
          grievanceAPI.list({ limit: 100 }).then(r => {
            const data = (r.data.grievances || [])
              .filter(g => g.latitude && g.longitude)
              .map(g => ({
                ...g,
                ticket_id: g.ticket_id,
                latitude: parseFloat(g.latitude),
                longitude: parseFloat(g.longitude),
                priority_score: g.priority_score || 50,
                priority_color: PRIORITY_COLORS[g.priority] || '#8b5cf6',
                status_color: STATUS_COLORS[g.status] || '#64748b',
                upvote_count: g.upvote_count || 0,
              }));
            setMarkers(data);
          }).catch(() => {});
        });
      })
      .finally(() => setLoading(false));
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;

    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      const map = L.map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: false,
      });

      // Dark tile layer for premium look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      }).addTo(map);

      // Custom zoom control position
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Attribution
      L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when data/filter/colorBy changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const updateMarkers = async () => {
      const L = await import('leaflet');
      markersLayerRef.current.clearLayers();

      const filtered = filter === 'all'
        ? markers
        : markers.filter(m => m.status === filter);

      if (filtered.length === 0) return;

      filtered.forEach(m => {
        const color = colorBy === 'priority'
          ? (PRIORITY_COLORS[m.priority] || '#8b5cf6')
          : (STATUS_COLORS[m.status] || '#64748b');

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              width: 36px; height: 36px;
              border-radius: 50%;
              background: ${color}22;
              border: 2.5px solid ${color};
              display: flex; align-items: center; justify-content: center;
              font-size: 16px;
              box-shadow: 0 0 12px ${color}60, 0 2px 8px rgba(0,0,0,0.4);
              cursor: pointer;
              transition: all 0.2s;
              position: relative;
            ">
              <span style="filter: drop-shadow(0 0 2px ${color})">${CATEGORY_ICONS[m.category] || '📋'}</span>
              ${m.priority === 'critical' || m.priority === 'high' ? `
                <div style="
                  position: absolute; top: -2px; right: -2px;
                  width: 10px; height: 10px; border-radius: 50%;
                  background: ${color};
                  animation: pulse-dot 1.5s infinite;
                "></div>
              ` : ''}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([m.latitude, m.longitude], { icon })
          .on('click', () => {
            setSelected(m);
          });

        marker.bindTooltip(
          `<div style="
            background: rgba(15,15,26,0.95);
            border: 1px solid ${color}40;
            border-radius: 8px;
            padding: 8px 12px;
            color: #f1f5f9;
            font-size: 12px;
            font-family: inherit;
            max-width: 200px;
            backdrop-filter: blur(8px);
          ">
            <div style="font-weight: 700; margin-bottom: 4px;">${m.subject || 'Untitled'}</div>
            <div style="color: ${color}; font-size: 11px; text-transform: uppercase; font-weight: 600;">
              ${m.priority} · ${m.status}
            </div>
            ${m.district ? `<div style="color: #64748b; font-size: 10px; margin-top: 2px;">📍 ${m.district}${m.state ? ', ' + m.state : ''}</div>` : ''}
          </div>`,
          {
            direction: 'top',
            offset: [0, -20],
            className: 'custom-tooltip',
            permanent: false,
          }
        );

        markersLayerRef.current.addLayer(marker);
      });

      // Fit map to markers
      if (filtered.length > 0) {
        const bounds = L.latLngBounds(filtered.map(m => [m.latitude, m.longitude]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    };

    updateMarkers();
  }, [markers, filter, colorBy]);

  const filtered = filter === 'all' ? markers : markers.filter(m => m.status === filter);

  const handleUpvote = (id) => {
    setUpvoted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const stats = {
    total: markers.length,
    high: markers.filter(m => m.priority === 'high' || m.priority === 'critical').length,
    open: markers.filter(m => m.status === 'open').length,
    resolved: markers.filter(m => m.status === 'resolved').length,
  };

  return (
    <div className="main-content animate-fade">
      {/* Inline styles for custom markers */}
      <style>{`
        .custom-marker { background: none !important; border: none !important; }
        .custom-tooltip { background: none !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .custom-tooltip .leaflet-tooltip-arrow { display: none; }
        .leaflet-container { background: #0a0a0f !important; }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
        }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white mb-2">Grievance Map</h1>
        <p className="text-sm" style={{ color: '#64748b' }}>
          Interactive map showing all reported issues by location. Powered by NLP geocoding.
        </p>
        {departmentFilter && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
            🏢 Filtered: {departmentFilter} Department
          </div>
        )}
      </div>

      {/* Stats bar - Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Markers', value: stats.total, color: '#8b5cf6', icon: '📍' },
          { label: 'High Priority', value: stats.high, color: '#ef4444', icon: '🔴' },
          { label: 'Open Issues', value: stats.open, color: '#f59e0b', icon: '🟡' },
          { label: 'Resolved', value: stats.resolved, color: '#10b981', icon: '✅' },
        ].map((s) => (
          <div
            key={s.label}
            className="glass rounded-lg p-4 flex flex-col items-center text-center"
            style={{ border: `1px solid ${s.color}25`, background: `${s.color}08` }}
          >
            <span className="text-2xl mb-2">{s.icon}</span>
            <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: '#64748b' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent mb-6" style={{ opacity: 0.2 }} />

      {/* Filter + Color control */}
      <div className="mb-6 space-y-4">
        {/* Filter Section */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-3 px-1" style={{ color: '#a78bfa' }}>
            🔍 Filter by Status
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'open', 'in-progress', 'resolved'].map((f) => {
              const label = f === 'all'
                ? `All (${filtered.length})`
                : f.replace('-', ' ').charAt(0).toUpperCase() + f.replace('-', ' ').slice(1);

              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-4 py-2.5 rounded-md text-xs font-bold transition-all duration-200"
                  style={{ minWidth: 108, minHeight: 40, ...(filter === f
                    ? {
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        color: '#ffffff',
                        border: '2px solid #a78bfa',
                        boxShadow: '0 0 16px rgba(139, 92, 246, 0.4)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.08)',
                        color: '#e2e8f0',
                        border: '1.5px solid rgba(255,255,255,0.15)',
                        boxShadow: 'none',
                      }
                  ) }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(139,92,246,0.2), transparent)' }} />

        {/* Color Mode Section */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-3 px-1" style={{ color: '#a78bfa' }}>
            🎨 Color by
          </div>
          <div className="flex gap-3 flex-wrap">
            {['priority', 'status'].map((c) => (
              <button
                key={c}
                onClick={() => setColorBy(c)}
                className="px-5 py-2.5 rounded-md text-xs font-bold capitalize transition-all duration-200 flex items-center justify-center gap-2 text-center"
                style={{ minWidth: 120, minHeight: 40, ...(colorBy === c
                  ? {
                      background: c === 'priority'
                        ? 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                      color: '#ffffff',
                      border: `2px solid ${c === 'priority' ? '#f472b6' : '#60a5fa'}`,
                      boxShadow: `0 0 16px ${c === 'priority' ? 'rgba(236, 72, 153, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                    }
                  : {
                      background: 'rgba(255,255,255,0.08)',
                      color: '#e2e8f0',
                      border: '1.5px solid rgba(255,255,255,0.15)',
                      boxShadow: 'none',
                    }
                ) }}
              >
                <span className="text-base">{c === 'priority' ? '⚡' : '📊'}</span>
                <span>{c}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leaflet Map */}
        <div className="lg:col-span-2 glass rounded-lg overflow-hidden relative"
          style={{ height: 520, border: '1px solid rgba(139,92,246,0.15)' }}>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-[1000]"
              style={{ background: 'rgba(10,10,15,0.8)' }}>
              <div className="text-center">
                <div className="text-3xl mb-2 animate-pulse">🗺️</div>
                <p className="text-sm font-semibold" style={{ color: '#8b5cf6' }}>Loading map data...</p>
              </div>
            </div>
          )}

          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

          {/* Legend overlay */}
          <div className="absolute top-4 left-4 glass rounded-xl p-3 z-[800]"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: '#a78bfa' }}>
              {colorBy === 'priority' ? '⚡ Priority' : '📊 Status'}
            </div>
            {(colorBy === 'priority'
              ? [['critical', '#ec4899'], ['high', '#ef4444'], ['medium', '#f59e0b'], ['low', '#10b981']]
              : [['open', '#f59e0b'], ['in-progress', '#6366f1'], ['resolved', '#10b981'], ['closed', '#64748b']]
            ).map(([label, color]) => (
              <div key={label} className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}80` }} />
                <span className="text-xs capitalize" style={{ color: '#94a3b8' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Marker count badge */}
          <div className="absolute top-4 right-4 glass rounded-lg px-3 py-1.5 z-[800]"
            style={{ border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(10,10,15,0.85)' }}>
            <span className="text-xs font-bold" style={{ color: '#a78bfa' }}>
              📍 {filtered.length} markers
            </span>
          </div>

          {filtered.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center z-[800]"
              style={{ background: 'rgba(10,10,15,0.6)' }}>
              <div className="text-center">
                <div className="text-3xl mb-2">🗺️</div>
                <p className="text-sm font-semibold" style={{ color: '#475569' }}>
                  No geocoded grievances to display
                </p>
                <p className="text-xs mt-1" style={{ color: '#334155' }}>
                  Submit grievances with location details to see them on the map
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 520 }}>
          {selected ? (
            <div className="glass rounded-lg p-5" style={{ border: '1px solid rgba(139,92,246,0.2)' }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-mono text-xs font-bold mb-1" style={{ color: '#8b5cf6' }}>{selected.ticket_id}</div>
                  <h3 className="text-sm font-bold text-white leading-snug">{selected.subject}</h3>
                </div>
                <button onClick={() => setSelected(null)} className="text-lg hover:text-white transition-colors" style={{ color: '#475569' }}>✕</button>
              </div>

              {/* Badges */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" 
                  style={{ background: `${PRIORITY_COLORS[selected.priority] || '#8b5cf6'}20`, border: `1px solid ${PRIORITY_COLORS[selected.priority] || '#8b5cf6'}40` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLORS[selected.priority] || '#8b5cf6' }} />
                  <span className="text-xs font-bold capitalize" style={{ color: PRIORITY_COLORS[selected.priority] || '#8b5cf6' }}>{selected.priority}</span>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              {/* Description */}
              <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-xs leading-relaxed" style={{ color: '#cbd5e1' }}>
                  {selected.description}
                </div>
              </div>

              {/* Location */}
              {(selected.district || selected.state) && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                  <span className="text-lg">📍</span>
                  <div className="text-xs font-medium" style={{ color: '#a78bfa' }}>
                    <div>{selected.district}{selected.state ? ', ' + selected.state : ''}</div>
                    {selected.country && <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{selected.country}</div>}
                  </div>
                </div>
              )}

              {/* Coordinates */}
              <div className="mb-4 text-xs font-mono p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', color: '#64748b' }}>
                <div>Lat: <span style={{ color: '#94a3b8' }}>{selected.latitude?.toFixed(4)}</span></div>
                <div>Lng: <span style={{ color: '#94a3b8' }}>{selected.longitude?.toFixed(4)}</span></div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => handleUpvote(selected.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                  style={upvoted.has(selected.id)
                    ? { background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.4)' }
                    : { background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
                  ▲ {(selected.upvote_count || 0) + (upvoted.has(selected.id) ? 1 : 0)}
                </button>
                <button onClick={() => navigate(`/grievance/${selected.ticket_id}`)}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
                  View Details →
                </button>
              </div>
            </div>
          ) : (
            <div className="glass rounded-lg p-5 text-center" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-3xl mb-2">📍</div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#94a3b8' }}>Select a marker</p>
              <p className="text-xs" style={{ color: '#475569' }}>Click any marker on the map to view grievance details</p>
            </div>
          )}

          {/* List */}
          <div className="text-xs font-bold uppercase tracking-wider px-1 py-2 mb-2" style={{ color: '#8b5cf6', borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
            📍 {filtered.length} Geocoded Grievances
          </div>
          {filtered.slice(0, 10).map(g => (
            <button key={g.id} onClick={() => {
              setSelected(g);
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo([g.latitude, g.longitude], 14, { duration: 1 });
              }
            }}
              className="glass rounded-lg transition-all mb-2 text-left hover:border-opacity-100"
              style={{
                padding: '12px',
                borderColor: selected?.id === g.id ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,0.15)',
                borderWidth: '1px',
                background: selected?.id === g.id ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
              }}>
              {/* Header: Ticket ID + Priority + Status */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold" style={{ color: '#8b5cf6' }}>{g.ticket_id}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" 
                    style={{ background: `${PRIORITY_COLORS[g.priority] || '#8b5cf6'}20`, border: `1px solid ${PRIORITY_COLORS[g.priority] || '#8b5cf6'}40` }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLORS[g.priority] || '#8b5cf6' }} />
                    <span className="text-xs font-bold capitalize" style={{ color: PRIORITY_COLORS[g.priority] || '#8b5cf6' }}>{g.priority}</span>
                  </div>
                  <StatusBadge status={g.status} />
                </div>
              </div>

              {/* Subject - Allow wrapping */}
              <div className="mb-2">
                <div className="text-xs font-bold text-white leading-relaxed line-clamp-2">{g.subject}</div>
              </div>

              {/* Description preview - Show first 80 chars */}
              {g.description && (
                <div className="text-xs leading-relaxed mb-2 line-clamp-2" style={{ color: '#94a3b8' }}>
                  {g.description.length > 80 ? g.description.slice(0, 80) + '...' : g.description}
                </div>
              )}

              {/* Location - Allow wrapping */}
              {g.district && (
                <div className="flex items-center gap-1 text-xs" style={{ color: '#64748b' }}>
                  <span>📍</span>
                  <span className="line-clamp-1">{g.district}{g.state ? ', ' + g.state : ''}</span>
                </div>
              )}
            </button>
          ))}
          {filtered.length > 10 && (
            <div className="text-xs text-center py-2" style={{ color: '#475569' }}>
              + {filtered.length - 10} more on map
            </div>
          )}
        </div>
      </div>

      {/* District Intelligence — Heat Map Section */}
      <HeatMapContainer mapInstance={mapInstanceRef.current} />
    </div>
  );
}
