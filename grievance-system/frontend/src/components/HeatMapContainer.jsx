import { useState, useEffect, useRef, useCallback } from 'react';
import { analyticsAPI } from '../services/api';

const PRIORITY_COLORS = {
  critical: '#ec4899',
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

export default function HeatMapContainer({ mapInstance }) {
  const [hierarchy, setHierarchy] = useState({});
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [heatEnabled, setHeatEnabled] = useState(false);
  const [heatData, setHeatData] = useState(null);
  const [loading, setLoading] = useState(false);
  const heatLayerRef = useRef(null);

  // Load location hierarchy on mount
  useEffect(() => {
    analyticsAPI.getLocations()
      .then(r => {
        setHierarchy(r.data.hierarchy || {});
        // Auto-select India if it's the only country
        const countries = Object.keys(r.data.hierarchy || {});
        if (countries.length === 1) {
          setCountry(countries[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Reset cascading dropdowns
  useEffect(() => { setState(''); setDistrict(''); }, [country]);
  useEffect(() => { setDistrict(''); }, [state]);

  // Fetch heatmap data when district changes
  const fetchHeatmap = useCallback(async (selectedDistrict, selectedState, selectedCountry) => {
    if (!selectedDistrict && !selectedState) return;
    setLoading(true);
    try {
      const res = await analyticsAPI.getHeatmapData({
        district: selectedDistrict || undefined,
        state: selectedState || undefined,
        country: selectedCountry || undefined,
      });
      setHeatData(res.data);

      // Auto-zoom to district
      if (res.data.districtInfo && mapInstance) {
        const { lat, lng, zoom } = res.data.districtInfo;
        mapInstance.flyTo([lat, lng], zoom || 12, { duration: 1.5 });
      } else if (res.data.heatPoints?.length > 0 && mapInstance) {
        const L = await import('leaflet');
        const bounds = L.latLngBounds(res.data.heatPoints.map(p => [p[0], p[1]]));
        mapInstance.flyToBounds(bounds, { padding: [60, 60], maxZoom: 14, duration: 1.5 });
      }

      // Auto-enable heat map
      if (res.data.heatPoints?.length > 0) {
        setHeatEnabled(true);
      }
    } catch (err) {
      console.error('Heatmap fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [mapInstance]);

  // Trigger fetch when district is selected
  useEffect(() => {
    if (district) {
      fetchHeatmap(district, state, country);
    }
  }, [district, fetchHeatmap, state, country]);

  // Render/clear the heat layer on the map
  useEffect(() => {
    if (!mapInstance) return;

    const updateHeatLayer = async () => {
      // Remove previous layer
      if (heatLayerRef.current) {
        mapInstance.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }

      if (!heatEnabled || !heatData?.heatPoints?.length) return;

      const L = await import('leaflet');
      await import('leaflet.heat');

      // Create heat layer with custom gradient
      const heat = L.heatLayer(heatData.heatPoints, {
        radius: 35,
        blur: 25,
        maxZoom: 16,
        minOpacity: 0.4,
        max: 1.0,
        gradient: {
          0.0: '#1a1a2e',
          0.2: '#16213e',
          0.4: '#3b82f6',   // Blue — Safe
          0.5: '#06b6d4',   // Cyan
          0.6: '#eab308',   // Yellow — Warning
          0.7: '#f97316',   // Orange
          0.8: '#ef4444',   // Red
          0.9: '#dc2626',   // Deep Red
          1.0: '#991b1b',   // Crisis — Deep Red
        },
      });

      heat.addTo(mapInstance);
      heatLayerRef.current = heat;
    };

    updateHeatLayer();

    return () => {
      if (heatLayerRef.current && mapInstance) {
        mapInstance.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [heatEnabled, heatData, mapInstance]);

  const countries = Object.keys(hierarchy);
  const states = country ? Object.keys(hierarchy[country] || {}) : [];
  const districts = (country && state) ? (hierarchy[country]?.[state] || []) : [];

  return (
    <div className="glass rounded-lg p-5 mt-6" style={{ border: '1px solid rgba(139,92,246,0.2)' }}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(245,158,11,0.2))', border: '1px solid rgba(239,68,68,0.3)' }}>
            🔥
          </div>
          <div>
            <h2 className="text-lg font-black text-white">District Intelligence</h2>
            <p className="text-xs" style={{ color: '#64748b' }}>Heat map visualization of grievance density & severity</p>
          </div>
        </div>

        {/* Toggle Heat Map */}
        <button
          onClick={() => setHeatEnabled(prev => !prev)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all"
          style={heatEnabled ? {
            background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(245,158,11,0.15))',
            border: '1.5px solid rgba(239,68,68,0.5)',
            color: '#f87171',
            boxShadow: '0 0 20px rgba(239,68,68,0.15)',
          } : {
            background: 'rgba(255,255,255,0.05)',
            border: '1.5px solid rgba(255,255,255,0.1)',
            color: '#64748b',
          }}
        >
          <div className="relative w-9 h-5 rounded-full transition-all"
            style={{ background: heatEnabled ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)' }}>
            <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
              style={{
                left: heatEnabled ? '18px' : '2px',
                background: heatEnabled ? '#ef4444' : '#475569',
                boxShadow: heatEnabled ? '0 0 8px rgba(239,68,68,0.6)' : 'none',
              }} />
          </div>
          {heatEnabled ? '🔥 Heat Map ON' : 'Toggle Heat Map'}
        </button>
      </div>

      {/* Cascading Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {/* Country */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8b5cf6' }}>
            🌍 Country
          </label>
          <select value={country} onChange={e => setCountry(e.target.value)}
            style={selectStyle}>
            <option value="">Select Country</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* State */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8b5cf6' }}>
            🏛️ State
          </label>
          <select value={state} onChange={e => setState(e.target.value)}
            disabled={!country} style={{ ...selectStyle, opacity: country ? 1 : 0.4 }}>
            <option value="">Select State</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8b5cf6' }}>
            📍 District
          </label>
          <select value={district} onChange={e => setDistrict(e.target.value)}
            disabled={!state} style={{ ...selectStyle, opacity: state ? 1 : 0.4 }}>
            <option value="">Select District</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-4 gap-2">
          <div className="animate-spin w-4 h-4 border-2 rounded-full"
            style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }} />
          <span className="text-xs font-semibold" style={{ color: '#8b5cf6' }}>Loading heat map data...</span>
        </div>
      )}

      {/* Stats Dashboard */}
      {heatData && !loading && (
        <div>
          {/* Divider */}
          <div className="h-px mb-4" style={{ background: 'linear-gradient(to right, transparent, rgba(239,68,68,0.3), rgba(245,158,11,0.3), transparent)' }} />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            {[
              { label: 'Total Active', value: heatData.stats?.total || 0, color: '#8b5cf6', icon: '📊' },
              { label: 'Critical', value: heatData.stats?.critical || 0, color: '#ec4899', icon: '🔴' },
              { label: 'High', value: heatData.stats?.high || 0, color: '#ef4444', icon: '🟠' },
              { label: 'Medium', value: heatData.stats?.medium || 0, color: '#f59e0b', icon: '🟡' },
              { label: 'Avg Score', value: heatData.stats?.avgScore || 0, color: '#06b6d4', icon: '📈' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-3 text-center"
                style={{ background: `${s.color}08`, border: `1px solid ${s.color}25` }}>
                <div className="text-lg mb-1">{s.icon}</div>
                <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Category Breakdown */}
          {heatData.stats?.categories && Object.keys(heatData.stats.categories).length > 0 && (
            <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#a78bfa' }}>
                📋 Category Breakdown
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(heatData.stats.categories)
                  .sort(([,a], [,b]) => b - a)
                  .map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                      <span className="text-xs font-bold" style={{ color: '#a78bfa' }}>{cat}</span>
                      <span className="text-xs font-black px-1.5 py-0.5 rounded-md"
                        style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}>{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Heat Gradient Legend */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-bold" style={{ color: '#475569' }}>Intensity:</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden"
              style={{
                background: 'linear-gradient(to right, #1a1a2e, #3b82f6, #06b6d4, #eab308, #f97316, #ef4444, #991b1b)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
              }} />
            <div className="flex gap-4 text-xs font-semibold" style={{ color: '#64748b' }}>
              <span style={{ color: '#3b82f6' }}>Safe</span>
              <span style={{ color: '#eab308' }}>Warning</span>
              <span style={{ color: '#991b1b' }}>Crisis</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!heatData && !loading && (
        <div className="text-center py-6">
          <div className="text-3xl mb-2">🗺️</div>
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>Select a district to load heat map data</p>
          <p className="text-xs mt-1" style={{ color: '#334155' }}>
            Choose Country → State → District from the dropdowns above
          </p>
        </div>
      )}
    </div>
  );
}

const selectStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid rgba(139,92,246,0.25)',
  background: 'rgba(15,15,26,0.8)',
  color: '#e2e8f0',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  fontWeight: 600,
  outline: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s',
  appearance: 'auto',
};
