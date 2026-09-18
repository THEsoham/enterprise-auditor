import React, { useState } from 'react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import type { DebateResponse } from '../../types';
import {
  Scale,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  FileText,
  Gavel,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const QUICK_QUESTIONS = [
  'Can the client cancel without penalty with 30 days notice?',
  'Am I exposed to unlimited liability if something breaks?',
  'Who owns the intellectual property and code created?',
  'Are there automatic renewals or unexpected fees?',
  'What happens if an act of God or pandemic stops work?',
];

export const CourtroomDebateTab: React.FC = () => {
  const { selectedDocument, showToast } = useAudit();

  const [question, setQuestion] = useState(QUICK_QUESTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [debate, setDebate] = useState<DebateResponse | null>(null);
  const [copiedRemedy, setCopiedRemedy] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  const runDebate = async (targetQuestion?: string) => {
    const q = (targetQuestion || question).trim();
    if (!q) {
      showToast('Please type a question to debate', 'error');
      return;
    }
    if (!selectedDocument) {
      showToast('Please select a contract from the sidebar first', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.runDebate(q, selectedDocument);
      setDebate(res);
      showToast(`Adversarial debate complete: ${res.verdict}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Debate execution failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyRemedy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRemedy(true);
    setTimeout(() => setCopiedRemedy(false), 2500);
  };

  if (!selectedDocument) {
    return (
      <div className="p-12 bg-white border border-slate-200 rounded-2xl shadow-xs text-center my-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4 shadow-2xs">
          <Scale className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Select a Contract to Enter AI Courtroom</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Choose an agreement from the sidebar to cross-examine clauses through a 2-round debate between OpenAI and Google Gemini.
        </p>
      </div>
    );
  }

  const getVerdictStyle = (verdict: string) => {
    switch (verdict.toUpperCase()) {
      case 'VERIFIED':
      case 'REFINED_VERIFIED':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-800',
          badge: 'bg-emerald-600 text-white',
          icon: ShieldCheck,
          label: verdict === 'REFINED_VERIFIED' ? 'Refined & Verified by Skeptic' : 'Verified by Auditor',
        };
      case 'AMBIGUOUS':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          badge: 'bg-amber-600 text-white',
          icon: AlertTriangle,
          label: 'Ambiguous Contract Language',
        };
      default:
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-800',
          badge: 'bg-rose-600 text-white',
          icon: ShieldAlert,
          label: 'Unsupported / Unprotected',
        };
    }
  };

  const vStyle = debate ? getVerdictStyle(debate.verdict) : null;

  return (
    <div className="space-y-6">
      {/* 1. Header & AI Model Roster */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Multi-Round Adversarial Verification
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500 truncate max-w-xs">{selectedDocument}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <Scale className="w-8 h-8 text-blue-600 shrink-0" />
              AI Courtroom Debate
            </h1>
          </div>

          {/* Model Matchup Card */}
          <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 shrink-0 shadow-xs">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Proposer AI</div>
              <div className="text-xs font-bold text-emerald-400">OpenAI (gpt-4o-mini)</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-extrabold text-xs text-amber-400 border border-slate-700">
              VS
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Skeptical Auditor</div>
              <div className="text-xs font-bold text-blue-400">Gemini (gemini-3.6-flash)</div>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
          Single-turn LLMs hallucinate and accept bad contract terms. Enterprise Auditor uses a multi-round debate where the Proposer drafts a finding, the Skeptical Auditor cross-examines the raw contract to find overlooked catches, and a refined verdict is reached with 1-click negotiation text.
        </p>

        {/* Quick Question Chips */}
        <div className="pt-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Ask a common question:
          </span>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuestion(q);
                  runDebate(q);
                }}
                disabled={loading}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all text-left cursor-pointer ${
                  question === q
                    ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input Box */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runDebate()}
              placeholder="Type your own question (e.g., What are the payment deadlines?)..."
              disabled={loading}
              className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 shadow-2xs placeholder-slate-400"
            />
          </div>
          <button
            onClick={() => runDebate()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cross-Examining...
              </>
            ) : (
              <>
                <Gavel className="w-4 h-4" />
                Start Debate
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Active Debate Loading State */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-4 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto text-blue-600">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Round 1 & 2 in Progress...</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              OpenAI is submitting the claim, Google Gemini is cross-examining against raw contract clauses, and the auditor is preparing your plain-English remedy.
            </p>
          </div>
        </div>
      )}

      {/* 3. Debate Arena Results */}
      {debate && !loading && (
        <div className="space-y-6">
          {/* Final Verdict Banner */}
          {vStyle && (
            <div className={`p-6 rounded-2xl border-2 ${vStyle.border} ${vStyle.bg} shadow-xs space-y-4`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${vStyle.badge}`}>
                    {debate.verdict}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{vStyle.label}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold">Confidence:</span>
                  <span className="font-bold text-slate-800 uppercase">{debate.confidence}</span>
                </div>
              </div>

              {/* Authoritative Final Finding */}
              <div className="bg-white/90 p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Final Fact-Checked Finding:
                </span>
                <p className="text-sm text-slate-900 font-semibold leading-relaxed">
                  {debate.final_finding}
                </p>
              </div>

              {/* In Plain English Card (Zero Jargon USP) */}
              <div className="bg-amber-500/10 border border-amber-300/80 p-4 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    In Plain English (5th-Grade Explanation):
                  </span>
                </div>
                <p className="text-xs text-amber-950 font-medium leading-relaxed">
                  {debate.plain_english}
                </p>
              </div>

              {/* 1-Click How to Fix Remedy */}
              <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Gavel className="w-4 h-4" />
                    How to Fix This in Your Negotiation
                  </span>
                  <button
                    onClick={() => copyRemedy(debate.suggested_remedy)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer"
                  >
                    {copiedRemedy ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Counter-Clause
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-200 italic leading-relaxed bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                  "{debate.suggested_remedy}"
                </p>
                <span className="text-[11px] text-slate-400 block">
                  💡 Tip: Copy and paste this exact sentence into your reply email or contract redline.
                </span>
              </div>
            </div>
          )}

          {/* 4. Round-by-Round Courtroom Debate Log */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-blue-600" />
                  Courtroom Transcript (2-Round Multi-Turn Exchange)
                </h2>
                <p className="text-xs text-slate-500">
                  Observe how the models challenge, cite quotes, and revise findings until fact-checked.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                2 Rounds • 4 Turns
              </span>
            </div>

            <div className="space-y-6">
              {debate.rounds.map((round) => (
                <div key={round.round} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-blue-600 text-white">
                      ROUND {round.round}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {round.round === 1 ? 'Initial Claim & Cross-Examination' : 'Rebuttal & Final Ruling'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Proposer Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                          🏛️ Proposer ({round.proposer.model})
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {round.round === 1 ? 'Initial Statement' : 'Revised Argument'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium">
                        {round.proposer.statement}
                      </p>
                    </div>

                    {/* Skeptic Card */}
                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                          ⚖️ Skeptical Auditor ({round.skeptic.model})
                        </span>
                        <span className="text-[10px] text-blue-600 font-semibold">
                          {round.round === 1 ? 'Cross-Examination' : 'Judicial Ruling'}
                        </span>
                      </div>
                      <p className="text-xs text-blue-950 leading-relaxed font-medium">
                        {round.skeptic.challenge || round.skeptic.ruling}
                      </p>
                      {round.skeptic.exact_quote && (
                        <div className="mt-2 p-2.5 rounded-lg bg-white/80 border border-blue-200/60 text-[11px] text-slate-700 font-mono italic">
                          "{round.skeptic.exact_quote}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Retrieved Evidence Accordion */}
          {debate.evidence_snippets && debate.evidence_snippets.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-800">
                    Inspected Contract Evidence ({debate.evidence_snippets.length} excerpts)
                  </span>
                </div>
                {showEvidence ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showEvidence && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-200">
                  {debate.evidence_snippets.map((snip, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 leading-relaxed"
                    >
                      <span className="font-bold text-slate-400 block mb-1 text-[10px]">EXCERPT {i + 1}:</span>
                      {snip}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
