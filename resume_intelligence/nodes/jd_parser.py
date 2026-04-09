"""
jd_parser.py

Parses a raw JD string into structured sections with precedence weights.
This runs BEFORE final_scoring so the scorer receives clean, weighted signals.

Sections extracted:
  - required_skills     (weight 1.0)  — "required", "must have", "you must"
  - preferred_skills    (weight 0.6)  — "preferred", "nice to have", "bonus", "plus"
  - responsibilities    (weight 0.5)  — "responsibilities", "you will", "duties"
  - experience_required (weight 0.8)  — year mentions, "experience in X"

The parser is intentionally lenient: it tries multiple heuristics before
falling back to keyword scanning so a loosely-formatted JD still yields
usable output.
"""

import os
import re
import json
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from utils.json_parser import extract_json


# ---------------------------------------------------------------------------
# Section-weight registry — single source of truth used by final_scoring too
# ---------------------------------------------------------------------------
SECTION_WEIGHTS: dict[str, float] = {
    "required_skills":  1.0,
    "preferred_skills": 0.6,
    "responsibilities": 0.5,
    "experience":       0.8,
}

# ---------------------------------------------------------------------------
# Prompt (inline so this node is self-contained; move to prompts/ if needed)
# ---------------------------------------------------------------------------
_JD_PARSE_PROMPT = """
You are a technical recruiter parsing a job description.

Extract the following four sections. If a section is absent, return an empty list.

1. required_skills  — skills explicitly marked required / must-have / mandatory
2. preferred_skills — skills marked preferred / nice-to-have / bonus / plus / desirable
3. responsibilities — concrete things the candidate will do (action phrases)
4. experience       — experience requirements as short phrases (e.g. "3+ years Python",
                      "kubernetes production experience")

NORMALIZATION RULES:
- Return short, lowercased phrases (no sentences).
- Trim whitespace. No trailing commas inside JSON.
- For skills, prefer the canonical name the industry uses
  (e.g. "kubernetes" NOT "k8s", "postgresql" NOT "postgres").
  ALSO include common aliases as separate entries so fuzzy matching works
  (e.g. add both "kubernetes" and "k8s").

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
    """
    LangGraph node.

    Reads state["raw_jd"] (or falls back to skill_intelligence / role_context
    if the caller pre-parsed the JD elsewhere) and writes state["jd_sections"].

    jd_sections schema:
    {
      "required_skills":  ["python", "docker", ...],
      "preferred_skills": ["go", "terraform", ...],
      "responsibilities": ["design microservices", ...],
      "experience":       ["3+ years backend", ...],
      "weights": {
          "required_skills":  1.0,
          "preferred_skills": 0.6,
          "responsibilities": 0.5,
          "experience":       0.8
      }
    }
    """

    raw_jd: str = state.get("raw_jd", "")

    # ------------------------------------------------------------------
    # Fast-path: if the caller already populated skill_intelligence with
    # core_skills, build a minimal jd_sections from it so we don't break
    # existing pipelines that never pass raw_jd.
    # ------------------------------------------------------------------
    if not raw_jd.strip():
        skill_intel = state.get("skill_intelligence", {})
        role_ctx    = state.get("role_context", {})
        competency  = state.get("competency_profile", {})
        interview_r = state.get("interview_requirements", {})

        required_skills  = skill_intel.get("core_skills", [])
        preferred_skills = skill_intel.get("secondary_skills", []) or \
                           interview_r.get("secondary_skills", [])
        responsibilities = interview_r.get("primary_focus_areas", []) or \
                           role_ctx.get("responsibilities", [])
        experience       = _coerce_list(competency.get("experience_range", ""))

        jd_sections = _build_sections(
            required_skills, preferred_skills, responsibilities, experience
        )
        return {**state, "jd_sections": jd_sections}

    # ------------------------------------------------------------------
    # Full LLM parse of raw_jd
    # ------------------------------------------------------------------
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    prompt = PromptTemplate(
        input_variables=["jd_text"],
        template=_JD_PARSE_PROMPT,
    )

    response = llm.invoke(prompt.format(jd_text=raw_jd))
    parsed   = extract_json(response.content)

    required_skills  = _normalise_list(parsed.get("required_skills",  []))
    preferred_skills = _normalise_list(parsed.get("preferred_skills", []))
    responsibilities = _normalise_list(parsed.get("responsibilities", []))
    experience       = _normalise_list(parsed.get("experience",       []))

    # Deduplicate across required/preferred (required wins)
    preferred_skills = [s for s in preferred_skills if s not in required_skills]

    jd_sections = _build_sections(
        required_skills, preferred_skills, responsibilities, experience
    )
    return {**state, "jd_sections": jd_sections}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_sections(required, preferred, responsibilities, experience) -> dict:
    return {
        "required_skills":  required,
        "preferred_skills": preferred,
        "responsibilities": responsibilities,
        "experience":       experience,
        "weights":          dict(SECTION_WEIGHTS),
    }


def _normalise_list(items) -> list[str]:
    if not items:
        return []
    return [str(i).strip().lower() for i in items if str(i).strip()]


def _coerce_list(value) -> list[str]:
    """Turn a string or list into a list of strings."""
    if not value:
        return []
    if isinstance(value, list):
        return _normalise_list(value)
    return [str(value).strip().lower()]