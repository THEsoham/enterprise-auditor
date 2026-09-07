"""Section-aware semantic chunking for legal documents.

Replaces the naive fixed-length character splitter with a
chunker that respects legal document structure:

1. Detects section boundaries (ARTICLE, SECTION, numbered
   headings, all-caps titles).
2. Splits on paragraph boundaries within sections.
3. Merges small paragraphs up to a target size.
4. Hard-splits oversized paragraphs at sentence boundaries
   with 1-sentence overlap.
"""

import re

# -----------------------------------------------------------
# Section boundary detection patterns
# -----------------------------------------------------------

_SECTION_PATTERNS = [
    # ARTICLE I, ARTICLE 1, ARTICLE ONE
    re.compile(
        r"^(?:ARTICLE|Art\.)\s+[IVXLCDM\d]+",
        re.IGNORECASE | re.MULTILINE,
    ),
    # SECTION 1, SECTION 1.1, Section 12.3
    re.compile(
        r"^(?:SECTION|Sec\.)\s+\d+(?:\.\d+)*",
        re.IGNORECASE | re.MULTILINE,
    ),
    # Numbered headers: 1., 1.1, 1.1.1, 12.3.
    re.compile(
        r"^\d+(?:\.\d+)+\.?\s",
        re.MULTILINE,
    ),
    # All-caps titles (3+ words), e.g. LIMITATION OF LIABILITY
    re.compile(
        r"^[A-Z][A-Z\s,&/\-]{10,}$",
        re.MULTILINE,
    ),
    # Lettered subsections at start of line: (a), (b), (i), (ii)
    re.compile(
        r"^\s*\([a-z]{1,4}\)\s",
        re.MULTILINE,
    ),
]

# Target chunk sizes (in characters)
TARGET_CHUNK_SIZE = 2400  # ~600 tokens — rich context per chunk
MAX_CHUNK_SIZE = 3600     # hard ceiling before forced split
MIN_CHUNK_SIZE = 300      # merge threshold — avoid tiny chunks


def create_chunks(
    pages,
    document_id,
    source,
    chunk_size=None,   # kept for API compat, ignored
    overlap=None,      # kept for API compat, ignored
):
    """Create semantically coherent chunks from document pages.

    Args:
        pages: List of dicts with 'text' and 'page' keys.
        document_id: Unique document identifier.
        source: Source filename.
        chunk_size: Ignored (kept for backward compatibility).
        overlap: Ignored (kept for backward compatibility).

    Returns:
        List of chunk dicts with chunk_id, document_id,
        source, page, and text keys.
    """

    chunks = []

    for page in pages:
        text = page["text"].strip()

        if not text:
            continue

        page_num = page["page"]

        # Step 1: Split page text into sections
        sections = _split_into_sections(text)

        # Step 2: For each section, split into paragraphs
        # and merge/split to target size
        for section_idx, section_text in enumerate(sections):

            section_chunks = _chunk_section(section_text)

            for sub_idx, chunk_text in enumerate(section_chunks):

                chunk_text = chunk_text.strip()
                if not chunk_text:
                    continue

                chunk_id = (
                    f"{document_id}:p{page_num}"
                    f":s{section_idx}:c{sub_idx}"
                )

                chunks.append({
                    "chunk_id": chunk_id,
                    "document_id": document_id,
                    "source": source,
                    "page": page_num,
                    "text": chunk_text,
                })

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


# -----------------------------------------------------------
# Internal helpers
# -----------------------------------------------------------

def _split_into_sections(text):
    """Split text at detected section boundaries.

    Returns a list of section strings. If no boundaries
    are detected, returns the entire text as one section.
    """

    # Collect all boundary positions
    boundary_positions = set()

    for pattern in _SECTION_PATTERNS:
        for match in pattern.finditer(text):
            boundary_positions.add(match.start())

    if not boundary_positions:
        return [text]

    # Sort and split
    positions = sorted(boundary_positions)

    sections = []
    prev = 0

    for pos in positions:
        # Only split if there's meaningful content before
        segment = text[prev:pos].strip()
        if segment:
            sections.append(segment)
        prev = pos

    # Final segment
    tail = text[prev:].strip()
    if tail:
        sections.append(tail)

    return sections if sections else [text]


def _chunk_section(section_text):
    """Break a section into target-sized chunks.

    1. Split on paragraph boundaries (double newlines).
    2. Merge consecutive small paragraphs.
    3. Hard-split oversized paragraphs at sentence
       boundaries with 1-sentence overlap.
    """

    # Split into paragraphs
    paragraphs = re.split(r"\n\s*\n", section_text)
    paragraphs = [p.strip() for p in paragraphs if p.strip()]

    if not paragraphs:
        return []

    # Process: merge small, split large
    processed = []

    for para in paragraphs:
        if len(para) > MAX_CHUNK_SIZE:
            # Hard-split at sentence boundaries
            processed.extend(
                _split_at_sentences(para)
            )
        else:
            processed.append(para)

    # Merge consecutive small paragraphs
    return _merge_paragraphs(processed)


def _split_at_sentences(text):
    """Split oversized text at sentence boundaries.

    Uses a regex that catches common sentence endings
    (period, question mark, exclamation, semicolon)
    followed by whitespace. Includes 1-sentence overlap
    between consecutive chunks for continuity.
    """

    # Split on sentence-ending punctuation followed by space
    sentences = re.split(
        r"(?<=[.!?;])\s+(?=[A-Z\(\"\'])",
        text,
    )

    if not sentences:
        return [text]

    chunks = []
    current = []
    current_len = 0

    for sent in sentences:
        sent_len = len(sent)

        if current_len + sent_len > TARGET_CHUNK_SIZE and current:
            # Emit current chunk
            chunks.append(" ".join(current))

            # Keep last sentence as overlap
            overlap_sent = current[-1] if current else ""
            current = [overlap_sent, sent] if overlap_sent else [sent]
            current_len = len(overlap_sent) + sent_len
        else:
            current.append(sent)
            current_len += sent_len

    if current:
        chunks.append(" ".join(current))

    return chunks


def _merge_paragraphs(paragraphs):
    """Merge consecutive small paragraphs into
    target-sized chunks."""

    if not paragraphs:
        return []

    chunks = []
    current_parts = []
    current_len = 0

    for para in paragraphs:
        para_len = len(para)

        if current_len + para_len > TARGET_CHUNK_SIZE and current_parts:
            # Emit accumulated chunk
            chunks.append("\n\n".join(current_parts))
            current_parts = [para]
            current_len = para_len
        else:
            current_parts.append(para)
            current_len += para_len

    if current_parts:
        chunks.append("\n\n".join(current_parts))

    return chunks