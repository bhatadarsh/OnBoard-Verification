"""
File Loader — loads documents from a local path.
Supports single files and directories (recursive).
"""
import os
from pathlib import Path
from typing import List
from dataclasses import dataclass, field

from utils.logger import get_logger

log = get_logger(__name__)

# Supported extensions
SUPPORTED_EXTENSIONS = {
    ".pdf", ".docx", ".xlsx", ".xls", ".csv",
    ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".gif", ".webp",
}


@dataclass
class LoadedFile:
    """Represents a file loaded from disk."""
    path: Path
    filename: str
    extension: str
    size_bytes: int
    raw_bytes: bytes = field(repr=False)

    @property
    def is_pdf(self) -> bool:
        return self.extension == ".pdf"

    @property
    def is_docx(self) -> bool:
        return self.extension == ".docx"

    @property
    def is_spreadsheet(self) -> bool:
        return self.extension in {".xlsx", ".xls", ".csv"}

    @property
    def is_image(self) -> bool:
        return self.extension in {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".gif", ".webp"}


def load_file(file_path: str) -> LoadedFile:
    """Load a single file from disk.

    Args:
        file_path: Absolute or relative path to the file.

    Returns:
        LoadedFile object with metadata and raw bytes.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file extension is not supported.
    """
    path = Path(file_path).resolve()

    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    if not path.is_file():
        raise ValueError(f"Not a file: {path}")

    ext = path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}. Supported: {SUPPORTED_EXTENSIONS}")

    raw_bytes = path.read_bytes()
    log.info(f"Loaded [bold]{path.name}[/] ({len(raw_bytes):,} bytes)")

    return LoadedFile(
        path=path,
        filename=path.name,
        extension=ext,
        size_bytes=len(raw_bytes),
        raw_bytes=raw_bytes,
    )


def load_directory(dir_path: str) -> List[LoadedFile]:
    """Recursively load all supported files from a directory.

    Args:
        dir_path: Path to the directory.

    Returns:
        List of LoadedFile objects.
    """
    dir_path = Path(dir_path).resolve()

    if not dir_path.exists() or not dir_path.is_dir():
        raise FileNotFoundError(f"Directory not found: {dir_path}")

    files: List[LoadedFile] = []
    for root, _, filenames in os.walk(dir_path):
        for fname in sorted(filenames):
            fpath = Path(root) / fname
            ext = fpath.suffix.lower()
            if ext in SUPPORTED_EXTENSIONS:
                try:
                    files.append(load_file(str(fpath)))
                except Exception as e:
                    log.warning(f"Skipping {fpath.name}: {e}")

    log.info(f"Loaded [bold]{len(files)}[/] files from {dir_path}")
    return files


def load(input_path: str) -> List[LoadedFile]:
    """Smart loader — handles both single files and directories.

    Args:
        input_path: Path to a file or directory.

    Returns:
        List of LoadedFile objects.
    """
    p = Path(input_path).resolve()
    if p.is_file():
        return [load_file(str(p))]
    elif p.is_dir():
        return load_directory(str(p))
    else:
        raise FileNotFoundError(f"Path not found: {p}")
