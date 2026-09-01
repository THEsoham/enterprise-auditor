from pathlib import Path
import chromadb
import ollama


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

            print(
                f"Embedded {min(start + batch_size, len(chunks))}"
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