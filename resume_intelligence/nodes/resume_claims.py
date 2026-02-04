# import json
# from langchain_groq import ChatGroq
# from langchain.prompts import PromptTemplate
# from utils.json_parser import extract_json


# def extract_resume_claims(state: dict) -> dict:
#     llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

#     prompt = PromptTemplate(
#         input_variables=["resume"],
#         template=open(
#             "resume_intelligence/prompts/resume_claim_extraction.txt"
#         ).read()
#     )

#     response = llm.invoke(
#         prompt.format(resume=state["normalized_resume"])
#     )

#     return {
#         **state,
#         "resume_claims": extract_json(response.content)
#     }


import os
import json
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from utils.json_parser import extract_json


def extract_resume_claims(state: dict) -> dict:
    # -------------------------
    # Resolve prompt path SAFELY
    # -------------------------
    BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # resume_intelligence/
    PROMPT_PATH = os.path.join(
        BASE_DIR,
        "prompts",
        "resume_claim_extraction.txt"
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
        input_variables=["resume"],
        template=prompt_template
    )

    response = llm.invoke(
        prompt.format(
            resume=state["normalized_resume"]
        )
    )

    return {
        **state,
        "resume_claims": extract_json(response.content)
    }
