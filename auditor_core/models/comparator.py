"""Cross-document clause comparison."""

import ollama


class ClauseComparator:
    """Compares provisions across multiple contracts."""

    def __init__(
        self, retriever, reranker, model="qwen3.5:4b"
    ):
        self.retriever = retriever
        self.reranker = reranker
        self.model = model

    def compare(self, clause_type, n_contracts=5):
        """Compare a clause type across contracts.

        Retrieves the clause from multiple contracts
        and produces a textual comparison.
        """

        label = clause_type.replace("_", " ")
        query = f"{label} clause provisions terms"

        # Search across all documents
        candidates = self.retriever.search(
            query, n_candidates=20
        )

        results = self.reranker.rerank(
            query, candidates, top_k=10
        )

        documents = results["documents"][0]
        metadatas = results["metadatas"][0]

        if not documents:
            return {
                "clause_type": clause_type,
                "comparison": "No relevant provisions found.",
                "contracts": [],
            }

        # Group by source document
        by_source = {}

        for doc, meta in zip(documents, metadatas):

            source = meta["source"]

            if source not in by_source:
                by_source[source] = []

            by_source[source].append({
                "text": doc,
                "page": meta["page"],
            })

        # Limit to n_contracts
        sources = list(by_source.keys())[:n_contracts]

        # Build comparison context
        context_parts = []

        for i, source in enumerate(sources, 1):

            chunks = by_source[source]
            text = "\n".join(
                c["text"][:500] for c in chunks
            )
            pages = [c["page"] for c in chunks]

            context_parts.append(
                f"CONTRACT {i}: {source}\n"
                f"Pages: {pages}\n\n"
                f"{text}"
            )

        context = "\n\n---\n\n".join(context_parts)

        prompt = f"""Compare the {label} provisions across
these contracts.

For each contract, summarize the key terms concisely.
Highlight important differences between them.

Keep the format simple:

Contract A (filename):
  Key terms summary.

Contract B (filename):
  Key terms summary.

Key Differences:
  - Difference 1
  - Difference 2

CONTRACTS:

{context}

COMPARISON:
"""

        try:

            response = ollama.chat(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                think=False,
                options={
                    "temperature": 0,
                    "num_predict": 800,
                },
            )

            comparison = response["message"].get(
                "content", ""
            ).strip()

        except Exception as e:
            comparison = f"Comparison failed: {e}"

        return {
            "clause_type": clause_type,
            "comparison": comparison,
            "contracts": sources,
        }
