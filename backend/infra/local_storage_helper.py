"""
local_storage_helper.py
Replaces AzureBlobHelper with a local filesystem implementation.
All files are stored under the `datasets/` directory at the project root.
 
Folder mapping (mirrors old Azure container names):
  job-descriptions  → datasets/job_descriptions/
  resumes           → datasets/uploaded_docs/
  interview-traces  → datasets/interview_traces/
  (any other)       → datasets/<container_name>/
"""
 
import os
import shutil
from datetime import datetime
from pathlib import Path
 
 
# ---------------------------------------------------------------------------
# Resolve the project-root `datasets/` directory.
# This file lives at:  backend/infra/local_storage_helper.py
# Project root is three levels up.
# ---------------------------------------------------------------------------
_THIS_DIR = Path(os.path.dirname(os.path.abspath(__file__)))          # backend/infra/
_BACKEND_DIR = _THIS_DIR.parent                                         # backend/
_PROJECT_ROOT = _BACKEND_DIR.parent                                     # project root
DATASETS_ROOT = _PROJECT_ROOT / "datasets"
 
 
# Map old Azure container names → local sub-directories
_CONTAINER_MAP = {
    "job-descriptions": "job_descriptions",
    "resumes":          "uploaded_docs",
    "interview-traces": "interview_traces",
}
 
 
def _resolve_dir(container_name: str) -> Path:
    """Return (and create) the local directory for a given container name."""
    sub = _CONTAINER_MAP.get(container_name, container_name.replace("-", "_"))
    directory = DATASETS_ROOT / sub
    directory.mkdir(parents=True, exist_ok=True)
    return directory
 
 
def _resolve_path(container_name: str, blob_name: str) -> Path:
    """Return the full local Path for a blob, creating parent dirs as needed."""
    base = _resolve_dir(container_name)
    full_path = base / blob_name
    full_path.parent.mkdir(parents=True, exist_ok=True)
    return full_path
 
 
def _local_url(container_name: str, blob_name: str) -> str:
    """
    Return a backend URL that serves the file.
    The FastAPI app exposes  GET /files/{container}/{blob_path}
    which reads directly from the local filesystem.
    """
    return f"/files/{container_name}/{blob_name}"
 
 
# ---------------------------------------------------------------------------
# Public helper class  (drop-in replacement for AzureBlobHelper)
# ---------------------------------------------------------------------------
 
class LocalStorageHelper:
    """
    Local filesystem storage helper.
    Implements the same public API as AzureBlobHelper so the rest of the
    codebase requires minimal changes.
    """
 
    def __init__(self):
        DATASETS_ROOT.mkdir(parents=True, exist_ok=True)
        print(f"💾 LocalStorageHelper: storing files under {DATASETS_ROOT}")
 
    # ------------------------------------------------------------------
    # Core operations
    # ------------------------------------------------------------------
 
    def upload_file(
        self,
        container_name: str,
        blob_name: str,
        file_content: bytes,
        content_type: str = "application/pdf",
    ) -> str:
        """Write bytes to the local filesystem. Returns a local serving URL."""
        path = _resolve_path(container_name, blob_name)
        with open(path, "wb") as f:
            f.write(file_content)
        url = _local_url(container_name, blob_name)
        print(f"✅ Saved locally: {path}  →  {url}")
        return url
 
    def read_file(self, container_name: str, blob_name: str) -> bytes:
        """Read and return the raw bytes of a stored file."""
        path = _resolve_path(container_name, blob_name)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        return path.read_bytes()
 
    def get_blob_url(self, container_name: str, blob_name: str) -> str:
        """Return the local serving URL for a file."""
        return _local_url(container_name, blob_name)
 
    def generate_sas_url(
        self,
        container_name: str,
        blob_name: str,
        expiry_hours: int = 1,
    ) -> str:
        """
        SAS URLs are an Azure concept.  We just return the plain local URL
        (no expiry needed for local dev).
        """
        return _local_url(container_name, blob_name)
 
    def delete_blob(self, container_name: str, blob_name: str):
        """Delete a local file if it exists."""
        path = _resolve_path(container_name, blob_name)
        if path.exists():
            path.unlink()
            print(f"🗑️  Deleted: {path}")
 
    # ------------------------------------------------------------------
    # Chunked / block-upload stubs
    # (Used for video chunk uploads – accumulate chunks then commit)
    # ------------------------------------------------------------------
 
    def stage_block(
        self,
        container_name: str,
        blob_name: str,
        block_id: str,
        data: bytes,
    ):
        """
        Stage a video chunk by appending it to a temporary staging file.
        Staging file: <blob_path>.staging/<block_id>
        """
        staging_dir = _resolve_path(container_name, blob_name + ".staging") 
        # _resolve_path already created parent; make the staging dir itself
        staging_file_dir = _resolve_dir(container_name) / (blob_name + ".staging")
        staging_file_dir.mkdir(parents=True, exist_ok=True)
        chunk_path = staging_file_dir / block_id
        with open(chunk_path, "wb") as f:
            f.write(data)
 
    def commit_block_list(
        self,
        container_name: str,
        blob_name: str,
        block_ids: list,
        content_type: str = "video/webm",
    ) -> str:
        """
        Concatenate staged chunks in order and write the final blob.
        Returns the local serving URL.
        """
        staging_dir = _resolve_dir(container_name) / (blob_name + ".staging")
        final_path = _resolve_path(container_name, blob_name)
 
        with open(final_path, "wb") as out:
            for block_id in block_ids:
                chunk_path = staging_dir / block_id
                if chunk_path.exists():
                    out.write(chunk_path.read_bytes())
 
        # Clean up staging directory
        if staging_dir.exists():
            shutil.rmtree(staging_dir, ignore_errors=True)
 
        url = _local_url(container_name, blob_name)
        print(f"✅ Committed chunked file: {final_path}  →  {url}")
        return url
 
    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------
 
    def file_exists(self, container_name: str, blob_name: str) -> bool:
        return _resolve_path(container_name, blob_name).exists()
 
    def get_local_path(self, container_name: str, blob_name: str) -> Path:
        """Return the absolute local Path (useful for serving files directly)."""
        return _resolve_path(container_name, blob_name)
 
 
# ---------------------------------------------------------------------------
# Singleton – imported everywhere in the app as a drop-in for azure_blob_helper
# ---------------------------------------------------------------------------
local_storage_helper = LocalStorageHelper()
 
