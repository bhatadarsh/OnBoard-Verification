"""
Resume Extraction Service.

Orchestrates extraction for a single candidate resume:
  1. Read file bytes and build ContentProfile directly (no Gemini calls)
  2. Extract text (text_extractor)
  3. Extract tables (table_extractor) — education/work history tables
  4. Skip images and charts (not needed for resumes)
  5. Use Groq LLM to parse structured candidate info from raw text
  6. Generate embedding and store in ChromaDB
  7. Return structured candidate profile

NOTE: image_extractor and chart_extractor are intentionally excluded.
NOTE: detect_content() is intentionally skipped — resumes have no
      meaningful images or charts, so Gemini classification is wasteful.
"""
import json
from pathlib import Path
from typing import Dict, Any

from config.settings import settings
from utils.logger import get_logger
from ingestion.file_type_detector import ContentProfile
from extraction.text_extractor import extract_text
from extraction.table_extractor import extract_tables
from storage.chroma_handler import chroma_handler
from embeddings.embedding_generator import embed_and_prepare

log = get_logger(__name__)


def extract_resume(candidate_id: str, resume_path: str) -> Dict[str, Any]:
    """
    Run extraction pipeline on a candidate resume uploaded via API.

    Args:
        candidate_id: Unique candidate ID — used as ChromaDB vector key.
        resume_path:  Absolute path to the saved resume file on disk.

    Returns:
        Dict with extracted profile:
        {
            "skills":           [...],
            "education":        [...],
            "experience":       [...],
            "experience_years": int,
            "current_company":  str,
            "current_role":     str,
            "raw_text":         str,
            "chroma_vector_id": str,
        }
    """
    log.info(f"Starting resume extraction for candidate: {candidate_id}")

    # ── Step 1: Read file bytes and build ContentProfile directly ─
    # We skip detect_content() intentionally because:
    # - detect_content() calls Gemini Vision to classify images
    # - Resumes have no meaningful images or charts
    # - Skipping saves API quota, avoids rate limits, and speeds up pipeline
    with open(resume_path, "rb") as f:
        raw_bytes = f.read()

    ext = Path(resume_path).suffix.lstrip(".").lower()  # "pdf" or "docx"

    profile = ContentProfile(
        file_path  = resume_path,
        file_type  = ext,
        raw_bytes  = raw_bytes,
        has_text   = True,
        has_tables = True,   # resumes often have education/work tables
        has_images = False,  # skip — not useful for HR data
        has_charts = False,  # skip — no charts in resumes
    )
    log.info(f"File type: {ext} — skipping Gemini image/chart detection for resume")

    # ── Step 2: Extract text ──────────────────────────────────────
    text_result = extract_text(profile)
    full_text = text_result.get("full_text", "")
    log.info(f"Extracted {len(full_text):,} chars of text")

    # ── Step 3: Extract tables (education/work history) ───────────
    tables = extract_tables(profile)
    tables_text = ""
    if tables:
        tables_text = "\n\n".join(t.raw_text for t in tables)
        log.info(f"Extracted {len(tables)} table(s) from resume")

    # ── Step 4: Combine text for embedding ────────────────────────
    combined_text = full_text
    if tables_text:
        combined_text += "\n\n" + tables_text

    if not combined_text.strip():
        log.warning(f"No text extracted from resume: {resume_path}")

    # ── Step 5: Parse structured data using Groq LLM ──────────────
    structured = _parse_resume_with_llm(combined_text)
    log.info(f"LLM extracted: {len(structured.get('skills', []))} skills")

    # ── Step 6: Generate embedding and store in ChromaDB ──────────
    chroma_vector_id = f"resume_{candidate_id}"

    prepared = embed_and_prepare(
        content_id = chroma_vector_id,
        text       = combined_text,
        metadata   = {
            "type":             "resume",
            "candidate_id":     candidate_id,
            "skills":           ", ".join(structured.get("skills", [])),
            "current_role":     structured.get("current_role", ""),
            "experience_years": structured.get("experience_years", 0),
        }
    )

    chroma_handler.store_embeddings(
        ids       = [prepared["id"]],
        embeddings= [prepared["embedding"]],
        documents = [prepared["document"]],
        metadatas = [prepared["metadata"]],
    )
    log.info(f"Resume vector stored in ChromaDB: {chroma_vector_id}")

    return {
        "skills":           structured.get("skills", []),
        "education":        structured.get("education", []),
        "certifications":   structured.get("certifications", []),
        "experience":       structured.get("experience", []),
        "experience_years": structured.get("experience_years", 0),
        "current_company":  structured.get("current_company", ""),
        "current_role":     structured.get("current_role", ""),
        "raw_text":         combined_text[:5000],
        "chroma_vector_id": chroma_vector_id,
    }


def _parse_resume_with_llm(resume_text: str) -> Dict[str, Any]:
    """
    Use Groq Llama-3.3 to extract structured data from raw resume text.
    """
    if not settings.groq_api_key:
        log.warning("GROQ_API_KEY not set — skipping LLM parsing")
        return _fallback_parse(resume_text)

    try:
        from groq import Groq

        client = Groq(api_key=settings.groq_api_key)

        prompt = f"""You are a resume parser. Extract structured information from the resume text below.

STRICT RULES — follow these exactly:

EXPERIENCE rules:
- Only extract ACTUAL WORK EXPERIENCE — full-time jobs, internships at companies.
- DO NOT include certifications, courses, or training programs as experience.
  Examples of what NOT to include as experience:
  - "Cybersecurity Training at CDAC" → this is a certification, NOT experience
  - "CS50 course at Harvard" → this is a course, NOT experience
  - Any entry from "Courses & Certifications" section → NOT experience
- If the candidate is a fresher with no real work experience, return experience as empty list [].
- For duration calculate years: "Sep 2024 - Aug 2025" = 1.0 year, "Dec 2024 - Feb 2025" = 0.2 years.
- "Present" means the role is ongoing.

EDUCATION rules:
- Only extract the MOST RECENT / HIGHEST degree.
- That means only the college/university degree — typically B.Tech, B.E, BCA, MCA, MBA etc.
- DO NOT include school (10th), PU college (12th/PCME/PCMB), or intermediate education.
- Only one entry in the education list.

SKILLS rules:
- Extract all technical skills mentioned anywhere in the resume.
- Include programming languages, frameworks, tools, platforms.
- DO NOT include soft skills like "communication", "teamwork", "time management".

CERTIFICATIONS rules:
- Extract courses and certifications separately from experience.
- Include name, provider, and year if available.

TEXT LAYOUT NOTE:
- The resume text may be extracted from a multi-column PDF so order may be jumbled.
- Match dates to their correct company/role by reading context carefully.

Return ONLY valid JSON — no explanation, no markdown, no backticks.

Resume text:
{resume_text[:4000]}

Return this exact JSON structure:
{{
  "skills": ["Kali Linux", "Python", "Burp Suite"],
  "education": [
    {{
      "degree": "B.Tech CSE",
      "institute": "Dayananda Sagar University",
      "year": "2020-2024",
      "score": "8.5 CGPA"
    }}
  ],
  "certifications": [
    {{
      "name": "Cybersecurity Training",
      "provider": "CDAC Bengaluru",
      "year": "2025"
    }}
  ],
  "experience": [
    {{
      "company": "Gloify",
      "role": "Associate Java Developer Intern",
      "duration": "Aug 2025 - Present",
      "years": 0.5
    }}
  ],
  "experience_years": 0.5,
  "current_company": "Gloify",
  "current_role": "Associate Java Developer Intern",
  "is_fresher": false
}}

IMPORTANT: If candidate has no real work experience, return:
  "experience": [],
  "experience_years": 0,
  "current_company": "",
  "current_role": "",
  "is_fresher": true
"""

        response = client.chat.completions.create(
            model    = settings.llm_model,
            messages = [{"role": "user", "content": prompt}],
            temperature = 0,
            max_tokens  = 1500,
        )

        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(raw)
        log.info("LLM resume parsing successful")
        return parsed

    except json.JSONDecodeError as e:
        log.error(f"LLM returned invalid JSON: {e}")
        return _fallback_parse(resume_text)
    except Exception as e:
        log.error(f"LLM parsing error: {e}")
        return _fallback_parse(resume_text)


def _fallback_parse(resume_text: str) -> Dict[str, Any]:
    """Fallback when Groq LLM is unavailable."""
    log.warning("Using fallback resume parser — LLM unavailable")
    return {
        "skills":           [],
        "education":        [],
        "experience":       [],
        "experience_years": 0,
        "current_company":  "",
        "current_role":     "",
    }