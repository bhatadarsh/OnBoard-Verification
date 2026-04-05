"""
Table Extractor — detects and extracts tables from PDFs, DOCX, and spreadsheets.

Uses camelot for PDF table detection (lattice + stream),
python-docx for DOCX tables, and pandas for spreadsheets.
"""
import io
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

import pandas as pd

from utils.logger import get_logger

log = get_logger(__name__)


@dataclass
class ExtractedTable:
    """Represents a single extracted table."""
    table_id: str
    source_page: int
    dataframe: pd.DataFrame
    row_count: int
    col_count: int
    headers: List[str]
    raw_text: str  # Stringified version for embedding

    def to_dict(self) -> Dict[str, Any]:
        return {
            "table_id": self.table_id,
            "source_page": self.source_page,
            "row_count": self.row_count,
            "col_count": self.col_count,
            "headers": self.headers,
            "data": self.dataframe.to_dict(orient="records"),
            "raw_text": self.raw_text,
        }


def extract_tables(profile) -> List[ExtractedTable]:
    """Extract all tables from a document.

    Args:
        profile: ContentProfile from file_type_detector.

    Returns:
        List of ExtractedTable objects.
    """
    file_type = profile.file_type

    if file_type == "pdf":
        tables = _extract_tables_from_pdf(profile)
    elif file_type == "docx":
        tables = _extract_tables_from_docx(profile.raw_bytes)
    elif file_type in ("csv", "xlsx", "xls"):
        tables = _extract_tables_from_spreadsheet(profile.raw_bytes, file_type)
    else:
        log.warning(f"Table extraction not supported for: {file_type}")
        return []

    log.info(f"Extracted [bold]{len(tables)}[/] table(s)")
    return tables


def _extract_tables_from_pdf(profile) -> List[ExtractedTable]:
    """Extract tables from PDF using camelot, with pymupdf fallback."""
    tables = []
    try:
        import camelot
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(profile.raw_bytes)
            tmp_path = tmp.name

        try:
            # Try lattice first (for bordered tables)
            camelot_tables = camelot.read_pdf(tmp_path, pages="all", flavor="lattice")

            # If lattice finds nothing, try stream (for borderless tables)
            if len(camelot_tables) == 0:
                camelot_tables = camelot.read_pdf(tmp_path, pages="all", flavor="stream")

            for idx, ct in enumerate(camelot_tables):
                df = ct.df
                if len(df) > 1:
                    potential_header = df.iloc[0].tolist()
                    if all(isinstance(h, str) and len(h.strip()) > 0 for h in potential_header):
                        df.columns = potential_header
                        df = df.iloc[1:].reset_index(drop=True)

                headers = [str(c) for c in df.columns.tolist()]
                raw_text = df.to_string(index=False)

                tables.append(ExtractedTable(
                    table_id=f"pdf_table_{idx + 1}",
                    source_page=ct.page if hasattr(ct, 'page') else idx + 1,
                    dataframe=df,
                    row_count=len(df),
                    col_count=len(df.columns),
                    headers=headers,
                    raw_text=raw_text,
                ))
        finally:
            os.unlink(tmp_path)

    except ImportError:
        log.warning("camelot-py not installed. Using pymupdf fallback.")
    except Exception as e:
        log.warning(f"Camelot extraction error: {e}")

    # Always try pymupdf fallback if camelot found nothing
    if not tables:
        log.info("Camelot found 0 tables → trying pymupdf find_tables() fallback")
        fallback = _extract_tables_from_pdf_fallback(profile.raw_bytes)
        tables.extend(fallback)

    return tables


def _extract_tables_from_pdf_fallback(raw_bytes: bytes) -> List[ExtractedTable]:
    """Fallback: extract tables from PDF using pymupdf's built-in table finder."""
    tables = []
    try:
        import fitz

        doc = fitz.open(stream=raw_bytes, filetype="pdf")
        for page_idx, page in enumerate(doc):
            found_tables = page.find_tables()
            for t_idx, table in enumerate(found_tables):
                data = table.extract()
                if not data or len(data) < 2:
                    continue

                headers = [str(h) for h in data[0]]
                df = pd.DataFrame(data[1:], columns=headers)
                raw_text = df.to_string(index=False)

                tables.append(ExtractedTable(
                    table_id=f"pdf_table_p{page_idx + 1}_{t_idx + 1}",
                    source_page=page_idx + 1,
                    dataframe=df,
                    row_count=len(df),
                    col_count=len(df.columns),
                    headers=headers,
                    raw_text=raw_text,
                ))
        doc.close()
    except Exception as e:
        log.error(f"PDF fallback table extraction error: {e}")

    return tables


def _extract_tables_from_docx(raw_bytes: bytes) -> List[ExtractedTable]:
    """Extract tables from a DOCX document."""
    from docx import Document

    tables = []
    doc = Document(io.BytesIO(raw_bytes))

    for idx, table in enumerate(doc.tables):
        data = []
        for row in table.rows:
            data.append([cell.text.strip() for cell in row.cells])

        if not data or len(data) < 2:
            continue

        headers = data[0]
        df = pd.DataFrame(data[1:], columns=headers)
        raw_text = df.to_string(index=False)

        tables.append(ExtractedTable(
            table_id=f"docx_table_{idx + 1}",
            source_page=1,
            dataframe=df,
            row_count=len(df),
            col_count=len(df.columns),
            headers=headers,
            raw_text=raw_text,
        ))

    return tables


def _extract_tables_from_spreadsheet(raw_bytes: bytes, file_type: str) -> List[ExtractedTable]:
    """Extract tables from spreadsheet files."""
    tables = []
    try:
        if file_type == "csv":
            df = pd.read_csv(io.BytesIO(raw_bytes))
            tables.append(ExtractedTable(
                table_id="csv_table_1",
                source_page=1,
                dataframe=df,
                row_count=len(df),
                col_count=len(df.columns),
                headers=[str(c) for c in df.columns.tolist()],
                raw_text=df.to_string(index=False),
            ))
        else:
            xls = pd.ExcelFile(io.BytesIO(raw_bytes))
            for idx, sheet_name in enumerate(xls.sheet_names):
                df = pd.read_excel(xls, sheet_name=sheet_name)
                if df.empty:
                    continue
                tables.append(ExtractedTable(
                    table_id=f"xlsx_{sheet_name}",
                    source_page=idx + 1,
                    dataframe=df,
                    row_count=len(df),
                    col_count=len(df.columns),
                    headers=[str(c) for c in df.columns.tolist()],
                    raw_text=df.to_string(index=False),
                ))
    except Exception as e:
        log.error(f"Spreadsheet table extraction error: {e}")

    return tables
