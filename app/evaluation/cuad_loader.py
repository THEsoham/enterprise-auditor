"""CUAD ground-truth loader from HuggingFace."""

import json
import re
from pathlib import Path

from datasets import load_dataset


class CUADLoader:
    """Loads CUAD ground-truth Q&A from HuggingFace."""

    # The 41 CUAD clause categories
    CATEGORIES = [
        "Document Name",
        "Parties",
        "Agreement Date",
        "Effective Date",
        "Expiration Date",
        "Renewal Term",
        "Notice Period To Terminate Renewal",
        "Governing Law",
        "Most Favored Nation",
        "Non-Compete",
        "Exclusivity",
        "No-Solicit Of Customers",
        "Competitive Restriction Exception",
        "No-Solicit Of Employees",
        "Non-Disparagement",
        "Termination For Convenience",
        "Rofr/Rofo/Rofn",
        "Change Of Control",
        "Anti-Assignment",
        "Revenue/Profit Sharing",
        "Price Restrictions",
        "Minimum Commitment",
        "Volume Restriction",
        "Ip Ownership Assignment",
        "Joint Ip Ownership",
        "License Grant",
        "Non-Transferable License",
        "Affiliate License-Licensor",
        "Affiliate License-Licensee",
        "Unlimited/All-You-Can-Eat-License",
        "Irrevocable Or Perpetual License",
        "Source Code Escrow",
        "Post-Termination Services",
        "Audit Rights",
        "Uncapped Liability",
        "Cap On Liability",
        "Liquidated Damages",
        "Warranty Duration",
        "Insurance",
        "Covenant Not To Sue",
        "Third Party Beneficiary",
    ]

    def __init__(
        self,
        cache_dir="data/cuad_hf",
    ):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(
            parents=True, exist_ok=True
        )
        self.dataset = None

    def load(self):
        """Download and load the CUAD dataset."""

        cache_path = self.cache_dir / "cuad_qa.json"

        if cache_path.exists():
            print("  Loading cached CUAD data...")

            with open(cache_path) as f:
                self.dataset = json.load(f)

            return self.dataset

        print("  Downloading CUAD from HuggingFace...")

        try:

            ds = load_dataset(
                "theatticusproject/cuad-qa",
                trust_remote_code=True,
            )

            # Convert to list of dicts
            data = []

            for split in ds:

                for item in ds[split]:

                    data.append({
                        "id": item.get("id", ""),
                        "title": item.get("title", ""),
                        "context": item.get(
                            "context", ""
                        )[:500],
                        "question": item.get(
                            "question", ""
                        ),
                        "answers": item.get(
                            "answers", {}
                        ),
                    })

            # Cache locally
            with open(cache_path, "w") as f:
                json.dump(data, f)

            self.dataset = data

            print(
                f"  Loaded {len(data)} Q&A pairs "
                f"from CUAD"
            )

        except Exception as e:

            print(
                f"  Failed to load CUAD: {e}"
            )
            print(
                "  Falling back to built-in questions."
            )

            self.dataset = []

        return self.dataset

    def get_questions(
        self, max_per_category=2, max_total=50
    ):
        """Get evaluation questions from CUAD.

        Returns list of dicts with:
        question, document, expected_answer,
        category
        """

        if not self.dataset:
            self.load()

        if not self.dataset:
            return []

        questions = []
        category_counts = {}

        for item in self.dataset:

            question = item.get("question", "")
            answers = item.get("answers", {})
            title = item.get("title", "")

            # Extract answer texts
            answer_texts = answers.get("text", [])

            if not answer_texts:
                continue

            # Determine category from question
            category = self._guess_category(question)

            # Limit per category
            count = category_counts.get(category, 0)

            if count >= max_per_category:
                continue

            category_counts[category] = count + 1

            questions.append({
                "question": question,
                "document": title,
                "expected_answer": answer_texts[0],
                "all_answers": answer_texts,
                "category": category,
            })

            if len(questions) >= max_total:
                break

        return questions

    def _guess_category(self, question):
        """Map a question to a CUAD category."""

        q_lower = question.lower()

        for cat in self.CATEGORIES:

            cat_words = cat.lower().replace(
                "/", " "
            ).replace("-", " ").split()

            if all(w in q_lower for w in cat_words):
                return cat

        return "Other"
