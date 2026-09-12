"""Missing clause detection in contracts."""

import ollama


class MissingClauseDetector:
    """Detects whether clause types are present or absent."""

    def __init__(
        self, retriever, reranker, model="qwen2.5:latest"
    ):
        self.retriever = retriever
        self.reranker = reranker
        self.model = model

    def check(self, document_name, clause_type):
        """Check if a clause type exists in a document.

        Returns:
            Dict with status, detail, evidence_searched.
        """

        label = clause_type.replace("_", " ")
        query = f"{label} clause provisions obligations"

        candidates = self.retriever.search(
            query,
            n_candidates=10,
            document_filter=document_name,
        )

        results = self.reranker.rerank(
            query, candidates, top_k=3
        )

        documents = results["documents"][0]
        metadatas = results["metadatas"][0]

        if not documents:
            return {
                "status": "NOT_FOUND",
                "clause_type": clause_type,
                "source": document_name,
                "detail": (
                    f"No sufficiently relevant {label} "
                    f"provision was identified in "
                    f"{document_name}."
                ),
                "evidence_searched": "No chunks retrieved.",
            }

        evidence = "\n\n".join(
            f"[Page {m['page']}]\n{doc}"
            for doc, m in zip(documents, metadatas)
        )

        prompt = f"""Does this contract contain a {label}
clause or provision?

Respond with exactly one of:
FOUND - if a {label} provision is present
NOT_FOUND - if no {label} provision is present

Then briefly explain your determination.
If FOUND, quote the relevant text.

CONTRACT TEXT:

{evidence}

DETERMINATION:
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
                    "num_predict": 400,
                },
            )

            answer = response["message"].get(
                "content", ""
            ).strip()

        except Exception as e:
            answer = f"Analysis failed: {e}"

        found = answer.upper().startswith("FOUND")

        return {
            "status": "FOUND" if found else "NOT_FOUND",
            "clause_type": clause_type,
            "source": document_name,
            "detail": answer,
            "evidence_searched": [
                f"{m['source']} (Page {m['page']})"
                for m in metadatas
            ],
        }
