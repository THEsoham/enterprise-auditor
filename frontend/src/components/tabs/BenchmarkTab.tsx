import React, { useState } from 'react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import type { EvalSummary, EnterpriseEvalSummary } from '../../types';
import {
  Activity,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  FileCheck,
  Search,
  Loader2,
  Shield,
  Eye,
  Swords,
  Timer,
  BrainCircuit,
  Award,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Circular progress ring for metric scores                          */
/* ------------------------------------------------------------------ */
const ScoreRing: React.FC<{ score: number; size?: number; strokeWidth?: number; color?: string }> = ({
  score,
  size = 80,
  strokeWidth = 7,
  color = '#3b82f6',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Metric icon mapping                                               */
/* ------------------------------------------------------------------ */
const METRIC_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  clause_coverage:        { icon: FileCheck,     color: '#059669', bgColor: '#ecfdf5' },
  risk_detection:         { icon: Shield,        color: '#dc2626', bgColor: '#fef2f2' },
  cross_reference:        { icon: Eye,           color: '#7c3aed', bgColor: '#f5f3ff' },
  adversarial_robustness: { icon: Swords,        color: '#ea580c', bgColor: '#fff7ed' },
  latency_compliance:     { icon: Timer,         color: '#0284c7', bgColor: '#f0f9ff' },
  hallucination_guard:    { icon: BrainCircuit,  color: '#be185d', bgColor: '#fdf2f8' },
};

export const BenchmarkTab: React.FC = () => {
  const { showToast, selectedDocument } = useAudit();

  /* CUAD state */
  const [cuadLoading, setCuadLoading] = useState(false);
  const [evalData, setEvalData] = useState<EvalSummary | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  /* Enterprise Audit Score state */
  const [easLoading, setEasLoading] = useState(false);
  const [easData, setEasData] = useState<EnterpriseEvalSummary | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  /* ---- CUAD handler ---- */
  const handleRunCUAD = async () => {
    setCuadLoading(true);
    setEvalData(null);
    try {
      const data = await api.runEval();
      setEvalData(data);
      showToast('CUAD benchmark evaluation completed successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Benchmark evaluation failed', 'error');
    } finally {
      setCuadLoading(false);
    }
  };

  /* ---- Enterprise Audit Score handler ---- */
  const handleRunEAS = async () => {
    setEasLoading(true);
    setEasData(null);
    try {
      const data = await api.runEnterpriseEval(selectedDocument || undefined);
      setEasData(data);
      showToast(
        `Enterprise Audit Score: ${data.composite_score}/100 (${data.grade})`,
        data.composite_score >= 60 ? 'success' : 'error'
      );
    } catch (err: any) {
      showToast(err.message || 'Enterprise evaluation failed', 'error');
    } finally {
      setEasLoading(false);
    }
  };

  const cuadResults = evalData?.results || [];
  const filteredResults = cuadResults.filter((r) =>
    r.question.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const scoreColor = (s: number) =>
    s >= 80 ? '#059669' : s >= 60 ? '#d97706' : s >= 40 ? '#ea580c' : '#dc2626';

  const gradeColor = (g: string) =>
    g.startsWith('A') ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : g.startsWith('B') ? 'text-blue-700 bg-blue-50 border-blue-200'
    : g.startsWith('C') ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-rose-700 bg-rose-50 border-rose-200';

  return (
    <div className="space-y-8">

      {/* ================================================================ */}
      {/*  SECTION 1: Enterprise Audit Score (Custom Metrics)               */}
      {/* ================================================================ */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-slate-900">Enterprise Audit Score</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Custom Metrics
              </span>
            </div>
            <p className="text-xs text-slate-500">
              6 proprietary domain-specific metrics measuring clause coverage, adversarial robustness, hallucination resistance, and more
            </p>
          </div>

          <button
            onClick={handleRunEAS}
            disabled={easLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            {easLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
            {easLoading ? 'Running 6 Metrics...' : 'Run Enterprise Audit'}
          </button>
        </div>

        {/* EAS Results */}
        {easLoading ? (
          <div className="p-20 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">Running Enterprise Audit Score suite...</p>
            <p className="text-xs text-slate-500 mt-1">
              Testing clause extraction, adversarial robustness, hallucination resistance, latency SLA, and more
            </p>
          </div>
        ) : easData ? (
          <div className="space-y-4">
            {/* Composite Score Hero */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="relative">
                <ScoreRing
                  score={easData.composite_score}
                  size={120}
                  strokeWidth={10}
                  color={scoreColor(easData.composite_score)}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {easData.composite_score}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">/ 100</span>
                </div>
              </div>

              <div className="text-center sm:text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-slate-900">Composite Enterprise Score</span>
                  <span className={`text-sm font-black px-2.5 py-0.5 rounded-full border ${gradeColor(easData.grade)}`}>
                    {easData.grade}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Weighted average of 6 proprietary metrics evaluated against <strong>{easData.document}</strong>
                </p>
              </div>
            </div>

            {/* 6 Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(easData.metrics).map(([key, metric]) => {
                const config = METRIC_CONFIG[key] || { icon: Target, color: '#6b7280', bgColor: '#f9fafb' };
                const Icon = config.icon;
                const isExpanded = expandedMetric === key;
                const details = metric.details || metric.found_clauses || metric.missing_clauses || metric.individual_latencies;

                return (
                  <div
                    key={key}
                    className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden transition-all hover:shadow-sm"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: config.bgColor }}
                          >
                            <Icon className="w-4 h-4" style={{ color: config.color }} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800">{metric.label}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{metric.abbrev}</div>
                          </div>
                        </div>
                        <div className="relative">
                          <ScoreRing
                            score={metric.score}
                            size={48}
                            strokeWidth={5}
                            color={scoreColor(metric.score)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-black text-slate-800 font-mono">
                              {Math.round(metric.score)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick summary stats */}
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        {metric.found_count !== undefined && (
                          <div>Found: <strong className="text-slate-700">{metric.found_count}/{metric.total}</strong> clause types</div>
                        )}
                        {metric.risks_detected !== undefined && (
                          <div>Detected: <strong className="text-slate-700">{metric.risks_detected}</strong> risk findings</div>
                        )}
                        {metric.valid_citations !== undefined && (
                          <div>Valid: <strong className="text-slate-700">{metric.valid_citations}/{metric.total_citations}</strong> citations</div>
                        )}
                        {metric.correct_rejections !== undefined && (
                          <div>Rejected: <strong className="text-slate-700">{metric.correct_rejections}/{metric.total_claims || metric.total_questions}</strong> adversarial claims</div>
                        )}
                        {metric.queries_under_sla !== undefined && (
                          <div>Under SLA: <strong className="text-slate-700">{metric.queries_under_sla}/{metric.total_queries}</strong> (avg {metric.avg_latency_seconds}s)</div>
                        )}
                        {metric.correct_refusals !== undefined && (
                          <div>Refused: <strong className="text-slate-700">{metric.correct_refusals}/{metric.total_questions}</strong> unanswerable queries</div>
                        )}
                      </div>
                    </div>

                    {/* Expandable details */}
                    {details && (
                      <button
                        onClick={() => setExpandedMetric(isExpanded ? null : key)}
                        className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <span>View Details</span>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {isExpanded && details && (
                      <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 text-[11px] space-y-1 max-h-40 overflow-y-auto">
                        {Array.isArray(details) && details.map((d: any, i: number) => (
                          <div key={i} className="flex items-start gap-1.5">
                            {typeof d === 'string' ? (
                              <>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600">{d}</span>
                              </>
                            ) : typeof d === 'number' ? (
                              <>
                                <span className="text-slate-400">Q{i+1}:</span>
                                <span className="font-mono text-slate-700">{d}s</span>
                              </>
                            ) : d.claim ? (
                              <>
                                {d.correct
                                  ? <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                  : <XCircle className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />}
                                <span className="text-slate-600 truncate" title={d.claim}>{d.claim}</span>
                              </>
                            ) : d.question ? (
                              <>
                                {d.correctly_refused
                                  ? <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                  : <XCircle className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />}
                                <span className="text-slate-600 truncate" title={d.question}>{d.question}</span>
                              </>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
            <Award className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">Enterprise Audit Score Ready</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Run 6 proprietary evaluation metrics: Clause Coverage, Risk Detection Recall, Cross-Reference Fidelity,
              Adversarial Robustness, Latency Compliance, and Hallucination Guard Rate.
            </p>
            <button
              onClick={handleRunEAS}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" /> Run Enterprise Audit
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">External Benchmark</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* ================================================================ */}
      {/*  SECTION 2: CUAD Legal Benchmark (Existing)                      */}
      {/* ================================================================ */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-slate-900">CUAD Legal Benchmark</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Retrieval Metrics
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Empirical benchmark assessing retrieval precision, answer rates, and latency against gold-standard CUAD questions
            </p>
          </div>

          <button
            onClick={handleRunCUAD}
            disabled={cuadLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            {cuadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {cuadLoading ? 'Evaluating...' : 'Run CUAD Evaluation Suite'}
          </button>
        </div>

        {/* CUAD KPI Cards */}
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

        {/* CUAD Results Table */}
        {cuadLoading ? (
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
              onClick={handleRunCUAD}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> Start Benchmark Suite
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
