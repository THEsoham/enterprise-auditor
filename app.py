"""Enterprise Auditor AI - Multi-Platform Interface."""

import os
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(BASE_DIR))

# If executed via `streamlit run app.py`, seamlessly execute the full Streamlit dashboard
try:
    import streamlit as st
    if hasattr(st, "runtime") and st.runtime.exists():
        import runpy
        runpy.run_path(str(BASE_DIR / "streamlit_app.py"), run_name="__main__")
        sys.exit(0)
except ImportError:
    pass

import gradio as gr

from auditor_core.embeddings.vector_store import VectorStore
from auditor_core.retrieval.keyword_index import KeywordIndex
from auditor_core.retrieval.hybrid import HybridRetriever
from auditor_core.retrieval.reranker import Reranker
from auditor_core.retrieval.qa_engine import QAEngine
from auditor_core.models.clause_extractor import ClauseExtractor
from auditor_core.models.clause_analyzer import ClauseAnalyzer
from auditor_core.models.risk_detector import RiskDetector
from auditor_core.models.missing_clause import MissingClauseDetector
from auditor_core.models.comparator import ClauseComparator
from auditor_core.verification.verifier import Verifier
from auditor_core.graph.knowledge_graph import KnowledgeGraph
from auditor_core.models.report_generator import ReportGenerator
from auditor_core.models.obligation_extractor import ObligationExtractor
from auditor_core.ingestion.table_extractor import extract_tables
from auditor_core.ingestion.image_extractor import render_page_as_image
from auditor_core.models.vlm_analyzer import VLMAnalyzer
from auditor_core.ingestion.ingest_single import ingest_single_pdf


# Initialize engines
print("Initializing Enterprise Auditor Engines...")
store = VectorStore()
keyword_idx = KeywordIndex()
keyword_idx.build_from_store(store)
retriever = HybridRetriever(store, keyword_idx)
reranker = Reranker()

qa_engine = QAEngine(retriever, reranker)
clause_ext = ClauseExtractor(retriever, reranker)
clause_ana = ClauseAnalyzer()
risk_det = RiskDetector(retriever, reranker)
missing_det = MissingClauseDetector(retriever, reranker)
comparator = ClauseComparator(retriever, reranker)
verifier = Verifier()
kg = KnowledgeGraph()
report_gen = ReportGenerator(qa_engine, clause_ext, clause_ana, risk_det, missing_det)
obligation_ext = ObligationExtractor(qa_engine)
vlm = VLMAnalyzer()

# Discover available contracts
DATASET_DIR = Path("data/datasets/cuad_full/CUAD_v1/full_contract_pdf")
pdf_map = {}
if DATASET_DIR.exists():
    for p in DATASET_DIR.rglob("*.pdf"):
        pdf_map[p.name] = str(p)

doc_options = sorted(list(pdf_map.keys())) if pdf_map else ["Sample Contract"]


def run_qa(query, document):
    if not query:
        return "Please enter an audit question.", ""
    doc = None if document == "All Contracts" else document
    res = qa_engine.answer(query, document_name=doc)
    
    # Run adversarial verification
    v_res = verifier.verify(res["answer"], res["sources"])
    v_text = f"**Verdict:** `{v_res['verdict']}`\n\n**Confidence:** `{v_res['confidence']}`\n\n**Reasoning:**\n{v_res['reasoning']}"
    
    answer_text = f"### 💡 Findings\n\n{res['answer']}\n\n---\n#### 📚 Cited Evidence Sources ({len(res['sources'])} chunks)\n"
    for i, s in enumerate(res['sources'], 1):
        answer_text += f"\n**[{i}] {s['source']} (Page {s['page']})**\n> {s['text'][:300]}...\n"
    
    return answer_text, v_text


def run_clause_audit(clause_type, document):
    if not document or document == "All Contracts":
        document = doc_options[0] if doc_options else ""
    c_res = clause_ext.extract_clause(document, clause_type)
    a_res = clause_ana.analyze_clause(c_res)
    
    output = f"### 📑 Clause Extraction: {clause_type.upper()}\n"
    output += f"**Document:** `{document}` | **Status:** `{c_res['status']}` | **Confidence:** `{c_res['confidence']}`\n\n"
    output += f"**Extracted Text:**\n```\n{c_res['text']}\n```\n\n"
    output += f"---\n### ⚖️ Risk & Governance Analysis\n"
    output += f"**Risk Level:** `{a_res['risk_level']}` | **Compliance Score:** `{a_res['compliance_score']}/100`\n\n"
    output += f"**Key Terms:** {', '.join(a_res['key_terms'])}\n\n"
    output += f"**Analysis Summary:**\n{a_res['analysis']}\n"
    return output


def run_risk_audit(document):
    if not document or document == "All Contracts":
        document = doc_options[0] if doc_options else ""
    r_res = risk_det.detect_risks(document)
    m_res = missing_det.detect_missing(document)
    
    out = f"## ⚠️ Comprehensive Risk & Missing Safeguard Audit\n"
    out += f"**Document:** `{document}` | **Risk Score:** `{r_res['risk_score']}/100`\n\n"
    out += f"### Identified Risk Flags ({len(r_res['risks'])})\n"
    for r in r_res['risks']:
        out += f"- **[{r['severity']}] {r['clause']}**: {r['description']}\n"
    
    out += f"\n---\n### Missing Safeguards & Omissions ({len(m_res['missing_clauses'])})\n"
    for m in m_res['missing_clauses']:
        out += f"- **[{m['importance']}] {m['clause']}**: {m['impact']}\n"
    return out


def run_memo(document):
    if not document or document == "All Contracts":
        document = doc_options[0] if doc_options else ""
    res = report_gen.generate_memo(document)
    return res["markdown_memo"], f"{res['compliance_score']} / 100"


def run_obligations(document):
    if not document or document == "All Contracts":
        document = doc_options[0] if doc_options else ""
    res = obligation_ext.extract_obligations(document)
    out = f"### ⏱️ Post-Execution Obligations & Deadlines ({len(res['timeline_items'])} items)\n\n"
    for item in res["timeline_items"]:
        out += f"**[{item['category']}] ⏱️ {item['timeframe'].upper()}**\n> {item['context']}\n\n"
    return out


def run_kg(document):
    if not document or document == "All Contracts":
        document = doc_options[0] if doc_options else ""
    res = kg.build_contract_graph(document)
    return res["tree_text"], f"Total Nodes: {res['stats']['total_nodes']} | Total Edges: {res['stats']['total_edges']}"


def upload_and_ingest(file):
    if file is None:
        return "No file uploaded.", gr.update()
    res = ingest_single_pdf(file.name)
    new_doc = res["document_name"]
    pdf_map[new_doc] = file.name
    updated_docs = sorted(list(pdf_map.keys()))
    return f"✅ Successfully indexed {new_doc} ({res['total_pages']} pages, {res['chunks_indexed']} chunks)!", gr.update(choices=["All Contracts"] + updated_docs, value=new_doc)


# Gradio Layout
custom_theme = gr.themes.Soft(
    primary_hue="blue",
    secondary_hue="slate",
    neutral_hue="slate",
    font=[gr.themes.GoogleFont("Inter"), "sans-serif"]
)

with gr.Blocks(theme=custom_theme, title="Enterprise Auditor AI") as demo:
    gr.Markdown("# ⚖️ Enterprise Auditor AI\n**Next-Generation Multimodal Legal Intelligence & Knowledge Graph Suite**")
    
    with gr.Row():
        with gr.Column(scale=1):
            doc_dropdown = gr.Dropdown(
                choices=["All Contracts"] + doc_options,
                value=doc_options[0] if doc_options else "All Contracts",
                label="Selected Contract Agreement"
            )
            file_upload = gr.File(label="Upload New PDF Contract", file_types=[".pdf"])
            upload_btn = gr.Button("📥 Ingest Uploaded PDF", variant="secondary")
            upload_status = gr.Markdown("")

        with gr.Column(scale=3):
            with gr.Tabs():
                # Tab 1: Hybrid QA & Adversarial Verifier
                with gr.TabItem("🔍 Hybrid QA & AI Verifier"):
                    gr.Markdown("### Ask Complex Legal Questions with Adversarial Verification")
                    qa_query = gr.Textbox(
                        label="Audit Question",
                        placeholder="e.g. What is the cure period for material breach and notice requirements?",
                        lines=2
                    )
                    qa_btn = gr.Button("Run Verified Legal Audit", variant="primary")
                    with gr.Row():
                        qa_answer = gr.Markdown(label="Verified Findings & Evidence")
                        qa_verdict = gr.Markdown(label="Adversarial Verifier Verdict")
                    qa_btn.click(run_qa, inputs=[qa_query, doc_dropdown], outputs=[qa_answer, qa_verdict])

                # Tab 2: Clause Extraction & Governance
                with gr.TabItem("📑 Clause Governance"):
                    clause_type_dd = gr.Dropdown(
                        choices=["termination", "payment", "confidentiality", "indemnification", "liability", "governing_law", "intellectual_property", "assignment", "force_majeure"],
                        value="termination",
                        label="Target Clause Type"
                    )
                    clause_btn = gr.Button("Extract & Analyze Clause", variant="primary")
                    clause_output = gr.Markdown()
                    clause_btn.click(run_clause_audit, inputs=[clause_type_dd, doc_dropdown], outputs=clause_output)

                # Tab 3: Risk & Missing Safeguards
                with gr.TabItem("⚠️ Risk Matrix & Missing Safeguards"):
                    risk_btn = gr.Button("Scan Full Agreement for Risks & Omissions", variant="primary")
                    risk_output = gr.Markdown()
                    risk_btn.click(run_risk_audit, inputs=[doc_dropdown], outputs=risk_output)

                # Tab 4: Executive Due Diligence Memo
                with gr.TabItem("📋 Due Diligence Memorandum"):
                    memo_score = gr.Textbox(label="Compliance Health Score", interactive=False)
                    memo_btn = gr.Button("Generate Executive Memorandum", variant="primary")
                    memo_output = gr.Markdown()
                    memo_btn.click(run_memo, inputs=[doc_dropdown], outputs=[memo_output, memo_score])

                # Tab 5: Obligations Timeline
                with gr.TabItem("⏱️ Obligations & Deadlines"):
                    ob_btn = gr.Button("Scan Post-Execution Covenants & Timelines", variant="primary")
                    ob_output = gr.Markdown()
                    ob_btn.click(run_obligations, inputs=[doc_dropdown], outputs=ob_output)

                # Tab 6: Knowledge Graph
                with gr.TabItem("🕸️ Relational Knowledge Graph"):
                    kg_stats = gr.Textbox(label="Graph Ontology Stats", interactive=False)
                    kg_btn = gr.Button("Build Relational Knowledge Graph", variant="primary")
                    kg_output = gr.Markdown()
                    kg_btn.click(run_kg, inputs=[doc_dropdown], outputs=[kg_output, kg_stats])

    upload_btn.click(upload_and_ingest, inputs=[file_upload], outputs=[upload_status, doc_dropdown])

if __name__ == "__main__":
    demo.launch()
