"""
Node 7 — generate_admin_insights
Produces two recruiter-readable paragraphs via LLM.
"""
import json
from langchain.prompts import PromptTemplate
from utils.llm import get_llm, load_prompt
from utils.json_parser import extract_json


def generate_admin_insights(state: dict) -> dict:
    skill_intelligence = state.get("skill_intelligence", {})
    role_context = state.get("role_context", {})
    resume_claims = state.get("resume_claims", {})
    shortlist_reason = state.get("shortlist_reason", {})

    core_skills = skill_intelligence.get("core_skills", [])
    matched_skills = shortlist_reason.get("matched_core_skills", [])
    experience_metadata = shortlist_reason.get("experience_metadata", {})

    prompt_template = load_prompt("admin_insights.txt")
    llm = get_llm()

    prompt = PromptTemplate(
        input_variables=[
            "core_skills", "role_context", "resume_claims",
            "matched_skills", "experience_metadata",
        ],
        template=prompt_template,
    )

    response = llm.invoke(
        prompt.format(
            core_skills=json.dumps(core_skills),
            role_context=json.dumps(role_context),
            resume_claims=json.dumps(resume_claims),
            matched_skills=json.dumps(matched_skills),
            experience_metadata=json.dumps(experience_metadata),
        )
    )

    insights = extract_json(response.content)
    insights.setdefault("matched_skills_summary", "")
    insights.setdefault("candidate_strengths", "")

    return {**state, "admin_insights": insights}