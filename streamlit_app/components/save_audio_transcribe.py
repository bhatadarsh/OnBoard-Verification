
from os import getenv
from azure.storage.blob import BlobServiceClient
svc = BlobServiceClient.from_connection_string(getenv("AZURE_STORAGE_CONNECTION_STRING"))
cont = svc.get_container_client("interview-traces")
for b in cont.list_blobs(name_starts_with="raw-audio/"):
    print(b.name, b.size)
