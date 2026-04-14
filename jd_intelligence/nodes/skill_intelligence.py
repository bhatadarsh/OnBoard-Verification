



import os
import json
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from utils.json_parser import extract_json


def extract_skill_intelligence(state: dict) -> dict:
    # ---- HARD REQUIREMENT: role_context must exist ----
    if "role_context" not in state:
        raise RuntimeError("role_context missing. Skill extraction cannot proceed.")

    role = state["role_context"].get("primary_role")
    domain = state["role_context"].get("primary_domain")

    if not role or not domain:
        raise RuntimeError("Invalid role_context. Missing role or domain.")

    # ---- DEBUG (keep this until system is stable) ----
    print("[DEBUG] Skill extraction anchored to role:", role)
    print("[DEBUG] Skill extraction anchored to domain:", domain)

    # -------------------------
    # Resolve prompt path SAFELY
    # -------------------------
    BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # jd_intelligence/
    PROMPT_PATH = os.path.join(
        BASE_DIR,
        "prompts",
        "skill_extraction.txt"
    )

    if not os.path.exists(PROMPT_PATH):
        raise FileNotFoundError(f"Prompt file not found: {PROMPT_PATH}")

    with open(PROMPT_PATH, "r", encoding="utf-8") as f:
        prompt_template = f.read()

    # -------------------------
    # LLM
    # -------------------------
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0
    )

    prompt = PromptTemplate(
        input_variables=["jd", "role", "domain"],
        template=prompt_template,
        template_format="jinja2"
    )

    response = llm.invoke(
        prompt.format(
            jd=state["normalized_jd"],
            role=role,
            domain=domain
        )
    )

    skill_intelligence = extract_json(response.content)

    return {
        **state,
        "skill_intelligence": skill_intelligence
    }
