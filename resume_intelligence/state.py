from typing import TypedDict, Dict, Any, List


class ResumeState(TypedDict, total=False):
    # --- Resume input ---
    candidate_id: str
    raw_resume: str
    normalized_resume: str

    # --- JD input (optional — jd_parser falls back to skill_intelligence if absent) ---
    raw_jd: str

    # --- Resume intelligence ---
    resume_claims: Dict[str, Any]
    validated_skills: Dict[str, Any]
    match_scores: Dict[str, float]

    # --- Evidence ---
    evidence_map: Dict[str, Any]

    # --- JD context (pre-parsed by caller or extracted from raw_jd by jd_parser) ---
    role_context: Dict[str, Any]
    skill_intelligence: Dict[str, Any]
    competency_profile: Dict[str, Any]
    interview_requirements: Dict[str, Any]

    # --- Parsed JD sections (produced by jd_parser node) ---
    jd_sections: Dict[str, Any]
    # Schema:
    # {
    #   "required_skills":  List[str],   weight 1.0
    #   "preferred_skills": List[str],   weight 0.6
    #   "responsibilities": List[str],   weight 0.5
    #   "experience":       List[str],   weight 0.8
    #   "weights":          Dict[str, float]
    # }

    # --- Final output ---
    exaggeration_penalty: float
    penalty_breakdown: Dict[str, Any]
    final_score: float
    shortlist_decision: bool
    shortlist_reason: Dict[str, Any]

    # --- Admin Dashboard Insights ---
    admin_insights: Dict[str, str]