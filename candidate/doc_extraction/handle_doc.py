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
    def __init__(self, api_key: str, vision_model: str = None):
        from config.settings import settings
        self.api_key = api_key
        self.client = AsyncGroq(api_key=api_key)
        # Use provided model, or settings, or fallback to Llama 4 Scout (multimodal)
        self.vision_model = vision_model or os.getenv("VISION_MODEL") or "meta-llama/llama-4-scout-17b-16e-instruct"
        log.info(f"DocumentOCR initialized with model: {self.vision_model}")

    async def extract_text_from_image(self, image_path: str) -> str:
        """OCR for a single image file."""
        try:
            ext = os.path.splitext(image_path)[1].lower()
            mime_type = "image/png"
            if ext in [".jpg", ".jpeg"]: mime_type = "image/jpeg"
            elif ext == ".webp": mime_type = "image/webp"
            
            with open(image_path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')
            
            response = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model=self.vision_model,
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract all text from this image as accurately as possible. Preserve the layout if possible."},
                            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image_data}"}}
                        ]
                    }]
                ),
                timeout=120
            )
            return response.choices[0].message.content
        except asyncio.TimeoutError:
            log.error(f"Timeout extracting text from image {image_path}")
            return f"[Error: Vision OCR timed out for {os.path.basename(image_path)}]"
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
            "You are an expert data extractor specializing in recruitment and compliance documents. "
            "Given the OCR text below, accurately identify the document type and extract ALL relevant information. \n\n"
            "DOC TYPES TO IDENTIFY: \n"
            "- 'Aadhar Card': Look for 'UIDAI', 12-digit numbers, and address.\n"
            "- 'PAN Card': Look for 'Income Tax Dept' and 10-character alphanumeric ID.\n"
            "- 'Resume': Look for experience, education, skills, and contact info.\n"
            "- 'Marksheet': Identify level (10th, 12th, Graduation) and extract school/college, year, and percentage/CGPA.\n"
            "- 'Passbook/Cheque': Extract account number, IFSC code, and bank name.\n\n"
            "SPECIFIC FIELDS TO CAPTURE IF PRESENT: \n"
            "- Full Name, DOB, Gender, Phone, Email.\n"
            "- Aadhar Number, PAN Number, Bank Account No, IFSC.\n"
            "- Graduation Degree, College/University, Year of Passing, CGPA/Percentage.\n"
            "- Current Company, Current Role, Current CTC, Total Experience (in years).\n\n"
            "RULES: \n"
            "1. If a field is not found, do NOT include it in the JSON.\n"
            "2. Extract values exactly as they appear in the text.\n"
            "3. Return valid JSON only, with two top-level keys: 'document_type' and 'extracted_data'."
        )

        try:
            response = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": f"{prompt}\n\nText:\n{raw_text}"}],
                    response_format={"type": "json_object"}
                ),
                timeout=60
            )
            return json.loads(response.choices[0].message.content)
        except asyncio.TimeoutError:
            log.error("Timeout parsing text to JSON")
            return {"document_type": "unknown", "extracted_data": {}, "error": "LLM parse timed out"}
        except Exception as e:
            log.error(f"Error parsing text to JSON: {e}")
            return {"document_type": "unknown", "extracted_data": {}, "error": str(e)}
