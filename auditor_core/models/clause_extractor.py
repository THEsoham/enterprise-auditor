"""Clause extraction from contract documents."""

import ollama


CLAUSE_TYPES = [
    "termination",
    "payment",
    "confidentiality",
    "intellectual_property",
    "indemnification",
    "liability",
    "governing_law",
    "assignment",
    "force_majeure",
]


class ClauseExtractor:
    """Extracts standard clauses from contracts."""

    def __init__(
        self, retriever, reranker, model="qwen2.5:latest"
    ):
        self.retriever = retriever
        self.reranker = reranker
        self.model = model

    def extract(self, document_name):
        """Extract all 9 standard clauses from a document.

        Returns:
            Dict mapping clause type to extraction result.
        """

        results = {}

        for clause_type in CLAUSE_TYPES:

            print(f"  Extracting: {clause_type}...")

            results[clause_type] = self._extract_clause(
                document_name, clause_type
            )

        return results

    def extract_single(self, document_name, clause_type):
        """Extract a single clause type."""

        return self._extract_clause(
            document_name, clause_type
        )

    def _extract_clause(self, document_name, clause_type):
        """Search for and extract a specific clause."""

        label = clause_type.replace("_", " ")
        query = f"{label} clause provisions"

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
                "found": False,
                "clause_type": clause_type,
                "text": None,
                "pages": [],
                "source": document_name,
            }

        evidence = "\n\n".join(
            f"[Page {m['page']}]\n{doc}"
            for doc, m in zip(documents, metadatas)
        )

        prompt = f"""Extract the {label} clause from this contract text.

If no {label} clause is present, respond exactly:
NOT FOUND

If found, extract ONLY the relevant clause text
verbatim. Include the page number.

CONTRACT TEXT:

{evidence}

EXTRACTED CLAUSE:
"""

        try:
            from auditor_core.llm.cloud_llm import query_llm
            extracted = query_llm(prompt, self.model, max_tokens=600)
            if not extracted:
                extracted = documents[0] if documents else "NOT FOUND"
        except Exception:
            extracted = documents[0] if documents else "NOT FOUND"

        found = "NOT FOUND" not in extracted.upper() and len(extracted.strip()) > 10

        return {
            "found": found,
            "clause_type": clause_type,
            "text": extracted if found else None,
            "pages": [m["page"] for m in metadatas],
            "source": document_name,
        }
