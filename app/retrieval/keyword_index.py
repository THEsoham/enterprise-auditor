"""BM25 keyword search over contract chunks."""

import re

from rank_bm25 import BM25Okapi


class KeywordIndex:
    """In-memory BM25 index for keyword retrieval."""

    def __init__(self):
        self.chunk_ids = []
        self.documents = []
        self.metadatas = []
        self.bm25 = None

    def build_from_store(self, vector_store):
        """Build BM25 index from all documents in ChromaDB."""

        print("Loading documents from ChromaDB...")

        data = vector_store.get_all_documents()

        self.chunk_ids = data["ids"]
        self.documents = data["documents"]
        self.metadatas = data["metadatas"]

        print(
            f"Tokenizing {len(self.chunk_ids)} chunks..."
        )

        tokenized = [
            self._tokenize(doc)
            for doc in self.documents
        ]

        self.bm25 = BM25Okapi(tokenized)

        print(
            f"BM25 index built: "
            f"{len(self.chunk_ids)} chunks indexed"
        )

    def search(
        self,
        query,
        n_results=15,
        document_filter=None,
    ):
        """Search using BM25 keyword matching.

        Args:
            query: Search query string.
            n_results: Number of results to return.
            document_filter: Optional source filename
                to restrict search.

        Returns:
            Dict with ids, documents, metadatas, scores
            in ChromaDB-like nested list format.
        """

        if self.bm25 is None:
            return {
                "ids": [[]],
                "documents": [[]],
                "metadatas": [[]],
                "scores": [[]],
            }

        tokenized_query = self._tokenize(query)
        scores = self.bm25.get_scores(tokenized_query)

        # Zero out scores for documents that don't
        # match the filter
        if document_filter:
            for i, meta in enumerate(self.metadatas):
                if meta["source"] != document_filter:
                    scores[i] = -1.0

        # Sort by score descending
        ranked = sorted(
            range(len(scores)),
            key=lambda i: scores[i],
            reverse=True,
        )

        # Keep only positive scores, up to n_results
        ranked = [
            i for i in ranked
            if scores[i] > 0
        ][:n_results]

        return {
            "ids": [
                [self.chunk_ids[i] for i in ranked]
            ],
            "documents": [
                [self.documents[i] for i in ranked]
            ],
            "metadatas": [
                [self.metadatas[i] for i in ranked]
            ],
            "scores": [
                [float(scores[i]) for i in ranked]
            ],
        }

    def _tokenize(self, text):
        """Simple tokenization: lowercase + word extraction."""
        return re.findall(r"\w+", text.lower())
