from pathlib import Path

from auditor_core.ingestion.pdf_loader import load_pdf


DATASET_DIR = Path(
    r"data/datasets/cuad_full/CUAD_v1/full_contract_pdf"
)


def main():
    pdfs = sorted(DATASET_DIR.rglob("*.pdf"))

    print("=" * 60)
    print("CUAD DATASET")
    print("=" * 60)
    print(f"PDFs found: {len(pdfs)}")
    print()

    total_pages = 0
    failed = 0

    for index, pdf_path in enumerate(pdfs, start=1):

        document_id = f"cuad_{index:06d}"

        try:
            pages = load_pdf(str(pdf_path))

            total_pages += len(pages)

            print(
                f"[{index:3}/{len(pdfs)}] "
                f"{document_id} | "
                f"{len(pages):3} pages | "
                f"{pdf_path.name}"
            )

        except Exception as e:
            failed += 1

            print(
                f"[{index:3}/{len(pdfs)}] "
                f"FAILED | "
                f"{pdf_path.name}"
            )

            print(f"    {e}")

    print()
    print("=" * 60)
    print("INGESTION SUMMARY")
    print("=" * 60)
    print(f"Documents discovered : {len(pdfs)}")
    print(f"Total pages          : {total_pages}")
    print(f"Failed documents     : {failed}")


if __name__ == "__main__":
    main()
