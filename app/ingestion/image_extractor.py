"""Image extraction from PDF documents using PyMuPDF."""

from pathlib import Path

import pymupdf


# Minimum image size in bytes to keep
MIN_IMAGE_SIZE = 5000


def extract_images(
    file_path: str,
    output_dir: str = "data/extracted_images",
) -> list[dict]:
    """Extract images from a PDF file.

    Saves images to output_dir/<document_name>/
    Returns list of image metadata dicts.
    """

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"PDF not found: {path}"
        )

    # Create output directory
    doc_name = path.stem
    img_dir = Path(output_dir) / doc_name
    img_dir.mkdir(parents=True, exist_ok=True)

    images = []
    document = pymupdf.open(str(path))

    for page_number, page in enumerate(
        document, start=1
    ):

        image_list = page.get_images(full=True)

        for img_idx, img_info in enumerate(image_list):

            xref = img_info[0]

            try:

                base_image = document.extract_image(
                    xref
                )

                if not base_image:
                    continue

                image_bytes = base_image["image"]
                ext = base_image.get("ext", "png")
                width = base_image.get("width", 0)
                height = base_image.get("height", 0)

                # Skip tiny images
                if len(image_bytes) < MIN_IMAGE_SIZE:
                    continue

                # Skip very small dimensions
                if width < 50 or height < 50:
                    continue

                # Save image
                img_name = (
                    f"page_{page_number}"
                    f"_img_{img_idx}.{ext}"
                )

                img_path = img_dir / img_name

                with open(img_path, "wb") as f:
                    f.write(image_bytes)

                images.append({
                    "source": path.name,
                    "page": page_number,
                    "image_path": str(img_path),
                    "width": width,
                    "height": height,
                    "size_bytes": len(image_bytes),
                    "format": ext,
                })

            except Exception:
                continue

    document.close()

    return images


def render_page_as_image(
    file_path: str,
    page_number: int = 1,
    output_dir: str = "data/rendered_pages",
    dpi: int = 150
) -> dict:
    """Render a specific PDF page as an image for VLM analysis.

    Args:
        file_path: PDF file path.
        page_number: 1-indexed page number.
        output_dir: Output directory.
        dpi: Render resolution.

    Returns:
        Dict with image metadata and saved path.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    out_dir = Path(output_dir) / path.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    document = pymupdf.open(str(path))
    if page_number < 1 or page_number > len(document):
        document.close()
        raise ValueError(f"Page {page_number} out of range (1-{len(document)})")

    page = document[page_number - 1]
    pix = page.get_pixmap(dpi=dpi)
    
    img_name = f"page_{page_number}_rendered.png"
    img_path = out_dir / img_name
    pix.save(str(img_path))
    document.close()

    return {
        "source": path.name,
        "page": page_number,
        "image_path": str(img_path),
        "width": pix.width,
        "height": pix.height,
        "size_bytes": img_path.stat().st_size,
        "format": "png",
    }
