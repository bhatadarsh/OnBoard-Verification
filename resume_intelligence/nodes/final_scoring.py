"""
Node 6 — final_scoring_and_shortlisting

Key fixes vs. original:
1. Import moved to module level (was inside function body).
2. Penalty is now actually applied to the final score (it was computed but ignored).
3. Shortlist overrides are consolidated into a single, readable priority chain
   instead of 4 overlapping boolean checks.
4. Score components are weighted clearly and documented.
5. _parse_years handles None/empty inputs gracefully.

Score formula:
  raw_score = blended_skill_score * 0.60
            + project_alignment    * 0.25
            + conceptual_alignment * 0.15

  final_score = raw_score
              - exaggeration_penalty
              + exp_flexibility_bonus (if applicable)
  final_score capped to [0.0, 1.0]
"""
import re
from utils.semantic_match import semantic_overlap


# --- Helpers -----------------------------------------------------------------

def _parse_years(value) -> float | None:
    """Extract the first numeric year value from a string, list of strings, or None."""
    if not value:
        return None
    texts = [value] if isinstance(value, str) else list(value)
    for text in texts:
        if not isinstance(text, str):
            continue
        for pattern in [
            r"(\d+(?:\.\d+)?)\s*(?:years?|yrs?)",   # "3 years", "3.5 yrs"
            r"(\d+(?:\.\d+)?)\s*-\s*\d+",            # "2-4 years" → take lower
            r"(\d+(?:\.\d+)?)\s*\+",                  # "3+"
        ]:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                return float(m.group(1))
    return None


def _experience_flags(competency_profile: dict, resume_claims: dict) -> dict:
    """Return experience gap metadata and whether flexibility applies."""
    jd_exp = _parse_years(competency_profile.get("experience_range", ""))
    cand_exp = _parse_years(resume_claims.get("experience_signals", []))
    return {
        "jd_required_years": jd_exp,
        "candidate_years": cand_exp,
        "gap_detected": bool(jd_exp and cand_exp and cand_exp < jd_exp),
    }


# --- Main node ---------------------------------------------------------------

def final_scoring_and_shortlisting(state: dict) -> dict:
    scores = state.get("match_scores", {})
    penalty = state.get("exaggeration_penalty", 0.0)
    resume_claims = state.get("resume_claims", {})
    skill_intelligence = state.get("skill_intelligence", {})
    interview_requirements = state.get("interview_requirements", {})
    competency_profile = state.get("competency_profile", {})

    # ------------------------------------------------------------------
    # 1. Skill coverage: semantic overlap of core JD skills vs resume
    # ------------------------------------------------------------------
    core_skills = skill_intelligence.get("core_skills", [])
    responsibilities = [
        resp
        for project in resume_claims.get("projects", [])
        for resp in project.get("responsibilities", [])
    ]

    matched_core: list[str] = semantic_overlap(core_skills, responsibilities, threshold=0.38)
    total_jd_skills = max(len(core_skills), 1)
    coverage_ratio = len(matched_core) / total_jd_skills

    semantic_core = scores.get("core_skill_match", 0.0)
    # Blend: coverage (objective count) weighted higher than raw semantic score
    blended_skill = round(semantic_core * 0.3 + coverage_ratio * 0.7, 3)

    # ------------------------------------------------------------------
    # 2. Raw composite score
    # ------------------------------------------------------------------
    raw_score = (
        blended_skill                              * 0.60
        + scores.get("project_alignment", 0.0)    * 0.25
        + scores.get("conceptual_alignment", 0.0) * 0.15
    )

    # ------------------------------------------------------------------
    # 3. Experience flexibility adjustment
    # ------------------------------------------------------------------
    exp = _experience_flags(competency_profile, resume_claims)
    flexibility_bonus = 0.0
    flexibility_applied = False

    if exp["gap_detected"]:
        jd_exp = exp["jd_required_years"]
        cand_exp = exp["candidate_years"]
        within_30pct = cand_exp >= (jd_exp * 0.70)
        strong_skills = blended_skill >= 0.65
        if within_30pct and strong_skills:
            flexibility_bonus = 0.02   # small positive nudge for strong-skill near-misses
            flexibility_applied = True

    # ------------------------------------------------------------------
    # 4. Final score = raw - penalty + flexibility bonus, clamped [0,1]
    # ------------------------------------------------------------------
    final_score = round(
        max(0.0, min(1.0, raw_score - penalty + flexibility_bonus)), 3
    )

    # ------------------------------------------------------------------
    # 5. Shortlist decision — single priority chain (no conflicting flags)
    # ------------------------------------------------------------------
    THRESHOLD = 0.60
    FLEX_THRESHOLD = 0.55
    MIN_SKILL_COUNT = 4          # hard count override

    if final_score >= THRESHOLD:
        shortlist_decision = True
        note = f"Score {final_score} ≥ threshold {THRESHOLD}"
    elif flexibility_applied and final_score >= FLEX_THRESHOLD:
        shortlist_decision = True
        note = f"Experience flexibility: score {final_score} ≥ flex threshold {FLEX_THRESHOLD}"
    elif len(matched_core) >= MIN_SKILL_COUNT and final_score >= 0.50:
        shortlist_decision = True
        note = f"Skill count override: {len(matched_core)} verified skills, score {final_score}"
    else:
        shortlist_decision = False
        note = (
            f"Below threshold: score={final_score}, "
            f"skills={len(matched_core)}/{total_jd_skills}, "
            f"penalty={penalty}"
        )

    # ------------------------------------------------------------------
    # Debug summary
    # ------------------------------------------------------------------
    print(
        f"[final_scoring] coverage={coverage_ratio:.2f} "
        f"blended_skill={blended_skill:.3f} "
        f"raw={raw_score:.3f} penalty={penalty} "
        f"final={final_score} shortlist={shortlist_decision}"
    )

    return {
        **state,
        "final_score": final_score,
        "shortlist_decision": shortlist_decision,
        "shortlist_reason": {
            "matched_core_skills": matched_core,
            "aligned_projects": resume_claims.get("projects", []),
            "penalties_applied": state.get("penalty_breakdown", {}),
            "experience_metadata": {
                **exp,
                "flexibility_applied": flexibility_applied,
                "note": note,
            },
        },
    }