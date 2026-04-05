"""
Structure Extractor — generates page-level structural metadata.

Analyzes each page of a document and produces a structural summary
describing the layout, content types, and spatial relationships.
"""
from typing import List, Dict, Any

from utils.logger import get_logger

log = get_logger(__name__)


def extract_page_structures(profile, extraction_results: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate page-level structural metadata for a document.

    Args:
        profile: ContentProfile from file_type_detector.
        extraction_results: Dict containing results from all extractors.

    Returns:
        List of page structure dicts, one per page.
    """
    structures = []

    for page_num in range(1, profile.page_count + 1):
        page_struct = {
            "page_num": page_num,
            "content_types": [],
            "elements": [],
        }

        # Check for text on this page
        text_result = extraction_results.get("text", {})
        pages = text_result.get("pages", [])
        for p in pages:
            if p.get("page_num") == page_num and p.get("text"):
                text_len = len(p["text"])
                page_struct["content_types"].append("text")
                page_struct["elements"].append({
                    "type": "text",
                    "char_count": text_len,
                    "preview": p["text"][:200],
                })

        # Check for tables on this page
        tables = extraction_results.get("tables", [])
        for table in tables:
            if hasattr(table, 'source_page') and table.source_page == page_num:
                page_struct["content_types"].append("table")
                page_struct["elements"].append({
                    "type": "table",
                    "table_id": table.table_id,
                    "rows": table.row_count,
                    "cols": table.col_count,
                    "headers": table.headers,
                })

        # Check for images on this page
        images = extraction_results.get("images", [])
        for img in images:
            if hasattr(img, 'source_page') and img.source_page == page_num:
                page_struct["content_types"].append("image")
                page_struct["elements"].append({
                    "type": "image",
                    "image_id": img.image_id,
                    "has_summary": bool(img.summary),
                })

        # Check for charts on this page
        charts = extraction_results.get("charts", [])
        for chart in charts:
            if hasattr(chart, 'source_page') and chart.source_page == page_num:
                page_struct["content_types"].append("chart")
                page_struct["elements"].append({
                    "type": "chart",
                    "chart_id": chart.chart_id,
                    "chart_type": chart.chart_type,
                })

        # Deduplicate content types
        page_struct["content_types"] = list(set(page_struct["content_types"]))
        page_struct["element_count"] = len(page_struct["elements"])

        structures.append(page_struct)

    log.info(f"Extracted page structures for [bold]{len(structures)}[/] page(s)")
    return structures
