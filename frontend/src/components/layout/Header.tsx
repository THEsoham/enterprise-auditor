import React from 'react';
import { Sun, Moon, Database, Cpu, CheckCircle2 } from 'lucide-react';
import { useAudit } from '../../context/AuditContext';

export const Header: React.FC = () => {
  const { stats, selectedDocument, setSelectedDocument, theme, toggleTheme } = useAudit();

  const cleanDocName = selectedDocument
    ? selectedDocument.replace(/\.pdf$/i, '')
    : null;

  return (
    <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between z-30 shrink-0 select-none shadow-xs">
      {/* Brand Identity (Duck Creek / Clean Enterprise Style) */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg overflow-hidden shadow-sm shrink-0">
          <img src="/logo.jpg" alt="Enterprise Auditor" className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 tracking-tight">
              Enterprise Auditor
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Contract AI
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Commercial Due Diligence & Audit Platform
          </div>
        </div>
      </div>

      {/* Center: Clear Purposeful Active Scope Indicator */}
      <div className="hidden md:flex items-center gap-2.5 px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full shadow-xs">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          Active Context
        </span>
        <span
          className="text-xs font-semibold text-slate-800 truncate max-w-[340px]"
          title={cleanDocName || 'All Contracts'}
        >
          {cleanDocName || 'All 257 Agreements (Corpus-Wide Search)'}
        </span>
        {cleanDocName && (
          <button
            onClick={() => setSelectedDocument(null)}
            className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline ml-1 cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {/* Right: Telemetry & Status Badges */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div className="flex items-center gap-1.5" title="Retriever Status">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-700 font-semibold">Online</span>
          </div>

          <div className="w-[1px] h-3.5 bg-slate-200" />

          <div className="flex items-center gap-1.5 text-slate-600" title="Dual LLM Architecture">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px]">
              <strong className="text-slate-800 font-medium">Qwen 2.5</strong> Gen ·{' '}
              <strong className="text-slate-800 font-medium">Llama 3.1</strong> Verify
            </span>
          </div>

          <div className="w-[1px] h-3.5 bg-slate-200" />

          <div className="flex items-center gap-1.5 text-slate-600" title="Vector Chunks">
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px]">
              <strong className="text-slate-800 font-medium">
                {stats?.total_vectors.toLocaleString() || '14,849'}
              </strong>{' '}
              chunks
            </span>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};
