import React, { useState, useEffect } from 'react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import type { ObligationsResponse, ObligationItem } from '../../types';
import {
  Clock,
  Calendar,
  AlertCircle,
  UserCheck,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  RefreshCw
} from 'lucide-react';

export const ObligationsTab: React.FC = () => {
  const { selectedDocument, openVerifier, openEvidenceModal, showToast } = useAudit();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ObligationsResponse | null>(null);
  const [partyFilter, setPartyFilter] = useState<string>('ALL');

  useEffect(() => {
    if (selectedDocument) {
      loadObligations(selectedDocument);
    } else {
      setData(null);
    }
  }, [selectedDocument]);

  const loadObligations = async (docName: string) => {
    setLoading(true);
    try {
      const res = await api.extractObligations(docName);
      setData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to extract contractual obligations', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDocument) {
    return (
      <div className="p-12 bg-white border border-slate-200 rounded-xl shadow-xs text-center my-8">
        <div className="w-14 h-14 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 mx-auto mb-3 shadow-2xs">
          <Clock className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-800 mb-1">Select an Agreement to View Deadlines & Duties</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Choose an agreement from the sidebar to extract actionable covenants, payment milestones, notice windows, and recurring compliance deadlines.
        </p>
      </div>
    );
  }

  const obligations = data?.obligations || [];
  const uniqueParties = Array.from(
    new Set(obligations.map((o) => o.responsible_party).filter(Boolean))
  );

  const filteredObligations = obligations.filter((o) => {
    if (partyFilter === 'ALL') return true;
    return o.responsible_party === partyFilter;
  });

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-slate-900">Obligations & Deadlines Timeline</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
              Contract Operations
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Track operational milestones, time-sensitive notice windows, and breach triggers for{' '}
            <span className="font-semibold text-slate-800">{selectedDocument}</span>
          </p>
        </div>

        <button
          onClick={() => loadObligations(selectedDocument)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Parsing Deadlines...' : 'Re-Extract Timeline'}
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-600">Filter by Party:</span>
          <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
            <button
              onClick={() => setPartyFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                partyFilter === 'ALL'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Parties ({obligations.length})
            </button>
            {uniqueParties.map((party) => (
              <button
                key={party}
                onClick={() => setPartyFilter(party!)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  partyFilter === party
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {party}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-800">{filteredObligations.length}</strong> items
        </div>
      </div>

      {/* Timeline View */}
      {loading ? (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">Extracting temporal triggers and action items...</p>
          <p className="text-xs text-slate-500 mt-1">Parsing timeframes, cure periods, and penalty consequences</p>
        </div>
      ) : filteredObligations.length === 0 ? (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">No Actionable Obligations Found</h3>
          <p className="text-xs text-slate-500">No explicit operational deadlines match the active filter.</p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l-2 border-cyan-300 space-y-5 my-3">
          {filteredObligations.map((item, idx) => (
            <div key={idx} className="relative group">
              {/* Timeline Bullet */}
              <div className="absolute -left-[31px] sm:-left-[39px] top-4 w-4 h-4 rounded-full bg-white border-3 border-cyan-600 shadow-xs" />

              <div className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all space-y-3 shadow-xs">
                {/* Header: Type, Party, Page */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 capitalize">
                      {item.type || 'Obligation'}
                    </span>
                    {item.responsible_party && (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" /> {item.responsible_party}
                      </span>
                    )}
                    {item.page && (
                      <span className="text-xs text-slate-500 font-mono font-medium">
                        Pg. {item.page}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      openVerifier(
                        `Obligation [${item.type}] for ${item.responsible_party || 'party'}: ${item.description}`,
                        `Trigger: ${item.trigger_date || 'N/A'}, Timeframe: ${item.timeframe || 'N/A'}, Penalty: ${item.penalty || 'N/A'}`
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verify with Llama 3.1
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  {item.description}
                </p>

                {/* Trigger & Deadlines Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {item.trigger_date && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="text-[10.5px] text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" /> Trigger Event
                      </div>
                      <div className="text-slate-800 font-medium">{item.trigger_date}</div>
                    </div>
                  )}

                  {item.timeframe && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="text-[10.5px] text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1 font-bold">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" /> Deadline / Timeframe
                      </div>
                      <div className="text-slate-800 font-semibold font-mono">{item.timeframe}</div>
                    </div>
                  )}
                </div>

                {/* Penalty / Consequences */}
                {item.penalty && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold mr-1">Breach Consequence:</span>
                      {item.penalty}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
