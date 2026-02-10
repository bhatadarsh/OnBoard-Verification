import os
import json
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from utils.json_parser import extract_json

def generate_admin_insights(state: dict) -> dict:
    """
    Generates two concise paragraphs for the Admin Dashboard:
    1. Matched Core Skills Summary
    2. Strengths Based on JD–Resume Match
    """
    
    # -------------------------
    # Resolve prompt path SAFELY
    # -------------------------
    BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # resume_intelligence/
    PROMPT_PATH = os.path.join(
        BASE_DIR,
        "prompts",
        "admin_insights.txt"
    )

    if not os.path.exists(PROMPT_PATH):
        raise FileNotFoundError(f"Prompt file not found: {PROMPT_PATH}")

    with open(PROMPT_PATH, "r", encoding="utf-8") as f:
        prompt_template = f.read()

    # -------------------------
    # Inputs
    # -------------------------
    skill_intelligence = state.get("skill_intelligence", {})
    core_skills = skill_intelligence.get("core_skills", [])
    role_context = state.get("role_context", {})
    resume_claims = state.get("resume_claims", {})
    shortlist_reason = state.get("shortlist_reason", {})
    matched_skills = shortlist_reason.get("matched_core_skills", [])
    experience_metadata = shortlist_reason.get("experience_metadata", {})

    # -------------------------
    # LLM
    # -------------------------
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0
    )

    prompt = PromptTemplate(
        input_variables=["core_skills", "role_context", "resume_claims", "matched_skills", "experience_metadata"],
        template=prompt_template
    )

    response = llm.invoke(
        prompt.format(
            core_skills=json.dumps(core_skills),
            role_context=json.dumps(role_context),
            resume_claims=json.dumps(resume_claims),
            matched_skills=json.dumps(matched_skills),
            experience_metadata=json.dumps(experience_metadata)
        )
    )

    insights = extract_json(response.content)

    return {
        **state,
        "admin_insights": insights
    }
