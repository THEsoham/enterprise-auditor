import React, { useState, useEffect } from 'react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import type { RiskResponse, RiskFinding } from '../../types';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lightbulb,
  Loader2,
  RefreshCw,
  Info,
  ChevronRight
} from 'lucide-react';

export const RiskAuditTab: React.FC = () => {
  const { selectedDocument, openVerifier, openEvidenceModal, showToast } = useAudit();

  const [loading, setLoading] = useState(false);
  const [riskData, setRiskData] = useState<RiskResponse | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  useEffect(() => {
    if (selectedDocument) {
      loadRisks(selectedDocument);
    } else {
      setRiskData(null);
    }
  }, [selectedDocument]);

  const loadRisks = async (docName: string) => {
    setLoading(true);
    try {
      const data = await api.detectRisks(docName);
      setRiskData(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to detect contract risks', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDocument) {
    return (
      <div className="p-12 bg-white border border-slate-200 rounded-xl shadow-xs text-center my-8">
        <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-3 shadow-2xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-800 mb-1">Select an Agreement to Run Risk Audit</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Choose an agreement from the sidebar to scan for uncapped liabilities, non-standard indemnities, and regulatory hazards.
        </p>
      </div>
    );
  }

  const risks = riskData?.risks || [];
  const filteredRisks = risks.filter((r) => {
    if (filter === 'ALL') return true;
    return r.severity === filter;
  });

  const highCount = riskData?.severity_counts?.HIGH ?? risks.filter(r => r.severity === 'HIGH').length;
  const mediumCount = riskData?.severity_counts?.MEDIUM ?? risks.filter(r => r.severity === 'MEDIUM').length;
  const lowCount = riskData?.severity_counts?.LOW ?? risks.filter(r => r.severity === 'LOW').length;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">Contract Risk & Compliance Audit</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Risk Triage
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated exposure triage and mitigation recommendations for{' '}
            <span className="font-semibold text-slate-800">{selectedDocument}</span>
          </p>
        </div>

        <button
          onClick={() => loadRisks(selectedDocument)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Scanning Risks...' : 'Re-Scan Agreement'}
        </button>
      </div>

      {/* Severity Scoreboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 mb-1 font-medium">Total Risk Findings</div>
          <div className="text-2xl font-bold text-slate-800">{risks.length}</div>
        </div>

        <div
          onClick={() => setFilter('HIGH')}
          className={`p-4 rounded-xl border cursor-pointer transition-all shadow-2xs ${
            filter === 'HIGH'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/30'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="text-xs text-rose-700 font-semibold mb-1 flex items-center justify-between">
            <span>High Severity</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{highCount}</div>
        </div>

        <div
          onClick={() => setFilter('MEDIUM')}
          className={`p-4 rounded-xl border cursor-pointer transition-all shadow-2xs ${
            filter === 'MEDIUM'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="text-xs text-amber-700 font-semibold mb-1 flex items-center justify-between">
            <span>Medium Severity</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{mediumCount}</div>
        </div>

        <div
          onClick={() => setFilter('LOW')}
          className={`p-4 rounded-xl border cursor-pointer transition-all shadow-2xs ${
            filter === 'LOW'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/30'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="text-xs text-blue-700 font-semibold mb-1 flex items-center justify-between">
            <span>Low / Advisory</span>
            <Info className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-blue-700">{lowCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200">
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                filter === lvl
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lvl === 'ALL' ? 'All Findings' : lvl}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500">
          Showing <strong className="text-slate-800">{filteredRisks.length}</strong> of {risks.length} items
        </div>
      </div>

      {/* Findings List */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">Auditing contract language for legal hazards...</p>
          <p className="text-xs text-slate-500 mt-1">Evaluating unmitigated indemnity, uncapped damages, and asymmetrical covenants</p>
        </div>
      ) : filteredRisks.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">No Risks Detected in this Category</h3>
          <p className="text-xs text-slate-500">
            The agreement conforms to standard compliance thresholds for {filter.toLowerCase()} risk criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredRisks.map((finding, idx) => {
            const isHigh = finding.severity === 'HIGH';
            const isMedium = finding.severity === 'MEDIUM';

            return (
              <div
                key={idx}
                className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        isHigh
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isMedium
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{finding.risk_type}</h3>
                  </div>

                  <button
                    onClick={() =>
                      openVerifier(
                        `Risk Finding: [${finding.severity}] ${finding.risk_type}: ${finding.description}`,
                        finding.evidence
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verify with Llama 3.1
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-700 leading-relaxed font-medium">{finding.description}</p>

                {/* Evidence Quote Block */}
                {finding.evidence && (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-serif italic">
                    "{finding.evidence.length > 340
                      ? `${finding.evidence.slice(0, 340)}...`
                      : finding.evidence}"

                    {finding.evidence.length > 340 && (
                      <button
                        onClick={() =>
                          openEvidenceModal(`Contract Evidence: ${finding.risk_type}`, finding.evidence)
                        }
                        className="inline-flex items-center gap-1 ml-2 not-italic text-blue-600 hover:underline font-sans text-xs font-semibold cursor-pointer"
                      >
                        Inspect excerpt <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Recommendation / Actionable Mitigation */}
                {finding.recommendation && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                    <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold mr-1">Recommended Mitigation:</span>
                      {finding.recommendation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
