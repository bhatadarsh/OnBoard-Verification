# def intersect_focus_areas(state: dict) -> dict:
#     """
#     Intersects candidate strengths with JD interview priorities.
#     Keeps only strengths that are relevant for THIS job.
#     """

#     candidate_strengths = state.get("candidate_strengths", [])
#     interview_requirements = state.get("interview_requirements", {})

#     primary_focus = interview_requirements.get("primary_focus_areas", [])
#     secondary_focus = interview_requirements.get("secondary_focus_areas", [])

#     intersected = []

#     for strength in candidate_strengths:
#         area = strength["area"]
#         confidence = strength["confidence"]
#         evidence = strength.get("evidence", [])

#         # Conservative filter: only strong or medium strengths
#         if confidence not in ("High", "Medium"):
#             continue

#         # Priority determination
#         if any(pf.lower() in area.lower() or area.lower() in pf.lower()
#                for pf in primary_focus):
#             priority = "Primary"
#         elif any(sf.lower() in area.lower() or area.lower() in sf.lower()
#                  for sf in secondary_focus):
#             priority = "Secondary"
#         else:
#             continue  # Not relevant to JD

#         intersected.append({
#             "topic": area,
#             "priority": priority,
#             "confidence": confidence,
#             "evidence": evidence,
#             "reason": (
#                 "Strong candidate strength aligned with JD primary focus"
#                 if priority == "Primary"
#                 else "Relevant candidate strength aligned with JD secondary focus"
#             )
#         })

#     return {
#         **state,
#         "intersected_focus_areas": intersected
#     }



def intersect_focus_areas(state: dict) -> dict:
    """
    Intersects JD focus areas with resume evidence.
    Produces interview-eligible focus topics.
    """

    interview_requirements = state.get("interview_requirements", {})
    skill_intelligence = state.get("skill_intelligence", {})
    resume_claims = state.get("resume_claims", {})

    jd_focus = interview_requirements.get("primary_focus_areas", [])
    resume_skills = resume_claims.get("skills_claimed", [])

    print("[DEBUG] JD focus:", jd_focus)
    print("[DEBUG] Resume skills:", resume_skills)

    import re
    from difflib import SequenceMatcher

    def _norm_tokens(text: str):
        t = text.lower()
        subs = {
            "apis": "api",
            "restful": "rest",
            "microservices": "microservice",
            "micro-services": "microservice",
            "auth": "authentication",
            "authn": "authentication",
            "authz": "authorization",
        }
        for k, v in subs.items():
            t = t.replace(k, v)
        t = re.sub(r"[^a-z0-9 ]+", " ", t)
        stop = {"and", "the", "to", "for", "with", "from", "using", "experience", "build", "implement", "design", "develop", "own", "owned", "improve", "debug", "optimize", "service", "services"}
        toks = [tok for tok in t.split() if len(tok) > 2 and tok not in stop]
        return toks

    def _fuzzy(a: str, b: str) -> float:
        return SequenceMatcher(None, a, b).ratio()

    intersected = []

    for topic in jd_focus:
        topic_lower = topic.lower()
        topic_toks = _norm_tokens(topic_lower)

        matched = False
        for skill in resume_skills:
            s = skill.lower()
            skill_toks = _norm_tokens(s)

            # exact substring checks
            a = topic_lower in s
            b = s in topic_lower

            # token overlap
            inter = set(topic_toks) & set(skill_toks)
            overlap_topic = len(inter) / (len(set(topic_toks)) or 1)
            overlap_skill = len(inter) / (len(set(skill_toks)) or 1)

            # fuzzy title match (fallback)
            fuzz = _fuzzy(" ".join(topic_toks), " ".join(skill_toks))

            print(f"[DEBUG MATCH] topic='{topic_lower}' skill='{s}' -> topic_in_skill={a}, skill_in_topic={b}, overlap_topic={overlap_topic:.2f}, overlap_skill={overlap_skill:.2f}, fuzz={fuzz:.2f}")

            if a or b or overlap_topic >= 0.35 or overlap_skill >= 0.35 or fuzz >= 0.6:
                matched = True
                print(f"[DEBUG] Matched topic '{topic}' with skill '{skill}' (tokens={list(inter)}, fuzz={fuzz:.2f})")
                break

        if matched:
            print(f"[DEBUG] Appending intersected topic: {topic}")
            intersected.append({
                "topic": topic,
                "priority": "Primary",
                "confidence": "High",
                "evidence": resume_skills
            })

    # persist into state in-place so downstream nodes see it
    state["intersected_focus_areas"] = intersected
    return state
