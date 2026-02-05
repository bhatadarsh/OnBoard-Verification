import os
import json
from datetime import datetime
from azure.storage.blob import BlobServiceClient
import time
CONTAINER_NAME = "interview-traces"


def get_blob_client(blob_name: str):
    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not conn_str:
        raise RuntimeError("AZURE_STORAGE_CONNECTION_STRING not set")

    service = BlobServiceClient.from_connection_string(conn_str)
    container = service.get_container_client(CONTAINER_NAME)

    # create container if not exists (safe)
    try:
        container.create_container()
    except Exception:
        pass

    return container.get_blob_client(blob_name)


def save_interview_trace(candidate_id: str, interview_trace: list):
    blob_name = f"{candidate_id}.json"

    payload = {
        "candidate_id": candidate_id,
        "saved_at": datetime.utcnow().isoformat(),
        "interview_trace": interview_trace,
    }

    print(f"DEBUG: Saving trace to Azure. Turns: {len(interview_trace)}")
    for i, turn in enumerate(interview_trace):
        print(f"DEBUG: Trace Turn {i}: {turn.get('answer_text')}")

    blob = get_blob_client(blob_name)
    blob.upload_blob(
        json.dumps(payload, indent=2),
        overwrite=True,
        content_type="application/json",
    )


def save_raw_audio(candidate_id: str, file_path: str):
    """Upload raw audio file to blob storage under raw-audio/ folder."""
    if not os.path.exists(file_path):
        raise RuntimeError("audio file does not exist")

    base = os.path.basename(file_path)
    blob_name = f"raw-audio/{candidate_id}_{int(time.time())}_{base}"
    blob = get_blob_client(blob_name)
    with open(file_path, 'rb') as f:
        blob.upload_blob(f.read(), overwrite=True, content_type="audio/wav")

    # Return the blob URL for referencing in interview trace
    try:
        return blob.url
    except Exception:
        return blob_name
