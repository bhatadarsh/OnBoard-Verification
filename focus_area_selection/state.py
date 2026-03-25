from typing import TypedDict, List, Dict



class Stage3State(TypedDict, total=False):
    """
    State used by Stage 3: Focus Area Selection.

    This state EXTENDS outputs from Stage 1 and Stage 2.
    It does NOT redefine or recompute them.
    """

    # -------------------------
    # Inputs from Stage 1
    # -------------------------
    interview_requirements: Dict
    skill_intelligence: Dict

    # -------------------------
    # Inputs from Stage 2
    # -------------------------
    resume_claims: Dict
    evidence_map: Dict
    match_scores: Dict
    final_score: float

    # -------------------------
    # Stage 3 Intermediate Outputs
    # -------------------------
    candidate_strengths: List[Dict]
    intersected_focus_areas: List[Dict]
    depth_worthy_focus_areas: List[Dict]

    # -------------------------
    # Stage 3 Final Output
    # -------------------------
    final_focus_areas: List[Dict]
