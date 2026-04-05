# # import json
# # from langchain_groq import ChatGroq
# # from langchain.prompts import PromptTemplate
# # from utils.json_parser import extract_json


# # def map_evidence(state: dict) -> dict:
# #     llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

# #     prompt = PromptTemplate(
# #         input_variables=["resume_claims"],
# #         template=open(
# #             "resume_intelligence/prompts/evidence_mapping.txt"
# #         ).read()
# #     )

# #     response = llm.invoke(
# #         prompt.format(resume_claims=state["resume_claims"])
# #     )

# #     return {
# #         **state,
# #         "evidence_map": extract_json(response.content)
# #     }


# import json
# from langchain_groq import ChatGroq
# from langchain.prompts import PromptTemplate
# from utils.json_parser import extract_json


# def map_evidence(state: dict) -> dict:
#     """
#     Maps resume claims to evidence strength buckets.
#     """

#     llm = ChatGroq(
#         model="llama-3.1-8b-instant",
#         temperature=0
#     )

#     prompt = PromptTemplate(
#         input_variables=["resume_claims"],
#         template=open(
#             "resume_intelligence/prompts/evidence_mapping.txt"
#         ).read()
#     )

#     # 🔑 Always pass JSON, never raw dicts
#     resume_claims_json = json.dumps(state["resume_claims"], indent=2)

#     response = llm.invoke(
#         prompt.format(resume_claims=resume_claims_json)
#     )

#     # Attempt to parse JSON; on failure, print the raw LLM output for diagnosis
#     try:
#         evidence_map = extract_json(response.content)
#     except Exception as e:
#         print("[ERROR] Failed to parse evidence_mapping LLM response as JSON.")
#         print("--- LLM raw response start ---")
#         print(response.content)
#         print("--- LLM raw response end ---")
#         raise

#     return {
#         **state,
#         "evidence_map": evidence_map
#     }


import os
import json
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from utils.json_parser import extract_json


def map_evidence(state: dict) -> dict:
    # -------------------------
    # Resolve prompt path SAFELY
    # -------------------------
    BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # resume_intelligence/
    PROMPT_PATH = os.path.join(
        BASE_DIR,
        "prompts",
        "evidence_mapping.txt"
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
            "resume_claims",
            "skill_intelligence",
            "interview_requirements"
        ],
        template=prompt_template
    )

    response = llm.invoke(
        prompt.format(
            resume_claims=state["resume_claims"],
            skill_intelligence=state["skill_intelligence"],
            interview_requirements=state["interview_requirements"]
        )
    )

    evidence_map = extract_json(response.content)

    return {
        **state,
        "evidence_map": evidence_map
    }
