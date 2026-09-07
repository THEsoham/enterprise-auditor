import React from 'react';
import { useAudit } from '../../context/AuditContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useAudit();

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-md ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : toast.type === 'error'
            ? 'bg-rose-50 border-rose-300 text-rose-900'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div className="shrink-0">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
        </div>
        <p className="text-xs font-semibold leading-snug">{toast.message}</p>
      </div>
    </div>
  );
};
