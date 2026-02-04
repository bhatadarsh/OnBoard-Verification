import json
from pathlib import Path
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from utils.json_parser import extract_json


PROMPT_PATH = Path(__file__).parent.parent.parent / \
              "jd_intelligence/prompts/competency_modeling.txt"


def extract_competency_profile(state: dict) -> dict:
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0
    )

    prompt = PromptTemplate(
        input_variables=["jd", "role_context", "skill_intelligence"],
        template=PROMPT_PATH.read_text()
    )

    response = llm.invoke(
        prompt.format(
            jd=state["normalized_jd"],
            role_context=state["role_context"],
            skill_intelligence=state["skill_intelligence"]
        )
    )

    competency_profile = extract_json(response.content)

    return {
        **state,
        "competency_profile": competency_profile
    }
