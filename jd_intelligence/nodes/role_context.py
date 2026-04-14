# nodes/role_context.py
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from utils.json_parser import extract_json

def infer_role_context(state: dict) -> dict:
    """
    Infers the primary hands-on execution role from a normalized job description.
    The output drives downstream skill extraction and question generation.
    Returns: {"primary_role": str, "seniority": str, "primary_domain": str, "confidence": float}
    """
    jd = state.get("normalized_jd", "")
    if not jd:
        return {
            **state,
            "role_context": {
                "primary_role": "Technical Professional",
                "seniority": "Mid",
                "primary_domain": "General",
                "confidence": 0.0
            }
        }

    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0
    )

    prompt = PromptTemplate(
        input_variables=["jd"],
        template="""
You are an AI that prepares technical interviews. Your task is to analyze the job description below and extract only the information needed to generate relevant, hands-on technical questions.

Important context for you:
- We will later ask the candidate about building, designing, debugging, or optimizing real systems.
- We do NOT care about soft skills (communication, leadership, collaboration) – those are not interview topics.
- We do NOT care about company culture, benefits, diversity statements, or application instructions.
- We only care about the technical work the candidate will actually perform.

From the job description, infer:

1. **primary_role** – The single most accurate title for the hands-on technical role (e.g., "Backend Engineer", "Data Analyst", "ML Ops Specialist"). If multiple roles are mentioned, pick the one that appears most central to the daily work.

2. **seniority** – Junior, Mid, Senior, Staff, or Lead. Base this on the required years of experience, complexity of tasks, and whether the role includes mentoring.

3. **primary_domain** – The main technical area. Use a short, descriptive phrase that captures the core technology focus (e.g., "Cloud Infrastructure", "Frontend React", "Computer Vision", "Data Warehousing"). Do not use a fixed list – derive it from the JD.

4. **confidence** – A number between 0.0 and 1.0 indicating how clear and unambiguous the JD is about the technical role.

Return ONLY valid JSON. Example:
{{
  "primary_role": "Data Platform Engineer",
  "seniority": "Senior",
  "primary_domain": "Big Data / Spark",
  "confidence": 0.85
}}

Job Description:
{jd}
"""
    )

    response = llm.invoke(prompt.format(jd=jd[:8000]))
    role_context = extract_json(response.content)

    # Ensure expected fields exist (fallbacks)
    if not isinstance(role_context, dict):
        role_context = {}
    role_context.setdefault("primary_role", "Technical Professional")
    role_context.setdefault("seniority", "Mid")
    role_context.setdefault("primary_domain", "General")
    role_context.setdefault("confidence", 0.5)

    # Very light sanity: if primary_role is suspiciously non‑technical, add a warning flag
    # (But we don't reject – let downstream nodes decide)
    suspicious_indicators = ["manager", "recruiter", "coordinator", "admin"]
    role_lower = role_context["primary_role"].lower()
    if any(ind in role_lower for ind in suspicious_indicators):
        role_context["_warning"] = "Role may not be hands-on technical"

    return {
        **state,
        "role_context": role_context
    }