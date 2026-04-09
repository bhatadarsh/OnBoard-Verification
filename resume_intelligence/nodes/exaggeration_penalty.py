"""
Node 5 — compute_exaggeration_penalty
Pure rule-based penalty: no LLM required.

Penalty weights:
  - Unsupported claim that IS a core JD skill    → 0.15 each (max impact)
  - Weakly supported claim in primary focus area → 0.08 each
  - Unsupported claim with no JD relevance       → 0.03 each (buzzword noise)

Cap: 0.25 total (a single candidate can't tank to zero just from exaggeration).
"""


def compute_exaggeration_penalty(state: dict) -> dict:
    evidence = state.get("evidence_map", {})
    skill_intelligence = state.get("skill_intelligence", {})
    interview_requirements = state.get("interview_requirements", {})

    core_skills = {s.lower() for s in skill_intelligence.get("core_skills", [])}
    focus_areas = {f.lower() for f in interview_requirements.get("primary_focus_areas", [])}

    unsupported = [c.lower() for c in evidence.get("unsupported_claims", [])]
    weak = [c.lower() for c in evidence.get("weakly_supported", [])]

    unsupported_core = [c for c in unsupported if c in core_skills]
    weak_focus = [c for c in weak if c in focus_areas]
    buzzword_only = [c for c in unsupported if c not in core_skills and c not in focus_areas]

    penalty = (
        len(unsupported_core) * 0.15
        + len(weak_focus) * 0.08
        + len(buzzword_only) * 0.03
    )
    penalty = round(min(penalty, 0.25), 3)

    return {
        **state,
        "exaggeration_penalty": penalty,
        "penalty_breakdown": {
            "unsupported_core_skills": unsupported_core,
            "weak_focus_areas": weak_focus,
            "buzzword_only_claims": buzzword_only,
        },
    }