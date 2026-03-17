from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from utils.json_parser import extract_json


def infer_role_context(state: dict) -> dict:
    """
    Infers PRIMARY execution role from a job description.

    This node MUST:
    - Identify the hands-on engineering role
    - Ignore soft skills, hiring responsibilities, and company process language
    - Anchor downstream skill extraction
    """

    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0
    )
    prompt = PromptTemplate(
        input_variables=["jd"],
        template="""
You are a senior technical recruiter.

Your task is to identify the PRIMARY HANDS-ON ROLE this job is hiring for.

STRICT RULES:
- Choose exactly ONE primary role
- The role MUST be a hands-on execution role (not recruiter, interviewer, manager)
- Ignore soft skills like communication, collaboration, leadership
- Ignore hiring, interviewing, mentoring, or evaluation responsibilities
- Focus ONLY on what the candidate will BUILD, DESIGN, or IMPLEMENT

Also infer:
- Seniority level (Junior / Mid / Senior / Staff)
- Primary technical domain (e.g. Backend Systems, Applied AI, Frontend, Data, Infra)

Return JSON only.

Format:
{{
  "primary_role": "",
  "seniority": "",
  "primary_domain": "",
  "confidence": 0.0
}}

Job Description:
{jd}
"""
    )

    response = llm.invoke(
        prompt.format(jd=state["normalized_jd"])
    )

    role_context = extract_json(response.content)

    # ---- HARD SAFETY CHECK (IMPORTANT) ----
    banned_roles = [
        "recruiter",
        "interviewer",
        "hiring manager",
        "people manager",
        "technical interviewer"
    ]

    role_name = role_context.get("primary_role", "").lower()
    if any(bad in role_name for bad in banned_roles):
        raise RuntimeError(
            f"Invalid role inferred: {role_context['primary_role']}"
        )

    return {
        **state,
        "role_context": role_context
    }
