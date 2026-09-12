import React, { useState } from 'react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import type { EvalSummary } from '../../types';
import {
  Activity,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  FileCheck,
  Search,
  Loader2
} from 'lucide-react';

export const BenchmarkTab: React.FC = () => {
  const { showToast } = useAudit();

  const [loading, setLoading] = useState(false);
  const [evalData, setEvalData] = useState<EvalSummary | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const handleRunEvaluation = async () => {
    setLoading(true);
    setEvalData(null);
    try {
      const data = await api.runEval();
      setEvalData(data);
      showToast('CUAD benchmark evaluation completed successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Benchmark evaluation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const results = evalData?.results || [];
  const filteredResults = results.filter((r) =>
    r.question.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-slate-900">CUAD Legal Benchmark Evaluation</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Retrieval Metrics
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Empirical benchmark assessing retrieval precision, answer rates, and latency against gold-standard CUAD questions
          </p>
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {loading ? 'Evaluating...' : 'Run CUAD Evaluation Suite'}
        </button>
      </div>

      {/* KPI Cards */}
      {evalData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Answer Rate
            </div>
            <div className="text-2xl font-bold text-emerald-700 font-mono">
              {(evalData.answer_rate * 100).toFixed(1)}%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
              <Target className="w-3.5 h-3.5 text-blue-600" /> Keyword Score
            </div>
            <div className="text-2xl font-bold text-blue-700 font-mono">
              {(evalData.keyword_score * 100).toFixed(1)}%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-600" /> Avg. Latency
            </div>
            <div className="text-2xl font-bold text-slate-800 font-mono">
              {evalData.avg_latency_s.toFixed(2)}s
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
              <FileCheck className="w-3.5 h-3.5 text-cyan-600" /> Sources / Query
            </div>
            <div className="text-2xl font-bold text-cyan-700 font-mono">
              {evalData.avg_sources.toFixed(1)}
            </div>
          </div>
        </div>
      )}

      {/* Benchmark Results Table */}
      {loading ? (
        <div className="p-20 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">Running CUAD test suite through Qwen 2.5 & Vector Store...</p>
          <p className="text-xs text-slate-500 mt-1">Executing multi-hop retrieval queries and measuring legal ground-truth overlap</p>
        </div>
      ) : evalData ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">Evaluation Test Matrix</h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search benchmark tests..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 w-56 shadow-2xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Evaluation Question</th>
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4 w-32">Keyword Score</th>
                  <th className="py-3 px-4 w-28">Latency</th>
                  <th className="py-3 px-4 w-24">Sources</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((res, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{res.question}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                          res.answered
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {res.answered ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Answered
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Unresolved
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {(res.keyword_score * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{res.latency_seconds.toFixed(2)}s</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{res.num_sources}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
          <Activity className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">CUAD Benchmark Ready</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Benchmark your active retrieval model and embedding pipeline against gold-standard CUAD dataset questions.
          </p>
          <button
            onClick={handleRunEvaluation}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> Start Benchmark Suite
          </button>
        </div>
      )}
    </div>
  );
};
