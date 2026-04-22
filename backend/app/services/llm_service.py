"""
LLM Service - Groq integration for document extraction and audio transcription.
Used as a tool by LangGraph extraction node.
"""
import json
import base64
import os
import asyncio
import tempfile
from typing import Dict, Any
from groq import AsyncGroq
from tenacity import retry, wait_exponential, stop_after_attempt

from app.core.config import config


class LLMService:
    """Handles LLM operations: extraction from documents, audio transcription."""
    
    def __init__(self):
        if not config.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not set in .env")
        self.client = AsyncGroq(api_key=config.GROQ_API_KEY)
        self.model = config.LLM_MODEL
        self.whisper_model = config.WHISPER_MODEL
    
    @retry(wait=wait_exponential(multiplier=1, min=2, max=30), stop=stop_after_attempt(5))
    async def _call_llm(self, system_prompt: str, user_prompt: str) -> Dict[str, str]:
        """Call LLM and return structured JSON response."""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=4096,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content or "{}"
            result_dict = json.loads(content)
            
            # Normalize keys to lower snake_case
            normalized = {}
            for k, v in result_dict.items():
                clean_key = k.strip().lower().replace(' ', '_').replace("'", "").replace("-", "_")
                val_str = str(v).strip()
                if clean_key and val_str and val_str.lower() not in ['not found', 'n/a', 'none', 'not', 'unknown', 'null']:
                    normalized[clean_key] = val_str
            return normalized
        except Exception as e:
            print(f"LLM Error: {e}")
            return {}

    @retry(wait=wait_exponential(multiplier=1, min=2, max=30), stop=stop_after_attempt(5))
    async def extract_from_image_vision_async(self, file_path: str) -> str:
        """Extract text from image using Groq Vision API concurrently."""
        try:
            with open(file_path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')
            
            ext = os.path.splitext(file_path)[1].lower()
            mime_map = {
                '.png': 'image/png', '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg', '.gif': 'image/gif',
                '.webp': 'image/webp',
            }
            mime_type = mime_map.get(ext, 'image/png')
            
            response = await self.client.chat.completions.create(
                model=config.VISION_MODEL,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract ALL text from this document image. This appears to be an Indian ID document (Aadhar/PAN card) or educational certificate. Extract and output ALL visible text line by line. Be thorough."
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
            return response.choices[0].message.content or ""
        except Exception as e:
            print(f"Vision OCR error: {e}")
            return ""

    @retry(wait=wait_exponential(multiplier=1, min=2, max=30), stop=stop_after_attempt(3))
    async def verify_signature_vision_async(self, file_path: str) -> str:
        """Verify if a document contains a handwritten or digital signature using Vision API."""
        try:
            with open(file_path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')
            
            ext = os.path.splitext(file_path)[1].lower()
            mime_map = {
                '.png': 'image/png', '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg', '.gif': 'image/gif',
                '.webp': 'image/webp',
            }
            mime_type = mime_map.get(ext, 'image/png')
            
            response = await self.client.chat.completions.create(
                model=config.VISION_MODEL,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Analyze this document image. Focus heavily on the bottom left and bottom right corners, or any designated signature blocks. Your goal is to determine if ANY valid signature is present. Look for: 1) Handwritten physical signatures (ink marks, cursive scribbles), 2) Digital signatures (stamps like 'Digitally Signed by', DocuSign banners), 3) Typed e-signatures (like /s/ John Doe). Output ONLY a JSON object exactly like: {\"signature_detected\": \"Yes\" or \"No\", \"signature_details\": \"Explanation of what was found or missing\"}."
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime_type};base64,{image_data}"}
                        }
                    ]
                }],
                temperature=0.1,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            return response.choices[0].message.content or "{\"signature_detected\": \"No\", \"signature_details\": \"Failed to analyze\"}"
        except Exception as e:
            print(f"Signature Verification Vision error: {e}")
            return "{\"signature_detected\": \"No\", \"signature_details\": \"Error occurred during analysis\"}"

    async def _transcribe_audio_chunk(self, chunk, ext, idx):
        tmp_path = ""
        try:
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                chunk.export(tmp.name, format="mp3")
                tmp_path = tmp.name
                
            with open(tmp_path, "rb") as f:
                res = await self.client.audio.transcriptions.create(
                    model=self.whisper_model,
                    file=f,
                    response_format="text"
                )
            os.unlink(tmp_path)
            return res
        except Exception as e:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
            print(f"Chunk {idx} failed: {e}")
            return ""

    async def transcribe_audio(self, audio_path: str) -> str:
        """Transcribe audio file using Whisper with large file chunking logic."""
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_file(audio_path)
            chunk_length_ms = 5 * 60 * 1000 # 5 minutes chunking
            
            if len(audio) <= chunk_length_ms:
                # Direct transcribe
                with open(audio_path, "rb") as audio_file:
                    return await self.client.audio.transcriptions.create(
                        model=self.whisper_model,
                        file=audio_file,
                        response_format="text"
                    )
            
            chunks = []
            for i in range(0, len(audio), chunk_length_ms):
                chunks.append(audio[i:i+chunk_length_ms])
                
            tasks = [self._transcribe_audio_chunk(chunk, ".mp3", idx) for idx, chunk in enumerate(chunks)]
            raw_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            valid_results = []
            for i, r in enumerate(raw_results):
                if isinstance(r, Exception):
                    print(f"  [ERROR] Audio chunk {i} failed: {r}")
                elif r:
                    valid_results.append(str(r))
                    
            return " ".join(valid_results)
            
        except Exception as e:
            print(f"Audio chunking bypassed (missing ffmpeg?): {e}")
            try:
                # Fallback to direct
                with open(audio_path, "rb") as audio_file:
                    return await self.client.audio.transcriptions.create(
                        model=self.whisper_model,
                        file=audio_file,
                        response_format="text"
                    )
            except Exception as e2:
                return f"Transcription error: {str(e2)}"
    
    async def extract_from_resume(self, text: str) -> Dict[str, str]:
        prompt = """Extract personal, educational and professional information from this resume. Output MUST be a valid JSON object. Extract keys: "full_name", "email", "phone", "current_location", "current_company", "current_role", "current_ctc", "total_experience", "graduation_degree", "graduation_college", "graduation_year", "12th_school", "12th_year", "12th_percentage", "10th_school", "10th_year", "10th_percentage", "skills". Write "Not found" for values if field is not available."""
        return await self._call_llm(prompt, f"Resume:\n{text}")
    
    async def extract_from_hr_transcript(self, text: str) -> Dict[str, str]:
        prompt = """Extract key candidate information from this HR interview transcript. Output MUST be a valid JSON object. Extract keys: "candidate_name", "full_name", "current_location", "current_address", "current_ctc", "expected_ctc", "notice_period", "current_company", "current_role", "father_name", "date_of_birth", "reason_for_change". Write "Not found" for values if not mentioned."""
        return await self._call_llm(prompt, f"HR Transcript:\n{text}")
    
    async def extract_from_aadhar(self, text: str) -> Dict[str, str]:
        prompt = """Extract information from this Aadhar card text. Output MUST be a valid JSON object. Extract keys: "full_name", "date_of_birth", "dob", "gender", "permanent_address", "aadhar_number". Note: Mask aadhar_number as XXXX-XXXX-1234. Write "Not found" for values if not available."""
        return await self._call_llm(prompt, f"Aadhar Card:\n{text}")
    
    async def extract_from_marksheet(self, text: str, grade: str = "10th") -> Dict[str, str]:
        prompt = f"""Extract information from this {grade} marksheet. Output MUST be a valid JSON object. Extract keys: "student_name", "full_name", "father_name", "date_of_birth", "dob", "school_name", "board", "year_of_passing", "percentage", "total_marks". Write "Not found" for values if not available."""
        return await self._call_llm(prompt, f"{grade} Marksheet:\n{text}")
    
    async def extract_from_pan(self, text: str) -> Dict[str, str]:
        prompt = """Extract information from this PAN card. Output MUST be a valid JSON object. Extract keys: "full_name", "father_name", "date_of_birth", "dob", "pan_number". Write "Not found" for values if not available."""
        return await self._call_llm(prompt, f"PAN Card:\n{text}")

    async def extract_from_i9(self, text: str) -> Dict[str, str]:
        prompt = """Extract verification details from this I-9 form text. The text will contain OCR data AND a signature verification result block. Output MUST be a valid JSON object. Extract keys: "full_name", "signature_detected", "signature_details". Use the "[SIGNATURE VERIFICATION RESULT]" block to populate signature fields. For full_name, look for the employee's name printed or handwritten on the form. If no signature block is found, write "No" for signature_detected."""
        return await self._call_llm(prompt, f"I-9 Form:\n{text}")

# Singleton
llm_service = LLMService()
