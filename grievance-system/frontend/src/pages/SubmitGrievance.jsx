import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { grievanceAPI, nlpAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const CATEGORIES = ['Delivery', 'Refund', 'Product Quality', 'Customer Service', 'Billing', 'Technical', 'Other'];
const PRIORITIES = [
  { value: 'low',      label: 'Low',      color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)' },
  { value: 'medium',   label: 'Medium',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)' },
  { value: 'high',     label: 'High',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)'  },
  { value: 'critical', label: 'Critical', color: '#ec4899', bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.35)' },
];

export default function SubmitGrievance() {
  const navigate = useNavigate();
  const { show } = useToast();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [triaging, setTriaging] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [success, setSuccess] = useState(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    customerName: user?.name || '', customerEmail: user?.email || '', customerPhone: '',
    orderId: '', category: '', priority: 'medium',
    subject: '', description: '',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleTriage = async () => {
    if (!form.description && !form.subject) {
      show('Please enter a description or subject first', 'error');
      return;
    }
    setTriaging(true);
    try {
      const res = await nlpAPI.triage(form.description, form.subject);
      const data = res.data;
      setTriageResult(data);
      setForm(f => ({
        ...f,
        priority: data.priority || f.priority,
        category: data.category || f.category,
      }));
      show(`Priority predicted: ${(data.priority || '').toUpperCase()} (${Math.round((data.confidence || 0) * 100)}% confidence)`, 'success');
    } catch (err) {
      show('NLP triage service unavailable — set priority manually', 'error');
    } finally {
      setTriaging(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('attachment', file);
      const res = await grievanceAPI.submit(fd);
      setSuccess(res.data.grievance.ticket_id);
      show('Grievance submitted successfully!', 'success');
      await refreshUser();
    } catch (err) {
      show(err.response?.data?.error || 'Submission failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="main-content animate-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <div className="glass" style={{ maxWidth: 480, width: '100%', padding: '3rem 2.5rem', textAlign: 'center', border: '1px solid rgba(16,185,129,0.25)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1.2rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '0.6rem' }}>Submitted Successfully!</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.8rem', lineHeight: 1.6 }}>
            Your grievance has been registered. Save your Ticket ID below for tracking.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: '2rem' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '10px 24px', letterSpacing: '0.04em' }}>
              {success}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(success); show('Ticket ID copied!', 'success'); }}
              title="Copy Ticket ID"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: '#10b981', fontSize: '1rem' }}>
              📋
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate(`/track?id=${success}`)} style={btnPrimary}>
              🔍 Track Status
            </button>
            <button onClick={() => navigate('/profile', { state: { refresh: true } })} style={btnPrimary}>
              👤 Go to Profile
            </button>
            <button onClick={() => { setSuccess(null); setForm({ customerName: user?.name||'', customerEmail: user?.email||'', customerPhone:'', orderId:'', category:'', priority:'medium', subject:'', description:'' }); }} style={btnOutline}>
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content animate-fade" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 820, width: '100%', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem', width: '100%' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#f1f5f9', marginBottom: '0.5rem' }}>
            Submit a Grievance
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.8, maxWidth: 640, margin: '0 auto' }}>
            Fill in the details below. Our AI will automatically classify and prioritize your case.
          </p>
        </div>

        {/* Form Card */}
        <div className="glass" style={{ padding: '2.5rem 2rem', width: '100%' }}>
          <form onSubmit={handleSubmit}>

            {/* Section: Personal Info */}
            <SectionLabel>Personal Information</SectionLabel>
            <div style={grid2}>
              <Field label="Full Name *" placeholder="John Doe" value={form.customerName} onChange={set('customerName')} required />
              <Field label="Email Address *" type="email" placeholder="john@example.com" value={form.customerEmail} onChange={set('customerEmail')} required />
              <Field label="Phone Number" placeholder="+91 98765 43210" value={form.customerPhone} onChange={set('customerPhone')} />
              <Field label="Order / Reference ID" placeholder="ORD-123456" value={form.orderId} onChange={set('orderId')} />
            </div>

            <Divider />

            {/* Section: Issue Details */}
            <SectionLabel>Issue Details</SectionLabel>
            <div style={grid2}>
              <div style={{ marginBottom: '1.4rem' }}>
                <label style={labelStyle}>Category</label>
                <select value={form.category} onChange={set('category')} style={inputStyle}>
                  <option value="">AI will auto-detect</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Field label="Subject *" placeholder="Brief summary of your issue" value={form.subject} onChange={set('subject')} required />
            </div>

            {/* Priority — AI-powered auto-triage */}
            <div style={{ marginBottom: '1.4rem' }}>
              <label style={labelStyle}>Priority</label>

              {/* Predict Priority button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <button type="button" onClick={handleTriage} disabled={triaging}
                  style={{
                    padding: '10px 24px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700,
                    cursor: triaging ? 'wait' : 'pointer', transition: 'all 0.2s',
                    border: '1.5px solid rgba(139,92,246,0.5)',
                    color: '#a78bfa',
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))',
                    opacity: triaging ? 0.6 : 1,
                    fontFamily: 'inherit',
                    boxShadow: '0 0 20px rgba(139,92,246,0.1)',
                  }}>
                  {triaging ? '🔄 Analyzing...' : '🤖 Predict Priority'}
                </button>
                <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                  AI analyzes your description for urgency & sentiment
                </span>
              </div>

              {/* Triage result card */}
              {triageResult && (
                <div style={{
                  marginBottom: 14, padding: '14px 18px', borderRadius: 12,
                  background: 'rgba(139,92,246,0.06)',
                  border: '1px solid rgba(139,92,246,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8b5cf6' }}>AI Triage Result</span>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                      background: PRIORITIES.find(p => p.value === triageResult.priority)?.bg || 'rgba(245,158,11,0.12)',
                      color: PRIORITIES.find(p => p.value === triageResult.priority)?.color || '#f59e0b',
                      border: `1px solid ${PRIORITIES.find(p => p.value === triageResult.priority)?.border || 'rgba(245,158,11,0.35)'}`,
                    }}>
                      {triageResult.priority?.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {Math.round((triageResult.confidence || 0) * 100)}% confidence
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>Sentiment: <b style={{ color: triageResult.sentiment === 'negative' ? '#ef4444' : triageResult.sentiment === 'positive' ? '#10b981' : '#f59e0b' }}>{triageResult.sentiment}</b></span>
                    {triageResult.category && <span>Category: <b style={{ color: '#a78bfa' }}>{triageResult.category}</b></span>}
                    {triageResult.urgency_keywords?.length > 0 && (
                      <span>Keywords: <b style={{ color: '#ef4444' }}>{triageResult.urgency_keywords.slice(0, 3).join(', ')}</b></span>
                    )}
                  </div>
                </div>
              )}

              {/* Priority pills (still selectable for manual override) */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {PRIORITIES.map((p) => {
                  const active = form.priority === p.value;
                  return (
                    <button key={p.value} type="button"
                      onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                      style={{
                        padding: '8px 22px', borderRadius: 20, fontSize: '0.83rem', fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.18s',
                        border: `1.5px solid ${active ? p.color : 'rgba(255,255,255,0.1)'}`,
                        color: active ? p.color : '#475569',
                        background: active ? p.bg : 'transparent',
                      }}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.73rem', color: '#334155', marginTop: 8 }}>
                💡 Click "Predict Priority" to auto-detect, or select manually to override
              </p>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1.4rem' }}>
              <label style={labelStyle}>Description *</label>
              <textarea
                value={form.description}
                onChange={set('description')}
                required
                placeholder="Describe your issue in detail. Include dates, order numbers, and any relevant information that will help us resolve your case faster..."
                style={{ ...inputStyle, minHeight: 150, resize: 'vertical' }}
              />
            </div>

            <Divider />

            {/* Attachment */}
            <SectionLabel>Attachment (Optional)</SectionLabel>
            <div style={{ marginBottom: '1.4rem' }}>
              <label style={labelStyle}>Upload File</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setFile(e.target.files[0])}
                style={{ ...inputStyle, cursor: 'pointer' }}
              />
              <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: 6 }}>
                Accepted: JPG, PNG, PDF — Maximum 5MB
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button type="button" onClick={() => navigate('/')} style={btnOutline}>
                Cancel
              </button>
              <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
                {loading ? '⏳ Submitting...' : '✍️ Submit Grievance'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8b5cf6', marginBottom: '1.2rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(139,92,246,0.2)', textAlign: 'center' }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2rem 0' }} />;
}

function Field({ label, ...props }) {
  return (
    <div style={{ marginBottom: '1.4rem', textAlign: 'center' }}>
      <label style={labelStyle}>{label}</label>
      <input
        {...props}
        style={{ ...inputStyle, maxWidth: '100%' }}
        onFocus={(e) => { e.target.style.borderColor = 'rgba(139,92,246,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)'; }}
        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

const grid2 = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '1rem',
  alignItems: 'start',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: '#64748b',
  marginBottom: 8,
  textAlign: 'center',
};

const inputStyle = {
  width: '100%',
  padding: '11px 15px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: '#f1f5f9',
  fontSize: '0.92rem',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'all 0.18s',
  boxSizing: 'border-box',
};

const btnPrimary = {
  padding: '11px 32px',
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
  color: 'white',
  fontWeight: 700,
  fontSize: '0.92rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.18s',
};

const btnOutline = {
  padding: '11px 28px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  color: '#94a3b8',
  fontWeight: 600,
  fontSize: '0.92rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.18s',
};
