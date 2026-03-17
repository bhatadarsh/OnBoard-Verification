"""
Ingestion Tools - Document text extraction utilities used by the ingestion node.
Handles OCR (via Groq Vision), PDF, DOCX, and plain text extraction.
"""
import os
import base64
from typing import Optional

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

try:
    from docx import Document as DocxDocument
except ImportError:
    DocxDocument = None

from app.core.config import config


def extract_text_from_file(file_path: str) -> str:
    """Extract text from any supported document format.
    
    Supports: images (OCR via Groq Vision), PDF, DOCX, plain text.
    """
    if not os.path.exists(file_path):
        return ""
    
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.gif', '.webp']:
        return _extract_from_image_vision(file_path)
    elif ext == '.pdf':
        return _extract_from_pdf(file_path)
    elif ext == '.docx':
        return _extract_from_docx(file_path)
    elif ext in ['.txt', '.text', '.md']:
        return _extract_from_text(file_path)
    elif ext in ['.mp3', '.wav', '.m4a', '.ogg', '.flac']:
        return f"[AUDIO_FILE:{file_path}]"
    else:
        return _extract_from_text(file_path)


def is_audio_file(file_path: str) -> bool:
    """Check if file is audio."""
    ext = os.path.splitext(file_path)[1].lower()
    return ext in ['.mp3', '.wav', '.m4a', '.ogg', '.flac']


def _extract_from_text(file_path: str) -> str:
    """Read plain text file."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except Exception as e:
        return f"Error reading text: {e}"


def _extract_from_pdf(file_path: str) -> str:
    """Extract text from PDF. Falls back to Vision OCR for scanned PDFs."""
    if PdfReader is None:
        return "[PDF extraction not available - install PyPDF2]"
    
    try:
        reader = PdfReader(file_path)
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        
        result = "\n".join(text_parts)
        
        if len(result.strip()) < 50:
            return _extract_from_scanned_pdf(file_path)
        
        return result
    except Exception as e:
        return f"Error reading PDF: {e}"


def _extract_from_scanned_pdf(file_path: str) -> str:
    """Extract text from scanned PDF using Vision API."""
    try:
        from pdf2image import convert_from_path
        import tempfile
        
        images = convert_from_path(file_path, first_page=1, last_page=1)
        if not images:
            return "[Could not convert PDF to image]"
        
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            images[0].save(tmp.name, 'PNG')
            text = _extract_from_image_vision(tmp.name)
            os.unlink(tmp.name)
            return text
    except Exception as e:
        return f"Error OCR on scanned PDF: {e}"


def _extract_from_docx(file_path: str) -> str:
    """Extract text from DOCX file including tables."""
    if DocxDocument is None:
        return "[DOCX extraction not available - install python-docx]"
    
    try:
        doc = DocxDocument(file_path)
        text_parts = []
        for para in doc.paragraphs:
            if para.text:
                text_parts.append(para.text)
        for table in doc.tables:
            for row in table.rows:
                row_text = [cell.text for cell in row.cells if cell.text]
                if row_text:
                    text_parts.append(" | ".join(row_text))
        return "\n".join(text_parts)
    except Exception as e:
        return f"Error reading DOCX: {e}"


def _extract_from_image_vision(file_path: str) -> str:
    """Extract text from image using Groq Vision API (no tesseract needed)."""
    try:
        from groq import Groq
        
        with open(file_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
        
        ext = os.path.splitext(file_path)[1].lower()
        mime_map = {
            '.png': 'image/png', '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg', '.gif': 'image/gif',
            '.webp': 'image/webp',
        }
        mime_type = mime_map.get(ext, 'image/png')
        
        client = Groq(api_key=config.GROQ_API_KEY)
        response = client.chat.completions.create(
            model=config.VISION_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": """Extract ALL text from this document image. This appears to be an Indian ID document (Aadhar/PAN card) or educational certificate.

Extract and output ALL visible text including:
- Names (in English and any other language)
- Numbers (Aadhar number, PAN number, dates, phone numbers)
- Addresses
- Dates of birth
- Any other text visible

Output the extracted text line by line. Be thorough."""
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{image_data}"}
                    }
                ]
            }],
            temperature=0.1,
            max_tokens=2000
        )
        
        extracted = response.choices[0].message.content
        print(f"  Vision OCR extracted {len(extracted)} characters from {file_path}")
        return extracted
        
    except Exception as e:
        print(f"Vision OCR error: {e}")
        return f"[Vision OCR error: {str(e)}]"
