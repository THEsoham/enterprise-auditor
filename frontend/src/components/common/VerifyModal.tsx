import React from 'react';
import { ShieldCheck, X, CheckCircle, AlertOctagon, HelpCircle, Loader2 } from 'lucide-react';
import { useAudit } from '../../context/AuditContext';

export const VerifyModal: React.FC = () => {
  const { verifyModal, closeVerifier } = useAudit();
  const { isOpen, finding, result, loading, error } = verifyModal;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-modal overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">AI Skeptical Verifier</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Adversarial scrutiny powered by <strong className="text-emerald-700">Llama 3.1</strong>
              </p>
            </div>
          </div>
          <button
            onClick={closeVerifier}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Finding being audited */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Statement Under Audit
            </div>
            <p className="text-slate-800 font-semibold">{finding}</p>
          </div>

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-slate-600 font-medium text-xs">
                Querying Llama 3.1 adversarial verifier across citations...
              </p>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Verdict Header */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2.5">
                  {result.verdict === 'SUPPORTED' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : result.verdict === 'NOT_SUPPORTED' ? (
                    <AlertOctagon className="w-5 h-5 text-rose-600" />
                  ) : (
                    <HelpCircle className="w-5 h-5 text-amber-600" />
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Verdict
                    </span>
                    <span
                      className={`font-bold text-sm ${
                        result.verdict === 'SUPPORTED'
                          ? 'text-emerald-700'
                          : result.verdict === 'NOT_SUPPORTED'
                          ? 'text-rose-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {result.verdict.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Confidence
                  </span>
                  <span className="font-bold text-xs text-slate-800">{result.confidence || 'HIGH'}</span>
                </div>
              </div>

              {/* Reasoning */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Adversarial Reasoning & Analysis
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 leading-relaxed font-medium">
                  {result.reasoning}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/70 text-[11px] text-slate-400">
          <span>Model: Llama 3.1 Instruct</span>
          <button
            onClick={closeVerifier}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
