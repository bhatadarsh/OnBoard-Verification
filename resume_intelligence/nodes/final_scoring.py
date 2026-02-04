# from utils.semantic_match import semantic_overlap
# def final_scoring_and_shortlisting(state: dict) -> dict:
#     # -----------------------------
#     # Required inputs
#     # -----------------------------
#     scores = state["match_scores"]
#     penalty = state.get("exaggeration_penalty", 0.0)

#     evidence = state.get("evidence_map", {})
#     resume_claims = state.get("resume_claims", {})

#     skill_intelligence = state.get("skill_intelligence", {})
#     interview_requirements = state.get("interview_requirements", {})

#     # -----------------------------
#     # Weighted score
#     # -----------------------------
#     raw_score = (
#         scores.get("core_skill_match", 0.0) * 0.4 +
#         scores.get("project_alignment", 0.4) * 0.4 +
#         scores.get("conceptual_alignment", 0.0) * 0.2
#     )

#     final_score = round(max(raw_score - penalty, 0.0), 3)

#     shortlist_decision = final_score >= 0.70

#     # -----------------------------
#     # Explainability
#     # -----------------------------
#     core_skills = skill_intelligence.get("core_skills", [])
#     strong_evidence = evidence.get("strongly_supported", [])

#     matched_core = semantic_overlap(
#     core_skills,
#     strong_evidence,
#     threshold=0.45
#     )

#     aligned_projects = resume_claims.get("projects", [])

#     penalties_applied = state.get("penalty_breakdown", {})

#     return {
#         **state,
#         "final_score": final_score,
#         "shortlist_decision": shortlist_decision,
#         "shortlist_reason": {
#             "matched_core_skills": matched_core,
#             "aligned_projects": aligned_projects,
#             "penalties_applied": penalties_applied
#         }
#     }




from utils.semantic_match import semantic_overlap


def final_scoring_and_shortlisting(state: dict) -> dict:
    """
    Final scoring + shortlist decision with explainability.
    """

    # -----------------------------
    # Inputs
    # -----------------------------
    scores = state.get("match_scores", {})
    penalty = state.get("exaggeration_penalty", 0.0)

    resume_claims = state.get("resume_claims", {})
    skill_intelligence = state.get("skill_intelligence", {})
    interview_requirements = state.get("interview_requirements", {})
    evidence = state.get("evidence_map", {})

    # -----------------------------
    # Weighted score
    # -----------------------------
    # Rebalanced weights: emphasize core skills while keeping project
    # alignment relevant. Lower the shortlist threshold to be more
    # permissive given embedding variability.
    raw_score = (
        scores.get("core_skill_match", 0.0) * 0.5 +
        scores.get("project_alignment", 0.0) * 0.35 +
        scores.get("conceptual_alignment", 0.0) * 0.15
    )
    normalized_score = min(raw_score * 1.35, 1.0)   
    final_score = round(max(normalized_score - penalty, 0.0), 3)
    shortlist_decision = final_score >= 0.45

    # -----------------------------
    # Explainability (CORRECTED)
    # -----------------------------
    core_skills = skill_intelligence.get("core_skills", [])

    resume_responsibilities = [
        resp
        for project in resume_claims.get("projects", [])
        for resp in project.get("responsibilities", [])
    ]

    matched_core = semantic_overlap(
        core_skills,
        resume_responsibilities,
        threshold=0.45
    )

    aligned_projects = resume_claims.get("projects", [])

    penalties_applied = {}
    if penalty > 0:
        penalties_applied = state.get("penalty_breakdown", {})

    # -----------------------------
    # Output
    # -----------------------------
    return {
        **state,
        "final_score": final_score,
        "shortlist_decision": shortlist_decision,
        "shortlist_reason": {
            "matched_core_skills": matched_core,
            "aligned_projects": aligned_projects,
            "penalties_applied": penalties_applied
        }
    }
