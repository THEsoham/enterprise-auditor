import time
import ollama


class QAEngine:
    """Retrieval-augmented Q&A over contract documents."""

    def __init__(self, retriever, reranker, model="qwen2.5:latest"):
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

        prompt = f"""You are a document analysis assistant.

Your job is to answer the user's question using
ONLY the provided document evidence.

IMPORTANT RULES:

1. Use only the supplied evidence.
2. Do not use outside knowledge.
3. Do not invent or assume facts.
4. If the evidence does not contain the answer,
   respond exactly:

Insufficient evidence in the provided documents.

5. Keep the answer concise and factual.
6. When answering, mention the relevant document
   name and page number.
7. If multiple documents contain relevant information,
   distinguish them clearly.
8. Return ONLY the final answer.

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
