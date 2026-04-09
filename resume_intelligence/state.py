"""
state.py — LangGraph state schema for the resume-JD matching pipeline.

All keys are optional (total=False) because LangGraph builds the state
incrementally — early nodes don't have access to keys set by later nodes.
"""
from typing import TypedDict, Dict, Any, List, Optional


class ResumeState(TypedDict, total=False):
    # ── Input ────────────────────────────────────────────────────────────────
    candidate_id: str
    raw_resume: str

    # ── JD context (provided before graph execution) ─────────────────────────
    role_context: Dict[str, Any]          # high-level role description
    skill_intelligence: Dict[str, Any]    # core_skills, nice_to_have, etc.
    competency_profile: Dict[str, Any]    # experience_range, seniority, etc.
    interview_requirements: Dict[str, Any] # primary_focus_areas, eval_dimensions

    # ── Node 1 ───────────────────────────────────────────────────────────────
    normalized_resume: str

    # ── Node 2 ───────────────────────────────────────────────────────────────
    resume_claims: Dict[str, Any]
    # {
    #   "skills_claimed": List[str],
    #   "projects": [{"project_name": str, "responsibilities": List[str]}],
    #   "roles_and_ownership": List[str],
    #   "experience_signals": List[str],
    # }

    # ── Node 3 ───────────────────────────────────────────────────────────────
    evidence_map: Dict[str, Any]
    # {
    #   "strongly_supported": List[str],
    #   "weakly_supported": List[str],
    #   "unsupported_claims": List[str],
    # }

    # ── Node 4 ───────────────────────────────────────────────────────────────
    match_scores: Dict[str, float]
    # {
    #   "core_skill_match": float,
    #   "project_alignment": float,
    #   "conceptual_alignment": float,
    # }

    # ── Node 5 ───────────────────────────────────────────────────────────────
    exaggeration_penalty: float
    penalty_breakdown: Dict[str, Any]
    # {
    #   "unsupported_core_skills": List[str],
    #   "weak_focus_areas": List[str],
    #   "buzzword_only_claims": List[str],
    # }

    # ── Node 6 ───────────────────────────────────────────────────────────────
    final_score: float                # 0.0 – 1.0
    shortlist_decision: bool
    shortlist_reason: Dict[str, Any]
    # {
    #   "matched_core_skills": List[str],
    #   "aligned_projects": List[dict],
    #   "penalties_applied": dict,
    #   "experience_metadata": {
    #       "jd_required_years": Optional[float],
    #       "candidate_years": Optional[float],
    #       "gap_detected": bool,
    #       "flexibility_applied": bool,
    #       "note": str,
    #   },
    # }

    # ── Node 7 ───────────────────────────────────────────────────────────────
    admin_insights: Dict[str, str]
    # {
    #   "matched_skills_summary": str,
    #   "candidate_strengths": str,
    # }