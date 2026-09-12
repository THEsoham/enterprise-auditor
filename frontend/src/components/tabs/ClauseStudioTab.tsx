import React, { useState, useEffect } from 'react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import type { ClauseInfo, ClauseDetailResponse } from '../../types';
import {
  FileCode,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Sliders,
  X,
  Sparkles,
  Loader2
} from 'lucide-react';

const CLAUSE_DISPLAY_NAMES: Record<string, string> = {
  termination: 'Termination & Cancellation',
  governing_law: 'Governing Law & Jurisdiction',
  confidentiality: 'Confidentiality & Non-Disclosure',
  indemnification: 'Indemnification & Hold Harmless',
  limitation_of_liability: 'Limitation of Liability & Caps',
  payment: 'Payment Terms & Invoicing',
  intellectual_property: 'Intellectual Property & IP Rights',
  assignment: 'Assignment & Transfer of Rights',
  force_majeure: 'Force Majeure & Excused Delays',
  non_compete: 'Non-Compete & Restrictive Covenants',
  dispute_resolution: 'Dispute Resolution & Arbitration',
  audit_rights: 'Audit & Inspection Rights',
  data_privacy: 'Data Privacy & Security (GDPR/CCPA)',
  insurance: 'Insurance Requirements',
  warranty: 'Representations & Warranties',
};

export const ClauseStudioTab: React.FC = () => {
  const { selectedDocument, openVerifier, openEvidenceModal, showToast } = useAudit();

  const [clauses, setClauses] = useState<Record<string, ClauseInfo>>({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'found' | 'missing'>('all');
  
  // Parameter Inspector Drawer State
  const [selectedClauseKey, setSelectedClauseKey] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [clauseDetail, setClauseDetail] = useState<ClauseDetailResponse | null>(null);

  useEffect(() => {
    if (selectedDocument) {
      loadClauses(selectedDocument);
    } else {
      setClauses({});
    }
  }, [selectedDocument]);

  const loadClauses = async (docName: string) => {
    setLoading(true);
    try {
      const res = await api.extractClauses(docName);
      setClauses(res.clauses || {});
    } catch (err: any) {
      showToast(err.message || 'Failed to extract clauses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectParameters = async (clauseKey: string) => {
    if (!selectedDocument) return;
    setSelectedClauseKey(clauseKey);
    setDetailLoading(true);
    setClauseDetail(null);
    try {
      const data = await api.extractClauseDetail(selectedDocument, clauseKey);
      setClauseDetail(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load clause parameters', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const entries = Object.entries(clauses);
  const filteredEntries = entries.filter(([_, info]) => {
    if (filter === 'found') return info.found;
    if (filter === 'missing') return !info.found;
    return true;
  });

  const foundCount = entries.filter(([_, info]) => info.found).length;
  const missingCount = entries.length - foundCount;

  if (!selectedDocument) {
    return (
      <div className="p-12 bg-white border border-slate-200 rounded-xl shadow-xs text-center my-8">
        <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-3 shadow-2xs">
          <FileCode className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-800 mb-1">Select an Agreement to Open Clause Studio</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Choose an executed agreement from the Contract Explorer on the left to inspect 9 standard covenants, verbatim quotes, and extracted legal parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">Clause Studio & Parameter Inspector</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Contract Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Extract covenants and inspect risk-rated parameters for{' '}
            <span className="font-semibold text-slate-800">{selectedDocument}</span>
          </p>
        </div>

        <button
          onClick={() => loadClauses(selectedDocument)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? 'Extracting...' : 'Re-Run Extraction'}
        </button>
      </div>

      {/* KPI & Filter Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 mb-1 font-medium">Standard Clauses</div>
          <div className="text-2xl font-bold text-slate-800">{entries.length || '15'}</div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 shadow-2xs">
          <div className="text-xs text-emerald-700 font-semibold mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Present & Verified
          </div>
          <div className="text-2xl font-bold text-emerald-700">{foundCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 shadow-2xs">
          <div className="text-xs text-rose-700 font-semibold mb-1 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Omitted / Missing
          </div>
          <div className="text-2xl font-bold text-rose-700">{missingCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-center">
          <div className="text-xs text-slate-500 mb-1.5 font-medium">Display Filter</div>
          <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            {(['all', 'found', 'missing'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 text-xs py-1 rounded capitalize font-medium transition-colors cursor-pointer ${
                  filter === f
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Clause Grid & Drawer Layout */}
      <div className="flex gap-5 relative">
        {/* Clause Cards List */}
        <div className={`flex-1 space-y-3.5 ${selectedClauseKey ? 'w-2/3' : 'w-full'}`}>
          {loading ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800">Analyzing document across legal taxonomies...</p>
              <p className="text-xs text-slate-500 mt-1">Cross-referencing embeddings and exact pattern matchers</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-xs text-slate-500">
              No clauses match the current filter.
            </div>
          ) : (
            filteredEntries.map(([key, info]) => {
              const displayName = CLAUSE_DISPLAY_NAMES[key] || key.replace(/_/g, ' ').toUpperCase();
              return (
                <div
                  key={key}
                  className={`p-5 rounded-xl border transition-all ${
                    selectedClauseKey === key
                      ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-md ${
                          info.found ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {info.found ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{displayName}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {info.pages && info.pages.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono font-medium">
                          Pg. {info.pages.join(', ')}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                          info.found
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {info.status || (info.found ? 'FOUND' : 'NOT FOUND')}
                      </span>
                    </div>
                  </div>

                  {info.found ? (
                    <div>
                      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-serif italic mb-3">
                        "{info.text.length > 360 ? `${info.text.slice(0, 360)}...` : info.text}"

                        {info.text.length > 360 && (
                          <button
                            onClick={() => openEvidenceModal(`${displayName} Full Excerpt`, info.text)}
                            className="inline-flex items-center gap-1 ml-2 not-italic text-blue-600 hover:underline font-sans text-xs font-semibold cursor-pointer"
                          >
                            Read full text <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() =>
                            openVerifier(
                              `Clause '${displayName}' is present in ${selectedDocument} with legal validity.`,
                              info.text
                            )
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Verify with Llama 3.1
                        </button>

                        <button
                          onClick={() => handleInspectParameters(key)}
                          className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-blue-700 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 transition-colors font-semibold cursor-pointer border border-slate-200"
                        >
                          <Sliders className="w-3.5 h-3.5 text-blue-600" /> Inspect Parameters
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                      <span>No explicit provisions identified in agreement.</span>
                      <button
                        onClick={() =>
                          openVerifier(
                            `Confirm absence of '${displayName}' in ${selectedDocument}.`,
                            'No provisions located'
                          )
                        }
                        className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Verify Missing Status
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Structured Parameter Inspector Drawer */}
        {selectedClauseKey && (
          <div className="w-96 shrink-0 sticky top-20 h-fit p-5 rounded-xl bg-white border border-slate-200 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-blue-600">Parameter Inspector</div>
                <h3 className="text-sm font-bold text-slate-900">
                  {CLAUSE_DISPLAY_NAMES[selectedClauseKey] || selectedClauseKey}
                </h3>
              </div>
              <button
                onClick={() => setSelectedClauseKey(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Extracting legal variables & risk scores...</p>
              </div>
            ) : clauseDetail ? (
              <div className="space-y-4">
                {/* Score & Risk Badges */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[10.5px] text-slate-500 mb-1 font-medium">Risk Level</div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                        clauseDetail.risk_level === 'HIGH'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : clauseDetail.risk_level === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {clauseDetail.risk_level || 'LOW'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[10.5px] text-slate-500 mb-1 font-medium">Compliance Score</div>
                    <div className="text-base font-bold text-slate-800 font-mono">
                      {clauseDetail.compliance_score != null ? `${clauseDetail.compliance_score}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Parameters Table */}
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" /> Extracted Variables
                  </div>
                  <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                    {Object.keys(clauseDetail.parameters || {}).length === 0 ? (
                      <div className="p-4 text-xs text-slate-400 text-center">No specific variables flagged</div>
                    ) : (
                      <dl className="divide-y divide-slate-100">
                        {Object.entries(clauseDetail.parameters).map(([k, v]) => (
                          <div key={k} className="p-2.5 flex items-start justify-between gap-2 text-xs">
                            <dt className="text-slate-500 font-medium capitalize">{k.replace(/_/g, ' ')}</dt>
                            <dd className="text-slate-900 font-mono text-right font-semibold break-all">
                              {typeof v === 'boolean'
                                ? v ? 'True' : 'False'
                                : typeof v === 'object'
                                ? JSON.stringify(v)
                                : String(v)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    openVerifier(
                      `Clause parameters for ${selectedClauseKey}: risk is ${clauseDetail.risk_level}, compliance is ${clauseDetail.compliance_score}%.`,
                      JSON.stringify(clauseDetail.parameters)
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-xs text-emerald-800 font-semibold transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verify Parameters with Llama 3.1
                </button>
              </div>
            ) : (
              <div className="p-4 text-xs text-slate-400 text-center">Unable to load parameters.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
