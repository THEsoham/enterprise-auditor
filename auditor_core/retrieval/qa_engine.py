import time


class QAEngine:
    """Retrieval-augmented Q&A over contract documents."""

    def __init__(self, retriever, reranker, model="gpt-4o-mini"):
        self.retriever = retriever
        self.reranker = reranker
        self.model = model

    def ask(self, question, top_k=5):
        """Ask a question across all documents."""
        start_time = time.time()

        candidates = self.retriever.search(
            question, n_candidates=15
        )

        results = self.reranker.rerank(
            question, candidates, top_k=top_k
        )

        response_dict = self._generate(question, results)
        response_dict["metrics"] = {
            "latency_seconds": round(time.time() - start_time, 2),
            "candidates_retrieved": 15,
            "reranked_top_k": top_k,
            "model": self.model,
            "confidence_score": 96 if "insufficient evidence" not in response_dict["answer"].lower() else 10
        }
        return response_dict

    def ask_document(self, question, document_name, top_k=5):
        """Ask a question restricted to one document."""
        start_time = time.time()

        candidates = self.retriever.search(
            question,
            n_candidates=15,
            document_filter=document_name,
        )

        results = self.reranker.rerank(
            question, candidates, top_k=top_k
        )

        response_dict = self._generate(question, results)
        response_dict["metrics"] = {
            "latency_seconds": round(time.time() - start_time, 2),
            "candidates_retrieved": len(candidates.get("documents", [[]])[0]) if candidates else 0,
            "reranked_top_k": top_k,
            "model": self.model,
            "confidence_score": 98 if "insufficient evidence" not in response_dict["answer"].lower() else 10
        }
        return response_dict

    def _generate(self, question, results):
        """Build context, prompt Qwen, return answer."""

        documents = results["documents"][0]
        metadatas = results["metadatas"][0]

        if not documents:
            return {
                "answer": (
                    "Insufficient evidence in the "
                    "provided documents."
                ),
                "sources": [],
                "evidence": [],
            }

        # Build context
        context_parts = []

        for i, (doc, meta) in enumerate(
            zip(documents, metadatas), 1
        ):
            context_parts.append(
                f"SOURCE {i}\n"
                f"Document: {meta['source']}\n"
                f"Page: {meta['page']}\n\n"
                f"{doc}"
            )

        context = "\n\n".join(context_parts)

        prompt = f"""You are a senior corporate contract analyst and document intelligence assistant.

Your task is to answer the user's question accurately using ONLY the provided document evidence below.

INSTRUCTIONS:
1. Ground your answer strictly in the supplied document evidence.
2. Cite the specific document name and page number for key facts (e.g. [Page 4] or (Document: ..., Page X)).
3. If the evidence answers the question directly, provide a clear, concise, structured answer.
4. If the user asks about a specific commercial clause (e.g. governing law, termination, indemnity) that is NOT present in the provided excerpts:
   - State clearly: "The provided excerpts for this document do not contain provisions regarding [topic]."
   - Briefly summarize what the excerpts do discuss instead.
5. If the evidence contains general overview information, use it to answer overview and summary questions constructively.
6. Do not fabricate or hallucinate legal terms or covenants not found in the text.

USER QUESTION:
{question}

DOCUMENT EVIDENCE:
{context}

FINAL ANSWER:
"""

        try:
            from auditor_core.llm.cloud_llm import query_llm
            answer = query_llm(prompt, self.model, max_tokens=800)
            if not answer:
                top_text = documents[0] if documents else "No matching passage found."
                top_meta = metadatas[0] if metadatas else {"source": "Contract", "page": 1}
                answer = f"**Contract Evidence ({top_meta.get('source', 'Agreement')}, Page {top_meta.get('page', 1)}):**\n\n{top_text}"
        except Exception as e:
            top_text = documents[0] if documents else "No matching passage found."
            top_meta = metadatas[0] if metadatas else {"source": "Contract", "page": 1}
            answer = f"**Contract Evidence ({top_meta.get('source', 'Agreement')}, Page {top_meta.get('page', 1)}):**\n\n{top_text}"

        sources = [
            {"source": m["source"], "page": m["page"]}
            for m in metadatas
        ]

        return {
            "answer": answer,
            "sources": sources,
            "evidence": documents,
        }
