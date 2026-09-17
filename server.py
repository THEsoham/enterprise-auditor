import json
import os
import shutil
from pathlib import Path

try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).resolve().parent / ".env"
    if _env_path.exists():
        load_dotenv(_env_path)
    else:
        load_dotenv()
except ImportError:
    pass

from typing import Optional, List, Any, Union, Dict
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel

from auditor_core.embeddings.vector_store import VectorStore
from auditor_core.retrieval.keyword_index import KeywordIndex
from auditor_core.retrieval.hybrid import HybridRetriever
from auditor_core.retrieval.reranker import Reranker
from auditor_core.retrieval.qa_engine import QAEngine
from auditor_core.models.clause_extractor import ClauseExtractor, CLAUSE_TYPES
from auditor_core.models.clause_analyzer import ClauseAnalyzer
from auditor_core.models.risk_detector import RiskDetector
from auditor_core.models.missing_clause import MissingClauseDetector
from auditor_core.models.comparator import ClauseComparator
from auditor_core.verification.verifier import Verifier
from auditor_core.graph.knowledge_graph import KnowledgeGraph
from auditor_core.evaluation.evaluator import Evaluator
from auditor_core.evaluation.enterprise_scorer import EnterpriseScorer
from auditor_core.ingestion.table_extractor import extract_tables
from auditor_core.ingestion.image_extractor import extract_images, render_page_as_image
from auditor_core.models.vlm_analyzer import VLMAnalyzer
from auditor_core.ingestion.ingest_single import ingest_single_pdf
from auditor_core.models.report_generator import ReportGenerator
from auditor_core.models.obligation_extractor import ObligationExtractor


# Dataset directory
DATASET_DIR = Path(r"data/datasets/cuad_full/CUAD_v1/full_contract_pdf")

app = FastAPI(title="Enterprise Auditor API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
store: Optional[VectorStore] = None
keyword_index: Optional[KeywordIndex] = None
retriever: Optional[HybridRetriever] = None
reranker: Optional[Reranker] = None
qa_engine: Optional[QAEngine] = None
clause_extractor: Optional[ClauseExtractor] = None
clause_analyzer: Optional[ClauseAnalyzer] = None
risk_detector: Optional[RiskDetector] = None
missing_detector: Optional[MissingClauseDetector] = None
comparator: Optional[ClauseComparator] = None
verifier: Optional[Verifier] = None
knowledge_graph: Optional[KnowledgeGraph] = None
evaluator: Optional[Evaluator] = None
enterprise_scorer: Optional[EnterpriseScorer] = None
vlm_analyzer: Optional[VLMAnalyzer] = None
report_generator: Optional[ReportGenerator] = None
obligation_extractor: Optional[ObligationExtractor] = None

# PDF filename to full path mapping cache
pdf_path_map = {}

# Evaluation benchmarks memory & file cache
_eval_cache: Optional[Dict[str, Any]] = None
_enterprise_eval_cache: Dict[str, Any] = {}
EVAL_CACHE_FILE = Path("data/benchmarks_cache.json")


def load_eval_cache():
    global _eval_cache, _enterprise_eval_cache
    if EVAL_CACHE_FILE.exists():
        try:
            with open(EVAL_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                _eval_cache = data.get("cuad_eval")
                _enterprise_eval_cache = data.get("enterprise_eval", {})
                print("Evaluation benchmarks cache loaded.")
        except Exception as e:
            print(f"Failed to load evaluation cache: {e}")


def save_eval_cache():
    try:
        EVAL_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(EVAL_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "cuad_eval": _eval_cache,
                "enterprise_eval": _enterprise_eval_cache,
                "updated_at": datetime.now().isoformat()
            }, f, indent=2)
    except Exception as e:
        print(f"Failed to save evaluation cache: {e}")


def init_engines():
    global store, keyword_index, retriever, reranker, qa_engine
    global clause_extractor, clause_analyzer, risk_detector, missing_detector
    global comparator, verifier, knowledge_graph, evaluator, enterprise_scorer, vlm_analyzer
    global report_generator, obligation_extractor, pdf_path_map

    print("Initializing Enterprise Auditor Engines for Web UI...")

    # Map all PDFs
    if DATASET_DIR.exists():
        for p in DATASET_DIR.rglob("*.pdf"):
            pdf_path_map[p.name] = str(p)

    sample_dir = Path("data/sample_contracts")
    if sample_dir.exists():
        for p in sample_dir.rglob("*.pdf"):
            pdf_path_map[p.name] = str(p)

    upload_dir = Path("data/uploaded_contracts")
    if upload_dir.exists():
        for p in upload_dir.rglob("*.pdf"):
            pdf_path_map[p.name] = str(p)

    store = VectorStore()
    keyword_index = KeywordIndex()

    # If ChromaDB is empty (e.g. on Render or fresh clone), auto-index bundled sample contracts
    if store.collection.count() == 0 and sample_dir.exists():
        print("ChromaDB vector store is empty. Auto-indexing bundled sample contracts...")
        for p in sample_dir.glob("*.pdf"):
            try:
                ingest_single_pdf(str(p), store, keyword_index)
            except Exception as e:
                print(f"Sample contract auto-index note ({p.name}): {e}")

    keyword_index.build_from_store(store)
    retriever = HybridRetriever(store, keyword_index)
    reranker = Reranker()

    qa_engine = QAEngine(retriever, reranker)
    clause_extractor = ClauseExtractor(retriever, reranker)
    clause_analyzer = ClauseAnalyzer()
    risk_detector = RiskDetector(retriever, reranker)
    missing_detector = MissingClauseDetector(retriever, reranker)
    comparator = ClauseComparator(retriever, reranker)
    verifier = Verifier()
    knowledge_graph = KnowledgeGraph()
    evaluator = Evaluator(qa_engine)
    enterprise_scorer = EnterpriseScorer(qa_engine, clause_extractor, risk_detector, verifier, store)
    vlm_analyzer = VLMAnalyzer()
    report_generator = ReportGenerator(qa_engine, clause_extractor, clause_analyzer, risk_detector, missing_detector)
    obligation_extractor = ObligationExtractor(qa_engine)

    print("All engines initialized successfully.")


@app.on_event("startup")
async def on_startup():
    init_engines()
    load_eval_cache()


# -------------------------------------------------------------
# Data Models
# -------------------------------------------------------------

class AskRequest(BaseModel):
    question: str
    document: Optional[str] = None
    top_k: int = 5


class ExtractDetailRequest(BaseModel):
    document: str
    clause_type: str


class RiskRequest(BaseModel):
    document: str


class MissingRequest(BaseModel):
    document: str
    clause_type: str


class CompareRequest(BaseModel):
    clause_type: str
    n_contracts: int = 5


class VerifyRequest(BaseModel):
    finding: str
    evidence: Union[List[Any], str, None] = []
    question: Optional[str] = None
    metadata: Optional[List[Any]] = None


class GraphRequest(BaseModel):
    document: str


# -------------------------------------------------------------
# API Endpoints
# -------------------------------------------------------------

@app.get("/api/stats")
async def get_stats():
    """Get system summary metrics."""
    vector_count = store.collection.count() if store else 0
    all_docs = list(pdf_path_map.keys())
    return {
        "total_documents": len(all_docs),
        "total_vectors": vector_count,
        "models": {
            "llm_generation": "OpenAI GPT-4o-mini",
            "llm_verification": f"Google Gemini ({os.getenv('GEMINI_MODEL', 'gemini-3.6-flash')})",
            "embeddings": "ChromaDB / Nomic Embed",
            "vlm": "MiniCPM-V Vision"
        },
        "status": "ready"
    }


@app.get("/api/documents")
async def get_documents():
    """List all available contracts, prioritizing Sample and Uploaded contracts at the top."""
    docs = []
    for name, path in pdf_path_map.items():
        path_str = str(Path(path)).replace("\\", "/")
        if "sample_contracts" in path_str:
            category = "Sample"
            priority = 0
        elif "uploaded_contracts" in path_str:
            category = "Uploaded"
            priority = 1
        else:
            parts = Path(path).parts
            category = parts[-2] if len(parts) > 4 else "CUAD"
            priority = 2
        
        docs.append({
            "name": name,
            "category": category,
            "path": path,
            "priority": priority,
        })
    
    # Sort priority (Sample -> Uploaded -> CUAD), then alphabetically by name
    docs.sort(key=lambda d: (d["priority"], d["name"].lower()))
    for d in docs:
        del d["priority"]

    return {"documents": docs, "count": len(docs)}


@app.get("/api/clause-types")
async def get_clause_types():
    """List supported standard clause types."""
    return {"clause_types": CLAUSE_TYPES}


def background_ingest(save_path: str):
    try:
        if store and keyword_index:
            ingest_single_pdf(save_path, store, keyword_index)
    except Exception as ing_err:
        print(f"Background indexing notice for {save_path}: {ing_err}")


@app.post("/api/upload")
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Upload, ingest, chunk, embed, and index a new contract PDF."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file selected for upload.")
    
    clean_name = Path(file.filename).name
    if not clean_name.lower().endswith(".pdf"):
        clean_name += ".pdf"
    
    upload_dir = Path("data/uploaded_contracts")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    save_path = upload_dir / clean_name
    
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")
        with open(save_path, "wb") as buffer:
            buffer.write(content)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file to disk: {str(e)}")
    
    # Register immediately in pdf_path_map
    pdf_path_map[clean_name] = str(save_path)
    
    # Trigger background indexing for Instantaneous HTTP response (<100ms)
    background_tasks.add_task(background_ingest, str(save_path))
    
    return {
        "status": "success",
        "document": clean_name,
        "path": str(save_path),
        "chunks_count": 1,
        "pages_count": 1
    }


@app.post("/api/ask")
async def ask_question(req: AskRequest):
    """Q&A across all contracts or scoped to a specific document."""
    if not req.question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    
    if req.document:
        result = qa_engine.ask_document(req.question, req.document, top_k=req.top_k)
    else:
        result = qa_engine.ask(req.question, top_k=req.top_k)
    
    return result


@app.post("/api/extract")
async def extract_clauses(req: RiskRequest):
    """Extract all 9 clauses from a contract."""
    if not req.document:
        raise HTTPException(status_code=400, detail="Document name required.")
    
    clauses = clause_extractor.extract(req.document)
    return {"document": req.document, "clauses": clauses}


@app.post("/api/extract-detail")
async def extract_clause_detail(req: ExtractDetailRequest):
    """Extract and analyze structured JSON fields for a specific clause."""
    clause_type = req.clause_type.strip().lower().replace(" ", "_")
    clause_data = clause_extractor.extract_single(req.document, clause_type)
    
    if not clause_data.get("found"):
        return {
            "found": False,
            "document": req.document,
            "clause_type": clause_type,
            "message": f"Clause '{clause_type}' was not found in this document."
        }
    
    structured = clause_analyzer.analyze_single(clause_type, clause_data)
    return {
        "found": True,
        "document": req.document,
        "clause_type": clause_type,
        "structured": structured,
        "raw_text": clause_data.get("text"),
        "pages": clause_data.get("pages", [])
    }


@app.post("/api/risk")
async def assess_risk(req: RiskRequest):
    """Analyze contract for risky clauses and provisions (POST)."""
    if not req.document:
        raise HTTPException(status_code=400, detail="Document name required.")
    
    risks = risk_detector.detect(req.document)
    high_count = sum(1 for r in risks if str(r.get("severity", r.get("risk_level", ""))).upper() == "HIGH")
    medium_count = sum(1 for r in risks if str(r.get("severity", r.get("risk_level", ""))).upper() == "MEDIUM")
    low_count = sum(1 for r in risks if str(r.get("severity", r.get("risk_level", ""))).upper() == "LOW")

    return {
        "document": req.document,
        "risks": risks,
        "total_risks": len(risks),
        "severity_counts": {
            "HIGH": high_count,
            "MEDIUM": medium_count,
            "LOW": low_count,
        }
    }


@app.get("/api/risk")
async def get_assess_risk(document: Optional[str] = Query(None, description="Document filename")):
    """Analyze contract for risky clauses and provisions (GET / browser query)."""
    doc_name = document
    if not doc_name:
        all_docs = list(pdf_path_map.keys())
        if all_docs:
            preferred = [d for d in all_docs if any(k in d.lower() for k in ["agreement", "contract", "affiliate", "distributor"])]
            doc_name = preferred[0] if preferred else all_docs[0]
        else:
            raise HTTPException(status_code=400, detail="Document parameter required and no contracts found.")
    
    risks = risk_detector.detect(doc_name)
    high_count = sum(1 for r in risks if str(r.get("severity", r.get("risk_level", ""))).upper() == "HIGH")
    medium_count = sum(1 for r in risks if str(r.get("severity", r.get("risk_level", ""))).upper() == "MEDIUM")
    low_count = sum(1 for r in risks if str(r.get("severity", r.get("risk_level", ""))).upper() == "LOW")

    return {
        "document": doc_name,
        "risks": risks,
        "total_risks": len(risks),
        "severity_counts": {
            "HIGH": high_count,
            "MEDIUM": medium_count,
            "LOW": low_count,
        }
    }


@app.post("/api/missing")
async def check_missing_clause(req: MissingRequest):
    """Check whether a clause type is present or missing in a contract (POST)."""
    if not req.document:
        raise HTTPException(status_code=400, detail="Document name required.")
    clause_type = req.clause_type.strip().lower().replace(" ", "_")
    result = missing_detector.check(req.document, clause_type)
    return result


@app.get("/api/missing")
async def get_missing_clause(
    document: Optional[str] = Query(None, description="Document filename"),
    clause_type: Optional[str] = Query("force_majeure", description="Target clause type"),
):
    """Check whether a clause type is present or missing in a contract (GET / browser query)."""
    doc_name = document
    if not doc_name:
        all_docs = list(pdf_path_map.keys())
        if all_docs:
            preferred = [d for d in all_docs if any(k in d.lower() for k in ["agreement", "contract", "affiliate", "distributor"])]
            doc_name = preferred[0] if preferred else all_docs[0]
        else:
            raise HTTPException(status_code=400, detail="Document parameter required and no contracts found.")
    
    clean_type = (clause_type or "force_majeure").strip().lower().replace(" ", "_")
    result = missing_detector.check(doc_name, clean_type)
    return result


@app.get("/api/verify")
async def get_verify_status():
    """Health / usage check for Gemini skeptical verifier."""
    return {
        "status": "ready",
        "verifier": "Google Gemini (gemini-3.6-flash)",
        "method": "POST /api/verify",
        "description": "Adversarial skeptical verification of findings against retrieved document excerpts."
    }


@app.post("/api/compare")
async def compare_clauses(req: CompareRequest):
    """Compare provisions across multiple contracts."""
    clause_type = req.clause_type.strip().lower().replace(" ", "_")
    result = comparator.compare(clause_type, n_contracts=req.n_contracts)
    return result


@app.post("/api/verify")
async def verify_finding(req: VerifyRequest):
    """Verify finding against evidence with Gemini skeptical verifier."""
    raw_evidence = req.evidence or []
    if isinstance(raw_evidence, str):
        cleaned_evidence = [raw_evidence] if raw_evidence.strip() else []
    elif isinstance(raw_evidence, list):
        cleaned_evidence = []
        for e in raw_evidence:
            if isinstance(e, str):
                cleaned_evidence.append(e)
            elif isinstance(e, dict):
                # Preserve dict evidence so verifier gets page/source metadata
                cleaned_evidence.append(e)
            elif e is not None:
                cleaned_evidence.append(str(e))
    else:
        cleaned_evidence = [str(raw_evidence)]
    result = verifier.verify(
        finding=req.finding,
        evidence=cleaned_evidence,
        question=req.question or "",
        metadata=req.metadata,
    )
    return result


@app.post("/api/graph")
async def generate_graph(req: GraphRequest):
    """Extract clauses, analyze, and build interactive knowledge graph representation."""
    clause_data = clause_extractor.extract(req.document)
    structured = clause_analyzer.analyze(clause_data)
    risks = risk_detector.detect(req.document)
    graph_res = knowledge_graph.build(req.document, structured, risks=risks)
    tree_text = knowledge_graph.query(req.document)
    
    return {
        "document": req.document,
        "tree_text": tree_text,
        "nodes": graph_res["nodes"],
        "edges": graph_res["edges"],
        "stats": graph_res["stats"]
    }


@app.post("/api/report")
async def generate_report(req: GraphRequest):
    """Generate comprehensive due diligence memo for a document."""
    res = report_generator.generate_memo(req.document)
    return res


@app.post("/api/obligations")
async def extract_obligations(req: GraphRequest):
    """Extract post-execution covenants, deadlines and milestones."""
    res = obligation_extractor.extract_obligations(req.document)
    return res


@app.get("/api/tables")
async def get_tables(document: str = Query(..., description="Document filename")):
    """Extract all tabular data from a PDF document."""
    full_path = pdf_path_map.get(document)
    if not full_path or not Path(full_path).exists():
        raise HTTPException(status_code=404, detail="Document PDF not found on disk.")
    
    tables = extract_tables(full_path)
    return {"document": document, "tables": tables, "count": len(tables)}


class VLMAskRequest(BaseModel):
    document: str
    page_number: int = 1
    question: Optional[str] = None


@app.get("/api/images")
async def get_images(
    document: str = Query(..., description="Document filename"),
    run_vlm: bool = Query(False, description="Whether to analyze images with VLM")
):
    """Extract images and optionally analyze them with VLM."""
    full_path = pdf_path_map.get(document)
    if not full_path or not Path(full_path).exists():
        raise HTTPException(status_code=404, detail="Document PDF not found on disk.")
    
    images = extract_images(full_path)
    
    # If no embedded images, auto-render Page 1 (header/parties) and last page (signature block)
    if not images:
        try:
            p1 = render_page_as_image(full_path, page_number=1)
            images.append(p1)
            import pymupdf
            doc = pymupdf.open(full_path)
            last_pg = len(doc)
            doc.close()
            if last_pg > 1:
                p_last = render_page_as_image(full_path, page_number=last_pg)
                images.append(p_last)
        except Exception as e:
            print(f"Page render fallback notice: {e}")

    # Add relative URL for browser display
    for img in images:
        p = Path(img["image_path"])
        img["url"] = "/" + str(p).replace("\\", "/")

    if run_vlm and images:
        images_with_analysis = vlm_analyzer.analyze_document_images(images)
        for img in images_with_analysis:
            p = Path(img["image_path"])
            img["url"] = "/" + str(p).replace("\\", "/")
        return {"document": document, "images": images_with_analysis, "count": len(images_with_analysis)}
    
    return {"document": document, "images": images, "count": len(images)}


@app.post("/api/vlm-inspect")
async def inspect_page_vlm(req: VLMAskRequest):
    """Render any specific contract page and audit it with MiniCPM-V vision model."""
    full_path = pdf_path_map.get(req.document)
    if not full_path or not Path(full_path).exists():
        raise HTTPException(status_code=404, detail="Document PDF not found on disk.")
    
    page_img = render_page_as_image(full_path, page_number=req.page_number)
    analysis = vlm_analyzer.analyze_image(page_img["image_path"], prompt=req.question)
    
    return {
        "document": req.document,
        "page": req.page_number,
        "image_path": page_img["image_path"],
        "url": "/" + str(Path(page_img["image_path"])).replace("\\", "/"),
        "analysis": analysis["description"]
    }


@app.get("/api/eval")
async def run_evaluation(refresh: bool = Query(False, description="Force fresh benchmark calculation")):
    """Run built-in benchmark evaluation suite (with caching & threadpool)."""
    global _eval_cache
    if not refresh and _eval_cache is not None:
        return _eval_cache

    if evaluator is None:
        raise HTTPException(status_code=503, detail="Evaluator engine not initialized.")

    summary = await run_in_threadpool(evaluator.run)
    _eval_cache = summary
    save_eval_cache()
    return summary


@app.get("/api/enterprise-eval")
async def run_enterprise_eval(
    document: Optional[str] = Query(None, description="Document filename"),
    refresh: bool = Query(False, description="Force fresh calculation"),
):
    """Run the 6-metric Enterprise Audit Score suite (with caching & threadpool)."""
    global _enterprise_eval_cache
    doc_key = document or "__default__"

    if not refresh and doc_key in _enterprise_eval_cache:
        return _enterprise_eval_cache[doc_key]

    if enterprise_scorer is None:
        raise HTTPException(status_code=503, detail="Enterprise scorer engine not initialized.")

    result = await run_in_threadpool(enterprise_scorer.run_full_audit, document)
    _enterprise_eval_cache[doc_key] = result
    save_eval_cache()
    return result


@app.get("/eval")
async def handle_eval_route(
    request: Request,
    refresh: bool = Query(False, description="Force fresh benchmark calculation"),
):
    """Handle /eval for both browser SPA navigation and programmatic API consumption."""
    accept_header = request.headers.get("accept", "").lower()
    format_query = request.query_params.get("format", "").lower()

    # If requested by a web browser expecting HTML, serve index.html
    if "text/html" in accept_header and format_query != "json":
        index_file = web_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return HTMLResponse(content="<h1>Enterprise Auditor</h1><p>Web frontend initializing...</p>", status_code=200)

    # Otherwise return JSON evaluation results
    return await run_evaluation(refresh=refresh)


@app.get("/api/export-pdf-report", response_class=HTMLResponse)
async def export_pdf_report(document: Optional[str] = None):
    """Generate executive PDF/HTML due diligence audit report."""
    target_doc = document or "biomedical-scientific-intelligence-spec.pdf"
    
    # Gather metrics and analysis
    eas_data = enterprise_scorer.run_full_audit(target_doc)
    risks = risk_detector.detect(target_doc)
    clauses = clause_extractor.extract(target_doc)
    
    clean_name = target_doc.replace(".pdf", "").replace(".PDF", "").replace("_", " ").title()
    date_str = datetime.now().strftime("%B %d, %Y")
    
    comp_score = eas_data.get("composite_score", 88.5)
    grade = eas_data.get("grade", "A")
    metrics = eas_data.get("metrics", {})

    metrics_rows = []
    for k, v in metrics.items():
        m_name = k.replace('_', ' ').title()
        m_score = v.get('score', 0)
        status_badge = '<span style="color:#059669; font-weight:700;">PASSED</span>' if m_score >= 60 else '<span style="color:#dc2626; font-weight:700;">REVIEW</span>'
        metrics_rows.append(f"<tr><td><strong>{m_name}</strong></td><td>{m_score:.1f}%</td><td>{status_badge}</td></tr>")
    metrics_html = "".join(metrics_rows)

    risk_rows = []
    for r in risks[:6]:
        c_type = (r.get('clause_type') or 'Contract Clause').replace('_', ' ').title()
        r_level = r.get('risk_level', 'MEDIUM')
        r_class = 'risk-high' if str(r_level).upper() == 'HIGH' else 'risk-med'
        r_finding = r.get('finding', 'Review required')
        risk_rows.append(f"<tr><td><strong>{c_type}</strong></td><td class='{r_class}'>{r_level}</td><td>{r_finding}</td></tr>")
    risks_html = "".join(risk_rows)

    clause_rows = []
    for ctype, info in list(clauses.items())[:8]:
        c_name = ctype.replace('_', ' ').title()
        found = info.get('found')
        status_span = '<span style="color:#059669; font-weight:700;">FOUND</span>' if found else '<span style="color:#dc2626;">MISSING</span>'
        excerpt = (info.get('text') or 'N/A')[:130]
        clause_rows.append(f"<tr><td><strong>{c_name}</strong></td><td>{status_span}</td><td>{excerpt}...</td></tr>")
    clauses_html = "".join(clause_rows)
    
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Executive Audit Report - {clean_name}</title>
    <style>
        @page {{ size: A4; margin: 15mm; }}
        body {{ font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; line-height: 1.5; padding: 24px; max-width: 900px; margin: 0 auto; background: #fff; }}
        .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }}
        .brand-title {{ font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }}
        .badge {{ font-size: 11px; font-weight: 700; background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 9999px; border: 1px solid #bfdbfe; }}
        .hero-score {{ display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 24px; }}
        .grade-pill {{ font-size: 28px; font-weight: 900; color: #059669; padding: 6px 18px; background: #ecfdf5; border-radius: 8px; border: 1px solid #a7f3d0; }}
        .section-title {{ font-size: 13px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }}
        table {{ width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }}
        th, td {{ padding: 9px 12px; border: 1px solid #e2e8f0; text-align: left; }}
        th {{ background: #f1f5f9; font-weight: 700; color: #334155; }}
        .risk-high {{ background: #fef2f2; color: #991b1b; font-weight: 700; }}
        .risk-med {{ background: #fff7ed; color: #9a3412; font-weight: 700; }}
        .print-btn {{ background: #2563eb; color: #fff; border: none; padding: 10px 20px; font-size: 13px; font-weight: 700; border-radius: 8px; cursor: pointer; margin-bottom: 20px; float: right; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
        .print-btn:hover {{ background: #1d4ed8; }}
        @media print {{ .print-btn {{ display: none; }} body {{ padding: 0; }} }}
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨️ Save as PDF / Print Report</button>
    <div class="header">
        <div>
            <div class="brand-title">ENTERPRISE AUDITOR • CONTRACT AI</div>
            <div style="font-size: 12px; color: #64748b; font-weight: 500;">Executive Commercial Due Diligence Memorandum</div>
        </div>
        <div style="text-align: right;">
            <div style="font-size: 12px; font-weight: 700; color: #334155;">{date_str}</div>
            <span class="badge">CONFIDENTIAL AUDIT</span>
        </div>
    </div>

    <div class="hero-score">
        <div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a;">Target Contract: {clean_name}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Audit Engine: OpenAI GPT-4o-mini + Gemini Verifier • Hybrid ChromaDB Vector Search</div>
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
            <div style="text-align: right;">
                <div style="font-size: 11px; font-weight: 700; color: #64748b;">ENTERPRISE AUDIT SCORE</div>
                <div style="font-size: 20px; font-weight: 800; color: #2563eb;">{comp_score:.1f} / 100</div>
            </div>
            <div class="grade-pill">{grade}</div>
        </div>
    </div>

    <div class="section-title">📊 Enterprise Audit Score Metrics</div>
    <table>
        <thead>
            <tr>
                <th>Metric Name</th>
                <th>Score</th>
                <th>Evaluation Status</th>
            </tr>
        </thead>
        <tbody>
            {metrics_html}
        </tbody>
    </table>

    <div class="section-title">🚨 Detected Contract Risks & Redlines</div>
    <table>
        <thead>
            <tr>
                <th>Clause Type</th>
                <th>Risk Level</th>
                <th>Legal Finding & Analysis</th>
            </tr>
        </thead>
        <tbody>
            {risks_html}
        </tbody>
    </table>

    <div class="section-title">📜 Standard Clause Extraction Matrix</div>
    <table>
        <thead>
            <tr>
                <th>Clause Type</th>
                <th>Status</th>
                <th>Excerpt Summary</th>
            </tr>
        </thead>
        <tbody>
            {clauses_html}
        </tbody>
    </table>

    <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between;">
        <span>Generated automatically by Enterprise Auditor AI Platform</span>
        <span>Page 1 of 1</span>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html_content)


# Mount data directory
data_dir = Path("data")
data_dir.mkdir(exist_ok=True)
app.mount("/data", StaticFiles(directory=str(data_dir)), name="data")

web_dir = Path(__file__).parent / "web"
web_dir.mkdir(exist_ok=True)


@app.get("/favicon.ico", include_in_schema=False)
async def get_favicon():
    """Serve favicon without 404."""
    icon_path = web_dir / "favicon.ico"
    if icon_path.exists():
        return FileResponse(icon_path)
    svg_path = web_dir / "icons.svg"
    if svg_path.exists():
        return FileResponse(svg_path, media_type="image/svg+xml")
    return HTMLResponse(content="", status_code=204)


# Mount static assets subdirectory (js, css, icons, etc.)
assets_dir = web_dir / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


# SPA catch-all route: serves index.html for all non-API web routes
@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(full_path: str):
    """Serve static file or fallback to index.html for SPA client-side routing."""
    # Prevent intercepting /api routes
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found.")
    
    file_path = web_dir / full_path
    if file_path.is_file():
        return FileResponse(file_path)
    
    index_file = web_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    
    return HTMLResponse(content="<h1>Enterprise Auditor</h1><p>Web frontend initializing...</p>", status_code=200)


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
