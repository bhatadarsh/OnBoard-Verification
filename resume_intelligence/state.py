from typing import TypedDict, Dict, Any


class ResumeState(TypedDict, total=False):
    # --- Resume input ---
    candidate_id: str
    raw_resume: str
    normalized_resume: str

    # --- Resume intelligence ---
    resume_claims: Dict[str, Any]
    validated_skills: Dict[str, Any]
    match_scores: Dict[str, float]

    # --- Evidence ---
    evidence_map: Dict[str, Any]

    # --- JD context ---
    role_context: Dict[str, Any]
    skill_intelligence: Dict[str, Any]
    competency_profile: Dict[str, Any]
    interview_requirements: Dict[str, Any]

    # --- Final output ---
    exaggeration_penalty: float
    penalty_breakdown: Dict[str, Any]
    final_score: float
    shortlist_decision: bool
    shortlist_reason: str
