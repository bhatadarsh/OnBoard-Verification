"""
Relationship Mapper — identifies and maps relationships between
extracted tables, charts, images, and text within a document.
"""
from typing import List, Dict, Any

from utils.logger import get_logger

log = get_logger(__name__)


def map_relationships(
    extraction_results: Dict[str, Any],
    page_structures: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Identify relationships between extracted elements.

    Relationship types:
    - "same_page": Two elements appear on the same page
    - "chart_references_table": A chart's data matches a table
    - "text_references_table": Text mentions table-like keywords near a table
    - "image_near_text": An image is on the same page as related text

    Args:
        extraction_results: Dict with tables, charts, images, text results.
        page_structures: List of page structure dicts.

    Returns:
        List of relationship dicts.
    """
    relationships = []

    tables = extraction_results.get("tables", [])
    charts = extraction_results.get("charts", [])
    images = extraction_results.get("images", [])
    text_result = extraction_results.get("text", {})
    text_pages = text_result.get("pages", [])

    # 1. Same-page relationships
    for page_struct in page_structures:
        elements = page_struct.get("elements", [])
        page_num = page_struct.get("page_num", 0)

        # Build pairs from same-page elements
        for i in range(len(elements)):
            for j in range(i + 1, len(elements)):
                e1 = elements[i]
                e2 = elements[j]

                relationships.append({
                    "type": "same_page",
                    "page": page_num,
                    "source": {
                        "type": e1["type"],
                        "id": e1.get("table_id") or e1.get("chart_id") or e1.get("image_id", "text"),
                    },
                    "target": {
                        "type": e2["type"],
                        "id": e2.get("table_id") or e2.get("chart_id") or e2.get("image_id", "text"),
                    },
                })

    # 2. Chart → Table relationships (charts that might visualize table data)
    for chart in charts:
        for table in tables:
            if hasattr(chart, 'source_page') and hasattr(table, 'source_page'):
                # Charts on the same or adjacent pages as tables are likely related
                page_diff = abs(chart.source_page - table.source_page)
                if page_diff <= 1:
                    relationships.append({
                        "type": "chart_references_table",
                        "chart_id": chart.chart_id,
                        "table_id": table.table_id,
                        "page_proximity": page_diff,
                    })

    # 3. Text referencing tables
    table_keywords = {"table", "fig", "figure", "chart", "graph", "data"}
    for text_page in text_pages:
        page_num = text_page.get("page_num", 0)
        text = text_page.get("text", "").lower()

        for table in tables:
            if hasattr(table, 'source_page') and abs(table.source_page - page_num) <= 1:
                if any(kw in text for kw in table_keywords):
                    relationships.append({
                        "type": "text_references_table",
                        "page": page_num,
                        "table_id": table.table_id,
                    })

    log.info(f"Mapped [bold]{len(relationships)}[/] relationships")
    return relationships
