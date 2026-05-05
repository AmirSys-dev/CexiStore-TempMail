import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastId;
    setToasts(prev => [...prev.slice(-2), { id, message, type }]);
    timers.current[id] = setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  const toast = useMemo(() => ({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  }), [addToast]);

  const toastIcon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite" aria-relevant="additions removals text">
        {toasts.map(t => {
          const Icon = toastIcon[t.type] || Info;
          const isError = t.type === 'error';
          return (
            <div
              key={t.id}
              className={`toast toast-${t.type}`}
              onClick={() => removeToast(t.id)}
              role={isError ? 'alert' : 'status'}
              aria-live={isError ? 'assertive' : 'polite'}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
