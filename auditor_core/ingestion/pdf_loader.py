from pathlib import Path

import pymupdf


def load_pdf(file_path: str) -> list[dict]:
    path = Path(file_path)

    if not path.exists():
        return []

    try:
        document = pymupdf.open(str(path))
        pages = []
        for page_number, page in enumerate(document, start=1):
            text = page.get_text("text").strip()
            pages.append(
                {
                    "source": path.name,
                    "page": page_number,
                    "text": text if text else f"Page {page_number} (Contract Document Image)",
                }
            )
        document.close()
        return pages if pages else [{"source": path.name, "page": 1, "text": f"Contract Document {path.name}"}]
    except Exception as e:
        print(f"PyMuPDF load notice for {file_path}: {e}")
        return [{"source": path.name, "page": 1, "text": f"Contract Document {path.name}"}]
