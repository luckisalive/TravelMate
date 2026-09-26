import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ message, description, type = 'info', duration = 4000 }) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, description, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toast = {
    success: (message, description, duration) =>
      addToast({ message, description, type: 'success', duration }),
    error: (message, description, duration) =>
      addToast({ message, description, type: 'error', duration }),
    info: (message, description, duration) =>
      addToast({ message, description, type: 'info', duration }),
    warning: (message, description, duration) =>
      addToast({ message, description, type: 'warning', duration }),
    dismiss: removeToast,
  };

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'success':
        return 'border-emerald-200 bg-white shadow-emerald-100';
      case 'error':
        return 'border-rose-200 bg-white shadow-rose-100';
      case 'warning':
        return 'border-amber-200 bg-white shadow-amber-100';
      case 'info':
      default:
        return 'border-indigo-200 bg-white shadow-indigo-100';
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Notification Container */}
      <div 
        aria-live="polite"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:top-20 sm:bottom-auto sm:right-6 z-50 flex flex-col gap-2.5 max-w-[calc(100vw-2rem)] sm:max-w-md w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 sm:slide-in-from-top-3 ${getBorderColor(
              t.type
            )}`}
          >
            {getToastIcon(t.type)}
            <div className="flex-1 min-w-0">
              <h5 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                {t.message}
              </h5>
              {t.description && (
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
