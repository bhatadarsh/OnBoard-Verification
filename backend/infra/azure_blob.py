import os
from azure.storage.blob import BlobServiceClient, ContentSettings
from datetime import datetime, timedelta
from config import settings

class AzureBlobHelper:
    def __init__(self):
        if not settings.AZURE_STORAGE_CONNECTION_STRING:
            raise RuntimeError("AZURE_STORAGE_CONNECTION_STRING is not set in environment or config")
        self.blob_service_client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)

    def _get_container_client(self, container_name: str):
        container_client = self.blob_service_client.get_container_client(container_name)
        try:
            container_client.create_container()
        except Exception:
            # Container already exists
            pass
        return container_client

    def upload_file(self, container_name: str, blob_name: str, file_content: bytes, content_type: str = "application/pdf"):
        container_client = self._get_container_client(container_name)
        blob_client = container_client.get_blob_client(blob_name)
        blob_client.upload_blob(file_content, overwrite=True, content_type=content_type)
        return blob_client.url

    def stage_block(self, container_name: str, blob_name: str, block_id: str, data: bytes):
        """Stage a block for a block blob."""
        container_client = self._get_container_client(container_name)
        blob_client = container_client.get_blob_client(blob_name)
        blob_client.stage_block(block_id=block_id, data=data)

    def commit_block_list(self, container_name: str, blob_name: str, block_ids: list, content_type: str = "video/webm"):
        """Commit the list of staged blocks to finalize the blob."""
        container_client = self._get_container_client(container_name)
        blob_client = container_client.get_blob_client(blob_name)
        blob_client.commit_block_list(block_ids, content_settings=ContentSettings(content_type=content_type))
        return blob_client.url

    def get_blob_url(self, container_name: str, blob_name: str):
        container_client = self.blob_service_client.get_container_client(container_name)
        blob_client = container_client.get_blob_client(blob_name)
        return blob_client.url

    def generate_sas_url(self, container_name: str, blob_name: str, expiry_hours: int = 1):
        from azure.storage.blob import generate_blob_sas, BlobSasPermissions
        
        sas_token = generate_blob_sas(
            account_name=self.blob_service_client.account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=self.blob_service_client.credential.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=expiry_hours)
        )
        
        return f"https://{self.blob_service_client.account_name}.blob.core.windows.net/{container_name}/{blob_name}?{sas_token}"

azure_blob_helper = AzureBlobHelper()
