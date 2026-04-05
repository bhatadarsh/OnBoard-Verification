# def compute_exaggeration_penalty(state: dict, jd_context: dict) -> dict:
#     evidence = state["evidence_map"]

#     core_skills = jd_context["skill_intelligence"]["core_skills"]
#     focus_areas = jd_context["interview_requirements"]["primary_focus_areas"]

#     unsupported = evidence.get("unsupported_claims", [])
#     weak = evidence.get("weakly_supported", [])

#     # ---- Categorize penalties ----
#     unsupported_core = [
#         skill for skill in unsupported
#         if skill in core_skills
#     ]

#     weak_focus = [
#         area for area in weak
#         if area in focus_areas
#     ]

#     buzzword_only = [
#         item for item in unsupported
#         if item not in core_skills and item not in focus_areas
#     ]

#     # ---- Penalty calculation ----
#     penalty = (
#         len(unsupported_core) * 0.15 +
#         len(weak_focus) * 0.08 +
#         len(buzzword_only) * 0.03
#     )

#     penalty = round(min(penalty, 0.25), 3)

#     return {
#         **state,
#         "exaggeration_penalty": penalty,
#         "penalty_breakdown": {
#             "unsupported_core_skills": unsupported_core,
#             "weak_focus_areas": weak_focus,
#             "buzzword_only_claims": buzzword_only
#         }
#     }

def compute_exaggeration_penalty(state: dict) -> dict:
    """
    Penalizes exaggerated resume claims based on evidence
    relative to JD expectations.
    """

    # --- Pull everything from state (LangGraph rule) ---
    evidence = state["evidence_map"]

    skill_intelligence = state["skill_intelligence"]
    interview_requirements = state["interview_requirements"]

    core_skills = skill_intelligence["core_skills"]
    focus_areas = interview_requirements["primary_focus_areas"]

    unsupported = evidence.get("unsupported_claims", [])
    weak = evidence.get("weakly_supported", [])

    # ---- Categorize penalties ----
    unsupported_core = [
        skill for skill in unsupported
        if skill in core_skills
    ]

    weak_focus = [
        area for area in weak
        if area in focus_areas
    ]

    buzzword_only = [
        item for item in unsupported
        if item not in core_skills and item not in focus_areas
    ]

    # ---- Penalty calculation ----
    penalty = (
        len(unsupported_core) * 0.15 +
        len(weak_focus) * 0.08 +
        len(buzzword_only) * 0.03
    )

    penalty = round(min(penalty, 0.25), 3)

    return {
        **state,
        "exaggeration_penalty": penalty,
        "penalty_breakdown": {
            "unsupported_core_skills": unsupported_core,
            "weak_focus_areas": weak_focus,
            "buzzword_only_claims": buzzword_only
        }
    }
