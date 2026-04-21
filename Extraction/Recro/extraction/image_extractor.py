"""
Image Extractor — extracts images from documents and generates
text summaries using Gemini Vision for downstream embedding.
"""
import io
import base64
from dataclasses import dataclass, field
from typing import List, Dict, Any

from config.settings import settings
from utils.logger import get_logger

log = get_logger(__name__)


@dataclass
class ExtractedImage:
    """Represents a single extracted image."""
    image_id: str
    source_page: int
    image_bytes: bytes = field(repr=False)
    mime_type: str = "image/png"
    width: int = 0
    height: int = 0
    summary: str = ""  # Gemini-generated text summary

    def to_dict(self) -> Dict[str, Any]:
        return {
            "image_id": self.image_id,
            "source_page": self.source_page,
            "mime_type": self.mime_type,
            "width": self.width,
            "height": self.height,
            "summary": self.summary,
        }


def extract_images(profile) -> List[ExtractedImage]:
    """Extract images from a document and generate LLM summaries.

    Args:
        profile: ContentProfile from file_type_detector.

    Returns:
        List of ExtractedImage objects with Gemini-generated summaries.
    """
    file_type = profile.file_type

    if file_type == "pdf":
        images = _extract_images_from_pdf(profile.raw_bytes)
    elif file_type == "docx":
        images = _extract_images_from_docx(profile.raw_bytes)
    elif file_type in ("png", "jpg", "jpeg", "bmp", "tiff", "gif", "webp"):
        images = _handle_standalone_image(profile)
    else:
        log.warning(f"Image extraction not supported for: {file_type}")
        return []

    # Generate summaries using Gemini Vision
    for img in images:
        img.summary = _generate_image_summary(img)

    log.info(f"Extracted [bold]{len(images)}[/] image(s) with summaries")
    return images


def _extract_images_from_pdf(raw_bytes: bytes) -> List[ExtractedImage]:
    """Extract embedded images from a PDF."""
    import fitz

    images = []
    doc = fitz.open(stream=raw_bytes, filetype="pdf")

    for page_idx, page in enumerate(doc):
        image_list = page.get_images(full=True)
        for img_idx, img_info in enumerate(image_list):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                mime_type = f"image/{base_image['ext']}"

                images.append(ExtractedImage(
                    image_id=f"pdf_img_p{page_idx + 1}_{img_idx + 1}",
                    source_page=page_idx + 1,
                    image_bytes=image_bytes,
                    mime_type=mime_type,
                    width=base_image.get("width", 0),
                    height=base_image.get("height", 0),
                ))
            except Exception as e:
                log.warning(f"Failed to extract image {xref} from page {page_idx + 1}: {e}")

    doc.close()
    return images


def _extract_images_from_docx(raw_bytes: bytes) -> List[ExtractedImage]:
    """Extract embedded images from a DOCX."""
    from docx import Document

    images = []
    doc = Document(io.BytesIO(raw_bytes))

    for idx, rel in enumerate(doc.part.rels.values()):
        if "image" in rel.reltype:
            try:
                image_part = rel.target_part
                image_bytes = image_part.blob
                content_type = image_part.content_type

                images.append(ExtractedImage(
                    image_id=f"docx_img_{idx + 1}",
                    source_page=1,
                    image_bytes=image_bytes,
                    mime_type=content_type,
                ))
            except Exception as e:
                log.warning(f"Failed to extract DOCX image: {e}")

    return images


def _handle_standalone_image(profile) -> List[ExtractedImage]:
    """Handle standalone image files."""
    from pathlib import Path

    ext = profile.file_type
    filename_stem = Path(profile.file_path).stem  # e.g. "goldchart", "grammer"
    mime_map = {
        "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "bmp": "image/bmp", "tiff": "image/tiff", "gif": "image/gif",
        "webp": "image/webp",
    }
    return [ExtractedImage(
        image_id=f"{filename_stem}_img_1",
        source_page=1,
        image_bytes=profile.raw_bytes,
        mime_type=mime_map.get(ext, "image/png"),
    )]


def _generate_image_summary(image: ExtractedImage) -> str:
    """Generate a text summary of an image using Gemini Vision.

    Args:
        image: ExtractedImage with raw bytes.

    Returns:
        Text summary of the image content.
    """
    if not settings.gemini_api_key:
        log.warning("GEMINI_API_KEY not set. Skipping image summary generation.")
        return "[Image summary unavailable - no API key]"

    try:
        from google import genai
        from utils.gemini_helper import call_gemini

        client = genai.Client(api_key=settings.gemini_api_key)

        b64_data = base64.b64encode(image.image_bytes).decode("utf-8")

        response = call_gemini(
            client=client,
            model=settings.gemini_model,
            contents=[
                {
                    "role": "user",
                    "parts": [
                        {"text": (
                            "Provide a detailed text summary of this image. "
                            "Include all visible text, data, labels, and visual elements. "
                            "If it contains a chart or graph, describe the data trends. "
                            "If it contains a table, describe its structure and key data. "
                            "Be thorough and factual."
                        )},
                        {
                            "inline_data": {
                                "mime_type": image.mime_type,
                                "data": b64_data,
                            }
                        },
                    ],
                }
            ],
        )

        summary = response.text.strip()
        log.info(f"Generated summary for {image.image_id}: {len(summary)} chars")
        return summary

    except Exception as e:
        log.error(f"Gemini image summary error for {image.image_id}: {e}")
        return f"[Image summary error: {str(e)}]"
