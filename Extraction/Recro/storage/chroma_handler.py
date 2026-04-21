"""
ChromaDB Handler — stores and retrieves vector embeddings.
"""
from typing import List, Dict, Any, Optional

from config.settings import settings
from utils.logger import get_logger

log = get_logger(__name__)


class ChromaHandler:
    """Manages ChromaDB collection for document embeddings."""

    def __init__(self):
        self._client = None
        self._collection = None

    @property
    def client(self):
        if self._client is None:
            import chromadb

            self._client = chromadb.PersistentClient(
                path=settings.chroma_persist_dir
            )
            log.info(f"ChromaDB initialized at: {settings.chroma_persist_dir}")
        return self._client

    @property
    def collection(self):
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name=settings.chroma_collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            log.info(f"Using collection: {settings.chroma_collection_name}")
        return self._collection

    def store_embeddings(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> int:
        """Store embeddings in ChromaDB.

        Args:
            ids: Unique IDs for each embedding.
            embeddings: List of embedding vectors.
            documents: Original text documents.
            metadatas: Optional metadata for each document.

        Returns:
            Number of embeddings stored.
        """
        if not ids or not embeddings:
            return 0

        # Filter out empty embeddings
        valid = [
            (i, e, d, m)
            for i, e, d, m in zip(
                ids,
                embeddings,
                documents,
                metadatas or [{}] * len(ids),
            )
            if e  # Skip empty embeddings
        ]

        if not valid:
            log.warning("No valid embeddings to store")
            return 0

        v_ids, v_embeddings, v_documents, v_metadatas = zip(*valid)

        # Sanitize metadata (ChromaDB only supports str, int, float, bool)
        clean_metadatas = []
        for meta in v_metadatas:
            clean = {}
            for k, v in (meta or {}).items():
                if isinstance(v, (str, int, float, bool)):
                    clean[k] = v
                else:
                    clean[k] = str(v)
            clean_metadatas.append(clean)

        try:
            self.collection.upsert(
                ids=list(v_ids),
                embeddings=list(v_embeddings),
                documents=list(v_documents),
                metadatas=clean_metadatas,
            )
            log.info(f"Stored [bold]{len(v_ids)}[/] embeddings in ChromaDB")
            return len(v_ids)

        except Exception as e:
            log.error(f"ChromaDB storage error: {e}")
            return 0

    def query(
        self,
        query_text: str = None,
        query_embedding: List[float] = None,
        n_results: int = 5,
        where: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """Query the vector database.

        Args:
            query_text: Text to search for (will be embedded).
            query_embedding: Pre-computed embedding vector.
            n_results: Number of results to return.
            where: Optional filter conditions.

        Returns:
            ChromaDB query results.
        """
        try:
            kwargs = {"n_results": n_results}
            if where:
                kwargs["where"] = where

            if query_embedding:
                kwargs["query_embeddings"] = [query_embedding]
            elif query_text:
                kwargs["query_texts"] = [query_text]
            else:
                log.warning("No query provided")
                return {}

            results = self.collection.query(**kwargs)
            return results

        except Exception as e:
            log.error(f"ChromaDB query error: {e}")
            return {}

    def get_count(self) -> int:
        """Get the total number of embeddings in the collection."""
        return self.collection.count()

    def get_by_id(self, content_id: str) -> Dict[str, Any]:
        """Retrieve a document and its metadata by ID."""
        try:
            result = self.collection.get(ids=[content_id])
            if not result or not result["ids"]:
                return {}
            
            return {
                "id": result["ids"][0],
                "document": result["documents"][0] if result["documents"] else None,
                "metadata": result["metadatas"][0] if result["metadatas"] else {},
            }
        except Exception as e:
            log.error(f"ChromaDB get error for {content_id}: {e}")
            return {}

    def update_metadata(self, ids: List[str], metadatas: List[Dict[str, Any]]):
        """Update metadata for existing documents."""
        if not ids or not metadatas:
            return
        
        # Sanitize metadata
        clean_metadatas = []
        for meta in metadatas:
            clean = {}
            for k, v in (meta or {}).items():
                if isinstance(v, (str, int, float, bool)):
                    clean[k] = v
                else:
                    clean[k] = str(v)
            clean_metadatas.append(clean)

        self.collection.update(ids=ids, metadatas=clean_metadatas)

    def delete_embeddings(self, ids: List[str]):
        """Delete embeddings from the collection."""
        if not ids:
            return
        self.collection.delete(ids=ids)


# Singleton
chroma_handler = ChromaHandler()
