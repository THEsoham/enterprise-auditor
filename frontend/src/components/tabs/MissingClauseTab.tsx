import React, { useState, useEffect } from 'react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import type { MissingClauseResponse } from '../../types';
import {
  ShieldCheck,
  CheckCircle2,
  FileQuestion,
  Search,
  Loader2,
  AlertOctagon
} from 'lucide-react';

const DEFAULT_CLAUSE_TYPES = [
  'indemnification',
  'limitation_of_liability',
  'force_majeure',
  'confidentiality',
  'governing_law',
  'termination',
  'dispute_resolution',
  'non_compete',
  'data_privacy',
  'audit_rights',
  'insurance',
  'assignment'
];

export const MissingClauseTab: React.FC = () => {
  const { selectedDocument, openVerifier, showToast } = useAudit();

  const [clauseTypes, setClauseTypes] = useState<string[]>(DEFAULT_CLAUSE_TYPES);
  const [selectedClause, setSelectedClause] = useState<string>('force_majeure');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MissingClauseResponse | null>(null);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      const res = await api.getClauseTypes();
      if (res.clause_types && res.clause_types.length > 0) {
        setClauseTypes(res.clause_types);
      }
    } catch {}
  };

  const handleCheck = async () => {
    if (!selectedDocument || !selectedClause) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await api.checkMissingClause(selectedDocument, selectedClause);
      setResult(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to check clause presence', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDocument) {
    return (
      <div className="p-12 bg-white border border-slate-200 rounded-xl shadow-xs text-center my-8">
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto mb-3 shadow-2xs">
          <FileQuestion className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-800 mb-1">Select an Agreement to Test for Missing Clauses</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Choose an executed agreement to verify whether critical covenants (e.g. Force Majeure, IP Indemnity, or GDPR protections) are completely absent.
        </p>
      </div>
    );
  }

  const isNotFound = result?.status === 'NOT_FOUND';

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-lg font-bold text-slate-900">Missing Clause & Negative Proof Checker</h1>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Completeness Audit
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Verify absence of standard protective provisions and omissions in{' '}
          <span className="font-semibold text-slate-800">{selectedDocument}</span>
        </p>
      </div>

      {/* Clause Query Box */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Target Provision to Test
        </label>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={selectedClause}
            onChange={(e) => setSelectedClause(e.target.value)}
            className="w-full sm:w-80 px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white cursor-pointer capitalize shadow-2xs"
          >
            {clauseTypes.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <button
            onClick={handleCheck}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Evaluating Provision...' : 'Check Provision Presence'}
          </button>
        </div>
      </div>

      {/* Result Presentation */}
      {result && (
        <div
          className={`p-6 rounded-xl border transition-all shadow-xs ${
            isNotFound
              ? 'bg-rose-50/50 border-rose-200'
              : 'bg-emerald-50/50 border-emerald-200'
          }`}
        >
          {/* Status Badge & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${
                  isNotFound ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {isNotFound ? <AlertOctagon className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
              </div>
              <div>
                <div className="text-xs text-slate-500 capitalize">
                  Tested Provision: <span className="text-slate-900 font-bold">{result.clause_type.replace(/_/g, ' ')}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isNotFound ? 'CRITICAL OMISSION: Provision Not Found' : 'PROVISION VERIFIED: Provision Present in Contract'}
                </h3>
              </div>
            </div>

            <button
              onClick={() =>
                openVerifier(
                  `Clause '${result.clause_type}' is ${result.status} in ${result.document}.`,
                  result.detail
                )
              }
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Verify with Llama 3.1
            </button>
          </div>

          {/* Detailed Legal Analysis */}
          <div className="py-4 space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Legal Evaluation & Summary
            </div>
            <p className="text-xs text-slate-800 leading-relaxed bg-white p-4 rounded-lg border border-slate-200 font-medium">
              {result.detail}
            </p>
          </div>

          {/* Evidence Citations */}
          {result.evidence && Array.isArray(result.evidence) && result.evidence.length > 0 && (
            <div className="pt-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Contextual Contract Excerpts
              </div>
              <div className="space-y-2">
                {result.evidence.map((ev: any, idx: number) => {
                  const evText = typeof ev === 'string' ? ev : ev.text || '';
                  const evSource = typeof ev === 'object' ? ev.source || '' : '';
                  const evPage = typeof ev === 'object' ? ev.page : '';

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 font-serif italic shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-[11px] not-italic font-sans text-slate-500 mb-1">
                        <span className="font-semibold">Reference #{idx + 1} {evSource && `• ${evSource}`}</span>
                        {evPage && <span>Pg. {evPage}</span>}
                      </div>
                      "{evText}"
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
