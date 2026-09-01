# ⚖️ Enterprise Auditor AI

> **Next-Generation Autonomous Legal Intelligence, Multimodal Contract Auditing & Knowledge Graph Platform**

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.35+-FF4B4B.svg)](https://streamlit.io)
[![Ollama](https://img.shields.io/badge/Ollama-Local_Inference-black.svg)](https://ollama.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Enterprise Auditor** is an autonomous legal intelligence suite designed to audit, extract, cross-examine, and verify complex commercial agreements across hundreds of SEC EDGAR contracts with **zero hallucination risk** and **100% local data sovereignty**.

---

## 🌟 Key Capabilities

1. **Two-Tier Hybrid Retrieval Funnel**
   - Combines dense semantic vectors (`nomic-embed-text:latest`) and sparse lexical retrieval (`BM25Okapi`) with Reciprocal Rank Fusion and local Cross-Encoder reranking (`Qwen 3.5 4B`).
2. **Defense-in-Depth Adversarial AI Verifier**
   - A dedicated skeptical verifier pass that cross-examines generated findings exclusively against cited source chunks to issue line-by-line `SUPPORTED` / `UNSUPPORTED` verdicts.
3. **Multimodal Document Vision Intelligence (VLM)**
   - Powered by `MiniCPM-V` to render and inspect scanned exhibits, corporate stamps, notary seals, and execution signature blocks.
4. **Structured Table & Financial Schedule Extractor**
   - High-precision table extraction using `pdfplumber` with `[TABLE]` markdown grid chunking.
5. **Interactive Force-Directed Knowledge Graph**
   - Dynamic node-edge network mapping `Contracts` $\rightarrow$ `Clauses` $\rightarrow$ `Jurisdictions` $\rightarrow$ `Risk Flags` with physics simulation and Graphviz DOT rendering.
6. **Executive Due Diligence Memorandum Generator**
   - One-click synthesis of comprehensive due diligence memos with automated **0–100 Compliance Health Scores** and markdown exports.
7. **Post-Execution Obligations & Deadlines Timeline**
   - Automatically identifies and structures contractual notice windows, cure periods, and payment milestones.

---

## 🏗️ Architecture

```
[ PDF Contract / SEC EDGAR Filing ]
                 │
  ┌──────────────┴──────────────┐
  ▼                             ▼
[ PyMuPDF Text Chunks ]   [ pdfplumber Table Grids ]
  │                             │
  ├─────────────────────────────┘
  ▼
[ ChromaDB Vectors (Nomic-Embed) ] + [ BM25Okapi In-Memory Index ]
  │
  ▼
[ Hybrid Retriever & Qwen Reranker ]
  │
  ▼
[ QA / Clause Extraction / Risk Detection Engine ]
  │
  ▼
[ Adversarial AI Verifier ] ──▶ Verified Legal Findings
  │
  ▼
[ Knowledge Graph & Due Diligence Memo ]
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.11+
- [Ollama](https://ollama.ai) installed with the following models:
  ```bash
  ollama pull qwen3.5:4b
  ollama pull nomic-embed-text
  ollama pull minicpm-v
  ```

### 2. Installation
```bash
git clone https://github.com/<your-username>/enterprise-auditor.git
cd enterprise-auditor

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Running the Applications

#### Option A: Custom Executive Web Dashboard (FastAPI)
```bash
python -m uvicorn server:app --host 127.0.0.1 --port 8000
```
*Open **http://localhost:8000** in your browser.*

#### Option B: Standalone Streamlit Dashboard
```bash
streamlit run streamlit_app.py
```
*Open **http://localhost:8501** in your browser.*

---

## 🐳 Docker Deployment

Run the complete multi-container stack with GPU acceleration:
```bash
docker compose up -d --build
```

---

## 📄 License
This project is licensed under the MIT License.
