import React, { useState, useEffect } from 'react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import type { AuditSummaryResponse, RelationshipNode } from '../../types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  FileText,
  Network,
  Sparkles,
  Loader2,
  Lock,
  ArrowRight
} from 'lucide-react';

export const DocumentHealthTab: React.FC = () => {
  const { selectedDocument, setActiveTab } = useAudit();

  const [summary, setSummary] = useState<AuditSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'deal_breakers' | 'watch_out' | 'missing' | 'safe'>('all');
  const [selectedNode, setSelectedNode] = useState<RelationshipNode | null>(null);

  useEffect(() => {
    if (selectedDocument) {
      loadSummary(selectedDocument);
    } else {
      setSummary(null);
    }
  }, [selectedDocument]);

  const loadSummary = async (doc: string) => {
    setLoading(true);
    try {
      const data = await api.getAuditSummary(doc);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load audit summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (!selectedDocument) {
    return (
      <div className="p-12 bg-white border border-slate-200 rounded-2xl shadow-xs text-center my-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4 shadow-2xs">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Select a Document to Inspect Health</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Choose any agreement from the left explorer or upload your own PDF to see instant Health Scores, Deal-Breakers, and plain-English fixes.
        </p>
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div className="p-16 bg-white border border-slate-200 rounded-2xl shadow-xs text-center my-8">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
        <h3 className="text-base font-semibold text-slate-800 mb-1">Auditing Document Health...</h3>
        <p className="text-xs text-slate-500">Checking liability caps, termination clauses, hidden risks, and missing safeguards.</p>
      </div>
    );
  }

  const score = summary?.health_score || 75;
  const badgeColor =
    score >= 80
      ? { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', stroke: '#10b981' }
      : score >= 60
      ? { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', stroke: '#f59e0b' }
      : { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', stroke: '#ef4444' };

  const dealBreakers = summary?.deal_breakers || [];
  const watchOut = summary?.watch_out || [];
  const safeProvisions = summary?.safe_provisions || [];
  const missingProtections = summary?.missing_protections || [];

  return (
    <div className="space-y-6">
      {/* 1. Header Overview & Health Score Gauge */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${badgeColor.bg} ${badgeColor.text} ${badgeColor.border}`}>
                {summary?.health_status || 'Document Health'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500 truncate max-w-xs">{selectedDocument}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Document Health & Red Flags
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              We audited this document in plain English without legal jargon. Here is everything that could hurt you, what you must watch out for, and how to fix it before signing.
            </p>

            {/* Quick Action Navigation to Debate */}
            <div className="pt-2">
              <button
                onClick={() => setActiveTab('debate')}
                className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-3.5 py-1.5 rounded-lg border border-blue-200/60 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Cross-examine these clauses in the AI Courtroom
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Circular Score Gauge */}
          <div className="flex items-center gap-6 bg-slate-50/80 p-5 rounded-2xl border border-slate-100 shrink-0">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#e2e8f0"
                  strokeWidth="9"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={badgeColor.stroke}
                  strokeWidth="9"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - score / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{score}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Score</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="font-semibold text-slate-700">{dealBreakers.length} Deal-Breakers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="font-semibold text-slate-700">{watchOut.length} Watch Out</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                <span className="font-semibold text-slate-700">{missingProtections.length} Missing Shields</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-slate-700">{safeProvisions.length} Safe Terms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Navigation Chips */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-100 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filter:</span>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Items ({dealBreakers.length + watchOut.length + missingProtections.length + safeProvisions.length})
          </button>
          <button
            onClick={() => setActiveFilter('deal_breakers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'deal_breakers'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200/60 hover:bg-rose-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            🔴 Deal-Breakers ({dealBreakers.length})
          </button>
          <button
            onClick={() => setActiveFilter('watch_out')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'watch_out'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 border border-amber-200/60 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            🟡 Watch Out ({watchOut.length})
          </button>
          <button
            onClick={() => setActiveFilter('missing')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'missing'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-pink-50 text-pink-700 border border-pink-200/60 hover:bg-pink-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            🛡️ Missing Protections ({missingProtections.length})
          </button>
          <button
            onClick={() => setActiveFilter('safe')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'safe'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            🟢 Safe Terms ({safeProvisions.length})
          </button>
        </div>
      </div>

      {/* 2. Interactive Visual Relationship Map (Centerpiece) */}
      {summary?.graph && summary.graph.nodes.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Document Relationship Map</h2>
              </div>
              <p className="text-xs text-slate-500">
                Visual topology of key risk nodes, missing safeguards, and contractual obligations. Click any node to inspect.
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {summary.graph.stats.nodes_count} Nodes • {summary.graph.stats.edges_count} Connections
            </span>
          </div>

          <div className="bg-slate-900 rounded-xl p-5 relative overflow-hidden border border-slate-800 min-h-[260px] flex flex-col justify-between">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-300 z-10">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Contract Center
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Deal-Breaker
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Watch Out
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span> Missing Guard
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Safe Provision
              </span>
            </div>

            {/* Nodes Visual Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 my-6 z-10">
              {summary.graph.nodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                    selectedNode?.id === node.id
                      ? 'bg-slate-800 border-blue-400 ring-2 ring-blue-500/30'
                      : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: node.color }}
                    ></span>
                    <span className="text-xs font-bold text-white truncate">{node.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {node.description || 'Contract relationship component'}
                  </p>
                </div>
              ))}
            </div>

            {/* Selected Node Drawer */}
            {selectedNode && (
              <div className="bg-slate-800/95 border border-slate-700 p-4 rounded-xl text-xs text-slate-200 z-10 flex items-start justify-between gap-4 animate-in fade-in duration-200">
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-0.5">
                    Selected Node Inspector
                  </span>
                  <p className="font-bold text-white text-sm mb-1">{selectedNode.label}</p>
                  <p className="text-slate-300">{selectedNode.description}</p>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-md"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Deal-Breakers Section */}
      {(activeFilter === 'all' || activeFilter === 'deal_breakers') && dealBreakers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700">
              <ShieldAlert className="w-3.5 h-3.5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">🔴 Deal-Breakers (Critical Red Flags)</h2>
              <p className="text-xs text-slate-500">
                Clauses that shift extreme liability onto you. Do not sign without requesting the suggested edits below.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {dealBreakers.map((item) => (
              <div
                key={item.id}
                className="bg-white border-2 border-rose-200/90 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                      {item.clause}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                    Page {item.page || 1}
                  </span>
                </div>

                {/* Why it hurts you */}
                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-1">
                    ⚠️ Why this hurts you in plain English:
                  </span>
                  <p className="text-xs text-rose-900 leading-relaxed font-medium">
                    {item.why_it_matters}
                  </p>
                </div>

                {/* Contract Quote */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono italic">
                  "{item.quote}"
                </div>

                {/* 1-Click Fix */}
                <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      1-Click Negotiation Counter-Clause
                    </span>
                    <button
                      onClick={() => copyToClipboard(item.how_to_fix, item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Fix to Clipboard
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {item.how_to_fix}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Watch Out (Yellow Warnings) */}
      {(activeFilter === 'all' || activeFilter === 'watch_out') && watchOut.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">🟡 Watch Out (Conditional Warnings)</h2>
              <p className="text-xs text-slate-500">
                Terms that are manageable but contain tight notice deadlines, auto-renewals, or unilateral rights.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {watchOut.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-amber-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-100 text-amber-800">
                    {item.clause}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Page {item.page || 1}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.why_it_matters}</p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Recommended Adjustment:</span>
                  <button
                    onClick={() => copyToClipboard(item.how_to_fix, item.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedId === item.id ? 'Copied' : 'Copy Edit'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Missing Protections (Safety Nets Left Out) */}
      {(activeFilter === 'all' || activeFilter === 'missing') && missingProtections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-700">
              <Lock className="w-3.5 h-3.5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">🛡️ Missing Safety Nets (Forgotten Clauses)</h2>
              <p className="text-xs text-slate-500">
                Standard protections that are completely missing from this agreement. Adding these prevents surprise lawsuits.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missingProtections.map((item, idx) => (
              <div
                key={`mp_${idx}`}
                className="bg-white border border-pink-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-pink-100 text-pink-800">
                    {item.clause.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">OMITTED</span>
                </div>
                <h3 className="text-xs font-bold text-slate-900">{item.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.why_it_matters}</p>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Add this clause:
                    </span>
                    <button
                      onClick={() => copyToClipboard(item.suggested_text, `mp_${idx}`)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === `mp_${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedId === `mp_${idx}` ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-800 italic">"{item.suggested_text}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Safe & Balanced Provisions */}
      {(activeFilter === 'all' || activeFilter === 'safe') && safeProvisions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">🟢 Safe & Standard Provisions</h2>
              <p className="text-xs text-slate-500">
                Fair, balanced terms that protect both parties equally without unusual traps.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {safeProvisions.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800">
                    {item.clause}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600">VERIFIED SAFE</span>
                </div>
                <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.why_it_matters}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
