"""
Text Extractor — extracts raw text from PDF, DOCX, CSV files.
"""
import io
from typing import List, Dict, Any

from utils.logger import get_logger

log = get_logger(__name__)


def extract_text(profile) -> Dict[str, Any]:
    """Extract text content from a document.

    Args:
        profile: ContentProfile from file_type_detector.

    Returns:
        Dict with keys:
            - "pages": List of {"page_num": int, "text": str}
            - "full_text": str (concatenated)
    """
    file_type = profile.file_type

    if file_type == "pdf":
        pages = _extract_text_from_pdf(profile.raw_bytes)
    elif file_type == "docx":
        pages = _extract_text_from_docx(profile.raw_bytes)
    elif file_type in ("csv", "xlsx", "xls"):
        pages = _extract_text_from_spreadsheet(profile.raw_bytes, file_type)
    else:
        log.warning(f"Text extraction not supported for: {file_type}")
        return {"pages": [], "full_text": ""}

    full_text = "\n\n".join(p["text"] for p in pages if p["text"])
    log.info(f"Extracted [bold]{len(full_text):,}[/] chars of text from {len(pages)} page(s)")

    return {"pages": pages, "full_text": full_text}


def _extract_text_from_pdf(raw_bytes: bytes) -> List[Dict[str, Any]]:
    """Extract text page-by-page from a PDF."""
    import fitz

    doc = fitz.open(stream=raw_bytes, filetype="pdf")
    pages = []

    for page_idx, page in enumerate(doc):
        text = page.get_text("text").strip()
        pages.append({"page_num": page_idx + 1, "text": text})

    doc.close()
    return pages


def _extract_text_from_docx(raw_bytes: bytes) -> List[Dict[str, Any]]:
    """Extract text from a DOCX document."""
    from docx import Document

    doc = Document(io.BytesIO(raw_bytes))
    paragraphs = []

    for para in doc.paragraphs:
        if para.text.strip():
            paragraphs.append(para.text.strip())

    full_text = "\n".join(paragraphs)
    return [{"page_num": 1, "text": full_text}]


def _extract_text_from_spreadsheet(raw_bytes: bytes, file_type: str) -> List[Dict[str, Any]]:
    """Extract text representation from spreadsheet files."""
    import pandas as pd

    try:
        if file_type == "csv":
            df = pd.read_csv(io.BytesIO(raw_bytes))
            text = df.to_string(index=False)
            return [{"page_num": 1, "text": text}]
        else:
            # Excel with multiple sheets
            xls = pd.ExcelFile(io.BytesIO(raw_bytes))
            pages = []
            for idx, sheet_name in enumerate(xls.sheet_names):
                df = pd.read_excel(xls, sheet_name=sheet_name)
                text = f"Sheet: {sheet_name}\n{df.to_string(index=False)}"
                pages.append({"page_num": idx + 1, "text": text})
            return pages
    except Exception as e:
        log.error(f"Spreadsheet text extraction error: {e}")
        return [{"page_num": 1, "text": ""}]
