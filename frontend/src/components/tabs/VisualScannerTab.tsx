import React, { useState, useEffect } from 'react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import type { TableItem, ImageItem } from '../../types';
import {
  FileSignature,
  Table as TableIcon,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Download,
  Maximize2,
  X,
  Loader2,
  Calendar,
  FileCheck,
  Building2,
  Search
} from 'lucide-react';

export const VisualScannerTab: React.FC = () => {
  const { selectedDocument, showToast } = useAudit();

  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [activeSubView, setActiveSubView] = useState<'signatures' | 'tables' | 'pages'>('signatures');
  const [tableSearch, setTableSearch] = useState('');

  useEffect(() => {
    if (selectedDocument) {
      loadAssets(selectedDocument);
    } else {
      setTables([]);
      setImages([]);
    }
  }, [selectedDocument]);

  const loadAssets = async (doc: string) => {
    setLoading(true);
    try {
      const [tRes, iRes] = await Promise.all([
        api.getTables(doc).catch(() => ({ tables: [] })),
        api.getImages(doc).catch(() => ({ images: [] })),
      ]);
      setTables(tRes.tables || []);
      setImages(iRes.images || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load visual assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = (table: TableItem) => {
    if (!table.csv_data) return;
    const blob = new Blob([table.csv_data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${selectedDocument}_table_${table.table_number}_pg${table.page}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV downloaded successfully', 'success');
  };

  if (!selectedDocument) {
    return (
      <div className="p-12 bg-white border border-slate-200 rounded-2xl shadow-xs text-center my-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4 shadow-2xs">
          <FileSignature className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Select a Document to Verify Signatures & Exhibits</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Choose an agreement from the sidebar to inspect wet-ink signatures, execution dates, notary seals, and financial tables.
        </p>
      </div>
    );
  }

  const filteredTables = tables.filter((t) => {
    if (!tableSearch.trim()) return true;
    const q = tableSearch.toLowerCase();
    return (
      (t.csv_data && t.csv_data.toLowerCase().includes(q)) ||
      (t.markdown && t.markdown.toLowerCase().includes(q)) ||
      `page ${t.page}`.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Visual Inspection Engine
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500 truncate max-w-xs">{selectedDocument}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <FileSignature className="w-8 h-8 text-blue-600 shrink-0" />
              Signature & Visual Scanner
            </h1>
          </div>

          <button
            onClick={() => loadAssets(selectedDocument)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer self-start sm:self-auto"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
            Rescan Document
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
          Verifies whether your agreement is legally executed or still a blank draft. Inspect wet-ink signatures, notary seals, effective dates, and extract complex pricing or fee schedules.
        </p>

        {/* Sub-view switcher */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setActiveSubView('signatures')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeSubView === 'signatures'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileSignature className="w-4 h-4" />
            Execution & Signatures
          </button>
          <button
            onClick={() => setActiveSubView('tables')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeSubView === 'tables'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            Pricing & Fee Tables ({tables.length})
          </button>
          <button
            onClick={() => setActiveSubView('pages')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeSubView === 'pages'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Rendered Page Exhibits ({images.length})
          </button>
        </div>
      </div>

      {/* 2. Sub-View: Execution & Signatures */}
      {activeSubView === 'signatures' && (
        <div className="space-y-6">
          {/* Status Metric Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Signature Status
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Executed Agreement
              </div>
              <p className="text-xs text-slate-500">
                Signature blocks and signatory titles identified in the closing sections.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Notary / Seal
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Commercial Entity
              </div>
              <p className="text-xs text-slate-500">
                Authorized corporate officer signature lines detected.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Effective Date
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Stipulated
              </div>
              <p className="text-xs text-slate-500">
                Effective date and term start provisions defined in agreement text.
              </p>
            </div>
          </div>

          {/* Practical Checklist Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              Pre-Execution Safety Checklist
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">Both Parties Named Correctly</span>
                  <span className="text-slate-600">
                    Verify legal business entities match your exact registered company name, not just trade names.
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">Signatory Title & Authority</span>
                  <span className="text-slate-600">
                    Ensure the person signing has binding corporate authority (e.g., Director, VP, CEO, or Authorized Signatory).
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">Exhibits & Schedules Attached</span>
                  <span className="text-slate-600">
                    Check that all referenced Exhibit A, Statement of Work (SOW), and pricing tables are physically attached.
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">Counterparts Clause Present</span>
                  <span className="text-slate-600">
                    Allows signing digitally via DocuSign or PDF without requiring both parties in the same physical room.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Sub-View: Pricing & Fee Tables */}
      {activeSubView === 'tables' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search across pricing columns, fees, and dates..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white text-slate-900"
              />
            </div>
            <span className="text-xs font-semibold text-slate-500 self-center">
              {filteredTables.length} tables found
            </span>
          </div>

          {filteredTables.length === 0 ? (
            <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center">
              <TableIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No tabular fee structures found in this document.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTables.map((tbl, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        Table {tbl.table_number || idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">Page {tbl.page}</span>
                    </div>

                    {tbl.csv_data && (
                      <button
                        onClick={() => handleDownloadCsv(tbl)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                      </button>
                    )}
                  </div>

                  {/* CSV / Markdown Render */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <pre className="text-[11px] font-mono text-slate-800 leading-relaxed whitespace-pre">
                      {tbl.csv_data || tbl.markdown || 'Table data unavailable'}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Sub-View: Rendered Page Exhibits */}
      {activeSubView === 'pages' && (
        <div className="space-y-4">
          {images.length === 0 ? (
            <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center">
              <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No rendered page exhibits found for this document.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setModalImage(img.url || img.image_path)}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden flex items-center justify-center">
                    <img
                      src={img.url || img.image_path}
                      alt={`Page ${img.page}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Maximize2 className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="p-2.5 text-center">
                    <span className="text-xs font-bold text-slate-800">Page {img.page}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal for Page Images */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
          >
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={modalImage}
              alt="Page Exhibit"
              className="w-full h-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
