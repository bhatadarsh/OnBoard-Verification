"""
exaggeration_penalty.py  —  UPDATED

Problem with previous version
------------------------------
The old penalty weights were calibrated for a resume that ONLY lists skills
in project bullets. Real professional resumes have a dedicated "Technical
Skills" section — these appear as "unsupported" to the evidence mapper
because they're not inside a project block. With 15+ skills in a skills
section all classified as buzzword_only, the penalty immediately hit the
0.25 cap and cost strong candidates 2.5 points.

The updated logic
-----------------
1. buzzword_only penalty reduced from 0.03 → 0.01 per item.
   Skills in a technical skills section are NOT buzzwords. The evidence
   mapper now classifies them as weakly_supported, but even if a few
   leak into unsupported_claims this rate prevents over-penalization.

2. Overall cap reduced from 0.25 → 0.12 (in 0-1 space, ~1.2 points on
   the 0-10 scale). A real exaggerator should lose at most 1.2 points,
   not 2.5.

3. unsupported_core penalty reduced from 0.15 → 0.10 per item.
   Still meaningful but doesn't kill the score for one misclassified skill.

4. weak_focus penalty unchanged at 0.08 — this is still appropriate.

Penalty table (updated):
  unsupported core JD skill    → 0.10 each
  weakly supported focus area  → 0.08 each
  buzzword / no JD connection  → 0.01 each
  CAP                          → 0.12 total
"""


def compute_exaggeration_penalty(state: dict) -> dict:
    evidence           = state.get("evidence_map", {})
    skill_intelligence = state.get("skill_intelligence", {})
    interview_requirements = state.get("interview_requirements", {})

    core_skills = {s.lower() for s in skill_intelligence.get("core_skills", [])}
    focus_areas = {f.lower() for f in interview_requirements.get("primary_focus_areas", [])}

    unsupported = [c.lower() for c in evidence.get("unsupported_claims",  [])]
    weak        = [c.lower() for c in evidence.get("weakly_supported",    [])]

    unsupported_core = [c for c in unsupported if c in core_skills]
    weak_focus       = [c for c in weak        if c in focus_areas]
    buzzword_only    = [c for c in unsupported if c not in core_skills and c not in focus_areas]

    penalty = (
        len(unsupported_core) * 0.10   # reduced from 0.15
        + len(weak_focus)     * 0.08   # unchanged
        + len(buzzword_only)  * 0.01   # reduced from 0.03
    )
    penalty = round(min(penalty, 0.12), 3)   # cap reduced from 0.25 to 0.12

    print(f"[penalty] unsupported_core={len(unsupported_core)}, "
          f"weak_focus={len(weak_focus)}, buzzword={len(buzzword_only)}, "
          f"total={penalty}")

    return {
        **state,
        "exaggeration_penalty": penalty,
        "penalty_breakdown": {
            "unsupported_core_skills": unsupported_core,
            "weak_focus_areas":        weak_focus,
            "buzzword_only_claims":    buzzword_only,
        },
    }