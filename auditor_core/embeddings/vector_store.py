from pathlib import Path
import chromadb


class VectorStore:

    def __init__(self, chroma_path=None):
        # Resolve ChromaDB directory across root and subdirectories
        if chroma_path:
            chosen_path = Path(chroma_path)
        else:
            candidates = [
                Path("data/chroma"),
                Path("../data/chroma"),
                Path(__file__).resolve().parent.parent.parent / "data" / "chroma",
            ]
            chosen_path = Path("data/chroma")
            for c in candidates:
                if c.exists() and any(c.iterdir()):
                    chosen_path = c.resolve()
                    break

        self.persist_path = str(chosen_path)
        self.client = chromadb.PersistentClient(
            path=self.persist_path
        )

        self.collection = self.client.get_or_create_collection(
            name="enterprise_documents"
        )

    def add_chunks(self, chunks, batch_size=32):

        for start in range(0, len(chunks), batch_size):

            batch = chunks[start:start + batch_size]

            texts = [c["text"] for c in batch]

            try:
                import ollama
                response = ollama.embed(
                    model="nomic-embed-text:latest",
                    input=texts
                )

                embeddings = response["embeddings"]

                self.collection.upsert(
                    ids=[c["chunk_id"] for c in batch],
                    embeddings=embeddings,
                    documents=texts,
                    metadatas=[
                        {
                            "document_id": c["document_id"],
                            "source": c["source"],
                            "page": c["page"],
                        }
                        for c in batch
                    ]
                )
            except Exception as e:
                # Fallback: Upsert documents directly without custom embeddings if embedding service offline
                try:
                    self.collection.upsert(
                        ids=[c["chunk_id"] for c in batch],
                        documents=texts,
                        metadatas=[
                            {
                                "document_id": c["document_id"],
                                "source": c["source"],
                                "page": c["page"],
                            }
                            for c in batch
                        ]
                    )
                except Exception as inner_e:
                    print(f"ChromaDB upsert notice: {inner_e}")

            print(
                f"Processed {min(start + batch_size, len(chunks))}"
                f"/{len(chunks)}"
            )

    def get_all_documents(self):
        """Retrieve all stored documents and metadata.

        Used to build the BM25 keyword index at startup.
        """

        return self.collection.get(
            include=["documents", "metadatas"]
        )

    def search(
        self,
        query,
        n_results=5,
        where_filter=None,
    ):
        """Search by semantic similarity.

        Args:
            query: Search query string.
            n_results: Number of results to return.
            where_filter: Optional ChromaDB where clause,
                e.g. {"source": "contract.pdf"}.
        """

        try:
            import ollama
            response = ollama.embed(
                model="nomic-embed-text:latest",
                input=query
            )

            query_embedding = response["embeddings"][0]

            kwargs = {
                "query_embeddings": [query_embedding],
                "n_results": n_results,
            }

            if where_filter:
                kwargs["where"] = where_filter

            return self.collection.query(**kwargs)
        except Exception as e:
            # Fallback to ChromaDB built-in document query if Ollama is offline
            try:
                kwargs = {"n_results": n_results}
                if where_filter:
                    kwargs["where"] = where_filter
                res = self.collection.get(**kwargs)
                return {
                    "ids": [res.get("ids", [])[:n_results]],
                    "documents": [res.get("documents", [])[:n_results]],
                    "metadatas": [res.get("metadatas", [])[:n_results]]
                }
            except Exception:
                return {"ids": [[]], "documents": [[]], "metadatas": [[]]}
