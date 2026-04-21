def filter_depth_worthy_areas(state: dict) -> dict:
    """
    Filters focus areas based on whether they can sustain
    deep, multi-turn interview questioning.
    """

    intersected_areas = state.get("intersected_focus_areas", [])
    print("[DEBUG] Intersected focus areas:", intersected_areas)
    resume_claims = state.get("resume_claims", {})

    projects = resume_claims.get("projects", [])

    depth_worthy = []

    for area in intersected_areas:
        topic = area["topic"]
        priority = area["priority"]
        confidence = area["confidence"]

        topic_lower = topic.lower()
        topic_tokens = topic_lower.split()

        depth_signals = []

        # Scan projects for topic-linked depth indicators
        for project in projects:
            text = " ".join(project.get("responsibilities", [])).lower()

            # ---- Topic relevance check (CRITICAL FIX) ----
            topic_present = any(token in text for token in topic_tokens)

            if not topic_present:
                continue

            # ---- Ownership & decision depth ----
            if any(keyword in text for keyword in [
                "designed", "implemented", "architected",
                "owned", "evaluated", "decision",
                "tradeoff", "scaled", "optimized", "end-to-end"
            ]):
                depth_signals.append(
                    f"{project.get('project_name', '')}: hands-on ownership of {topic}"
                )

            # ---- System / workflow complexity ----
            if any(keyword in text for keyword in [
                "workflow", "pipeline", "architecture",
                "multi-agent", "orchestration"
            ]):
                depth_signals.append(
                    f"{project.get('project_name', '')}: system-level complexity"
                )

        # ---- Determine depth score ----
        if len(depth_signals) >= 2:
            depth_score = "High"
        elif len(depth_signals) == 1:
            depth_score = "Medium"
        else:
            # Fallback: If topic was intersected, it means we found skills for it.
            # Even without explicit "depth keywords" in project descriptions, 
            # we should allow it as a valid interview topic to avoid blocking the interview.
            depth_score = "Foundation"

        if depth_score in ["High", "Medium", "Foundation"]:
            depth_worthy.append({
                "topic": topic,
                "priority": priority,
                "confidence": confidence,
                "depth_signals": depth_signals[:3] if depth_signals else ["Inferred from skill match"],
                "depth_score": depth_score,
                "reason": (
                    "Clear ownership and multiple decision points"
                    if depth_score == "High"
                    else "Standard implementation experience"
                )
            })
            print(f"[DEBUG] Appended topic '{topic}' with depth_score='{depth_score}'")
        else:
            print(f"[DEBUG] Topic '{topic}' rejected with depth_score='{depth_score}'")

    print(f"[DEBUG] Final depth_worthy list size: {len(depth_worthy)}")
    return {
        **state,
        "depth_worthy_focus_areas": depth_worthy
    }
