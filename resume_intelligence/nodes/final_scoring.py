



import re


def _parse_years(text_input):
    """
    Helper to extract a numeric year value from strings or lists of strings.
    Matches '3 years', '2.5 yrs', '3+', '2-4 years' (takes lower bound).
    """
    if not text_input:
        return None
    
    texts = [text_input] if isinstance(text_input, str) else text_input
    
    for text in texts:
        # Match '3.5 years' or '3 years' or '3 yrs'
        match = re.search(r"(\d+(?:\.\d+)?)\s*(?:years|yrs|year|yr)", text, re.IGNORECASE)
        if match:
            return float(match.group(1))
        
        # Match range '2-4 years' -> take 2
        match = re.search(r"(\d+(?:\.\d+)?)\s*-\s*\d+", text)
        if match:
            return float(match.group(1))
            
        # Match '3+'
        match = re.search(r"(\d+(?:\.\d+)?)\s*\+", text)
        if match:
            return float(match.group(1))
            
    return None


def final_scoring_and_shortlisting(state: dict) -> dict:
    """
    Final scoring + shortlist decision with experience flexibility upgrade.
    """

    # -----------------------------
    # Inputs
    # -----------------------------
    scores = state.get("match_scores", {})
    penalty = state.get("exaggeration_penalty", 0.0)

    resume_claims = state.get("resume_claims", {})
    skill_intelligence = state.get("skill_intelligence", {})
    interview_requirements = state.get("interview_requirements", {})
    competency_profile = state.get("competency_profile", {})
    evidence = state.get("evidence_map", {})

    # -----------------------------
    # Experience Flexibility Rule
    # -----------------------------
    jd_exp = _parse_years(competency_profile.get("experience_range", ""))
    cand_exp = _parse_years(resume_claims.get("experience_signals", []))
    
    exp_flexibility_applied = False
    exp_gap_detected = False
    
    if jd_exp and cand_exp:
        if cand_exp < jd_exp:
            exp_gap_detected = True
            # Flexibility: 30% lower bound (e.g. 2.1 for 3.0)
            is_within_flex_range = cand_exp >= (jd_exp * 0.70)
            # Strong skill alignment threshold
            is_skill_match_strong = scores.get("core_skill_match", 0.0) >= 0.70
            
            if is_within_flex_range and is_skill_match_strong:
                exp_flexibility_applied = True

    # -----------------------------
    # Weighted score
    # -----------------------------
    raw_score = (
        scores.get("core_skill_match", 0.0) * 0.5 +
        scores.get("project_alignment", 0.0) * 0.35 +
        scores.get("conceptual_alignment", 0.0) * 0.15
    )
    
    # Soft penalty for experience gap if flexibility wasn't enough to fully cover it
    # This keeps the score realistic while the decision remains flexible.
    exp_penalty = 0.0
    if exp_gap_detected and not exp_flexibility_applied:
        # Hard gap penalty
        exp_penalty = 0.05
    elif exp_gap_detected and exp_flexibility_applied:
        # Soft penalty
        exp_penalty = 0.02

    normalized_score = min(raw_score * 1.35, 1.0)   
    final_score = round(max(normalized_score - penalty - exp_penalty, 0.0), 3)
    
    # Shortlist Decision with Flexibility Override
    # -----------------------------
    # Explainability & Hard Skill Check
    # -----------------------------
    from utils.semantic_match import semantic_overlap
    
    core_skills = skill_intelligence.get("core_skills", [])
    resume_responsibilities = [
        resp
        for project in resume_claims.get("projects", [])
        for resp in project.get("responsibilities", [])
    ]

    matched_core = semantic_overlap(
        core_skills,
        resume_responsibilities,
        threshold=0.38
    )
    
    print(f"\n[DEBUG] Matched Core Skills ({len(matched_core)}):")
    for m in matched_core:
        print(f" - {m}")
    
    # -----------------------------
    # Final Shortlist Decision (RELAXED MODE)
    # -----------------------------
    base_threshold = 0.50  # Was 0.60
    
    # Rule 1: High enough score
    score_pass = final_score >= base_threshold
    
    # Rule 2: Experience Flexibility (Score >= 0.45 if strong skills)
    flex_pass = exp_flexibility_applied and final_score >= 0.45 # Was 0.55
    
    # Rule 3: Core Skill Override (At least 3 verified matched skills)
    skill_count_override = len(matched_core) >= 3 # Was 4
    
    # Rule 4: High Skill Score Override (Score >= 0.60)
    skill_score_override = scores.get("core_skill_match", 0.0) >= 0.60 # Was 0.70
    
    print(f"[DEBUG] Shortlist Logic: Score={final_score}, Matched={len(matched_core)}")
    print(f"[DEBUG] Rules: Score>0.50={score_pass}, Flex={flex_pass}, Count>=3={skill_count_override}, SkillScore>=0.60={skill_score_override}")
    
    if score_pass or flex_pass or skill_count_override or skill_score_override:
        shortlist_decision = True
    else:
        shortlist_decision = False

    # -----------------------------
    # Finalize Report Data
    # -----------------------------

    aligned_projects = resume_claims.get("projects", [])

    penalties_applied = {}
    if penalty > 0:
        penalties_applied = state.get("penalty_breakdown", {})

    # Determine reason note
    note = None
    if skill_count_override:
        note = f"Shortlisted via Strong Skill Count Override ({len(matched_core)} verified skills)"
    elif skill_score_override:
        note = f"Shortlisted via High Skill Match Score ({scores.get('core_skill_match', 0.0)})"
    elif flex_pass:
        note = "Shortlisted via skill-alignment flexibility"

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
            "penalties_applied": penalties_applied,
            "experience_metadata": {
                "jd_required_years": jd_exp,
                "candidate_years": cand_exp,
                "flexibility_applied": flex_pass,
                "note": note
            }
        }
    }
