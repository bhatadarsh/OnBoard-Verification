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

    CAT_MAP = {
        "sql": ["postgresql", "mysql", "oracle", "sql server", "sqlite", "mariadb"],
        "nosql": ["mongodb", "cassandra", "redis", "dynamodb", "couchbase", "nosql"],
        "backend": ["python", "java", "node.js", "javascript", "golang", "ruby", "rust", "fastapi", "django", "flask", "express.js", "backend"],
        "frontend": ["react", "vue", "angular", "html", "css", "javascript", "next.js", "frontend"],
        "api": ["rest", "restful", "api", "graphql", "grpc", "soap"],
        "cloud": ["aws", "azure", "gcp", "google cloud", "cloud", "docker", "kubernetes", "devops"],
        "database": ["postgresql", "mysql", "mongodb", "cassandra", "redis", "sql", "nosql", "db", "databases"],
        "databases": ["postgresql", "mysql", "mongodb", "cassandra", "redis", "sql", "nosql", "db", "database"]
    }

    intersected = []

    for topic in jd_focus:
        topic_lower = topic.lower()
        topic_toks = _norm_tokens(topic_lower)

        matched = False
        match_reason = ""

        # Check for direct category match first
        for skill in resume_skills:
            s_lower = skill.lower()
            
            # 1. Category-based matching
            for cat, members in CAT_MAP.items():
                if cat in topic_toks:
                    if any(m in s_lower for m in members) or any(s_lower in m for m in members):
                        matched = True
                        match_reason = f"Category match: topic component '{cat}' matches skill '{skill}'"
                        break
            if matched: break

            # 2. Token overlap and fuzzy matching
            skill_toks = _norm_tokens(s_lower)
            
            a = topic_lower in s_lower
            b = s_lower in topic_lower
            inter = set(topic_toks) & set(skill_toks)
            overlap_topic = len(inter) / (len(set(topic_toks)) or 1)
            overlap_skill = len(inter) / (len(set(skill_toks)) or 1)
            fuzz = _fuzzy(" ".join(topic_toks), " ".join(skill_toks))

            print(f"[DEBUG MATCH] topic='{topic_lower}' skill='{s_lower}' -> topic_in_skill={a}, skill_in_topic={b}, overlap_topic={overlap_topic:.2f}, overlap_skill={overlap_skill:.2f}, fuzz={fuzz:.2f}")

            if a or b or overlap_topic >= 0.35 or overlap_skill >= 0.35 or fuzz >= 0.6:
                matched = True
                match_reason = f"Heuristic match: overlap={overlap_topic:.2f}, fuzz={fuzz:.2f}"
                break

        if matched:
            print(f"[DEBUG] Found intersection: Topic='{topic}' matched because: {match_reason}")
            intersected.append({
                "topic": topic,
                "priority": "Primary",
                "confidence": "High",
                "evidence": resume_skills
            })

    print(f"[DEBUG] Intersected focus areas: {[t['topic'] for t in intersected]}")
    # persist into state in-place so downstream nodes see it
    state["intersected_focus_areas"] = intersected
    return state
