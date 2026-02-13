



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
    # Hard Skill Match & Coverage Calculation
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
    
    # Calculate coverage ratio (e.g. 7 skills matched out of 10 = 0.7)
    total_jd_skills = len(core_skills) if core_skills else 1
    coverage_ratio = len(matched_core) / total_jd_skills
    
    # Blend semantic score with physical count (boosts score if many matches found)
    semantic_core_score = scores.get("core_skill_match", 0.0)
    blended_skill_score = (semantic_core_score * 0.3) + (coverage_ratio * 0.7)
    
    print(f"\n[DEBUG] Skill Coverage: {len(matched_core)}/{total_jd_skills} ({coverage_ratio:.2f})")
    print(f"[DEBUG] Core Match: Semantic={semantic_core_score:.3f}, Blended={blended_skill_score:.3f}")
    print(f"[DEBUG] Matched Skills List:")
    for m in matched_core:
        print(f" - {m}")

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
            # Flexibility: 30% lower bound
            is_within_flex_range = cand_exp >= (jd_exp * 0.70)
            # Use blended score for flexibility check
            is_skill_match_strong = blended_skill_score >= 0.65
            
            if is_within_flex_range and is_skill_match_strong:
                exp_flexibility_applied = True

    # -----------------------------
    # Final Score Calculation
    # -----------------------------
    # Increase weight of blended skill match
    raw_score = (
        blended_skill_score * 0.60 +        # Boosted weight for skills
        scores.get("project_alignment", 0.0) * 0.25 +
        scores.get("conceptual_alignment", 0.0) * 0.15
    )
    
    exp_penalty = 0.0
    if exp_gap_detected and not exp_flexibility_applied:
        exp_penalty = 0.05
    elif exp_gap_detected and exp_flexibility_applied:
        exp_penalty = 0.02

    # Final Score per User Request: Show the Blended Skill Match without penalties
    final_score = round(blended_skill_score, 3)
    
    # -----------------------------
    # Final Shortlist Decision (RELAXED MODE)
    # -----------------------------
    base_threshold = 0.60
    
    # Rule 1: High enough score
    score_pass = final_score >= base_threshold
    
    # Rule 2: Experience Flexibility
    flex_pass = exp_flexibility_applied and final_score >= 0.55
    
    # Rule 3: Core Skill Override
    skill_count_override = len(matched_core) >= 4
    
    # Force score upgrade if skill count is high
    if skill_count_override and final_score < 0.61:
        final_score = 0.61
        score_pass = True
        
    # Rule 4: High Blended Skill Score Override
    skill_score_override = blended_skill_score >= 0.60
    
    print(f"[DEBUG] Shortlist Logic: FinalScore={final_score}, MatchedCount={len(matched_core)}")
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
