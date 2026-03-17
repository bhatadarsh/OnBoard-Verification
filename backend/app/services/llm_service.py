"""
LLM Service - Groq integration for document extraction and audio transcription.
Used as a tool by LangGraph extraction node.
"""
import re
from typing import Dict, Any
from groq import Groq

from app.core.config import config


class LLMService:
    """Handles LLM operations: extraction from documents, audio transcription."""
    
    def __init__(self):
        if not config.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not set in .env")
        self.client = Groq(api_key=config.GROQ_API_KEY)
        self.model = config.LLM_MODEL
        self.whisper_model = config.WHISPER_MODEL
    
    def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """Call LLM and return text response."""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=4096
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            print(f"LLM Error: {e}")
            return f"Error: {str(e)}"
    
    def _parse_key_value(self, text: str) -> Dict[str, str]:
        """Parse 'Key: Value' format from LLM response."""
        result = {}
        for line in text.strip().split('\n'):
            if ':' in line and not line.strip().startswith('#'):
                key, _, value = line.partition(':')
                key = key.strip().lower().replace(' ', '_').replace("'", "").replace("-", "_")
                key = re.sub(r'[^a-z0-9_]', '', key)
                value = value.strip()
                if key and value and value.lower() not in ['not found', 'n/a', 'none', 'not', 'unknown']:
                    result[key] = value
        return result
    
    def transcribe_audio(self, audio_path: str) -> str:
        """Transcribe audio file using Whisper."""
        try:
            with open(audio_path, "rb") as audio_file:
                transcription = self.client.audio.transcriptions.create(
                    model=self.whisper_model,
                    file=audio_file,
                    response_format="text"
                )
            return transcription
        except Exception as e:
            return f"Transcription error: {str(e)}"
    
    def extract_from_resume(self, text: str) -> Dict[str, str]:
        """Extract data from resume."""
        prompt = """Extract all personal, educational and professional information from this resume.
Output each field on a new line as: Field Name: Value

Extract these fields if available:
Full Name, Email, Phone, Current Location, Current Company, Current Role, Current CTC,
Total Experience, Graduation Degree, Graduation College, Graduation Year,
12th School, 12th Year, 12th Percentage, 10th School, 10th Year, 10th Percentage, Skills

Write "Not found" if field is not available."""
        response = self._call_llm(prompt, f"Resume:\n{text}")
        return self._parse_key_value(response)
    
    def extract_from_hr_transcript(self, text: str) -> Dict[str, str]:
        """Extract data from HR interview transcript."""
        prompt = """Extract key candidate information from this HR interview transcript.
Output each field on a new line as: Field Name: Value

Extract: Candidate Name, Full Name, Current Location, Current Address, Current CTC, 
Expected CTC, Notice Period, Current Company, Current Role, Father Name, 
Date of Birth, Reason for Change

Write "Not found" if not mentioned."""
        response = self._call_llm(prompt, f"HR Transcript:\n{text}")
        return self._parse_key_value(response)
    
    def extract_from_aadhar(self, text: str) -> Dict[str, str]:
        """Extract data from Aadhar card (OCR text)."""
        prompt = """Extract information from this Aadhar card text.
Output each field on a new line as: Field Name: Value

Extract: Full Name, Date of Birth, DOB, Gender, Permanent Address, Aadhar Number
(Mask Aadhar as XXXX-XXXX-1234)

Write "Not found" if not available."""
        response = self._call_llm(prompt, f"Aadhar Card:\n{text}")
        return self._parse_key_value(response)
    
    def extract_from_marksheet(self, text: str, grade: str = "10th") -> Dict[str, str]:
        """Extract data from education marksheet."""
        prompt = f"""Extract information from this {grade} marksheet.
Output each field on a new line as: Field Name: Value

Extract: Student Name, Full Name, Father Name, Date of Birth, DOB, 
School Name, Board, Year of Passing, Percentage, Total Marks

Write "Not found" if not available."""
        response = self._call_llm(prompt, f"{grade} Marksheet:\n{text}")
        return self._parse_key_value(response)
    
    def extract_from_pan(self, text: str) -> Dict[str, str]:
        """Extract data from PAN card."""
        prompt = """Extract information from this PAN card.
Output each field on a new line as: Field Name: Value

Extract: Full Name, Father Name, Date of Birth, DOB, PAN Number

Write "Not found" if not available."""
        response = self._call_llm(prompt, f"PAN Card:\n{text}")
        return self._parse_key_value(response)


# Singleton
llm_service = LLMService()
