from pathlib import Path
import json
import re

import ollama

from app.ingestion.pdf_loader import load_pdf
from app.chunking.chunker import create_chunks
from app.embeddings.vector_store import VectorStore
from app.retrieval.keyword_index import KeywordIndex
from app.retrieval.hybrid import HybridRetriever
from app.retrieval.reranker import Reranker
from app.retrieval.qa_engine import QAEngine
from app.models.clause_extractor import ClauseExtractor
from app.models.clause_analyzer import ClauseAnalyzer
from app.models.risk_detector import RiskDetector
from app.models.missing_clause import MissingClauseDetector
from app.models.comparator import ClauseComparator
from app.verification.verifier import Verifier
from app.graph.knowledge_graph import KnowledgeGraph
from app.evaluation.evaluator import Evaluator


# ============================================================
# DATASET
# ============================================================

DATASET_DIR = Path(
    r"data/datasets/cuad_full/CUAD_v1/full_contract_pdf"
)


# ============================================================
# INGESTION + CHUNKING
# ============================================================

def build_chunks():

    pdfs = sorted(DATASET_DIR.rglob("*.pdf"))

    all_chunks = []
    failed = 0

    print(f"Found {len(pdfs)} PDFs")

    for i, pdf_path in enumerate(pdfs, 1):

        try:

            pages = load_pdf(str(pdf_path))

            chunks = create_chunks(
                pages,
                document_id=f"cuad_{i:06d}",
                source=pdf_path.name,
            )

            all_chunks.extend(chunks)

            print(
                f"[{i}/{len(pdfs)}] "
                f"{len(pages)} pages -> "
                f"{len(chunks)} chunks"
            )

        except Exception as e:

            failed += 1

            print(
                f"FAILED: {pdf_path.name}"
            )

            print(e)

    print()
    print("=" * 60)
    print("INGESTION + CHUNKING SUMMARY")
    print("=" * 60)

    print(f"Documents : {len(pdfs)}")
    print(f"Failed    : {failed}")
    print(f"Chunks    : {len(all_chunks)}")

    return all_chunks


# ============================================================
# COMMAND PARSING
# ============================================================

def extract_filename_and_rest(text):
    """Extract a quoted or unquoted filename + remainder."""

    text = text.strip()

    # Quoted filename
    match = re.match(r'"([^"]+)"\s*(.*)', text)

    if match:
        return match.group(1), match.group(2).strip()

    # Unquoted: first token
    parts = text.split(None, 1)

    if parts:
        return (
            parts[0],
            parts[1] if len(parts) > 1 else "",
        )

    return None, ""


def print_help():

    print("\n" + "=" * 60)
    print("ENTERPRISE AUDITOR - COMMANDS")
    print("=" * 60)
    print()
    print(
        '  ask <question>'
        '                 - Q&A across all documents'
    )
    print(
        '  ask-doc "<file>" <question>'
        '    - Q&A on specific document'
    )
    print(
        '  extract "<file>"'
        '               - Extract all clauses'
    )
    print(
        '  extract-detail "<file>" <type>'
        ' - Structured analysis'
    )
    print(
        '  risk "<file>"'
        '                  - Detect risks'
    )
    print(
        '  missing "<file>" <clause_type>'
        '  - Check for clause'
    )
    print(
        '  compare <clause_type>'
        '           - Compare across contracts'
    )
    print(
        '  verify'
        '                         - Verify last finding'
    )
    print(
        '  graph "<file>"'
        '                 - Build knowledge graph'
    )
    print(
        '  eval'
        '                           - Batch evaluation'
    )
    print(
        '  help'
        '                           - Show this help'
    )
    print(
        '  exit'
        '                           - Quit'
    )


# ============================================================
# CLI COMMANDS
# ============================================================

def cmd_ask(qa, question):
    """General Q&A across all documents."""

    print("\nSearching documents...")

    result = qa.ask(question)

    print("\n" + "=" * 60)
    print("ANSWER")
    print("=" * 60)

    print(result["answer"])

    print("\nSOURCES")

    for i, s in enumerate(result["sources"], 1):
        print(
            f"  {i}. {s['source']} "
            f"(Page {s['page']})"
        )

    return result


def cmd_ask_doc(qa, rest):
    """Document-scoped Q&A."""

    filename, question = extract_filename_and_rest(rest)

    if not filename or not question:
        print('Usage: ask-doc "<filename>" <question>')
        return None

    print(f"\nSearching {filename}...")

    result = qa.ask_document(question, filename)

    print("\n" + "=" * 60)
    print("ANSWER")
    print("=" * 60)

    print(result["answer"])

    print("\nSOURCES")

    for i, s in enumerate(result["sources"], 1):
        print(
            f"  {i}. {s['source']} "
            f"(Page {s['page']})"
        )

    return result


def cmd_extract(extractor, rest):
    """Extract all 9 clauses from a document."""

    filename, _ = extract_filename_and_rest(rest)

    if not filename:
        print('Usage: extract "<filename>"')
        return None

    print(f"\nExtracting clauses from {filename}...")

    result = extractor.extract(filename)

    print("\n" + "=" * 60)
    print("EXTRACTED CLAUSES")
    print("=" * 60)

    for clause_type, data in result.items():

        status = (
            "FOUND" if data["found"]
            else "NOT FOUND"
        )

        print(f"\n  [{status}] {clause_type}")

        if data["found"] and data.get("text"):
            preview = data["text"][:200]
            print(f"    {preview}...")

    return {"clauses": result, "source": filename}


def cmd_extract_detail(extractor, analyzer, rest):
    """Structured clause analysis."""

    filename, clause_type = extract_filename_and_rest(
        rest
    )

    if not filename or not clause_type:
        print(
            'Usage: extract-detail "<filename>" '
            "<clause_type>"
        )
        return None

    clause_type = (
        clause_type.strip().lower().replace(" ", "_")
    )

    print(
        f"\nAnalyzing {clause_type} in {filename}..."
    )

    clause_data = extractor.extract_single(
        filename, clause_type
    )

    if not clause_data["found"]:
        print(
            f"\n{clause_type} clause NOT FOUND "
            f"in {filename}"
        )
        return None

    structured = analyzer.analyze_single(
        clause_type, clause_data
    )

    print("\n" + "=" * 60)
    print(f"STRUCTURED: {clause_type.upper()}")
    print("=" * 60)

    print(json.dumps(structured, indent=2, default=str))

    return {
        "finding": json.dumps(structured, default=str),
        "evidence": [clause_data.get("text", "")],
    }


def cmd_risk(risk_det, extractor, rest, last_result):
    """Risk detection."""

    filename, _ = extract_filename_and_rest(rest)

    if not filename:
        print('Usage: risk "<filename>"')
        return None

    print(f"\nDetecting risks in {filename}...")

    # Reuse clause data if available
    clause_data = None

    if (
        last_result
        and last_result.get("source") == filename
        and last_result.get("clauses")
    ):
        clause_data = last_result["clauses"]

    risks = risk_det.detect(filename, clause_data)

    print("\n" + "=" * 60)
    print("RISK ANALYSIS")
    print("=" * 60)

    if not risks:
        print("\nNo significant risks detected.")
        return {"finding": "No risks detected", "evidence": []}

    for i, risk in enumerate(risks, 1):

        level = risk.get("risk_level", "UNKNOWN")
        clause = risk.get("clause", "unknown")
        finding = risk.get("finding", "")
        evidence = risk.get("evidence", "")
        source = risk.get("source", filename)
        pages = risk.get("pages", [])

        print(f"\n  RISK {i}: {level}")
        print(f"  Clause: {clause}")
        print(f"  Finding: {finding}")

        if evidence:
            ev_preview = str(evidence)[:200]
            print(f'  Evidence: "{ev_preview}"')

        print(f"  Source: {source}")

        if pages:
            print(f"  Pages: {pages}")

    return {
        "finding": json.dumps(risks, default=str),
        "evidence": [
            str(r.get("evidence", ""))
            for r in risks
        ],
    }


def cmd_missing(missing_det, rest):
    """Missing clause detection."""

    filename, clause_type = extract_filename_and_rest(
        rest
    )

    if not filename or not clause_type:
        print('Usage: missing "<filename>" <clause_type>')
        return None

    clause_type = (
        clause_type.strip().lower().replace(" ", "_")
    )

    print(
        f"\nChecking for {clause_type} "
        f"in {filename}..."
    )

    result = missing_det.check(filename, clause_type)

    print("\n" + "=" * 60)
    print(f"CLAUSE CHECK: {clause_type.upper()}")
    print("=" * 60)

    print(f"\n  Status: {result['status']}")
    print(f"  {result['detail']}")

    if result.get("evidence_searched"):

        print("\n  Evidence searched:")

        searched = result["evidence_searched"]

        if isinstance(searched, list):
            for e in searched:
                print(f"    - {e}")
        else:
            print(f"    {searched}")

    return {
        "finding": result["detail"],
        "evidence": (
            result.get("evidence_searched", [])
            if isinstance(
                result.get("evidence_searched"), list
            )
            else []
        ),
    }


def cmd_compare(comparator, clause_type):
    """Cross-document comparison."""

    clause_type = (
        clause_type.strip().lower().replace(" ", "_")
    )

    print(
        f"\nComparing {clause_type} "
        f"across contracts..."
    )

    result = comparator.compare(clause_type)

    print("\n" + "=" * 60)
    print(f"COMPARISON: {clause_type.upper()}")
    print("=" * 60)

    print(f"\n{result['comparison']}")
    print(
        f"\nContracts compared: "
        f"{len(result['contracts'])}"
    )

    return {
        "finding": result["comparison"],
        "evidence": [],
    }


def cmd_verify(verifier, last_result):
    """Verify last finding against evidence."""

    if not last_result:
        print("No previous finding to verify.")
        return

    finding = (
        last_result.get("finding")
        or last_result.get("answer", "")
    )

    evidence = last_result.get("evidence", [])

    if not finding:
        print("No finding text to verify.")
        return

    print("\nVerifying last finding...")

    result = verifier.verify(finding, evidence)

    print("\n" + "=" * 60)
    print(f"VERIFICATION: {result['verdict']}")
    print("=" * 60)

    print(f"\n{result['reasoning']}")


def cmd_graph(
    graph, extractor, analyzer, rest
):
    """Build and display knowledge graph."""

    filename, _ = extract_filename_and_rest(rest)

    if not filename:
        print('Usage: graph "<filename>"')
        return

    print(
        f"\nBuilding knowledge graph "
        f"for {filename}..."
    )

    clause_data = extractor.extract(filename)
    structured = analyzer.analyze(clause_data)
    graph.build(filename, structured)

    print("\n" + "=" * 60)
    print("KNOWLEDGE GRAPH")
    print("=" * 60)
    print()
    print(graph.query(filename))


def cmd_eval(evaluator):
    """Run batch evaluation."""

    print("\nRunning evaluation...")

    results = evaluator.run()

    print("\n" + "=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)

    print(
        f"\n  Questions:       "
        f"{results['total_questions']}"
    )
    print(
        f"  Answered:        "
        f"{results['answered']}"
    )
    print(
        f"  Answer rate:     "
        f"{results['answer_rate']}%"
    )
    print(
        f"  Keyword score:   "
        f"{results['avg_keyword_score']}%"
    )
    print(
        f"  Avg time:        "
        f"{results['avg_time_seconds']}s"
    )
    print(
        f"  Avg sources:     "
        f"{results['avg_sources']}"
    )

    print("\n  DETAIL:")

    for r in results["results"]:

        status = "+" if r["has_answer"] else "-"

        kw = (
            f"{r['keyword_hits']}/{r['keyword_total']}"
            if r["keyword_total"]
            else "n/a"
        )

        q = r["question"][:50]

        print(
            f"    {status} [{r['time_seconds']}s] "
            f"[kw:{kw}] {q}"
        )


# ============================================================
# CLI LOOP
# ============================================================

def run_cli(
    qa, extractor, analyzer, risk_det,
    missing_det, comparator, verifier, graph,
    evaluator,
):
    """Interactive CLI for Enterprise Auditor."""

    last_result = None

    print_help()

    while True:

        try:
            raw = input("\n> ").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if not raw:
            continue

        # Parse command
        parts = raw.split(None, 1)
        cmd = parts[0].lower()
        rest = parts[1] if len(parts) > 1 else ""

        # ====================================================
        # DISPATCH
        # ====================================================

        if cmd == "exit":
            break

        elif cmd == "help":
            print_help()

        elif cmd == "ask":
            if not rest:
                print("Usage: ask <question>")
                continue
            last_result = cmd_ask(qa, rest)

        elif cmd == "ask-doc":
            result = cmd_ask_doc(qa, rest)
            if result:
                last_result = result

        elif cmd == "extract":
            result = cmd_extract(extractor, rest)
            if result:
                last_result = result

        elif cmd == "extract-detail":
            result = cmd_extract_detail(
                extractor, analyzer, rest
            )
            if result:
                last_result = result

        elif cmd == "risk":
            result = cmd_risk(
                risk_det, extractor, rest, last_result
            )
            if result:
                last_result = result

        elif cmd == "missing":
            result = cmd_missing(missing_det, rest)
            if result:
                last_result = result

        elif cmd == "compare":
            if not rest:
                print("Usage: compare <clause_type>")
                continue
            result = cmd_compare(comparator, rest)
            if result:
                last_result = result

        elif cmd == "verify":
            cmd_verify(verifier, last_result)

        elif cmd == "graph":
            cmd_graph(
                graph, extractor, analyzer, rest
            )

        elif cmd == "eval":
            cmd_eval(evaluator)

        else:
            # Unknown command -> treat as question
            last_result = cmd_ask(qa, raw)


# ============================================================
# MAIN
# ============================================================

def main():

    # ========================================================
    # INGESTION + CHUNKING
    # ========================================================

    chunks = build_chunks()

    # ========================================================
    # VECTOR DATABASE
    # ========================================================

    store = VectorStore()

    existing_count = store.collection.count()

    if existing_count == 0:

        print("\n" + "=" * 60)
        print("BUILDING VECTOR DATABASE")
        print("=" * 60)

        store.add_chunks(chunks)

    else:

        print("\n" + "=" * 60)
        print("VECTOR DATABASE ALREADY EXISTS")
        print("=" * 60)

        print(
            f"Existing vectors: {existing_count}"
        )

        print(
            "Skipping embedding."
        )

    # ========================================================
    # READY
    # ========================================================

    print("\n" + "=" * 60)
    print("VECTOR DATABASE READY")
    print("=" * 60)

    print(
        f"Vectors available: "
        f"{store.collection.count()}"
    )

    # ========================================================
    # KEYWORD INDEX
    # ========================================================

    print("\n" + "=" * 60)
    print("BUILDING KEYWORD INDEX")
    print("=" * 60)

    keyword_index = KeywordIndex()
    keyword_index.build_from_store(store)

    retriever = HybridRetriever(store, keyword_index)
    reranker = Reranker()

    # ========================================================
    # INITIALIZE ENGINES
    # ========================================================

    print("\n" + "=" * 60)
    print("INITIALIZING ENGINES")
    print("=" * 60)

    qa = QAEngine(retriever, reranker)
    extractor = ClauseExtractor(retriever, reranker)
    analyzer = ClauseAnalyzer()
    risk_det = RiskDetector(retriever, reranker)
    missing_det = MissingClauseDetector(
        retriever, reranker
    )
    comparator = ClauseComparator(retriever, reranker)
    verifier = Verifier()
    graph = KnowledgeGraph()
    evaluator = Evaluator(qa)

    print("All systems ready.")

    # ========================================================
    # CLI
    # ========================================================

    run_cli(
        qa, extractor, analyzer, risk_det,
        missing_det, comparator, verifier, graph,
        evaluator,
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()