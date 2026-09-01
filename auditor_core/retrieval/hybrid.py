"""Hybrid retrieval: vector search + BM25 with RRF fusion."""


class HybridRetriever:
    """Combines semantic and keyword retrieval
    using Reciprocal Rank Fusion."""

    def __init__(self, vector_store, keyword_index):
        self.vector_store = vector_store
        self.keyword_index = keyword_index

    def search(
        self,
        query,
        n_candidates=15,
        document_filter=None,
    ):
        """Retrieve candidates using hybrid search.

        Args:
            query: Search query string.
            n_candidates: Number of fused candidates
                to return.
            document_filter: Optional source filename
                to restrict search.

        Returns:
            Dict with ids, documents, metadatas
            in ChromaDB-like nested list format.
        """

        # ====================================================
        # VECTOR SEARCH
        # ====================================================

        where_filter = None

        if document_filter:
            where_filter = {"source": document_filter}

        vector_results = self.vector_store.search(
            query,
            n_results=n_candidates,
            where_filter=where_filter,
        )

        # ====================================================
        # KEYWORD SEARCH
        # ====================================================

        keyword_results = self.keyword_index.search(
            query,
            n_results=n_candidates,
            document_filter=document_filter,
        )

        # ====================================================
        # RECIPROCAL RANK FUSION
        # ====================================================

        fused = self._rrf_fusion(
            vector_results,
            keyword_results,
            k=60,
        )

        # Trim to requested count
        for key in ("ids", "documents", "metadatas"):
            fused[key] = [
                fused[key][0][:n_candidates]
            ]

        return fused

    def _rrf_fusion(self, *result_sets, k=60):
        """Reciprocal Rank Fusion across result sets.

        score(d) = sum( 1 / (k + rank) )
        across all rankings the document appears in.

        k=60 is the standard constant from the RRF paper.
        """

        scores = {}
        doc_info = {}

        for result_set in result_sets:

            ids = result_set["ids"][0]
            docs = result_set["documents"][0]
            metas = result_set["metadatas"][0]

            for rank, (chunk_id, doc, meta) in enumerate(
                zip(ids, docs, metas), 1
            ):

                scores[chunk_id] = (
                    scores.get(chunk_id, 0.0)
                    + 1.0 / (k + rank)
                )

                doc_info[chunk_id] = (doc, meta)

        # Sort by fused score descending
        sorted_ids = sorted(
            scores,
            key=lambda cid: scores[cid],
            reverse=True,
        )

        return {
            "ids": [
                [cid for cid in sorted_ids]
            ],
            "documents": [
                [doc_info[cid][0] for cid in sorted_ids]
            ],
            "metadatas": [
                [doc_info[cid][1] for cid in sorted_ids]
            ],
        }
