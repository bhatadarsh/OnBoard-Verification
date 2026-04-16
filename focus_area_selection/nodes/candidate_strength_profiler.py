def profile_candidate_strengths(state: dict) -> dict:
    """
    Identifies and ranks candidate strengths that are:
    - Relevant to JD
    - Supported by resume evidence
    - Strong enough for deep interview questioning
    """

    interview_requirements = state["interview_requirements"]
    resume_claims = state["resume_claims"]
    match_scores = state["match_scores"]

    focus_areas = interview_requirements.get("primary_focus_areas", [])

    # Flatten project evidence
    project_evidence = [
        f"{project.get('project_name', '')}: {' '.join(project.get('responsibilities', []))}"
        for project in resume_claims.get("projects", [])
    ]

    strengths = []

    for area in focus_areas:
        evidence_hits = [
            ev for ev in project_evidence
            if area.lower() in ev.lower()
        ]

        # Confidence assignment (human-like)
        if match_scores["project_alignment"] >= 0.75 and evidence_hits:
            confidence = "High"
        elif match_scores["project_alignment"] >= 0.55:
            confidence = "Medium"
        else:
            confidence = "Low"

        if confidence != "Low":
            strengths.append({
                "area": area,
                "confidence": confidence,
                "evidence": evidence_hits[:2],  # limit noise
                "reason": (
                    "Strong project alignment"
                    if confidence == "High"
                    else "Moderate alignment with resume evidence"
                )
            })

    return {
        **state,
        "candidate_strengths": strengths
    }
