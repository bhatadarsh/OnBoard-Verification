"""
Chart Extractor — detects charts/graphs in documents and extracts
them as images for downstream chart-to-table conversion.
"""
import io
from dataclasses import dataclass, field
from typing import List, Dict, Any

from utils.logger import get_logger

log = get_logger(__name__)


@dataclass
class ExtractedChart:
    """Represents a single extracted chart."""
    chart_id: str
    source_page: int
    image_bytes: bytes = field(repr=False)
    mime_type: str = "image/png"
    chart_type: str = "unknown"  # bar, line, pie, etc.
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chart_id": self.chart_id,
            "source_page": self.source_page,
            "chart_type": self.chart_type,
            "description": self.description,
        }


def extract_charts(profile) -> List[ExtractedChart]:
    """Extract chart images from a document.

    Charts are detected as large images on pages with minimal text.
    Each is rendered as an image for chart-to-table conversion.

    Args:
        profile: ContentProfile from file_type_detector.

    Returns:
        List of ExtractedChart objects.
    """
    file_type = profile.file_type

    if file_type == "pdf":
        charts = _extract_charts_from_pdf(profile.raw_bytes)
    elif file_type in ("xlsx", "xls"):
        charts = _extract_charts_from_excel(profile.raw_bytes)
    elif file_type in ("png", "jpg", "jpeg", "webp", "bmp", "tiff"):
        charts = _extract_chart_from_image(profile)
    else:
        log.info(f"Chart extraction not applicable for: {file_type}")
        return []

    log.info(f"Extracted [bold]{len(charts)}[/] chart(s)")
    return charts


def _extract_chart_from_image(profile) -> List[ExtractedChart]:
    """Treat a standalone image file as a chart.

    When file_type_detector flags an image as has_charts=True
    (e.g., filename contains 'chart', 'graph'), we wrap the raw
    image bytes as an ExtractedChart for chart-to-table conversion.
    """
    from pathlib import Path

    filename = Path(profile.file_path).stem
    ext = profile.file_type

    # Guess chart type from filename
    name_lower = filename.lower()
    chart_type = "unknown"
    for ct in ["bar", "line", "pie", "histogram", "scatter", "area"]:
        if ct in name_lower:
            chart_type = ct
            break

    chart = ExtractedChart(
        chart_id=f"img_chart_{filename}",
        source_page=1,
        image_bytes=profile.raw_bytes,
        mime_type=f"image/{ext}",
        chart_type=chart_type,
        description=f"Chart image: {filename}.{ext}",
    )

    log.info(f"Standalone chart image detected: [bold]{filename}.{ext}[/] (type={chart_type})")
    return [chart]


def _extract_charts_from_pdf(raw_bytes: bytes) -> List[ExtractedChart]:
    """Extract chart-like images from PDF pages.

    Uses Gemini Vision to classify large images as charts,
    regardless of how much text is on the page.
    """
    import fitz

    charts = []
    doc = fitz.open(stream=raw_bytes, filetype="pdf")

    for page_idx, page in enumerate(doc):
        image_list = page.get_images(full=True)

        for img_idx, img_info in enumerate(image_list):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                width = base_image.get("width", 0)
                height = base_image.get("height", 0)

                # Only consider large images
                if width < 200 or height < 200:
                    continue

                # Use Gemini to classify the image
                from ingestion.file_type_detector import _classify_image_with_gemini
                ext = base_image.get("ext", "png")
                img_class = _classify_image_with_gemini(
                    base_image["image"], f"image/{ext}"
                )

                if img_class in ("chart", "table"):
                    log.info(
                        f"  PDF p{page_idx+1} img_{img_idx+1} "
                        f"({width}x{height}) → Gemini: [bold]{img_class}[/]"
                    )
                    charts.append(ExtractedChart(
                        chart_id=f"pdf_chart_p{page_idx + 1}_{img_idx + 1}",
                        source_page=page_idx + 1,
                        image_bytes=base_image["image"],
                        mime_type=f"image/{ext}",
                        chart_type=img_class,
                    ))

            except Exception as e:
                log.warning(f"Chart extraction error for xref {xref}: {e}")

    doc.close()
    return charts


def _extract_charts_from_excel(raw_bytes: bytes) -> List[ExtractedChart]:
    """Extract charts from XLSX files.

    openpyxl can detect chart objects; we render the sheet as an image.
    """
    charts = []
    try:
        import openpyxl

        wb = openpyxl.load_workbook(io.BytesIO(raw_bytes), data_only=True)

        for sheet_idx, sheet in enumerate(wb.worksheets):
            if hasattr(sheet, '_charts') and sheet._charts:
                for chart_idx, chart in enumerate(sheet._charts):
                    # openpyxl gives us chart metadata but not rendered images
                    # We store metadata and let chart2table handle conversion
                    chart_type = type(chart).__name__.lower().replace("chart", "")

                    charts.append(ExtractedChart(
                        chart_id=f"xlsx_chart_s{sheet_idx + 1}_{chart_idx + 1}",
                        source_page=sheet_idx + 1,
                        image_bytes=b"",  # Will be handled by chart2table via LLM
                        chart_type=chart_type,
                        description=f"Chart from sheet '{sheet.title}', type: {chart_type}",
                    ))

        wb.close()
    except Exception as e:
        log.error(f"Excel chart extraction error: {e}")

    return charts
