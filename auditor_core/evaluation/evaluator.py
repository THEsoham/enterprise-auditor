"""Batch evaluation of the retrieval + Q&A pipeline."""

import json
import re
import time
from collections import Counter
from pathlib import Path

from auditor_core.evaluation.cuad_loader import CUADLoader


class Evaluator:
    """Runs evaluation questions and measures quality."""

    def __init__(self, qa_engine):
        self.qa_engine = qa_engine

    def run(self, questions_file=None):
        """Run batch evaluation.

        Args:
            questions_file: Optional path to JSON file.
                If None, uses built-in questions.

        Returns:
            Dict with evaluation results and summary.
        """

        if questions_file:
            with open(questions_file) as f:
                questions = json.load(f)
        else:
            questions = self._default_questions()

        results = []
        total = len(questions)

        print(f"\nRunning {total} evaluation questions...\n")

        for i, q in enumerate(questions, 1):

            label = q["question"][:55]
            print(f"  [{i}/{total}] {label}...")

            start = time.time()

            if q.get("document"):
                response = self.qa_engine.ask_document(
                    q["question"], q["document"]
                )
            else:
                response = self.qa_engine.ask(
                    q["question"]
                )

            elapsed = time.time() - start

            # Did we get a real answer?
            has_answer = bool(
                response["answer"]
            ) and "insufficient evidence" not in (
                response["answer"].lower()
            )

            # Keyword match scoring
            keyword_hits = 0
            keyword_total = len(
                q.get("expected_keywords", [])
            )

            for kw in q.get("expected_keywords", []):
                if kw.lower() in response["answer"].lower():
                    keyword_hits += 1

            result = {
                "question": q["question"],
                "document": q.get("document"),
                "has_answer": has_answer,
                "answered": has_answer,
                "keyword_hits": keyword_hits,
                "keyword_total": keyword_total,
                "keyword_score": (
                    round(keyword_hits / keyword_total, 2)
                    if keyword_total > 0
                    else 0.0
                ),
                "sources_count": len(response["sources"]),
                "num_sources": len(response["sources"]),
                "time_seconds": round(elapsed, 2),
                "latency_seconds": round(elapsed, 2),
                "answer_preview": (
                    response["answer"][:200]
                ),
            }

            results.append(result)

        return self._summarize(results)

    def _summarize(self, results):
        """Produce evaluation summary."""

        total = len(results)

        answered = sum(
            1 for r in results if r.get("has_answer") or r.get("answered")
        )

        keyword_scores = [
            r["keyword_score"]
            for r in results
            if r.get("keyword_score") is not None
        ]

        avg_keyword = (
            sum(keyword_scores) / len(keyword_scores)
            if keyword_scores
            else 0
        )

        avg_time = (
            sum(r.get("time_seconds", r.get("latency_seconds", 0)) for r in results)
            / total
            if total
            else 0
        )

        avg_sources = (
            sum(r.get("sources_count", r.get("num_sources", 0)) for r in results)
            / total
            if total
            else 0
        )

        answer_pct = round(answered / total * 100, 1) if total else 0.0
        kw_score = round(avg_keyword * 100, 1)

        return {
            "total_questions": total,
            "answered": answered,
            "answer_rate": answer_pct,
            "keyword_score": kw_score,
            "avg_keyword_score": kw_score,
            "avg_latency_s": round(avg_time, 2),
            "avg_time_seconds": round(avg_time, 2),
            "avg_sources": round(avg_sources, 1),
            "results": results,
        }

    def _default_questions(self):
        """Built-in evaluation questions."""

        return [
            {
                "question": (
                    "What are the termination conditions?"
                ),
                "expected_keywords": [
                    "termination", "notice", "breach",
                ],
            },
            {
                "question": (
                    "What happens if there is a "
                    "material breach?"
                ),
                "expected_keywords": [
                    "breach", "cure", "termination",
                ],
            },
            {
                "question": (
                    "What are the confidentiality "
                    "obligations?"
                ),
                "expected_keywords": [
                    "confidential", "disclose",
                    "information",
                ],
            },
            {
                "question": (
                    "What are the indemnification "
                    "provisions?"
                ),
                "expected_keywords": [
                    "indemnif", "liability", "damages",
                ],
            },
            {
                "question": "What is the governing law?",
                "expected_keywords": [
                    "govern", "law", "state",
                ],
            },
            {
                "question": (
                    "Are there any assignment "
                    "restrictions?"
                ),
                "expected_keywords": [
                    "assign", "consent", "transfer",
                ],
            },
            {
                "question": (
                    "What are the payment terms?"
                ),
                "expected_keywords": [
                    "payment", "fee", "amount",
                ],
            },
            {
                "question": (
                    "What intellectual property rights "
                    "are addressed?"
                ),
                "expected_keywords": [
                    "intellectual", "property", "license",
                ],
            },
            {
                "question": (
                    "Are there force majeure provisions?"
                ),
                "expected_keywords": [
                    "force majeure", "event", "beyond",
                ],
            },
            {
                "question": (
                    "What are the liability limitations?"
                ),
                "expected_keywords": [
                    "liability", "limit", "damages",
                ],
            },
        ]

    def run_cuad(self, max_questions=20):
        """Run evaluation against CUAD ground truth.

        Downloads CUAD from HuggingFace, runs Q&A,
        computes Exact Match and token-level F1.
        """

        loader = CUADLoader()
        questions = loader.get_questions(
            max_per_category=1,
            max_total=max_questions,
        )

        if not questions:
            print(
                "  No CUAD questions available. "
                "Check internet connection."
            )
            return None

        total = len(questions)
        results = []

        print(
            f"\nRunning {total} CUAD "
            f"ground-truth questions...\n"
        )

        for i, q in enumerate(questions, 1):

            label = q["question"][:50]
            print(f"  [{i}/{total}] {label}...")

            start = time.time()

            response = self.qa_engine.ask(
                q["question"]
            )

            elapsed = time.time() - start

            predicted = response["answer"]
            expected = q["expected_answer"]
            all_answers = q.get(
                "all_answers", [expected]
            )

            # Compute metrics
            em = self._exact_match(
                predicted, all_answers
            )

            f1 = self._best_f1(
                predicted, all_answers
            )

            results.append({
                "question": q["question"],
                "category": q.get("category", ""),
                "expected": expected[:100],
                "predicted": predicted[:100],
                "exact_match": em,
                "f1": round(f1, 3),
                "time_seconds": round(elapsed, 1),
                "sources_count": len(
                    response["sources"]
                ),
            })

        # Summarize
        avg_em = (
            sum(r["exact_match"] for r in results)
            / total
        )

        avg_f1 = (
            sum(r["f1"] for r in results)
            / total
        )

        avg_time = (
            sum(r["time_seconds"] for r in results)
            / total
        )

        return {
            "total_questions": total,
            "avg_exact_match": round(
                avg_em * 100, 1
            ),
            "avg_f1": round(avg_f1 * 100, 1),
            "avg_time_seconds": round(avg_time, 1),
            "results": results,
        }

    def _normalize(self, text):
        """Normalize text for comparison."""

        text = text.lower()
        text = re.sub(r"[^\w\s]", "", text)
        text = re.sub(r"\s+", " ", text).strip()

        return text

    def _exact_match(self, predicted, references):
        """Check exact match against any reference."""

        pred_norm = self._normalize(predicted)

        for ref in references:

            if self._normalize(ref) == pred_norm:
                return 1

        return 0

    def _token_f1(self, predicted, reference):
        """Compute token-level F1 score."""

        pred_tokens = self._normalize(
            predicted
        ).split()

        ref_tokens = self._normalize(
            reference
        ).split()

        if not pred_tokens or not ref_tokens:
            return 0.0

        common = (
            Counter(pred_tokens)
            & Counter(ref_tokens)
        )

        num_common = sum(common.values())

        if num_common == 0:
            return 0.0

        precision = num_common / len(pred_tokens)
        recall = num_common / len(ref_tokens)

        f1 = (
            2 * precision * recall
            / (precision + recall)
        )

        return f1

    def _best_f1(self, predicted, references):
        """Best F1 across all references."""

        return max(
            self._token_f1(predicted, ref)
            for ref in references
        )
