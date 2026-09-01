def create_chunks(
    pages,
    document_id,
    source,
    chunk_size=1200,
    overlap=200,
):
    chunks = []

    for page in pages:
        text = page["text"].strip()

        if not text:
            continue

        start = 0
        chunk_number = 0

        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append({
                    "chunk_id": f"{document_id}:p{page['page']}:c{chunk_number}",
                    "document_id": document_id,
                    "source": source,
                    "page": page["page"],
                    "text": chunk_text,
                })

            chunk_number += 1

            if end >= len(text):
                break

            start = end - overlap

    return chunks


def create_table_chunks(
    tables,
    document_id,
    source,
):
    """Create chunks from extracted tables.

    Args:
        tables: List of table dicts from
            table_extractor.extract_tables().
        document_id: Unique document identifier.
        source: Source filename.

    Returns:
        List of chunk dicts.
    """

    chunks = []

    for table in tables:

        markdown = table.get("markdown", "")

        if not markdown:
            continue

        page = table["page"]
        idx = table["table_index"]
        rows = table.get("num_rows", 0)
        cols = table.get("num_cols", 0)

        # Prefix with [TABLE] marker
        text = (
            f"[TABLE] Table on page {page} "
            f"({rows} rows x {cols} cols):\n\n"
            f"{markdown}"
        )

        chunks.append({
            "chunk_id": (
                f"{document_id}:p{page}"
                f":table{idx}"
            ),
            "document_id": document_id,
            "source": source,
            "page": page,
            "text": text,
            "type": "table",
        })

    return chunks