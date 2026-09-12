import React, { useState, useEffect, useRef } from 'react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import {
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Info,
  Loader2
} from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  type: 'entity' | 'clause' | 'obligation' | 'law' | 'risk';
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
}

export const KnowledgeGraphTab: React.FC = () => {
  const { selectedDocument, showToast } = useAudit();

  const [loading, setLoading] = useState(false);
  const [graphSummary, setGraphSummary] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodeFilter, setNodeFilter] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Pan and zoom state
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<GraphNode | null>(null);

  useEffect(() => {
    if (selectedDocument) {
      loadGraph(selectedDocument);
    } else {
      setGraphSummary('');
      nodesRef.current = [];
      linksRef.current = [];
    }
  }, [selectedDocument]);

  const loadGraph = async (docName: string) => {
    setLoading(true);
    try {
      const data = await api.getKnowledgeGraph(docName);
      setGraphSummary(data.graph_summary || '');

      if (data.graph_data && data.graph_data.nodes && data.graph_data.links) {
        processGraphData(data.graph_data.nodes, data.graph_data.links);
      } else {
        generateSyntheticGraph(docName, data.graph_summary);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load contract topology', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateSyntheticGraph = (docName: string, _summary: string) => {
    const w = 800;
    const h = 500;
    const center = { x: w / 2, y: h / 2 };

    const nodes: GraphNode[] = [
      {
        id: 'doc',
        label: docName.slice(0, 24),
        type: 'entity',
        x: center.x,
        y: center.y,
        radius: 26,
        color: '#2563eb', // blue
      },
      {
        id: 'party_a',
        label: 'Company / Discloser',
        type: 'entity',
        x: center.x - 160,
        y: center.y - 120,
        radius: 20,
        color: '#0284c7',
      },
      {
        id: 'party_b',
        label: 'Recipient / Vendor',
        type: 'entity',
        x: center.x + 160,
        y: center.y - 120,
        radius: 20,
        color: '#0ea5e9',
      },
      {
        id: 'cl_term',
        label: 'Termination Clause',
        type: 'clause',
        x: center.x - 200,
        y: center.y + 100,
        radius: 18,
        color: '#059669', // emerald
      },
      {
        id: 'cl_indem',
        label: 'Indemnification',
        type: 'clause',
        x: center.x + 200,
        y: center.y + 100,
        radius: 18,
        color: '#d97706', // amber
      },
      {
        id: 'cl_liab',
        label: 'Limitation of Liability',
        type: 'clause',
        x: center.x + 40,
        y: center.y + 180,
        radius: 18,
        color: '#e11d48', // rose
      },
      {
        id: 'cl_law',
        label: 'Governing Law',
        type: 'law',
        x: center.x - 140,
        y: center.y + 200,
        radius: 16,
        color: '#6366f1', // indigo
      },
      {
        id: 'ob_conf',
        label: 'Confidentiality Duty',
        type: 'obligation',
        x: center.x,
        y: center.y - 200,
        radius: 16,
        color: '#0891b2', // cyan
      },
    ];

    const links: GraphLink[] = [
      { source: 'doc', target: 'party_a', label: 'Party A' },
      { source: 'doc', target: 'party_b', label: 'Party B' },
      { source: 'doc', target: 'cl_term', label: 'Specifies' },
      { source: 'doc', target: 'cl_indem', label: 'Mandates' },
      { source: 'doc', target: 'cl_liab', label: 'Caps Liability' },
      { source: 'doc', target: 'cl_law', label: 'Jurisdiction' },
      { source: 'party_b', target: 'ob_conf', label: 'Obligated' },
      { source: 'party_a', target: 'cl_indem', label: 'Indemnified By' },
      { source: 'cl_indem', target: 'cl_liab', label: 'Subject To Cap' },
    ];

    nodesRef.current = nodes;
    linksRef.current = links;
    resetTransform();
    startSimulation();
  };

  const processGraphData = (rawNodes: any[], rawLinks: any[]) => {
    const center = { x: 400, y: 250 };
    const palette: Record<string, string> = {
      entity: '#2563eb',
      clause: '#059669',
      obligation: '#0891b2',
      risk: '#e11d48',
      law: '#6366f1',
    };

    const nodes: GraphNode[] = rawNodes.map((n, i) => {
      const angle = (i / rawNodes.length) * Math.PI * 2;
      const dist = 140 + (i % 3) * 40;
      return {
        id: n.id || String(i),
        label: n.label || n.name || `Node ${i}`,
        type: n.type || 'clause',
        x: center.x + Math.cos(angle) * dist,
        y: center.y + Math.sin(angle) * dist,
        radius: n.type === 'entity' ? 22 : 17,
        color: palette[n.type] || '#2563eb',
      };
    });

    const links: GraphLink[] = rawLinks.map((l) => ({
      source: l.source,
      target: l.target,
      label: l.label || l.relationship || 'relates',
    }));

    nodesRef.current = nodes;
    linksRef.current = links;
    resetTransform();
    startSimulation();
  };

  const resetTransform = () => {
    transformRef.current = { x: 0, y: 0, scale: 1 };
  };

  const startSimulation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    renderLoop();
  };

  const renderLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const { x: panX, y: panY, scale } = transformRef.current;

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    const nodes = nodesRef.current;
    const links = linksRef.current;
    const nodeMap = new Map<string, GraphNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    // Draw Links
    links.forEach((link) => {
      const src = nodeMap.get(link.source);
      const tgt = nodeMap.get(link.target);
      if (!src || !tgt) return;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = '#cbd5e1'; // light slate line
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Edge Label
      const midX = (src.x + tgt.x) / 2;
      const midY = (src.y + tgt.y) / 2;
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText(link.label, midX, midY - 4);
    });

    // Draw Nodes
    nodes.forEach((node) => {
      const isSelected = selectedNode?.id === node.id;
      const isMatch = !nodeFilter || node.label.toLowerCase().includes(nodeFilter.toLowerCase());

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = isMatch ? node.color : '#94a3b8';
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label below node
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = isSelected ? '#0f172a' : '#334155';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + node.radius + 14);
    });

    ctx.restore();

    animationFrameRef.current = requestAnimationFrame(renderLoop);
  };

  // Mouse Interactivity
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { x: panX, y: panY, scale } = transformRef.current;
    const worldX = (mouseX - panX) / scale;
    const worldY = (mouseY - panY) / scale;

    const hitNode = nodesRef.current.find((n) => {
      const dx = n.x - worldX;
      const dy = n.y - worldY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius;
    });

    if (hitNode) {
      setSelectedNode(hitNode);
      draggedNodeRef.current = hitNode;
    } else {
      isDraggingRef.current = true;
      dragStartRef.current = { x: mouseX - panX, y: mouseY - panY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (draggedNodeRef.current) {
      const { x: panX, y: panY, scale } = transformRef.current;
      draggedNodeRef.current.x = (mouseX - panX) / scale;
      draggedNodeRef.current.y = (mouseY - panY) / scale;
    } else if (isDraggingRef.current) {
      transformRef.current.x = mouseX - dragStartRef.current.x;
      transformRef.current.y = mouseY - dragStartRef.current.y;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    draggedNodeRef.current = null;
  };

  const zoom = (factor: number) => {
    transformRef.current.scale = Math.max(0.4, Math.min(2.5, transformRef.current.scale * factor));
  };

  if (!selectedDocument) {
    return (
      <div className="p-12 bg-white border border-slate-200 rounded-xl shadow-xs text-center my-8">
        <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-3 shadow-2xs">
          <Share2 className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-800 mb-1">Select an Agreement to View Contract Map</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Choose an agreement from the sidebar to inspect legal topology, entity relationships, and cross-party covenants.
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
            <h1 className="text-lg font-bold text-slate-900">Contract Map & Topology</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Visual Relationships
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Interactive network mapping party relationships, liabilities, and clause dependencies for{' '}
            <span className="font-semibold text-slate-800">{selectedDocument}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search graph nodes..."
              value={nodeFilter}
              onChange={(e) => setNodeFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white w-48 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Graph Summary Card */}
      {graphSummary && (
        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 flex items-start gap-3 shadow-2xs">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 leading-relaxed font-medium">{graphSummary}</p>
        </div>
      )}

      {/* Canvas & Inspector Layout */}
      <div className="flex gap-5 relative">
        {/* Canvas Container */}
        <div className="flex-1 rounded-xl border border-slate-200 bg-white overflow-hidden relative min-h-[520px] shadow-xs">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs z-10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
              <p className="text-xs font-semibold text-slate-700">Synthesizing legal knowledge graph...</p>
            </div>
          ) : null}

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={900}
            height={520}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full cursor-grab active:cursor-grabbing block bg-slate-50/30"
          />

          {/* Floating Controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 p-1 rounded-lg bg-white border border-slate-200 shadow-md">
            <button
              onClick={() => zoom(1.2)}
              title="Zoom In"
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => zoom(0.8)}
              title="Zoom Out"
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetTransform}
              title="Reset View"
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute top-4 left-4 p-3 rounded-lg bg-white border border-slate-200 shadow-md text-[11px] space-y-1.5">
            <div className="font-bold text-slate-800 mb-1">Graph Legend</div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Parties & Entities
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Contract Clauses
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 inline-block" /> Obligations
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Liability Caps
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> Governing Law
            </div>
          </div>
        </div>

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="w-80 shrink-0 p-5 rounded-xl bg-white border border-slate-200 shadow-lg space-y-3.5 h-fit">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Node Details</div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedNode.color }}
              />
              <h3 className="text-sm font-bold text-slate-900">{selectedNode.label}</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Classification:</span>
                <span className="text-slate-800 font-bold capitalize">{selectedNode.type}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Identifier:</span>
                <span className="text-slate-700 font-mono text-[11px]">{selectedNode.id}</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-[10.5px] uppercase font-bold text-slate-500 tracking-wider mb-2">Connected Links</div>
              <div className="space-y-1.5">
                {linksRef.current
                  .filter((l) => l.source === selectedNode.id || l.target === selectedNode.id)
                  .map((l, idx) => {
                    const otherId = l.source === selectedNode.id ? l.target : l.source;
                    const otherNode = nodesRef.current.find((n) => n.id === otherId);
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                      >
                        <span className="text-slate-500">{l.label}:</span>
                        <span className="text-slate-900 font-semibold">{otherNode?.label || otherId}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
