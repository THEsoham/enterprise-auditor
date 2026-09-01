"""Ingest a single new uploaded PDF contract into VectorStore and KeywordIndex."""

from pathlib import Path
from auditor_core.ingestion.pdf_loader import load_pdf
from auditor_core.chunking.chunker import create_chunks, create_table_chunks
from auditor_core.ingestion.table_extractor import extract_tables


def ingest_single_pdf(file_path: str, store, keyword_index) -> dict:
    """Load, chunk, table-extract, embed, and index a single uploaded PDF.

    Args:
        file_path: Absolute or relative path to the PDF file.
        store: VectorStore instance.
        keyword_index: KeywordIndex instance.

    Returns:
        Dict with status, chunk count, and document name.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF file not found: {file_path}")

    doc_name = path.name
    doc_id = path.stem

    # 1. Load pages
    pages = load_pdf(str(path))
    if not pages:
        return {"status": "error", "message": "No text extracted from PDF.", "chunks": 0}

    # 2. Text Chunks
    text_chunks = create_chunks(pages, doc_id, doc_name)

    # 3. Table Chunks
    try:
        tables = extract_tables(str(path))
        table_chunks = create_table_chunks(tables, doc_id, doc_name)
    except Exception as e:
        print(f"Table extraction notice: {e}")
        table_chunks = []

    all_chunks = text_chunks + table_chunks

    # 4. Embed into ChromaDB Vector Store
    if all_chunks:
        store.add_chunks(all_chunks)

    # 5. Rebuild/Refresh BM25 Index
    keyword_index.build_from_store(store)

    return {
        "status": "success",
        "document": doc_name,
        "document_id": doc_id,
        "pages_count": len(pages),
        "chunks_count": len(all_chunks),
        "table_count": len(table_chunks)
    }
