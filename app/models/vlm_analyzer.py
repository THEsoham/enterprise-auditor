"""VLM-based image analysis using minicpm-v via Ollama."""

import base64
from pathlib import Path

import ollama


class VLMAnalyzer:
    """Analyzes document images using a vision LLM."""

    def __init__(self, model="minicpm-v"):
        self.model = model

    def analyze_image(self, image_path: str, prompt: str = None) -> dict:
        """Analyze a single image with the VLM.

        Returns:
            Dict with description and metadata.
        """
        path = Path(image_path)

        if not path.exists():
            return {
                "image_path": image_path,
                "description": f"Image not found: {image_path}",
                "error": True,
            }

        user_prompt = prompt or (
            "Analyze this legal document image in detail. "
            "1. If there are signatures, identify who signed, their title, company, and execution date. "
            "2. If there are tables or financial schedules, extract the columns and key numbers. "
            "3. If there are stamps, corporate seals, or handwritten notes, transcribe and describe them. "
            "4. Transcribe any critical headings or terms shown."
        )

        try:
            response = ollama.chat(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": user_prompt,
                        "images": [str(path)],
                    }
                ],
                options={
                    "temperature": 0,
                    "num_predict": 600,
                },
            )

            description = response["message"].get("content", "").strip()

        except Exception as e:
            return {
                "image_path": image_path,
                "description": f"VLM analysis failed: {e}",
                "error": True,
            }

        return {
            "image_path": image_path,
            "description": description,
            "error": False,
        }

    def ask_image(self, image_path: str, question: str) -> dict:
        """Ask a specific question about an image using the VLM."""
        return self.analyze_image(image_path, prompt=question)

    def analyze_document_images(
        self, images: list[dict]
    ) -> list[dict]:
        """Analyze all images from a document.

        Args:
            images: List of image metadata dicts
                from image_extractor.

        Returns:
            List of analysis results.
        """

        results = []

        for i, img in enumerate(images, 1):

            print(
                f"  Analyzing image {i}/{len(images)}: "
                f"page {img['page']}..."
            )

            result = self.analyze_image(
                img["image_path"]
            )

            # Merge metadata
            result["source"] = img.get("source", "")
            result["page"] = img.get("page", 0)
            result["width"] = img.get("width", 0)
            result["height"] = img.get("height", 0)

            results.append(result)

        return results
