import { useState } from 'react';
import { aiAPI } from '../services/api';
import { useToast } from './Toast';

export default function AIResponsePanel({ grievance, initialResponse }) {
  const [response, setResponse] = useState(initialResponse || '');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const generate = async () => {
    setLoading(true);
    try {
      const res = await aiAPI.suggest(grievance);
      setResponse(res.data.response);
    } catch {
      show('AI generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl p-5 mt-4" style={{
      background: 'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(99,102,241,0.04))',
      border: '1px solid rgba(139,92,246,0.2)',
    }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#8b5cf6' }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#8b5cf6' }}>AI Response</span>
      </div>
      {response ? (
        <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{response}</p>
      ) : (
        <p className="text-sm italic" style={{ color: '#475569' }}>No AI response generated yet.</p>
      )}
      <button onClick={generate} disabled={loading}
        className="mt-3 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
        style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
        {loading ? '⏳ Generating...' : response ? '↺ Regenerate' : '✨ Generate AI Response'}
      </button>
    </div>
  );
}
