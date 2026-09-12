import React, { useEffect, useState } from 'react';
import { useAudit } from '../../context/AuditContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useAudit();
  const [visible, setVisible] = useState(false);
  const [currentToast, setCurrentToast] = useState(toast);

  useEffect(() => {
    if (toast) {
      setCurrentToast(toast);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [toast]);

  if (!currentToast || !visible) return null;

  const icon = {
    success: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
    error: <AlertCircle className="w-6 h-6 text-rose-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
  }[currentToast.type || 'info'];

  const bgClass = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-rose-50 border-rose-200',
    info: 'bg-blue-50 border-blue-200',
  }[currentToast.type || 'info'];

  const titleColor = {
    success: 'text-emerald-800',
    error: 'text-rose-800',
    info: 'text-blue-800',
  }[currentToast.type || 'info'];

  const title = {
    success: 'Success',
    error: 'Error',
    info: 'Notice',
  }[currentToast.type || 'info'];

  const progressColor = {
    success: 'bg-emerald-400',
    error: 'bg-rose-400',
    info: 'bg-blue-400',
  }[currentToast.type || 'info'];

  return (
    <div
      className="fixed top-5 right-5 z-[9999]"
      style={{
        animation: 'toast-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className={`flex items-start gap-3 px-5 py-4 rounded-xl border shadow-2xl max-w-sm min-w-[320px] backdrop-blur-sm ${bgClass}`}
      >
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${titleColor}`}>{title}</p>
          <p className="text-xs font-medium text-slate-700 mt-0.5 leading-relaxed">
            {currentToast.message}
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="shrink-0 mt-0.5 p-0.5 rounded-md hover:bg-black/5 transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
      {/* Auto-dismiss progress bar */}
      <div className="mx-2 mt-0 h-1 rounded-b-full overflow-hidden bg-white/50">
        <div
          className={`h-full rounded-full ${progressColor}`}
          style={{
            animation: 'toast-progress 4s linear forwards',
          }}
        />
      </div>

      <style>{`
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
