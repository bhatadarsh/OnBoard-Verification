"""
jd_parser.py  —  UPDATED

Key fix: when raw_jd is missing (JD uploaded before raw_jd_text was stored),
the fast-path now builds a RICHER jd_sections by combining ALL available
intelligence fields instead of only skill_intelligence.core_skills.

This means old JD records (JOB_1 … JOB_N uploaded before the raw_jd_text
change) still produce a complete jd_sections without needing a re-upload.

Fast-path now pulls from:
  required_skills  ← skill_intelligence.core_skills
                     + skill_intelligence.required_skills  (if present)
  preferred_skills ← skill_intelligence.secondary_skills
                     + interview_requirements.secondary_skills
  responsibilities ← interview_requirements.primary_focus_areas
                     + interview_requirements.evaluation_dimensions
                     + role_context.responsibilities
  experience       ← competency_profile.experience_range
                     + competency_profile.seniority_level
"""

import os
import re
import json
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from utils.json_parser import extract_json


SECTION_WEIGHTS: dict[str, float] = {
    "required_skills":  1.0,
    "preferred_skills": 0.6,
    "responsibilities": 0.5,
    "experience":       0.8,
}

_JD_PARSE_PROMPT = """
You are a technical recruiter parsing a job description.

Extract the following four sections. If a section is absent, return an empty list.

1. required_skills  — ALL skills explicitly or implicitly required. Be comprehensive:
   include every technical tool, language, framework, method, and domain mentioned
   as required or expected. Do NOT limit to only bullet-pointed items.
2. preferred_skills — skills marked preferred / nice-to-have / bonus / plus / desirable
3. responsibilities — concrete action phrases describing what the candidate will do
4. experience       — experience requirements as short phrases (e.g. "3+ years Python",
                      "machine learning production experience")

NORMALIZATION RULES:
- Return short, lowercased phrases (no full sentences).
- Trim whitespace. No trailing commas inside JSON.
- For skills include both canonical name AND common alias where applicable
  (e.g. include both "principal component analysis" and "pca").

STRICT OUTPUT: Return ONLY a single JSON object, no markdown, no explanation.

{{
  "required_skills": [],
  "preferred_skills": [],
  "responsibilities": [],
  "experience": []
}}

JOB DESCRIPTION:
{jd_text}
"""


def parse_jd(state: dict) -> dict:
    raw_jd: str = state.get("raw_jd", "")

    if not raw_jd.strip():
        # ── Enhanced fast-path: pull from ALL available intelligence fields ──
        skill_intel  = state.get("skill_intelligence", {})
        role_ctx     = state.get("role_context", {})
        competency   = state.get("competency_profile", {})
        interview_r  = state.get("interview_requirements", {})

        # required_skills: combine every possible source
        required_skills = _dedup(
            _to_list(skill_intel.get("core_skills", []))
            + _to_list(skill_intel.get("required_skills", []))
            + _to_list(skill_intel.get("technical_skills", []))
            + _to_list(skill_intel.get("tools", []))
        )

        # preferred_skills
        preferred_skills = _dedup(
            _to_list(skill_intel.get("secondary_skills", []))
            + _to_list(interview_r.get("secondary_skills", []))
            + _to_list(skill_intel.get("preferred_skills", []))
        )

        # responsibilities: focus areas + evaluation dimensions + role responsibilities
        responsibilities = _dedup(
            _to_list(interview_r.get("primary_focus_areas", []))
            + _to_list(interview_r.get("evaluation_dimensions", []))
            + _to_list(role_ctx.get("responsibilities", []))
            + _to_list(role_ctx.get("key_responsibilities", []))
        )

        # experience
        experience = _dedup(
            _coerce_list(competency.get("experience_range", ""))
            + _coerce_list(competency.get("seniority_level", ""))
            + _to_list(competency.get("experience_requirements", []))
        )

        # Remove preferred skills that are already in required (required wins)
        preferred_skills = [s for s in preferred_skills if s not in set(required_skills)]

        jd_sections = _build_sections(required_skills, preferred_skills, responsibilities, experience)
        print(f"[jd_parser] fast-path: "
              f"required={len(required_skills)}, preferred={len(preferred_skills)}, "
              f"responsibilities={len(responsibilities)}, experience={len(experience)}")
        return {**state, "jd_sections": jd_sections}

    # ── Full LLM parse ────────────────────────────────────────────────────────
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    prompt = PromptTemplate(input_variables=["jd_text"], template=_JD_PARSE_PROMPT)
    response = llm.invoke(prompt.format(jd_text=raw_jd))
    parsed = extract_json(response.content)

    required_skills  = _normalise_list(parsed.get("required_skills",  []))
    preferred_skills = _normalise_list(parsed.get("preferred_skills", []))
    responsibilities = _normalise_list(parsed.get("responsibilities", []))
    experience       = _normalise_list(parsed.get("experience",       []))

    preferred_skills = [s for s in preferred_skills if s not in set(required_skills)]

    jd_sections = _build_sections(required_skills, preferred_skills, responsibilities, experience)
    print(f"[jd_parser] llm-parse: "
          f"required={len(required_skills)}, preferred={len(preferred_skills)}, "
          f"responsibilities={len(responsibilities)}, experience={len(experience)}")
    return {**state, "jd_sections": jd_sections}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_sections(required, preferred, responsibilities, experience) -> dict:
    return {
        "required_skills":  required,
        "preferred_skills": preferred,
        "responsibilities": responsibilities,
        "experience":       experience,
        "weights":          dict(SECTION_WEIGHTS),
    }


def _normalise_list(items) -> list:
    if not items:
        return []
    return [str(i).strip().lower() for i in items if str(i).strip()]


def _to_list(value) -> list:
    """Safely coerce any value to a normalised list of strings."""
    if not value:
        return []
    if isinstance(value, list):
        return _normalise_list(value)
    if isinstance(value, str):
        return [value.strip().lower()] if value.strip() else []
    return []


def _coerce_list(value) -> list:
    if not value:
        return []
    if isinstance(value, list):
        return _normalise_list(value)
    return [str(value).strip().lower()] if str(value).strip() else []


def _dedup(items: list) -> list:
    seen = set()
    result = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result