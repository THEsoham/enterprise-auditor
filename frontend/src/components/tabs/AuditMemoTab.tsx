import React, { useState, useEffect } from 'react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import type { ReportResponse } from '../../types';
import { marked } from 'marked';
import {
  FileText,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  RefreshCw,
  BookOpen
} from 'lucide-react';

export const AuditMemoTab: React.FC = () => {
  const { selectedDocument, openVerifier, showToast } = useAudit();

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedDocument) {
      loadReport(selectedDocument);
    } else {
      setReport(null);
    }
  }, [selectedDocument]);

  const loadReport = async (docName: string) => {
    setLoading(true);
    try {
      const data = await api.generateReport(docName);
      setReport(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate audit memorandum', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report?.markdown) return;
    navigator.clipboard.writeText(report.markdown);
    setCopied(true);
    showToast('Due diligence memorandum copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!report?.markdown || !selectedDocument) return;
    const blob = new Blob([report.markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Audit_Memo_${selectedDocument.replace(/\.[^/.]+$/, '')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Markdown memo downloaded successfully', 'success');
  };

  if (!selectedDocument) {
    return (
      <div className="p-12 bg-white border border-slate-200 rounded-xl shadow-xs text-center my-8">
        <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-3 shadow-2xs">
          <FileText className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-800 mb-1">Select an Agreement to Synthesize Audit Memorandum</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Choose an executed agreement from the sidebar to synthesize a comprehensive, board-ready Due Diligence Memorandum complete with compliance grades.
        </p>
      </div>
    );
  }

  const grade = report?.compliance_grade || 'B+';
  const isHighGrade = grade.startsWith('A');
  const isMedGrade = grade.startsWith('B');

  const renderedHtml = report?.markdown
    ? marked.parse(report.markdown)
    : '';

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-slate-900">Executive Due Diligence Memorandum</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Audit Summary
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Formal legal assessment and risk posture evaluation for{' '}
            <span className="font-semibold text-slate-800">{selectedDocument}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => loadReport(selectedDocument)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {loading ? 'Compiling...' : 'Regenerate'}
          </button>

          <button
            onClick={handleCopy}
            disabled={!report?.markdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            onClick={handleDownload}
            disabled={!report?.markdown}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Download .md
          </button>
        </div>
      </div>

      {/* Compliance Grade Card */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div
              className={`w-13 h-13 rounded-xl flex items-center justify-center font-bold text-xl font-mono shadow-2xs border ${
                isHighGrade
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : isMedGrade
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}
            >
              {grade}
            </div>
            <div>
              <div className="text-[10.5px] uppercase font-bold text-slate-500 tracking-wider">
                Overall Rating
              </div>
              <div className="text-xs font-bold text-slate-900">
                {isHighGrade ? 'Standard Compliance' : isMedGrade ? 'Moderate Commercial Risk' : 'Elevated Exposure'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs md:col-span-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 mb-0.5">Independent Verification Available</div>
              <p className="text-xs text-slate-500">
                Run an adversarial check with Llama 3.1 across all synthesized clauses and risk assessments in this memorandum.
              </p>
            </div>
            <button
              onClick={() =>
                openVerifier(
                  `Due Diligence Memorandum for ${selectedDocument} with compliance grade ${grade}.`,
                  report.markdown.slice(0, 1000)
                )
              }
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verify Memo with Llama 3.1
            </button>
          </div>
        </div>
      )}

      {/* Markdown Document Content */}
      <div className="p-8 rounded-xl bg-white border border-slate-200 shadow-xs">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">Synthesizing due diligence memorandum...</p>
            <p className="text-xs text-slate-500 mt-1">Aggregating covenants, liabilities, indemnities, and governing laws</p>
          </div>
        ) : report?.markdown ? (
          <article
            className="prose prose-slate max-w-none text-slate-800 text-sm leading-relaxed
              prose-headings:text-slate-900 prose-headings:font-bold
              prose-h1:text-lg prose-h1:border-b prose-h1:border-slate-200 prose-h1:pb-2.5
              prose-h2:text-base prose-h2:mt-6 prose-h2:mb-2.5
              prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2
              prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:bg-slate-50 prose-blockquote:p-3 prose-blockquote:rounded-r-lg prose-blockquote:text-xs prose-blockquote:italic
              prose-table:w-full prose-table:text-xs prose-th:bg-slate-50 prose-th:p-2.5 prose-td:p-2.5 prose-td:border-b prose-td:border-slate-100"
            dangerouslySetInnerHTML={{ __html: renderedHtml as string }}
          />
        ) : (
          <div className="py-16 text-center text-slate-400">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm">Click "Regenerate" to compile the executive due diligence report.</p>
          </div>
        )}
      </div>
    </div>
  );
};
