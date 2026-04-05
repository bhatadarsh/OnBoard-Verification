"""
MongoDB Handler — stores structural metadata and relationships.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime

from config.settings import settings
from utils.logger import get_logger

log = get_logger(__name__)


class MongoHandler:
    """Manages MongoDB connections for metadata storage."""

    def __init__(self):
        self._client = None
        self._db = None

    @property
    def client(self):
        if self._client is None:
            from pymongo import MongoClient

            self._client = MongoClient(settings.mongo_uri)
            log.info(f"Connected to MongoDB: {settings.mongo_uri}")
        return self._client

    @property
    def db(self):
        if self._db is None:
            self._db = self.client[settings.mongo_db_name]
        return self._db

    def store_document_metadata(self, metadata: Dict[str, Any]) -> str:
        """Store document-level metadata.

        Args:
            metadata: Dict with file info, content profile, extraction results.

        Returns:
            MongoDB document ID (str).
        """
        try:
            metadata["created_at"] = datetime.utcnow()
            result = self.db.documents.insert_one(metadata)
            doc_id = str(result.inserted_id)
            log.info(f"Stored document metadata: {doc_id}")
            return doc_id

        except Exception as e:
            log.error(f"MongoDB insert error: {e}")
            return ""

    def store_relationships(
        self,
        document_id: str,
        relationships: List[Dict[str, Any]],
    ) -> int:
        """Store relationships between extracted elements.

        Args:
            document_id: Parent document ID.
            relationships: List of relationship dicts.

        Returns:
            Number of relationships stored.
        """
        try:
            for rel in relationships:
                rel["document_id"] = document_id
                rel["created_at"] = datetime.utcnow()

            if relationships:
                result = self.db.relationships.insert_many(relationships)
                count = len(result.inserted_ids)
                log.info(f"Stored [bold]{count}[/] relationships for document {document_id}")
                return count

            return 0

        except Exception as e:
            log.error(f"MongoDB relationship insert error: {e}")
            return 0

    def store_page_structure(
        self,
        document_id: str,
        page_structures: List[Dict[str, Any]],
    ) -> int:
        """Store page-level structural metadata.

        Args:
            document_id: Parent document ID.
            page_structures: List of page structure dicts.

        Returns:
            Number of pages stored.
        """
        try:
            for ps in page_structures:
                ps["document_id"] = document_id
                ps["created_at"] = datetime.utcnow()

            if page_structures:
                result = self.db.page_structures.insert_many(page_structures)
                count = len(result.inserted_ids)
                log.info(f"Stored [bold]{count}[/] page structures for document {document_id}")
                return count

            return 0

        except Exception as e:
            log.error(f"MongoDB page structure insert error: {e}")
            return 0

    def get_document_metadata(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve document metadata by ID."""
        try:
            from bson import ObjectId

            result = self.db.documents.find_one({"_id": ObjectId(document_id)})
            return result
        except Exception as e:
            log.error(f"MongoDB query error: {e}")
            return None

    def close(self):
        """Close MongoDB connection."""
        if self._client:
            self._client.close()
            log.info("MongoDB connection closed")


# Singleton
mongo_handler = MongoHandler()
