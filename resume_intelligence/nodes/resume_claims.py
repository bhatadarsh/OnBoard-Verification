"""
Node 2 — extract_resume_claims
Extracts structured claims from the normalized resume via LLM.
"""
import json
from langchain.prompts import PromptTemplate
from utils.llm import get_llm, load_prompt
from utils.json_parser import extract_json


def extract_resume_claims(state: dict) -> dict:
    resume = state.get("normalized_resume", "").strip()
    if not resume:
        raise ValueError("State missing 'normalized_resume'. Run normalize_resume first.")

    prompt_template = load_prompt("resume_claim_extraction.txt")
    llm = get_llm()

    prompt = PromptTemplate(input_variables=["resume"], template=prompt_template)
    response = llm.invoke(prompt.format(resume=resume))
    claims = extract_json(response.content)

    # Defensive defaults so downstream nodes never KeyError
    claims.setdefault("skills_claimed", [])
    claims.setdefault("projects", [])
    claims.setdefault("roles_and_ownership", [])
    claims.setdefault("experience_signals", [])

    return {**state, "resume_claims": claims}