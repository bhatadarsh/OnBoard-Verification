import os
from azure.storage.blob import BlobServiceClient, ContentSettings, generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta
from backend.config import settings


class AzureBlobHelper:
    def __init__(self):
        conn = settings.AZURE_STORAGE_CONNECTION_STRING
        if not conn:
            raise RuntimeError("AZURE_STORAGE_CONNECTION_STRING is not set")

        self.connection_string = conn
        self.is_azurite = "127.0.0.1" in conn or "localhost" in conn

        # ✅ No credential=None — let the SDK parse the key from connection string
        self.blob_service_client = BlobServiceClient.from_connection_string(
            conn,
            connection_verify=False   # needed for Azurite HTTP (not HTTPS)
        )

        if self.is_azurite:
            print("📌 AzureBlobHelper: Running in LOCAL AZURITE mode")
        else:
            print("☁️  AzureBlobHelper: Running in PRODUCTION AZURE mode")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_container_client(self, container_name: str):
        """Get container client, creating the container if it doesn't exist."""
        container = self.blob_service_client.get_container_client(container_name)
        try:
            container.create_container()
        except Exception:
            pass  # Already exists — safe to ignore
        return container

    def _build_blob_url(self, container_name: str, blob_name: str) -> str:
        """Build the correct public URL depending on environment."""
        if self.is_azurite:
            # Azurite uses emulator path-style URLs
            return f"http://127.0.0.1:10000/devstoreaccount1/{container_name}/{blob_name}"
        # Production Azure
        return (
            f"https://{self.blob_service_client.account_name}"
            f".blob.core.windows.net/{container_name}/{blob_name}"
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def upload_file(
        self,
        container_name: str,
        blob_name: str,
        file_content: bytes,
        content_type: str = "application/pdf"
    ) -> str:
        """Upload bytes as a blob. Returns the blob URL."""
        container = self._get_container_client(container_name)
        blob_client = container.get_blob_client(blob_name)
        blob_client.upload_blob(
            file_content,
            overwrite=True,
            content_settings=ContentSettings(content_type=content_type)
        )
        url = self._build_blob_url(container_name, blob_name)
        print(f"✅ Uploaded: {url}")
        return url

    def stage_block(
        self,
        container_name: str,
        blob_name: str,
        block_id: str,
        data: bytes
    ):
        """Stage a single block for a block blob (used for chunked video upload)."""
        container = self._get_container_client(container_name)
        blob_client = container.get_blob_client(blob_name)
        blob_client.stage_block(block_id=block_id, data=data)

    def commit_block_list(
        self,
        container_name: str,
        blob_name: str,
        block_ids: list,
        content_type: str = "video/webm"
    ) -> str:
        """Commit staged blocks to finalize a blob. Returns the blob URL."""
        container = self._get_container_client(container_name)
        blob_client = container.get_blob_client(blob_name)
        blob_client.commit_block_list(
            block_ids,
            content_settings=ContentSettings(content_type=content_type)
        )
        url = self._build_blob_url(container_name, blob_name)
        print(f"✅ Committed block blob: {url}")
        return url

    def get_blob_url(self, container_name: str, blob_name: str) -> str:
        """Return the direct URL for a blob (no SAS)."""
        return self._build_blob_url(container_name, blob_name)

    def generate_sas_url(
        self,
        container_name: str,
        blob_name: str,
        expiry_hours: int = 1
    ) -> str:
        """Generate a time-limited SAS URL for reading a blob."""
        sas_token = generate_blob_sas(
            account_name=self.blob_service_client.account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=self.blob_service_client.credential.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=expiry_hours)
        )
        base_url = self._build_blob_url(container_name, blob_name)
        return f"{base_url}?{sas_token}"

    def delete_blob(self, container_name: str, blob_name: str):
        """Delete a blob if it exists."""
        container = self._get_container_client(container_name)
        blob_client = container.get_blob_client(blob_name)
        blob_client.delete_blob()
        print(f"🗑️  Deleted: {container_name}/{blob_name}")


# Singleton instance — imported everywhere in the app
azure_blob_helper = AzureBlobHelper()












# import os
# from azure.storage.blob import BlobServiceClient, ContentSettings
# from datetime import datetime, timedelta
# from backend.config import settings


# class AzureBlobHelper:
#     def __init__(self):
#         conn = settings.AZURE_STORAGE_CONNECTION_STRING
#         if not conn:
#             raise RuntimeError("AZURE_STORAGE_CONNECTION_STRING is not set")

#         self.connection_string = conn
#         self.blob_service_client = BlobServiceClient.from_connection_string(
#             conn,
#             # ❌ Remove credential=None — it overrides the key from the connection string
#             connection_verify=False  
#         )

#         self.is_azurite = "127.0.0.1" in conn or "localhost" in conn

#         if self.is_azurite:
#             print("📌 AzureBlobHelper: Running in LOCAL AZURITE mode")

#     def _get_container_client(self, container_name: str):
#         container = self.blob_service_client.get_container_client(container_name)
#         try:
#             container.create_container()
#         except Exception:
#             pass
#         return container

#     def upload_file(self, container_name: str, blob_name: str, file_content: bytes, content_type="application/pdf"):
#         container = self._get_container_client(container_name)
#         blob_client = container.get_blob_client(blob_name)

#         blob_client.upload_blob(file_content, overwrite=True, content_type=content_type)
#         return self._build_blob_url(container_name, blob_name)

#     def stage_block(self, container_name: str, blob_name: str, block_id: str, data: bytes):
#         container = self._get_container_client(container_name)
#         blob_client = container.get_blob_client(blob_name)
#         blob_client.stage_block(block_id=block_id, data=data)

#     def commit_block_list(self, container_name: str, blob_name: str, block_ids: list, content_type="video/webm"):
#         container = self._get_container_client(container_name)
#         blob_client = container.get_blob_client(blob_name)
#         blob_client.commit_block_list(block_ids, content_settings=ContentSettings(content_type=content_type))
#         return self._build_blob_url(container_name, blob_name)

#     def _build_blob_url(self, container, blob):
#         """
#         Generate correct blob URL for Azure or Azurite.
#         """
#         if self.is_azurite:
#             # Example:
#             # http://127.0.0.1:10000/devstoreaccount1/container/blob
#             return f"http://127.0.0.1:10000/devstoreaccount1/{container}/{blob}"
        
#         # Production Azure blob endpoint
#         return f"https://{self.blob_service_client.account_name}.blob.core.windows.net/{container}/{blob}"

#     def get_blob_url(self, container_name: str, blob_name: str):
#         return self._build_blob_url(container_name, blob_name)

#     def generate_sas_url(self, container_name: str, blob_name: str, expiry_hours: int = 1):
#         from azure.storage.blob import generate_blob_sas, BlobSasPermissions

#         sas_token = generate_blob_sas(
#             account_name=self.blob_service_client.account_name,
#             container_name=container_name,
#             blob_name=blob_name,
#             account_key=self.blob_service_client.credential.account_key,
#             permission=BlobSasPermissions(read=True),
#             expiry=datetime.utcnow() + timedelta(hours=expiry_hours)
#         )

#         base_url = self._build_blob_url(container_name, blob_name)

#         return f"{base_url}?{sas_token}"


# azure_blob_helper = AzureBlobHelper()




# # import os
# # from azure.storage.blob import BlobServiceClient, ContentSettings
# # from datetime import datetime, timedelta
# # from backend.config import settings

# # class AzureBlobHelper:
# #     def __init__(self):
# #         if not settings.AZURE_STORAGE_CONNECTION_STRING:
# #             raise RuntimeError("AZURE_STORAGE_CONNECTION_STRING is not set in environment or config")
# #         self.blob_service_client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)

# #     def _get_container_client(self, container_name: str):
# #         container_client = self.blob_service_client.get_container_client(container_name)
# #         try:
# #             container_client.create_container()
# #         except Exception:
# #             # Container already exists
# #             pass
# #         return container_client

# #     def upload_file(self, container_name: str, blob_name: str, file_content: bytes, content_type: str = "application/pdf"):
# #         container_client = self._get_container_client(container_name)
# #         blob_client = container_client.get_blob_client(blob_name)
# #         blob_client.upload_blob(file_content, overwrite=True, content_type=content_type)
# #         return blob_client.url

# #     def stage_block(self, container_name: str, blob_name: str, block_id: str, data: bytes):
# #         """Stage a block for a block blob."""
# #         container_client = self._get_container_client(container_name)
# #         blob_client = container_client.get_blob_client(blob_name)
# #         blob_client.stage_block(block_id=block_id, data=data)

# #     def commit_block_list(self, container_name: str, blob_name: str, block_ids: list, content_type: str = "video/webm"):
# #         """Commit the list of staged blocks to finalize the blob."""
# #         container_client = self._get_container_client(container_name)
# #         blob_client = container_client.get_blob_client(blob_name)
# #         blob_client.commit_block_list(block_ids, content_settings=ContentSettings(content_type=content_type))
# #         return blob_client.url

# #     def get_blob_url(self, container_name: str, blob_name: str):
# #         container_client = self.blob_service_client.get_container_client(container_name)
# #         blob_client = container_client.get_blob_client(blob_name)
# #         return blob_client.url

# #     def generate_sas_url(self, container_name: str, blob_name: str, expiry_hours: int = 1):
# #         from azure.storage.blob import generate_blob_sas, BlobSasPermissions
        
# #         sas_token = generate_blob_sas(
# #             account_name=self.blob_service_client.account_name,
# #             container_name=container_name,
# #             blob_name=blob_name,
# #             account_key=self.blob_service_client.credential.account_key,
# #             permission=BlobSasPermissions(read=True),
# #             expiry=datetime.utcnow() + timedelta(hours=expiry_hours)
# #         )
        
# #         return f"https://{self.blob_service_client.account_name}.blob.core.windows.net/{container_name}/{blob_name}?{sas_token}"

# # azure_blob_helper = AzureBlobHelper()
