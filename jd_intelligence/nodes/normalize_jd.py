# nodes/normalize_jd.py
import re
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate

def normalize_jd(state: dict) -> dict:
    """
    Cleans and normalizes the raw job description using an LLM.
    Removes generic/non-technical sections (benefits, company culture, equal opportunity, etc.)
    Preserves responsibilities, qualifications, skills, experience.
    Output: state["normalized_jd"] (cleaned text)
    """
    raw = state.get("raw_jd", "")
    if not raw:
        return {**state, "normalized_jd": ""}

    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.1
    )

    prompt = PromptTemplate(
        input_variables=["jd"],
        template="""
You are a technical recruiter assistant. Your task is to clean and normalize a job description.

STRICT RULES:
- Remove all sections that are NOT directly relevant to a technical interview:
  * Company benefits, perks, compensation, salary
  * Equal opportunity, diversity, inclusion statements
  * About us, company culture, mission, values
  * Work environment, remote/hybrid policies, office location
  * Background checks, drug tests, legal disclaimers
  * Contact information, emails, URLs, phone numbers
  * How to apply, recruiter contact
- Keep ONLY the sections that describe:
  * Role responsibilities / duties
  * Required qualifications (education, years of experience)
  * Technical skills (must-have, nice-to-have)
  * Preferred qualifications
  * Job summary (if it directly describes the role)
- Normalize bullet points: replace all bullet symbols with "-"
- Collapse multiple newlines into single newlines
- Remove extra spaces, but keep paragraph structure

OUTPUT: Return ONLY the cleaned job description text. No extra commentary.

RAW JOB DESCRIPTION:
{jd}
"""
    )

    response = llm.invoke(prompt.format(jd=raw))
    cleaned = response.content.strip()

    # Additional regex cleanups (safety)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)

    return {
        **state,
        "normalized_jd": cleaned
    }