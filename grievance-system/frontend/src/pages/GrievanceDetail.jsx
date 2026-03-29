import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { grievanceAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import Timeline from '../components/Timeline';
import AIResponsePanel from '../components/AIResponsePanel';
import { useAuth } from '../context/AuthContext';

export default function GrievanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    grievanceAPI.getById(id)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="main-content">
      <div className="flex flex-col gap-4 max-w-3xl mx-auto">
        {[200, 120, 160].map(h => <div key={h} className="skeleton rounded-2xl" style={{ height: h }} />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="main-content flex items-center justify-center min-h-[60vh]">
      <div className="glass rounded-2xl p-10 text-center max-w-md">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-white mb-2">Grievance Not Found</h2>
        <p className="text-sm mb-6" style={{ color: '#64748b' }}>{error}</p>
        <button onClick={() => navigate('/track')}
          className="px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
          ← Back to Track
        </button>
      </div>
    </div>
  );

  const { grievance, timeline, notes, sla } = data;

  return (
    <div className="main-content animate-fade">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)}
          className="mb-6 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}>
          ← Back
        </button>

        <div className="glass rounded-2xl p-6 mb-4" style={{ border: '1px solid rgba(139,92,246,0.15)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-mono text-xs mb-1" style={{ color: '#8b5cf6' }}>{grievance.ticket_id}</div>
              <h1 className="text-2xl font-black text-white mb-3">{grievance.subject}</h1>
              <div className="flex gap-2 flex-wrap">
                <StatusBadge status={grievance.status} />
                <PriorityBadge priority={grievance.priority} />
                {grievance.category && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>{grievance.category}</span>
                )}
                {grievance.sentiment && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>{grievance.sentiment}</span>
                )}
              </div>
            </div>
            <button onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}>🖨️</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              ['Customer', grievance.customer_name],
              ['Email', grievance.customer_email],
              ['Assigned To', grievance.assigned_officer_name || 'Unassigned'],
              ['SLA', sla?.breached ? '⚠️ Breached' : `✅ ${sla?.hoursRemaining?.toFixed(1)}h left`],
            ].map(([k, v]) => (
              <div key={k} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>{k}</div>
                <div className="text-sm font-medium text-white truncate">{v}</div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>Description</div>
            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{grievance.description}</p>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 mb-4" style={{ border: '1px solid rgba(139,92,246,0.15)' }}>
          <h2 className="text-lg font-bold text-white mb-4">Status Timeline</h2>
          <Timeline items={timeline} />
        </div>

        {(user?.role === 'admin' || user?.role === 'officer') && (
          <>
            <AIResponsePanel grievance={grievance} initialResponse={grievance.ai_response} />
            {notes?.length > 0 && (
              <div className="glass rounded-2xl p-6 mt-4" style={{ border: '1px solid rgba(139,92,246,0.15)' }}>
                <h2 className="text-lg font-bold text-white mb-4">Internal Notes</h2>
                {notes.map(n => (
                  <div key={n.id} className="p-3 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-xs mb-1" style={{ color: '#475569' }}>{n.author_name} · {new Date(n.created_at).toLocaleString()}</div>
                    <div className="text-sm" style={{ color: '#94a3b8' }}>{n.note}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
