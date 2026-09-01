"""Table extraction from PDF documents using pdfplumber."""

from pathlib import Path

import pdfplumber


def extract_tables(file_path: str) -> list[dict]:
    """Extract tables from a PDF file.

    Returns:
        List of dicts with keys:
        source, page, table_index, markdown, raw_data
    """

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"PDF not found: {path}"
        )

    tables = []

    try:

        with pdfplumber.open(str(path)) as pdf:

            for page_number, page in enumerate(
                pdf.pages, start=1
            ):

                page_tables = page.extract_tables()

                if not page_tables:
                    continue

                for idx, table in enumerate(page_tables):

                    if not table or len(table) < 2:
                        continue

                    # Filter out empty rows
                    cleaned = [
                        row
                        for row in table
                        if row
                        and any(
                            cell and cell.strip()
                            for cell in row
                            if cell
                        )
                    ]

                    if len(cleaned) < 2:
                        continue

                    markdown = _table_to_markdown(
                        cleaned
                    )

                    tables.append({
                        "source": path.name,
                        "page": page_number,
                        "table_index": idx,
                        "markdown": markdown,
                        "raw_data": cleaned,
                        "num_rows": len(cleaned),
                        "num_cols": (
                            len(cleaned[0])
                            if cleaned
                            else 0
                        ),
                    })

    except Exception as e:
        print(f"  Table extraction error: {e}")

    return tables


def _table_to_markdown(rows: list[list]) -> str:
    """Convert table rows to markdown format."""

    if not rows:
        return ""

    # Normalize cells
    normalized = []

    for row in rows:

        normalized.append([
            (cell or "").strip().replace(
                "\n", " "
            )
            for cell in row
        ])

    # Determine column widths
    num_cols = max(len(row) for row in normalized)

    # Pad rows to same length
    for row in normalized:
        while len(row) < num_cols:
            row.append("")

    # Build markdown
    lines = []

    # Header row
    header = normalized[0]
    lines.append(
        "| " + " | ".join(header) + " |"
    )

    # Separator
    lines.append(
        "| " + " | ".join(
            "---" for _ in header
        ) + " |"
    )

    # Data rows
    for row in normalized[1:]:
        lines.append(
            "| " + " | ".join(row) + " |"
        )

    return "\n".join(lines)
