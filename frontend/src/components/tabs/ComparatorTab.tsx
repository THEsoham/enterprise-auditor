import React, { useState, useEffect } from 'react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import type { CompareResponse } from '../../types';
import {
  GitCompare,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';

const DEFAULT_CLAUSES = [
  'governing_law',
  'indemnification',
  'limitation_of_liability',
  'termination',
  'confidentiality',
  'payment',
  'assignment',
  'force_majeure'
];

export const ComparatorTab: React.FC = () => {
  const { openVerifier, openEvidenceModal, showToast } = useAudit();

  const [clauseTypes, setClauseTypes] = useState<string[]>(DEFAULT_CLAUSES);
  const [selectedClause, setSelectedClause] = useState<string>('governing_law');
  const [numContracts, setNumContracts] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);

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

  const handleRunComparison = async () => {
    setLoading(true);
    setCompareData(null);
    try {
      const data = await api.compareClause(selectedClause, numContracts);
      setCompareData(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate comparison matrix', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-slate-900">Cross-Contract Matrix Comparator</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Corpus Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Benchmark provisions across multiple executed contracts to detect standard market terms and anomalies
          </p>
        </div>
      </div>

      {/* Control Configuration Bar */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Provision to Benchmark
            </label>
            <select
              value={selectedClause}
              onChange={(e) => setSelectedClause(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white capitalize cursor-pointer shadow-2xs"
            >
              {clauseTypes.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Agreements Count
            </label>
            <select
              value={numContracts}
              onChange={(e) => setNumContracts(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white cursor-pointer shadow-2xs"
            >
              <option value={3}>3 Contracts (Quick Sample)</option>
              <option value={5}>5 Contracts (Standard Matrix)</option>
              <option value={8}>8 Contracts (Deep Corpus)</option>
              <option value={12}>12 Contracts (Market Exhaustive)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunComparison}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
              {loading ? 'Analyzing Corpus...' : 'Build Comparison Matrix'}
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      {loading ? (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">Extracting and aligning provisions across {numContracts} agreements...</p>
          <p className="text-xs text-slate-500 mt-1">Calculating semantic similarities and identifying outlier jurisdictions & caps</p>
        </div>
      ) : compareData ? (
        <div className="space-y-5">
          {/* Executive Synthesis Card */}
          {compareData.synthesis && (
            <div className="p-5 rounded-xl bg-blue-50/60 border border-blue-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-800 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-blue-600" /> Executive Multi-Contract Synthesis
              </div>
              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                {compareData.synthesis}
              </p>
            </div>
          )}

          {/* Matrix Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 capitalize">
                {compareData.clause_type.replace(/_/g, ' ')} Provisions Comparison
              </h3>
              <span className="text-xs text-slate-500 font-medium font-mono">
                {compareData.comparisons?.length || 0} contracts sampled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-1/4">Contract Name</th>
                    <th className="py-3 px-4 w-28">Status</th>
                    <th className="py-3 px-4 w-20">Page</th>
                    <th className="py-3 px-4">Governing Excerpt & Provisions</th>
                    <th className="py-3 px-4 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {compareData.comparisons.map((row, idx) => {
                    const isFound = row.status === 'FOUND' || row.text.length > 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900 break-all">
                          {row.document}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                              isFound
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {row.status || (isFound ? 'FOUND' : 'NOT FOUND')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 font-medium">
                          {row.pages && row.pages.length > 0 ? `Pg. ${row.pages.join(',')}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 leading-relaxed font-serif italic">
                          {row.text ? (
                            <div>
                              <span>
                                "{row.text.length > 220 ? `${row.text.slice(0, 220)}...` : row.text}"
                              </span>
                              {row.text.length > 220 && (
                                <button
                                  onClick={() =>
                                    openEvidenceModal(
                                      `${row.document} - ${compareData.clause_type}`,
                                      row.text
                                    )
                                  }
                                  className="inline-flex items-center gap-1 ml-2 not-italic text-blue-600 hover:underline font-sans text-xs font-semibold cursor-pointer"
                                >
                                  View full <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 not-italic font-sans">
                              No explicit provision detected in agreement.
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {row.text && (
                            <button
                              onClick={() =>
                                openVerifier(
                                  `In contract ${row.document}, clause '${compareData.clause_type}' is present.`,
                                  row.text
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
          <GitCompare className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">Select a Clause to Compare</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Choose a provision type and sample count above to analyze divergence across executed commercial agreements.
          </p>
        </div>
      )}
    </div>
  );
};
