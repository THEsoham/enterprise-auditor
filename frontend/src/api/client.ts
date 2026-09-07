import type {
  SystemStats,
  DocumentItem,
  AskResponse,
  ClauseInfo,
  ClauseDetailResponse,
  RiskResponse,
  MissingClauseResponse,
  CompareResponse,
  VerifyResult,
  ObligationsResponse,
  ReportResponse,
  TableItem,
  ImageItem,
  EvalSummary
} from '../types';

const BASE_URL = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const err = await res.json();
      if (err.detail) errorDetail = err.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getStats: () => fetchJson<SystemStats>(`${BASE_URL}/stats`),

  getDocuments: () =>
    fetchJson<{ documents: DocumentItem[]; count: number }>(`${BASE_URL}/documents`),

  getClauseTypes: () =>
    fetchJson<{ clause_types: string[] }>(`${BASE_URL}/clause-types`),

  askQuestion: (question: string, document?: string | null, top_k = 5) =>
    fetchJson<AskResponse>(`${BASE_URL}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question, document: document || null, top_k }),
    }),

  extractClauses: (document: string) =>
    fetchJson<{ document: string; clauses: Record<string, ClauseInfo> }>(
      `${BASE_URL}/extract`,
      {
        method: 'POST',
        body: JSON.stringify({ document }),
      }
    ),

  extractClauseDetail: (document: string, clause_type: string) =>
    fetchJson<ClauseDetailResponse>(`${BASE_URL}/extract-detail`, {
      method: 'POST',
      body: JSON.stringify({ document, clause_type }),
    }),

  detectRisks: (document: string) =>
    fetchJson<RiskResponse>(`${BASE_URL}/risks`, {
      method: 'POST',
      body: JSON.stringify({ document }),
    }),

  checkMissingClause: (document: string, clause_type: string) =>
    fetchJson<MissingClauseResponse>(`${BASE_URL}/missing-clause`, {
      method: 'POST',
      body: JSON.stringify({ document, clause_type }),
    }),

  compareClause: (clause_type: string, n_contracts = 5) =>
    fetchJson<CompareResponse>(`${BASE_URL}/compare`, {
      method: 'POST',
      body: JSON.stringify({ clause_type, n_contracts }),
    }),

  verifyFinding: (finding: string, evidence: any) =>
    fetchJson<VerifyResult>(`${BASE_URL}/verify`, {
      method: 'POST',
      body: JSON.stringify({ finding, evidence }),
    }),

  getKnowledgeGraph: (document: string) =>
    fetchJson<{ document: string; graph_summary: string; graph_data?: any }>(
      `${BASE_URL}/knowledge-graph`,
      {
        method: 'POST',
        body: JSON.stringify({ document }),
      }
    ),

  extractObligations: (document: string) =>
    fetchJson<ObligationsResponse>(`${BASE_URL}/obligations?document=${encodeURIComponent(document)}`),

  generateReport: (document: string) =>
    fetchJson<ReportResponse>(`${BASE_URL}/report?document=${encodeURIComponent(document)}`),

  getTables: (document: string) =>
    fetchJson<{ document: string; tables: TableItem[]; count: number }>(
      `${BASE_URL}/tables?document=${encodeURIComponent(document)}`
    ),

  getImages: (document: string) =>
    fetchJson<{ document: string; images: ImageItem[]; count: number }>(
      `${BASE_URL}/images?document=${encodeURIComponent(document)}`
    ),

  runEval: () => fetchJson<EvalSummary>(`${BASE_URL}/eval`),

  uploadContract: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      let msg = 'Upload failed';
      try {
        const err = await res.json();
        if (err.detail) msg = err.detail;
      } catch {}
      throw new Error(msg);
    }
    return res.json() as Promise<{
      document: string;
      pages_count: number;
      chunks_count: number;
      status: string;
    }>;
  },
};
