import React, { useRef, useState } from 'react';
import {
  Search,
  X,
  FileText,
  Globe2,
  UploadCloud,
  MessageSquareText,
  ScrollText,
  AlertTriangle,
  HelpCircle,
  Columns3,
  Network,
  Clock,
  Image,
  FileSignature,
  FlaskConical,
  CheckCircle2,
} from 'lucide-react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';

export const Sidebar: React.FC = () => {
  const {
    documents,
    filteredDocuments,
    selectedDocument,
    setSelectedDocument,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    showToast,
    reloadDocuments,
  } = useAudit();

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
    alert?: boolean;
    cyan?: boolean;
  }

  const navGroups: { label: string; items: NavItem[] }[] = [
    {
      label: 'AUDIT & ANALYSIS',
      items: [
        { id: 'copilot', label: 'Ask Copilot', icon: MessageSquareText, badge: 'Q&A' },
        { id: 'clauses', label: 'Clause Studio', icon: ScrollText, badge: '9 Clauses' },
        { id: 'risks', label: 'Risk & Compliance', icon: AlertTriangle, badge: 'Audit', alert: true },
        { id: 'missing', label: 'Missing Clauses', icon: HelpCircle, badge: 'Check' },
      ],
    },
    {
      label: 'CROSS-CONTRACT TOOLS',
      items: [
        { id: 'compare', label: 'Compare Contracts', icon: Columns3, badge: 'Matrix' },
        { id: 'graph', label: 'Contract Map', icon: Network, badge: 'Graph' },
        { id: 'obligations', label: 'Deadlines & Duties', icon: Clock, badge: 'Timeline' },
        { id: 'tables', label: 'Tables & Schedules', icon: Image, badge: 'VLM', cyan: true },
      ],
    },
    {
      label: 'REPORTS & BENCHMARKS',
      items: [
        { id: 'report', label: 'Audit Memorandum', icon: FileSignature, badge: 'Report' },
        { id: 'eval', label: 'Accuracy Benchmark', icon: FlaskConical, badge: 'CUAD' },
      ],
    },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please upload a valid PDF contract file', 'error');
      return;
    }

    setUploading(true);
    showToast(`Uploading and chunking ${file.name}...`, 'info');

    try {
      const res = await api.uploadContract(file);
      showToast(`Ingested ${res.document} (${res.pages_count} pages, ${res.chunks_count} chunks)!`, 'success');
      await reloadDocuments();
      setSelectedDocument(res.document);
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <aside className="w-80 min-w-[320px] bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto select-none shadow-xs">
      {/* 1. Contract Explorer Section */}
      <div className="p-4 border-b border-slate-200 shrink-0 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-700 tracking-wider uppercase">
            Contract Explorer
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
            {documents.length} agreements
          </span>
        </div>

        {/* Search Input */}
        <div className="relative mb-2.5">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 257 agreements..."
            className="w-full pl-9 pr-7 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Scrollable Custom Document List */}
        <div className="max-h-56 overflow-y-auto space-y-1 pr-1 mb-2.5">
          {/* Top Pinned: All Contracts */}
          <div
            onClick={() => setSelectedDocument(null)}
            className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
              selectedDocument === null
                ? 'bg-blue-50 border border-blue-200 text-blue-900 shadow-2xs'
                : 'hover:bg-slate-100 border border-transparent text-slate-700'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                selectedDocument === null ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Globe2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">All 257 Agreements</div>
              <div className="text-[10px] text-slate-500 truncate">Corpus-wide hybrid search</div>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 shrink-0">
              Global
            </span>
          </div>

          {/* Individual Contracts */}
          {filteredDocuments.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">No matching contracts found</div>
          ) : (
            filteredDocuments.map((doc) => {
              const isSelected = selectedDocument === doc.name;
              const cleanTitle = doc.name.replace(/\.pdf$/i, '');
              const category = doc.category || 'General';
              const isSample = category === 'Sample';
              const isUploaded = category === 'Uploaded';

              return (
                <div
                  key={doc.name}
                  onClick={() => setSelectedDocument(doc.name)}
                  className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 border border-blue-300 text-blue-900 shadow-2xs font-medium'
                      : isSample
                      ? 'bg-amber-50/40 hover:bg-amber-50 border border-amber-200/60 text-slate-800'
                      : isUploaded
                      ? 'bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-200/60 text-slate-800'
                      : 'hover:bg-slate-100 border border-transparent text-slate-700'
                  }`}
                  title={doc.name}
                >
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : isSample
                        ? 'bg-amber-100 text-amber-700'
                        : isUploaded
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate leading-tight font-medium">{cleanTitle}</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {isSample ? 'Featured Sample Agreement' : isUploaded ? 'User Uploaded Contract' : `${category} Agreement`}
                    </div>
                  </div>
                  {isSample ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                      ⭐ Sample
                    </span>
                  ) : isUploaded ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      📤 Uploaded
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                      {category.substring(0, 8)}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Upload Custom PDF */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".pdf"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white border border-dashed border-blue-400 hover:border-blue-600 hover:bg-blue-50/50 text-blue-600 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{uploading ? 'Ingesting Contract...' : '+ Upload Custom Contract PDF'}</span>
        </button>
      </div>

      {/* 2. Categorized Navigation */}
      <nav className="flex-1 p-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-2.5 mb-1.5">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-800 font-bold border-l-4 border-blue-600 rounded-r-lg shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white border-transparent'
                        : item.alert
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : item.cyan
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 3. Sidebar Footer: System Status */}
      <div className="p-3 border-t border-slate-200 shrink-0 bg-slate-50/50">
        <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-bold text-slate-800 tracking-tight">
              Hybrid Index Ready
            </span>
          </div>
          <div className="text-[10.5px] text-slate-500 leading-snug">
            ChromaDB + BM25Okapi + Neural Reranker
          </div>
        </div>
      </div>
    </aside>
  );
};
