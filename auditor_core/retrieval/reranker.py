"""Reranking retrieved candidates using Qwen."""

import json
import re


class Reranker:
    """Uses Qwen to score and rerank retrieval candidates."""

    def __init__(self, model="qwen2.5:latest"):
        self.model = model

    def rerank(self, query, candidates, top_k=5):
        """Rerank candidates by relevance to query.

        Sends all candidates in a single prompt and asks
        Qwen to score each one. Returns the top_k highest
        scoring results.

        Args:
            query: The user's question.
            candidates: Dict with ids, documents, metadatas
                in ChromaDB-like nested list format.
            top_k: Number of top results to return.

        Returns:
            Dict with ids, documents, metadatas for the
            top_k reranked results.
        """

        ids = candidates["ids"][0]
        documents = candidates["documents"][0]
        metadatas = candidates["metadatas"][0]

        n = len(documents)

        if n <= top_k:
            return candidates

        # ==============================================
        # SCORE WITH QWEN
        # ==============================================

        prompt = self._build_prompt(query, documents)

        try:
            from auditor_core.llm.cloud_llm import query_llm
            response_text = query_llm(prompt, ollama_model=self.model, max_tokens=300)
            scores = self._parse_scores(response_text, n)
        except Exception as e:

            print(
                f"Reranking failed, "
                f"using fusion order: {e}"
            )

            # Fallback: preserve input order
            scores = {
                i: n - i
                for i in range(1, n + 1)
            }

        # ==============================================
        # SELECT TOP-K
        # ==============================================

        ranked = sorted(
            scores.items(),
            key=lambda x: x[1],
            reverse=True,
        )[:top_k]

        # Convert from 1-indexed to 0-indexed
        top_indices = [idx - 1 for idx, _ in ranked]

        return {
            "ids": [
                [ids[i] for i in top_indices]
            ],
            "documents": [
                [documents[i] for i in top_indices]
            ],
            "metadatas": [
                [metadatas[i] for i in top_indices]
            ],
        }

    def _build_prompt(self, query, documents):
        """Build the scoring prompt for Qwen."""

        lines = [
            "You are a relevance scoring assistant.",
            "",
            "Score each passage for relevance to the "
            "query on a scale of 0 to 10:",
            "",
            "  10 = directly answers the query",
            "  5  = somewhat relevant",
            "  0  = completely irrelevant",
            "",
            "Return ONLY a JSON object mapping passage "
            "numbers to integer scores.",
            "",
            'Example: {"1": 8, "2": 3, "3": 9}',
            "",
            f"QUERY: {query}",
            "",
        ]

        for i, doc in enumerate(documents, 1):

            # Truncate to keep prompt manageable
            text = doc[:600] if len(doc) > 600 else doc

            lines.append(f"PASSAGE {i}:")
            lines.append(text)
            lines.append("")

        lines.append("SCORES (JSON only):")

        return "\n".join(lines)

    def _parse_scores(self, response_text, n_candidates):
        """Parse relevance scores from Qwen response.

        Tries multiple parsing strategies. Falls back
        to preserving original ranking if all fail.
        """

        # Strategy 1: direct JSON parse
        try:

            scores = json.loads(response_text.strip())

            if isinstance(scores, dict):
                return {
                    int(k): float(v)
                    for k, v in scores.items()
                }

        except (json.JSONDecodeError, ValueError):
            pass

        # Strategy 2: extract JSON from response text
        match = re.search(r"\{[^}]+\}", response_text)

        if match:

            try:

                scores = json.loads(match.group())

                return {
                    int(k): float(v)
                    for k, v in scores.items()
                }

            except (json.JSONDecodeError, ValueError):
                pass

        # Strategy 3: fallback to original order
        print(
            "WARNING: Could not parse reranker scores, "
            "using fusion order."
        )

        return {
            i: n_candidates - i
            for i in range(1, n_candidates + 1)
        }
