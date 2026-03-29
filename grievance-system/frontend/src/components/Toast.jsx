import { useState, useCallback } from 'react';

let toastId = 0;
let globalAddToast = null;

export function useToast() {
  const show = (message, type = 'info') => {
    if (globalAddToast) globalAddToast({ id: ++toastId, message, type });
  };
  return { show };
}

const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
const colors = {
  success: { border: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '#10b981' },
  error: { border: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '#ef4444' },
  info: { border: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: '#8b5cf6' },
  warning: { border: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '#f59e0b' },
};

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  globalAddToast = useCallback((toast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), 4000);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => {
        const c = colors[t.type] || colors.info;
        return (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium animate-slide-right"
            style={{
              background: 'rgba(15,15,26,0.95)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${c.border}`,
              boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${c.border}20`,
              color: '#f1f5f9',
              minWidth: '280px',
              maxWidth: '360px',
            }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: c.bg, color: c.icon }}>
              {icons[t.type]}
            </div>
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
