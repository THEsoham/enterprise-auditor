import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  CheckCircle,
  AlertOctagon,
  HelpCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useAudit } from '../../context/AuditContext';

const ClaimsList: React.FC<{
  title: string;
  items: string[];
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}> = ({ title, items, icon, colorClass, bgClass, borderClass }) => {
  const [open, setOpen] = useState(items.length > 0);

  if (!items || items.length === 0) return null;

  return (
    <div className={`rounded-xl border ${borderClass} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 ${bgClass} cursor-pointer`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className={`text-[11px] font-bold uppercase tracking-wider ${colorClass}`}>
            {title} ({items.length})
          </span>
        </div>
        {open ? (
          <ChevronUp className={`w-3.5 h-3.5 ${colorClass}`} />
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 ${colorClass}`} />
        )}
      </button>
      {open && (
        <ul className="px-3.5 py-2.5 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-slate-700 leading-relaxed font-medium flex gap-2">
              <span className="text-slate-400 font-mono text-[10px] mt-0.5 shrink-0">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const VerifyModal: React.FC = () => {
  const { verifyModal, closeVerifier } = useAudit();
  const { isOpen, finding, result, loading, error } = verifyModal;

  if (!isOpen) return null;

  // Use explanation if available, fall back to reasoning
  const explanationText = result?.explanation || result?.reasoning || '';

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
                Adversarial scrutiny powered by <strong className="text-emerald-700">Gemini 3.6 Flash</strong>
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
                Querying Gemini verification engine across citations...
              </p>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-3 animate-in fade-in duration-150">
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
                  <span
                    className={`font-bold text-xs ${
                      result.confidence === 'HIGH'
                        ? 'text-emerald-700'
                        : result.confidence === 'MEDIUM'
                        ? 'text-amber-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {result.confidence || 'HIGH'}
                  </span>
                </div>
              </div>

              {/* Supported Claims */}
              <ClaimsList
                title="Supported Claims"
                items={result.supported_claims || []}
                icon={<CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                colorClass="text-emerald-700"
                bgClass="bg-emerald-50"
                borderClass="border-emerald-200"
              />

              {/* Unsupported Claims */}
              <ClaimsList
                title="Unsupported Claims"
                items={result.unsupported_claims || []}
                icon={<AlertOctagon className="w-3.5 h-3.5 text-rose-600" />}
                colorClass="text-rose-700"
                bgClass="bg-rose-50"
                borderClass="border-rose-200"
              />

              {/* Contradictions */}
              <ClaimsList
                title="Contradictions"
                items={result.contradictions || []}
                icon={<AlertTriangle className="w-3.5 h-3.5 text-orange-600" />}
                colorClass="text-orange-700"
                bgClass="bg-orange-50"
                borderClass="border-orange-200"
              />

              {/* Missing Information */}
              <ClaimsList
                title="Missing Information"
                items={result.missing_information || []}
                icon={<Info className="w-3.5 h-3.5 text-blue-600" />}
                colorClass="text-blue-700"
                bgClass="bg-blue-50"
                borderClass="border-blue-200"
              />

              {/* Correction */}
              {result.correction && result.correction.trim() !== '' && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                    Suggested Correction
                  </div>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-slate-700 leading-relaxed font-medium">
                    {result.correction}
                  </div>
                </div>
              )}

              {/* Explanation / Reasoning */}
              {explanationText && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Adversarial Reasoning &amp; Analysis
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 leading-relaxed font-medium">
                    {explanationText}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/70 text-[11px] text-slate-400">
          <span>Model: Gemini (Adversarial Verifier)</span>
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
