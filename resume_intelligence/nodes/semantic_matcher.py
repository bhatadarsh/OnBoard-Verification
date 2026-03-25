# import numpy as np
# from sentence_transformers import SentenceTransformer
# from sklearn.metrics.pairwise import cosine_similarity


# model = SentenceTransformer("all-MiniLM-L6-v2")


# def _embed(texts):
#     return model.encode(texts, normalize_embeddings=True)


# def _best_similarity(source_texts, target_texts):
#     """
#     For each source item, find the best semantic match in target items.
#     Return average of best matches.
#     """
#     if not source_texts or not target_texts:
#         return 0.0

#     src_emb = _embed(source_texts)
#     tgt_emb = _embed(target_texts)

#     sims = cosine_similarity(src_emb, tgt_emb)
#     best_scores = sims.max(axis=1)

#     return float(np.mean(best_scores))


# def semantic_match(state: dict, jd_context: dict) -> dict:
#     """
#     jd_context is Stage 1 output passed explicitly
#     """

#     resume_claims = state["resume_claims"]
#     interview_requirements = jd_context["interview_requirements"]
#     skill_intelligence = jd_context["skill_intelligence"]

#     # -------- Core Skill Match --------
#     core_skills = skill_intelligence["core_skills"]
#     resume_responsibilities = resume_claims["roles_and_responsibilities"]

#     core_skill_match = _best_similarity(
#         core_skills,
#         resume_responsibilities
#     )

#     # -------- Project Alignment --------
#     focus_areas = interview_requirements["primary_focus_areas"]
#     resume_projects = resume_claims["projects"]

#     project_alignment = _best_similarity(
#         focus_areas,
#         resume_projects
#     )

#     # -------- Conceptual Alignment --------
#     eval_dims = interview_requirements["evaluation_dimensions"]
#     experience_signals = resume_claims["experience_signals"]

#     conceptual_alignment = _best_similarity(
#         eval_dims,
#         experience_signals
#     )

#     return {
#         **state,
#         "match_scores": {
#             "core_skill_match": round(core_skill_match, 3),
#             "project_alignment": round(project_alignment, 3),
#             "conceptual_alignment": round(conceptual_alignment, 3)
#         }
#     }

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from utils.skill_expander import expand_core_skills
import re

# Load once (important for performance)
model = SentenceTransformer("all-MiniLM-L6-v2")


def _embed(texts):
    """
    Embed a list of strings safely.
    """
    if not texts:
        return np.array([])
    # Normalize texts to improve embedding alignment
    def normalize(t: str) -> str:
        t = t.lower()
        t = re.sub(r"[\r\n]+", " ", t)
        t = re.sub(r"[^a-z0-9\s]+", " ", t)
        t = re.sub(r"\s+", " ", t).strip()
        return t

    norm_texts = [normalize(t) for t in texts]
    return model.encode(norm_texts, normalize_embeddings=True)


def _best_similarity(source_texts, target_texts):
    """
    For each source item, find the best semantic match in target items.
    Returns the mean of best matches.
    """
    if not source_texts or not target_texts:
        return 0.0

    src_emb = _embed(source_texts)
    tgt_emb = _embed(target_texts)

    if src_emb.size == 0 or tgt_emb.size == 0:
        return 0.0

    sims = cosine_similarity(src_emb, tgt_emb)
    best_scores = sims.max(axis=1)

    return float(np.mean(best_scores))


def semantic_match(state: dict) -> dict:
    """
    LangGraph-compatible semantic matching node.

    Computes 3 independent semantic signals:
    - Core skill match
    - Project alignment
    - Conceptual alignment
    """

    resume_claims = state.get("resume_claims", {})
    interview_requirements = state.get("interview_requirements", {})
    skill_intelligence = state.get("skill_intelligence", {})

    # --------------------------------------------------
    # DEBUG: Raw core skills from JD
    # --------------------------------------------------
    raw_core_skills = skill_intelligence.get("core_skills", [])
    print("\n[DEBUG] Raw core skills from JD:")
    for s in raw_core_skills:
        print(" -", s)

    # --------------------------------------------------
    # Core Skill Match (expanded)
    # --------------------------------------------------
    expanded_core_skills = expand_core_skills(raw_core_skills)

    print("\n[DEBUG] Expanded core skills:")
    for s in expanded_core_skills:
        print(" -", s)

    resume_responsibilities = [
        resp
        for project in resume_claims.get("projects", [])
        for resp in project.get("responsibilities", [])
    ]

    print("\n[DEBUG] Resume responsibilities:")
    for r in resume_responsibilities:
        print(" -", r)

    core_skill_match = _best_similarity(
        expanded_core_skills,
        resume_responsibilities
    )

    # --------------------------------------------------
    # Project Alignment
    # --------------------------------------------------
    focus_areas = interview_requirements.get("primary_focus_areas", [])

    # Expand focus areas to include evaluable phrases matching resume wording
    expanded_focus_areas = expand_core_skills(focus_areas)

    print("\n[DEBUG] Interview focus areas:")
    for f in focus_areas:
        print(" -", f)

    print("\n[DEBUG] Expanded focus areas:")
    for f in expanded_focus_areas:
        print(" -", f)

    resume_project_texts = [
        f"{project.get('project_name', '')}: {' '.join(project.get('responsibilities', []))}"
        for project in resume_claims.get("projects", [])
    ]

    project_alignment = _best_similarity(
        expanded_focus_areas,
        resume_project_texts
    )

    # --------------------------------------------------
    # Conceptual Alignment
    # --------------------------------------------------
    eval_dims = interview_requirements.get("evaluation_dimensions", [])

    print("\n[DEBUG] Evaluation dimensions:")
    for e in eval_dims:
        print(" -", e)

    experience_signals = resume_claims.get("experience_signals", [])

    if not experience_signals:
        experience_signals = resume_responsibilities

    conceptual_alignment = _best_similarity(
        eval_dims,
        experience_signals
    )

    # --------------------------------------------------
    # FINAL DEBUG SUMMARY
    # --------------------------------------------------
    print("\n[DEBUG] Semantic scores:")
    print(" core_skill_match     =", round(core_skill_match, 3))
    print(" project_alignment    =", round(project_alignment, 3))
    print(" conceptual_alignment =", round(conceptual_alignment, 3))

    return {
        **state,
        "match_scores": {
            "core_skill_match": round(core_skill_match, 3),
            "project_alignment": round(project_alignment, 3),
            "conceptual_alignment": round(conceptual_alignment, 3),
        }
    }
