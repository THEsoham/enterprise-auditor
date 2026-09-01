from pathlib import Path

import pymupdf


def load_pdf(file_path: str) -> list[dict]:
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    if path.suffix.lower() != ".pdf":
        raise ValueError(f"Expected a PDF file, got: {path.suffix}")

    document = pymupdf.open(str(path))

    pages = []

    for page_number, page in enumerate(document, start=1):
        text = page.get_text("text").strip()

        pages.append(
            {
                "source": path.name,
                "page": page_number,
                "text": text,
            }
        )

    document.close()

    return pages