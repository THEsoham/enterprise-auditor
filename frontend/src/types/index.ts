export interface SystemStats {
  total_documents: number;
  total_vectors: number;
  models: {
    llm_generation: string;
    llm_verification: string;
    embeddings: string;
    vlm: string;
  };
  status: string;
}

export interface DocumentItem {
  name: string;
  category: string;
  path: string;
}

export interface CitedSource {
  text: string;
  source: string;
  page: number | string;
  score?: number;
}

export interface AskResponse {
  query: string;
  answer: string;
  sources: CitedSource[];
  document?: string | null;
  confidence?: string;
  latency_seconds?: number;
}

export interface ClauseInfo {
  found: boolean;
  status: string;
  text: string;
  pages: number[];
  confidence?: string;
}

export interface ClauseDetailResponse {
  clause_type: string;
  document: string;
  parameters: Record<string, any>;
  risk_level: string;
  compliance_score: number;
}

export interface RiskFinding {
  risk_type: string;
  description: string;
  evidence: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation?: string;
}

export interface RiskResponse {
  document: string;
  risks: RiskFinding[];
  total_risks: number;
  severity_counts: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}

export interface MissingClauseResponse {
  clause_type: string;
  document: string;
  status: 'FOUND' | 'NOT_FOUND';
  detail: string;
  evidence: CitedSource[] | string[];
}

export interface ComparisonItem {
  document: string;
  status: string;
  text: string;
  pages: number[];
}

export interface CompareResponse {
  clause_type: string;
  comparisons: ComparisonItem[];
  synthesis: string;
}

export interface VerifyResult {
  verdict: 'SUPPORTED' | 'NOT_SUPPORTED' | 'PARTIALLY_SUPPORTED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  supported_claims: string[];
  unsupported_claims: string[];
  contradictions: string[];
  missing_information: string[];
  correction: string;
  explanation: string;
  // Backward-compatible fields
  reasoning?: string;
  supported?: boolean;
  model?: string;
}

export interface ObligationItem {
  type: string;
  description: string;
  trigger_date?: string;
  timeframe?: string;
  responsible_party?: string;
  penalty?: string;
  page?: number | string;
}

export interface ObligationsResponse {
  document: string;
  obligations: ObligationItem[];
}

export interface ReportResponse {
  document: string;
  markdown: string;
  compliance_grade?: string;
}

export interface TableItem {
  table_number: number;
  page: number;
  shape: string;
  csv_data?: string;
  markdown?: string;
}

export interface ImageItem {
  image_path: string;
  page: number;
  url?: string;
  description?: string;
}

export interface EvalResultItem {
  question: string;
  answered: boolean;
  keyword_score: number;
  latency_seconds: number;
  num_sources: number;
}

export interface EvalSummary {
  answer_rate: number;
  keyword_score: number;
  avg_latency_s: number;
  avg_sources: number;
  results: EvalResultItem[];
}

export interface EnterpriseMetricDetail {
  score: number;
  label: string;
  abbrev: string;
  [key: string]: any;
}

export interface EnterpriseEvalSummary {
  document: string;
  composite_score: number;
  grade: string;
  metrics: {
    clause_coverage: EnterpriseMetricDetail;
    risk_detection: EnterpriseMetricDetail;
    cross_reference: EnterpriseMetricDetail;
    adversarial_robustness: EnterpriseMetricDetail;
    latency_compliance: EnterpriseMetricDetail;
    hallucination_guard: EnterpriseMetricDetail;
  };
  weights: Record<string, number>;
}

export const TYPES_VERSION = '1.1.0';
