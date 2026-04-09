"""
Node 3 — map_evidence
Validates resume claims: strongly supported / weakly supported / unsupported.

Fix applied: prompt variables must be JSON-serialized strings, not raw dicts.
The original code passed state["resume_claims"] (a dict) directly to
prompt.format(), which produced [object Object]-style garbage in the prompt.
"""
import json
from langchain.prompts import PromptTemplate
from utils.llm import get_llm, load_prompt
from utils.json_parser import extract_json


def map_evidence(state: dict) -> dict:
    resume_claims = state.get("resume_claims")
    skill_intelligence = state.get("skill_intelligence")
    interview_requirements = state.get("interview_requirements")

    if not resume_claims:
        raise ValueError("State missing 'resume_claims'. Run extract_resume_claims first.")
    if not skill_intelligence:
        raise ValueError("State missing 'skill_intelligence'. Provide JD context before running.")
    if not interview_requirements:
        raise ValueError("State missing 'interview_requirements'. Provide JD context before running.")

    prompt_template = load_prompt("evidence_mapping.txt")
    llm = get_llm()

    prompt = PromptTemplate(
        input_variables=["resume_claims", "skill_intelligence", "interview_requirements"],
        template=prompt_template,
    )

    # BUG FIX: serialize dicts to JSON strings so they render properly in the prompt
    response = llm.invoke(
        prompt.format(
            resume_claims=json.dumps(resume_claims),
            skill_intelligence=json.dumps(skill_intelligence),
            interview_requirements=json.dumps(interview_requirements),
        )
    )

    evidence = extract_json(response.content)

    # Defensive defaults
    evidence.setdefault("strongly_supported", [])
    evidence.setdefault("weakly_supported", [])
    evidence.setdefault("unsupported_claims", [])

    return {**state, "evidence_map": evidence}