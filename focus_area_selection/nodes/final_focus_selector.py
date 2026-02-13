def select_final_focus_areas(state: dict) -> dict:
    """
    Selects the final 4–5 interview focus areas.
    These become the interview pillars for Stage 4.
    """

    depth_worthy = state.get("depth_worthy_focus_areas", [])
    print(f"[DEBUG] Final Selector received {len(depth_worthy)} items.")

    if not depth_worthy:
        print("[DEBUG] No depth-worthy focus areas found. Returning empty list.")
        return {
            **state,
            "final_focus_areas": []
        }

    # Priority ordering maps
    priority_rank = {"Primary": 0, "Secondary": 1}
    depth_rank = {"High": 0, "Medium": 1, "Foundation": 2, "Low": 3}
    confidence_rank = {"High": 0, "Medium": 1, "Low": 2}

    # Sort topics by interview value
    sorted_topics = sorted(
        depth_worthy,
        key=lambda x: (
            priority_rank.get(x["priority"], 2),
            depth_rank.get(x["depth_score"], 2),
            confidence_rank.get(x["confidence"], 2),
        )
    )

    # Select top 5 (Force 5 focus areas)
    selected = []
    seen_topics = set()
    
    # First pass: standard sorted order
    for t in sorted_topics:
        if len(selected) >= 5:
            break
        if t["topic"] not in seen_topics:
            selected.append(t)
            seen_topics.add(t["topic"])

    # Fallback: If still under 5, duplicate broadly (This shouldn't happen due to earlier fallback)
    # But just in case, we return whatever we have.
    if len(selected) < 5:
        print(f"[WARN] Could only find {len(selected)} unique focus areas even after fallback.")

    final_focus_areas = []

    for idx, topic in enumerate(selected, start=1):
        final_focus_areas.append({
            "order": idx,
            "topic": topic["topic"],
            "priority": topic["priority"],
            "depth_score": topic["depth_score"],
            "confidence": topic["confidence"],
            "evidence": topic.get("depth_signals", []),
            "interview_goal": (
                "Assess system design, decision-making, and tradeoff reasoning"
                if topic["depth_score"] == "High"
                else "Assess implementation understanding and practical experience"
            )
        })

    return {
        **state,
        "final_focus_areas": final_focus_areas
    }
