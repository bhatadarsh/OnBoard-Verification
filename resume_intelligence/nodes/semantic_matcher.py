"""
Node 4 — semantic_match
Computes three semantic similarity scores between JD context and resume claims
using sentence-transformers (MiniLM).
"""
import re
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from utils.skill_expander import expand_core_skills

# Load model once at import time — never inside the function
_model = SentenceTransformer("all-MiniLM-L6-v2")


def _normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[\r\n]+", " ", text)
    text = re.sub(r"[^a-z0-9\s]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _embed(texts: list[str]) -> np.ndarray:
    if not texts:
        return np.array([])
    return _model.encode([_normalize(t) for t in texts], normalize_embeddings=True)


def _best_mean_similarity(sources: list[str], targets: list[str]) -> float:
    """
    For each source item, find its best-matching target.
    Return the mean of those best scores.
    """
    if not sources or not targets:
        return 0.0
    src_emb = _embed(sources)
    tgt_emb = _embed(targets)
    if src_emb.size == 0 or tgt_emb.size == 0:
        return 0.0
    sims = cosine_similarity(src_emb, tgt_emb)
    return float(np.mean(sims.max(axis=1)))


def _resume_responsibilities(resume_claims: dict) -> list[str]:
    return [
        resp
        for project in resume_claims.get("projects", [])
        for resp in project.get("responsibilities", [])
    ]


def semantic_match(state: dict) -> dict:
    resume_claims = state.get("resume_claims", {})
    interview_requirements = state.get("interview_requirements", {})
    skill_intelligence = state.get("skill_intelligence", {})

    # --- Core skill match ---
    raw_core_skills = skill_intelligence.get("core_skills", [])
    expanded_skills = expand_core_skills(raw_core_skills)
    responsibilities = _resume_responsibilities(resume_claims)

    core_skill_match = _best_mean_similarity(expanded_skills, responsibilities)

    # --- Project alignment ---
    focus_areas = interview_requirements.get("primary_focus_areas", [])
    expanded_focus = expand_core_skills(focus_areas)
    project_texts = [
        f"{p.get('project_name', '')}: {' '.join(p.get('responsibilities', []))}"
        for p in resume_claims.get("projects", [])
    ]
    project_alignment = _best_mean_similarity(expanded_focus, project_texts)

    # --- Conceptual alignment ---
    eval_dims = interview_requirements.get("evaluation_dimensions", [])
    experience_signals = resume_claims.get("experience_signals", []) or responsibilities
    conceptual_alignment = _best_mean_similarity(eval_dims, experience_signals)

    scores = {
        "core_skill_match": round(core_skill_match, 3),
        "project_alignment": round(project_alignment, 3),
        "conceptual_alignment": round(conceptual_alignment, 3),
    }

    print(f"[semantic_match] {scores}")
    return {**state, "match_scores": scores}