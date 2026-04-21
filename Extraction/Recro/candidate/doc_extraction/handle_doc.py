import os
import base64
import asyncio
import tempfile
import json
from groq import AsyncGroq
from pdf2image import convert_from_path # Needs poppler-utils
from pypdf import PdfReader           # For textual PDFs
from utils.logger import get_logger

log = get_logger(__name__)

class DocumentOCR:
    def __init__(self, api_key: str, vision_model: str = "llama-3.2-11b-vision-preview"):
        self.api_key = api_key
        self.client = AsyncGroq(api_key=api_key)
        self.vision_model = vision_model

    async def extract_text_from_image(self, image_path: str) -> str:
        """OCR for a single image file."""
        try:
            with open(image_path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')
            
            response = await self.client.chat.completions.create(
                model=self.vision_model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract all text from this image as accurately as possible. Preserve the layout if possible."},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_data}"}}
                    ]
                }]
            )
            return response.choices[0].message.content
        except Exception as e:
            log.error(f"Error extracting text from image {image_path}: {e}")
            return f"[Error extracting text from image: {str(e)}]"

    async def extract_from_pdf(self, pdf_path: str) -> str:
        """Extracts text from PDF. If scanned, uses Vision OCR on every page."""
        # 1. Try standard text extraction first
        try:
            reader = PdfReader(pdf_path)
            text = "".join([p.extract_text() for p in reader.pages if p.extract_text()])
            
            if len(text.strip()) > 100:
                log.info(f"Textual PDF detected for {os.path.basename(pdf_path)}. Using direct extraction.")
                return text 
        except Exception as e:
            log.warning(f"Direct PDF text extraction failed for {pdf_path}: {e}")

        # 2. Fallback to Vision OCR for scanned files
        log.info(f"Scanned PDF or insufficient text detected for {os.path.basename(pdf_path)}. Running Vision OCR...")
        
        try:
            # Use a temporary directory for image pages
            with tempfile.TemporaryDirectory() as tmp_dir:
                images = convert_from_path(pdf_path)
                tasks = []
                
                for i, img in enumerate(images):
                    tmp_name = os.path.join(tmp_dir, f"page_{i}.png")
                    img.save(tmp_name, 'PNG')
                    tasks.append(self.extract_text_from_image(tmp_name))
                
                # Process in parallel
                results = await asyncio.gather(*tasks)
                return "\n\n--- Page Break ---\n\n".join(results)
        except Exception as e:
            log.error(f"OCR Extraction failed for PDF {pdf_path}: {e}")
            return f"[OCR Extraction failed: {str(e)}]"

    async def parse_to_json(self, raw_text: str) -> dict:
        """Converts raw OCR text into structured JSON using a standard LLM.
        Auto-detects document type and extracts relevant information.
        """
        prompt = (
            "You are an expert data extractor. Given the OCR text below, accurately identify what kind of document it is. "
            "Be very specific (e.g., 'Aadhar Card', 'PAN Card', 'Voter ID', '10th Marksheet', '12th Marksheet', 'Diploma Marksheet', 'Graduation Marksheet', 'Degree Certificate', 'Resume'). \n\n"
            "If it's an Aadhar Card, look for 'Unique Identification Authority of India' and a 12-digit number.\n"
            "If it's a PAN Card, look for 'Income Tax Department' and a 10-character alphanumeric ID (e.g. ABCDE1234F).\n"
            "If it's a Marksheet, IDENTIFY THE LEVEL: \n"
            "   - '10th Marksheet' if it mentions Secondary School/Class X.\n"
            "   - '12th Marksheet' if it mentions Higher Secondary/Class XII.\n"
            "   - 'Diploma Marksheet' if it mentions Diploma.\n"
            "   - 'Graduation Marksheet' if it mentions Bachelor's Degree/Semester.\n"
            "Extract all key information into a valid JSON object. \n"
            "Return valid JSON only, with two top-level keys: 'document_type' and 'extracted_data'."
        )

        try:
            response = await self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": f"{prompt}\n\nText:\n{raw_text}"}],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            log.error(f"Error parsing text to JSON: {e}")
            return {"document_type": "unknown", "extracted_data": {}, "error": str(e)}
