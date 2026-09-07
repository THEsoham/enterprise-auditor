import json
import os
import shutil
from pathlib import Path
from typing import Optional, List, Any, Union
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
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
vlm_analyzer: Optional[VLMAnalyzer] = None
report_generator: Optional[ReportGenerator] = None
obligation_extractor: Optional[ObligationExtractor] = None

# PDF filename to full path mapping cache
pdf_path_map = {}


def init_engines():
    global store, keyword_index, retriever, reranker, qa_engine
    global clause_extractor, clause_analyzer, risk_detector, missing_detector
    global comparator, verifier, knowledge_graph, evaluator, vlm_analyzer
    global report_generator, obligation_extractor, pdf_path_map

    print("Initializing Enterprise Auditor Engines for Web UI...")

    # Map all PDFs
    if DATASET_DIR.exists():
        for p in DATASET_DIR.rglob("*.pdf"):
            pdf_path_map[p.name] = str(p)

    store = VectorStore()
    keyword_index = KeywordIndex()
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
    vlm_analyzer = VLMAnalyzer()
    report_generator = ReportGenerator(qa_engine, clause_extractor, clause_analyzer, risk_detector, missing_detector)
    obligation_extractor = ObligationExtractor(qa_engine)

    print("All engines initialized successfully.")


@app.on_event("startup")
async def on_startup():
    init_engines()


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
            "llm_generation": "qwen3.5:4b",
            "llm_verification": "llama3.1:8b",
            "embeddings": "nomic-embed-text:latest",
            "vlm": "minicpm-v"
        },
        "status": "ready"
    }


@app.get("/api/documents")
async def get_documents():
    """List all available contracts."""
    docs = []
    for name, path in sorted(pdf_path_map.items()):
        # Infer category from path
        parts = Path(path).parts
        category = "General"
        if len(parts) > 4:
            category = parts[-2]
        
        docs.append({
            "name": name,
            "category": category,
            "path": path
        })
    return {"documents": docs, "count": len(docs)}


@app.get("/api/clause-types")
async def get_clause_types():
    """List supported standard clause types."""
    return {"clause_types": CLAUSE_TYPES}


@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload, ingest, chunk, embed, and index a new contract PDF."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    upload_dir = Path("data/uploaded_contracts")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    save_path = upload_dir / file.filename
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Ingest, chunk, embed into ChromaDB and update BM25 index
    res = ingest_single_pdf(str(save_path), store, keyword_index)
    
    # Register in pdf_path_map
    pdf_path_map[file.filename] = str(save_path)
    
    return {
        "status": "success",
        "document": file.filename,
        "path": str(save_path),
        "chunks_count": res.get("chunks_count", 0),
        "pages_count": res.get("pages_count", 0)
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
    """Analyze contract for risky clauses and provisions."""
    if not req.document:
        raise HTTPException(status_code=400, detail="Document name required.")
    
    risks = risk_detector.detect(req.document)
    return {"document": req.document, "risks": risks}


@app.post("/api/missing")
async def check_missing_clause(req: MissingRequest):
    """Check whether a clause type is present or missing in a contract."""
    clause_type = req.clause_type.strip().lower().replace(" ", "_")
    result = missing_detector.check(req.document, clause_type)
    return result


@app.post("/api/compare")
async def compare_clauses(req: CompareRequest):
    """Compare provisions across multiple contracts."""
    clause_type = req.clause_type.strip().lower().replace(" ", "_")
    result = comparator.compare(clause_type, n_contracts=req.n_contracts)
    return result


@app.post("/api/verify")
async def verify_finding(req: VerifyRequest):
    """Verify finding against evidence with skeptical verifier LLM pass."""
    raw_evidence = req.evidence or []
    if isinstance(raw_evidence, str):
        cleaned_evidence = [raw_evidence] if raw_evidence.strip() else []
    elif isinstance(raw_evidence, list):
        cleaned_evidence = []
        for e in raw_evidence:
            if isinstance(e, str):
                cleaned_evidence.append(e)
            elif isinstance(e, dict):
                cleaned_evidence.append(e.get("text", e.get("content", str(e))))
            elif e is not None:
                cleaned_evidence.append(str(e))
    else:
        cleaned_evidence = [str(raw_evidence)]
    result = verifier.verify(req.finding, cleaned_evidence)
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
async def run_evaluation():
    """Run built-in benchmark evaluation suite."""
    summary = evaluator.run()
    return summary


# Mount data and static assets directory
data_dir = Path("data")
data_dir.mkdir(exist_ok=True)
app.mount("/data", StaticFiles(directory=str(data_dir)), name="data")

web_dir = Path(__file__).parent / "web"
web_dir.mkdir(exist_ok=True)
app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="web")


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
