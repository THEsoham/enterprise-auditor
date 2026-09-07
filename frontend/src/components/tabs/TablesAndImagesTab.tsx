import React, { useState, useEffect } from 'react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import type { TableItem, ImageItem } from '../../types';
import {
  Table as TableIcon,
  Image as ImageIcon,
  Download,
  FileSpreadsheet,
  Maximize2,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';

export const TablesAndImagesTab: React.FC = () => {
  const { selectedDocument, showToast } = useAudit();

  const [activeSubTab, setActiveSubTab] = useState<'tables' | 'images'>('tables');
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [modalImage, setModalImage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDocument) {
      loadAssets(selectedDocument);
    } else {
      setTables([]);
      setImages([]);
    }
  }, [selectedDocument]);

  const loadAssets = async (docName: string) => {
    setLoading(true);
    try {
      const [tRes, iRes] = await Promise.all([
        api.getTables(docName).catch(() => ({ tables: [] })),
        api.getImages(docName).catch(() => ({ images: [] })),
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
      <div className="p-12 bg-white border border-slate-200 rounded-xl shadow-xs text-center my-8">
        <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-3 shadow-2xs">
          <TableIcon className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-800 mb-1">Select an Agreement to View Tables & Exhibits</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Choose an agreement from the sidebar to inspect extracted financial schedules, fee matrices, and MiniCPM-V visual exhibits.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-slate-900">Tables & Visual Exhibits Studio</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              pdfplumber + MiniCPM-V
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Financial schedules, pricing matrices, and visual diagrams extracted from{' '}
            <span className="font-semibold text-slate-800">{selectedDocument}</span>
          </p>
        </div>

        <button
          onClick={() => loadAssets(selectedDocument)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Extracting Assets...' : 'Re-Extract Assets'}
        </button>
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('tables')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeSubTab === 'tables'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TableIcon className="w-4 h-4" />
          Tabular Schedules ({tables.length})
        </button>

        <button
          onClick={() => setActiveSubTab('images')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeSubTab === 'images'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Visual Exhibits & VLM ({images.length})
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">Extracting tabular matrices & diagrams...</p>
          <p className="text-xs text-slate-500 mt-1">Parsing cell boundaries and running MiniCPM-V vision models</p>
        </div>
      ) : activeSubTab === 'tables' ? (
        tables.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
            <TableIcon className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">No Tabular Schedules Detected</h3>
            <p className="text-xs text-slate-500">
              pdfplumber did not identify grid cell structures in this PDF agreement.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {tables.map((tbl, idx) => {
              const rows = tbl.csv_data
                ? tbl.csv_data.trim().split('\n').map((r) => r.split(',').map((c) => c.replace(/^"|"$/g, '').trim()))
                : [];
              const headerRow = rows[0] || [];
              const dataRows = rows.slice(1);

              return (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Schedule / Table #{tbl.table_number || idx + 1}
                        </h3>
                        <div className="text-xs text-slate-500 font-mono">
                          Page {tbl.page} • Shape: {tbl.shape || `${rows.length} rows`}
                        </div>
                      </div>
                    </div>

                    {tbl.csv_data && (
                      <button
                        onClick={() => handleDownloadCsv(tbl)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Download CSV
                      </button>
                    )}
                  </div>

                  {/* Rendered Table */}
                  {rows.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-96">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 sticky top-0 text-slate-700 uppercase font-bold border-b border-slate-200">
                          <tr>
                            {headerRow.map((col, cIdx) => (
                              <th key={cIdx} className="p-2.5 font-bold border-r border-slate-200 last:border-r-0">
                                {col || `Col ${cIdx + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {dataRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                              {row.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  className="p-2.5 text-slate-800 font-mono text-[11px] border-r border-slate-100 last:border-r-0"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                      No raw text rows available for this schedule.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        images.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
            <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">No Visual Exhibits Detected</h3>
            <p className="text-xs text-slate-500">
              No embedded flowcharts, signatures, or diagrammatic figures were found in this document.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img, idx) => {
              const srcUrl = img.url || (img.image_path.startsWith('/') ? img.image_path : `/data/${img.image_path}`);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all space-y-3 shadow-xs"
                >
                  <div className="relative group rounded-lg overflow-hidden bg-slate-50 border border-slate-200 aspect-video flex items-center justify-center">
                    <img
                      src={srcUrl}
                      alt={`Exhibit Page ${img.page}`}
                      className="object-contain w-full h-full max-h-48 group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        (e.target as any).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                      }}
                    />
                    <button
                      onClick={() => setModalImage(srcUrl)}
                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white text-xs font-bold transition-opacity cursor-pointer"
                    >
                      <Maximize2 className="w-4 h-4" /> Expand View
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Exhibit #{idx + 1}</span>
                    <span className="text-slate-500 font-mono">Page {img.page}</span>
                  </div>

                  {img.description && (
                    <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 text-xs text-slate-800 leading-relaxed">
                      <div className="text-[10px] uppercase font-bold text-blue-700 mb-0.5">MiniCPM-V Analysis</div>
                      {img.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Image Zoom Modal */}
      {modalImage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-6">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl p-3 border border-slate-200 shadow-modal">
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={modalImage}
              alt="Expanded Exhibit"
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};
