


import os
import json
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from utils.json_parser import extract_json


def filter_interview_requirements(state: dict) -> dict:
    # -------------------------
    # Resolve prompt path SAFELY
    # -------------------------
    BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # jd_intelligence/
    PROMPT_PATH = os.path.join(
        BASE_DIR,
        "prompts",
        "interview_relevance_filter.txt"
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
        input_variables=[
            "role_context",
            "skill_intelligence",
            "competency_profile"
        ],
        template=prompt_template
    )

    response = llm.invoke(
        prompt.format(
            role_context=state["role_context"],
            skill_intelligence=state["skill_intelligence"],
            competency_profile=state["competency_profile"]
        )
    )

    interview_requirements = extract_json(response.content)

    return {
        **state,
        "interview_requirements": interview_requirements
    }
