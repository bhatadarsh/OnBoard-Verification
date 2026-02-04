import os
import json
from typing import List, Dict


def _local_fallback_path(candidate_id: str) -> str:
    from pathlib import Path
    p = Path(__file__).parent / ".." / "data" / "azure_fallback"
    p.mkdir(parents=True, exist_ok=True)
    return str(p / f"{candidate_id}.json")


def save_interview_trace(candidate_id: str, interview_trace: List[Dict]) -> bool:
    """Save interview trace to Azure Blob Storage if configured.

    Falls back to writing a local JSON file when Azure settings are missing
    or upload fails.
    Returns True on success.
    """
    payload = json.dumps({"candidate_id": candidate_id, "interview_trace": interview_trace}, indent=2)

    # Prefer a full connection string
    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    container = os.getenv("AZURE_INTERVIEWS_CONTAINER", "interviews")

    if conn_str:
        try:
            from azure.storage.blob import BlobServiceClient

            svc = BlobServiceClient.from_connection_string(conn_str)
            container_client = svc.get_container_client(container)
            try:
                container_client.create_container()
            except Exception:
                pass

            blob_name = f"{candidate_id}.json"
            container_client.upload_blob(name=blob_name, data=payload, overwrite=True)
            return True
        except Exception:
            # fallback
            pass

    # Try account/key style
    account = os.getenv("AZURE_STORAGE_ACCOUNT")
    key = os.getenv("AZURE_STORAGE_KEY")
    if account and key:
        try:
            from azure.storage.blob import BlobServiceClient
            url = f"https://{account}.blob.core.windows.net"
            svc = BlobServiceClient(account_url=url, credential=key)
            container_client = svc.get_container_client(container)
            try:
                container_client.create_container()
            except Exception:
                pass
            blob_name = f"{candidate_id}.json"
            container_client.upload_blob(name=blob_name, data=payload, overwrite=True)
            return True
        except Exception:
            pass

    # Final fallback: write locally
    try:
        path = _local_fallback_path(candidate_id)
        with open(path, "w") as f:
            f.write(payload)
        return True
    except Exception:
        return False
