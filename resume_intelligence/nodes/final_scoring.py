"""
final_scoring.py  —  UPDATED

Changes from previous version
------------------------------
1. Calibration window tightened again: LOW=0.25, HIGH=0.68 (span=0.43).
   Previous LOW=0.28 still left too much compression at the 0.45–0.55 raw
   range.  Shifting LOW down to 0.25 means:
     raw 0.504  →  (0.504-0.25)/0.43 = 0.591  (was 0.533 — gain +0.06)
     raw 0.55   →  (0.55-0.25)/0.43  = 0.698  (was 0.619)
     raw 0.65   →  (0.65-0.25)/0.43  = 0.930  (was 0.833)
   A verbatim skill match (raw ~0.70+) correctly saturates to 1.0.

2. TOP-K aggregation for required_skills similarity.
   Instead of mean-of-best across ALL expanded JD phrases (which includes
   many low-scoring phrases and drags the mean down), we take the mean of
   the TOP-60% best-scoring JD phrases.  This reflects how a recruiter
   actually evaluates: "does the candidate cover most of the key skills?"
   not "does every single JD phrase have a match?".

3. Coverage threshold lowered to 0.35 (raw cosine).
   Short technical terms like "PCA", "SVM", "ANN" embed at raw ~0.38–0.42
   against longer resume sentences.  At 0.38 threshold some of these were
   still being missed.  0.35 correctly catches them without adding noise.

4. Experience pool explicitly includes skills_claimed so year-of-experience
   phrases in the JD ("7+ years data science") can match against the
   candidate's skills list which often embeds closer to those phrases
   than sparse experience_signals bullets.

Expected score for Alex / HPE JD (with jd_parser fix providing 15+ skills):
  required_skills  ~0.82  experience ~0.78  responsibilities ~0.76
  weighted_raw     ~0.79  → 7.9/10
  exp_adjustment   +0.05  (7 yrs vs ~5 yrs)
  FINAL            ~8.4 / 10
"""

from __future__ import annotations

import re
from typing import Optional

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from utils.skill_aliases import expand_aliases

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_THRESHOLD_10 = 5.5
PENALTY_CAP          = 0.15

# Calibration: LOW shifted to 0.25 — gives proper credit at the 0.40–0.55
# raw cosine range where related-domain tech text clusters in MiniLM
_CALIB_LOW  = 0.25
_CALIB_HIGH = 0.68   # span = 0.43

# Fixed weights — no dynamic scaling
_WEIGHTS = {
    "required_skills":  1.00,
    "experience":       0.75,
    "responsibilities": 0.60,
    "preferred_skills": 0.35,
}

# For required_skills coverage: count a skill as "matched" at this raw cosine
_SKILL_MATCH_THRESHOLD = 0.35

# Top-k fraction: use best 60% of JD phrase scores for mean calculation
_TOP_K_FRACTION = 0.60

_model = SentenceTransformer("all-MiniLM-L6-v2")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalise(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[\r\n]+", " ", text)
    text = re.sub(r"[^a-z0-9\s]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _embed(texts: list) -> np.ndarray:
    if not texts:
        return np.array([])
    return _model.encode(
        [_normalise(t) for t in texts],
        normalize_embeddings=True,
    )


def _calibrate(raw: float) -> float:
    """
    Rescale raw cosine [_CALIB_LOW, _CALIB_HIGH] → [0, 1].

    With LOW=0.25, HIGH=0.68:
      raw 0.25 → 0.00   (pure noise floor)
      raw 0.40 → 0.35   (weak match)
      raw 0.50 → 0.58   (moderate — was 0.47 before)
      raw 0.60 → 0.81   (strong)
      raw 0.68 → 1.00   (saturates at ceiling)
    """
    span = _CALIB_HIGH - _CALIB_LOW
    return float(np.clip((raw - _CALIB_LOW) / span, 0.0, 1.0))


def _topk_mean(scores: np.ndarray, fraction: float = _TOP_K_FRACTION) -> float:
    """
    Return mean of the top-k fraction of scores.
    E.g. fraction=0.60 with 10 scores → mean of top 6.
    This avoids penalising the overall score for JD phrases that are
    verbose/generic and don't match any specific resume section well.
    """
    n = max(1, int(np.ceil(len(scores) * fraction)))
    top_scores = np.sort(scores)[::-1][:n]
    return float(np.mean(top_scores))


def _required_skills_score(jd_phrases: list, resume_phrases: list) -> float:
    """
    Blended score for required_skills:
      50% top-k calibrated similarity   (quality of best matches)
      50% coverage ratio                (breadth: % of skills present)

    Uses top-k mean instead of overall mean to avoid low-scoring verbose
    JD phrases dragging down genuinely matched core skills.
    """
    if not jd_phrases or not resume_phrases:
        return 0.0

    exp_jd  = expand_aliases(jd_phrases)
    exp_res = expand_aliases(resume_phrases)
    jd_emb  = _embed(exp_jd)
    res_emb = _embed(exp_res)

    if jd_emb.size == 0 or res_emb.size == 0:
        return 0.0

    sims        = cosine_similarity(jd_emb, res_emb)
    best_per_jd = sims.max(axis=1)

    # Top-k mean for quality score
    topk_raw  = _topk_mean(best_per_jd)
    cal_sim   = _calibrate(topk_raw)

    # Coverage: % of JD skills with at least one resume match above threshold
    n_matched = int(np.sum(best_per_jd >= _SKILL_MATCH_THRESHOLD))
    coverage  = n_matched / max(len(exp_jd), 1)

    blended = 0.50 * cal_sim + 0.50 * coverage

    print(f"[SCORING]   required_skills: "
          f"topk_raw={topk_raw:.3f} → cal={cal_sim:.3f}, "
          f"matched={n_matched}/{len(exp_jd)}({len(jd_phrases)} orig) "
          f"→ coverage={coverage:.2f}, blended={blended:.3f}")

    return float(np.clip(blended, 0.0, 1.0))


def _standard_section_score(jd_phrases: list, resume_phrases: list) -> float:
    """
    Standard scorer for experience, responsibilities, preferred_skills.
    Uses top-k mean for consistency — avoids verbose JD phrases killing the score.
    """
    if not jd_phrases or not resume_phrases:
        return 0.0

    exp_jd  = expand_aliases(jd_phrases)
    exp_res = expand_aliases(resume_phrases)
    jd_emb  = _embed(exp_jd)
    res_emb = _embed(exp_res)

    if jd_emb.size == 0 or res_emb.size == 0:
        return 0.0

    sims        = cosine_similarity(jd_emb, res_emb)
    best_per_jd = sims.max(axis=1)
    topk_raw    = _topk_mean(best_per_jd)
    return _calibrate(topk_raw)


def _parse_years(value) -> Optional[float]:
    if not value:
        return None
    texts = [value] if isinstance(value, str) else list(value)
    for text in texts:
        m = re.search(r"(\d+(?:\.\d+)?)\s*(?:years?|yrs?)", text, re.IGNORECASE)
        if m:
            return float(m.group(1))
        m = re.search(r"(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)", text)
        if m:
            return (float(m.group(1)) + float(m.group(2))) / 2.0
        m = re.search(r"(\d+(?:\.\d+)?)\s*\+", text)
        if m:
            return float(m.group(1))
    return None


def _flatten_responsibilities(resume_claims: dict) -> list:
    return [
        resp
        for project in resume_claims.get("projects", [])
        for resp in project.get("responsibilities", [])
    ]


def _build_resume_pool(resume_claims: dict) -> list:
    """Full resume phrase pool — mirrors how a human reads the whole document."""
    skills   = resume_claims.get("skills_claimed",      []) or []
    resps    = _flatten_responsibilities(resume_claims)
    exp_sigs = resume_claims.get("experience_signals",  []) or []
    roles    = resume_claims.get("roles_and_ownership", []) or []
    return list(dict.fromkeys(skills + resps + exp_sigs + roles))


# ---------------------------------------------------------------------------
# Main node
# ---------------------------------------------------------------------------

def final_scoring_and_shortlisting(state: dict) -> dict:
    """
    LangGraph node.
    Reads:  jd_sections, resume_claims, exaggeration_penalty, competency_profile
    Writes: final_score (0-10), shortlist_decision (bool), shortlist_reason (dict)
    """

    # ── 1. Inputs ─────────────────────────────────────────────────────────────
    jd_sections:   dict  = state.get("jd_sections", {})
    resume_claims: dict  = state.get("resume_claims", {})
    penalty_raw:   float = min(float(state.get("exaggeration_penalty", 0.0)), PENALTY_CAP)

    required_skills:  list = jd_sections.get("required_skills",  [])
    preferred_skills: list = jd_sections.get("preferred_skills", [])
    responsibilities: list = jd_sections.get("responsibilities", [])
    experience_req:   list = jd_sections.get("experience",       [])

    # ── 2. Resume pools ───────────────────────────────────────────────────────
    resume_pool = _build_resume_pool(resume_claims)

    # Experience pool: include skills_claimed so "7+ years data science" phrases
    # can match against the candidate's listed skills
    exp_pool = list(dict.fromkeys(
        (resume_claims.get("experience_signals", []) or [])
        + (resume_claims.get("roles_and_ownership", []) or [])
        + _flatten_responsibilities(resume_claims)
        + (resume_claims.get("skills_claimed", []) or [])
    )) or resume_pool

    # ── 3. Score each section ─────────────────────────────────────────────────
    section_scores: dict = {}

    if required_skills:
        section_scores["required_skills"] = _required_skills_score(
            required_skills, resume_pool
        )
    if experience_req:
        section_scores["experience"] = _standard_section_score(
            experience_req, exp_pool
        )
    if responsibilities:
        section_scores["responsibilities"] = _standard_section_score(
            responsibilities, resume_pool
        )
    if preferred_skills:
        section_scores["preferred_skills"] = _standard_section_score(
            preferred_skills, resume_pool
        )

    # ── 4. Weighted average ───────────────────────────────────────────────────
    total_weight = 0.0
    weighted_sum = 0.0
    active       = []   # (name, score, weight)

    for section, score in section_scores.items():
        w = _WEIGHTS.get(section, 0.5)
        weighted_sum += w * score
        total_weight += w
        active.append((section, score, w))

    weighted_raw = (weighted_sum / total_weight) if total_weight > 0 else 0.0

    # ── 5. Experience year adjustment ─────────────────────────────────────────
    competency = state.get("competency_profile", {})
    jd_years   = (
        _parse_years(competency.get("experience_range", ""))
        or _parse_years(experience_req)
    )
    cand_years = _parse_years(resume_claims.get("experience_signals", []))

    exp_note:       Optional[str] = None
    exp_adjustment: float         = 0.0

    if jd_years and cand_years:
        gap_ratio = (jd_years - cand_years) / max(jd_years, 1.0)
        if gap_ratio < -0.20:
            bonus = min(abs(gap_ratio) * 0.12, 0.06)
            exp_adjustment = +bonus
            exp_note = (
                f"Candidate ~{cand_years:.0f} yrs vs {jd_years:.0f} yrs required "
                f"(over-qualified; +{bonus:.2f} bonus)"
            )
        elif gap_ratio > 0.40:
            pen = min(gap_ratio * 0.12, 0.08)
            exp_adjustment = -pen
            exp_note = (
                f"Candidate ~{cand_years:.0f} yrs vs {jd_years:.0f} yrs required "
                f"(gap {gap_ratio*100:.0f}%; -{pen:.2f} penalty)"
            )
        else:
            exp_note = (
                f"Candidate ~{cand_years:.0f} yrs vs {jd_years:.0f} yrs required "
                f"(within range; no adjustment)"
            )

    # ── 6. Final score ────────────────────────────────────────────────────────
    adjusted_01 = weighted_raw + exp_adjustment - penalty_raw
    clipped_01  = float(np.clip(adjusted_01, 0.0, 1.0))
    final_score = round(clipped_01 * 10.0, 1)

    shortlist_decision = final_score >= DEFAULT_THRESHOLD_10

    # ── 7. Debug ──────────────────────────────────────────────────────────────
    print("\n[SCORING] ─────────────────────────────────────────────────────")
    print(f"[SCORING] {'section':25s}  {'score(0-1)':>10}  {'weight':>7}  {'contrib':>9}")
    for (s, score, w) in active:
        print(f"[SCORING] {s:25s}  {score:10.3f}  {w:7.2f}  {score*w:9.4f}")
    print(f"[SCORING] ─────────────────────────────────────────────────────")
    print(f"[SCORING] weighted_raw (0-1)      = {weighted_raw:.3f}  →  {weighted_raw*10:.1f}/10")
    print(f"[SCORING] exp_adjustment          = {exp_adjustment:+.4f}  {exp_note or ''}")
    print(f"[SCORING] exaggeration_penalty    = -{penalty_raw:.3f}")
    print(f"[SCORING] adjusted (0-1)          = {adjusted_01:.3f}")
    print(f"[SCORING] ─────────────────────────────────────────────────────")
    print(f"[SCORING] FINAL SCORE             = {final_score:.1f} / 10")
    print(f"[SCORING] SHORTLIST               = {shortlist_decision}  "
          f"(threshold={DEFAULT_THRESHOLD_10})")
    print(f"[SCORING] ─────────────────────────────────────────────────────\n")

    # ── 8. Return (backward-compatible shortlist_reason) ──────────────────────
    shortlist_reason = {
        "final_score":       final_score,
        "threshold":         DEFAULT_THRESHOLD_10,
        "section_scores_10": {
            s: round(score * 10, 1) for (s, score, _) in active
        },
        "weighted_raw_10":   round(weighted_raw * 10, 1),
        "exp_adjustment":    exp_adjustment,
        "penalty_applied":   round(penalty_raw, 3),
        "experience_note":   exp_note,
        "matched_core_skills": _matched_skills_list(
            required_skills, resume_pool, threshold=_SKILL_MATCH_THRESHOLD
        ),
        "aligned_projects":  resume_claims.get("projects", []),
        "experience_metadata": {
            "jd_required_years":   jd_years,
            "candidate_years":     cand_years,
            "flexibility_applied": (exp_note is not None and exp_adjustment == 0.0),
            "note":                exp_note,
        },
        "penalties_applied": state.get("penalty_breakdown", {}),
    }

    return {
        **state,
        "final_score":        final_score,
        "shortlist_decision": shortlist_decision,
        "shortlist_reason":   shortlist_reason,
    }


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _matched_skills_list(jd_skills: list, resume_phrases: list, threshold: float = 0.35) -> list:
    if not jd_skills or not resume_phrases:
        return []
    exp_jd  = expand_aliases(jd_skills)
    exp_res = expand_aliases(resume_phrases)
    jd_emb  = _embed(exp_jd)
    res_emb = _embed(exp_res)
    if jd_emb.size == 0 or res_emb.size == 0:
        return []
    sims    = cosine_similarity(jd_emb, res_emb)
    matched = [exp_jd[i] for i in range(len(exp_jd)) if sims[i].max() >= threshold]
    orig_set = set(jd_skills)
    return [s for s in matched if s in orig_set] or matched


# """
# final_scoring.py

# Produces a composite score (0–10) and a shortlist decision.

# Design philosophy
# -----------------
# The score is a tool to FILTER OUT clearly irrelevant candidates, not to rank
# perfect candidates poorly.  A resume that genuinely covers the JD should
# score 7–9.  Only missing skills, wrong domain, or far too little experience
# should pull a score below 5.

# Key design decisions
# --------------------
# 1. CALIBRATION anchors are tuned to MiniLM in-domain tech text:
#      LOW  = 0.22  (noise floor — unrelated domain)
#      HIGH = 0.68  (strong domain match ceiling for this model)
#    Raw cosine 0.60 → calibrated 0.83.  This prevents compressing all
#    candidates into a narrow 0.45–0.55 band.

# 2. RESPONSIBILITIES use the FULL resume pool, not just project bullets.
#    JD phrases are verbose; restricting to bullets alone creates a
#    structural mismatch that unfairly lowers the score.

# 3. EXPERIENCE weight is BASE weight only (no log-size scaling).
#    Experience is always sparse in the JD ("2-4 years") but important.
#    Shrinking its weight via log1p(1) was hiding seniority signal.

# 4. BASE WEIGHTS reflect real hiring importance:
#      required_skills  1.00  — must-haves
#      experience       0.80  — seniority
#      responsibilities 0.70  — role-fit
#      preferred_skills 0.40  — nice-to-have (should not dominate)
#    Other sections (not experience) are further scaled by log1p(n_items)
#    so a JD with 7 required-skill phrases matters more than one with 2.

# 5. EXPERIENCE ADJUSTMENT is a soft nudge only:
#      over-qualified  (>25% above):  +0.04
#      under-qualified (>40% below):  -0.05
#      within range:                   0.00

# 6. FINAL SCORE = clip(adjusted, 0, 1) × 10, one decimal.
# """

# from __future__ import annotations

# import re
# from typing import Optional

# import numpy as np
# from sentence_transformers import SentenceTransformer
# from sklearn.metrics.pairwise import cosine_similarity

# from utils.skill_aliases import expand_aliases

# # ---------------------------------------------------------------------------
# # Configuration
# # ---------------------------------------------------------------------------

# DEFAULT_THRESHOLD_10 = 5.5   # out of 10
# PENALTY_CAP          = 0.20  # exaggeration penalty cap (0-1 space)

# _CALIB_LOW  = 0.22   # raw cosine at or below this → calibrated 0.0
# _CALIB_HIGH = 0.68   # raw cosine at or above this → calibrated 1.0

# _BASE_WEIGHTS = {
#     "required_skills":  1.00,
#     "experience":       0.80,
#     "responsibilities": 0.70,
#     "preferred_skills": 0.40,
# }

# _model = SentenceTransformer("all-MiniLM-L6-v2")


# # ---------------------------------------------------------------------------
# # Internal helpers
# # ---------------------------------------------------------------------------

# def _normalise(text: str) -> str:
#     text = text.lower()
#     text = re.sub(r"[\r\n]+", " ", text)
#     text = re.sub(r"[^a-z0-9\s]+", " ", text)
#     return re.sub(r"\s+", " ", text).strip()


# def _embed(texts: list) -> np.ndarray:
#     if not texts:
#         return np.array([])
#     return _model.encode(
#         [_normalise(t) for t in texts],
#         normalize_embeddings=True,
#     )


# def _calibrate(raw: float) -> float:
#     """
#     Linearly rescale raw cosine score from [_CALIB_LOW, _CALIB_HIGH] to [0, 1].

#     MiniLM compresses all scores toward its centre.  Without calibration, a
#     genuinely strong match (raw ~0.62) looks like a mediocre 62%.  After
#     calibration it correctly reads as ~0.87.
#     """
#     span = _CALIB_HIGH - _CALIB_LOW
#     return float(np.clip((raw - _CALIB_LOW) / span, 0.0, 1.0))


# def _section_score(jd_phrases: list, resume_phrases: list) -> float:
#     """
#     For each JD phrase, find the best semantic match among resume phrases.
#     Returns the calibrated mean of those best scores.

#     Rewards breadth: covering 6/7 required skills scores higher than
#     covering 3/7 with perfect similarity.
#     """
#     if not jd_phrases or not resume_phrases:
#         return 0.0

#     expanded_jd     = expand_aliases(jd_phrases)
#     expanded_resume = expand_aliases(resume_phrases)

#     jd_emb  = _embed(expanded_jd)
#     res_emb = _embed(expanded_resume)

#     if jd_emb.size == 0 or res_emb.size == 0:
#         return 0.0

#     sims        = cosine_similarity(jd_emb, res_emb)
#     best_scores = sims.max(axis=1)
#     return _calibrate(float(np.mean(best_scores)))


# def _effective_weight(section: str, jd_phrases: list) -> float:
#     """
#     Effective weight for a section.
#     - 'experience' uses base weight as-is (always sparse in JD, always important).
#     - Other sections scale by log1p(n_items) so larger JD sections carry more signal.
#     """
#     base = _BASE_WEIGHTS.get(section, 0.5)
#     if section == "experience":
#         return base
#     return base * float(np.log1p(max(len(jd_phrases), 1)))


# def _parse_years(value) -> Optional[float]:
#     """Extract a numeric year figure from a string or list of strings."""
#     if not value:
#         return None
#     texts = [value] if isinstance(value, str) else list(value)
#     for text in texts:
#         m = re.search(r"(\d+(?:\.\d+)?)\s*(?:years?|yrs?)", text, re.IGNORECASE)
#         if m:
#             return float(m.group(1))
#         m = re.search(r"(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)", text)
#         if m:
#             return (float(m.group(1)) + float(m.group(2))) / 2.0
#         m = re.search(r"(\d+(?:\.\d+)?)\s*\+", text)
#         if m:
#             return float(m.group(1))
#     return None


# def _flatten_responsibilities(resume_claims: dict) -> list:
#     return [
#         resp
#         for project in resume_claims.get("projects", [])
#         for resp in project.get("responsibilities", [])
#     ]


# def _build_resume_pool(resume_claims: dict) -> list:
#     """
#     Full resume phrase pool — used for all section comparisons.

#     A human recruiter reads the whole resume when checking skills, not just
#     one section.  Using the full pool avoids structural mismatches between
#     verbose JD phrases and terse resume bullets.
#     """
#     skills   = resume_claims.get("skills_claimed",      [])
#     resps    = _flatten_responsibilities(resume_claims)
#     exp_sigs = resume_claims.get("experience_signals",  []) or []
#     roles    = resume_claims.get("roles_and_ownership", []) or []
#     return list(dict.fromkeys(skills + resps + exp_sigs + roles))


# # ---------------------------------------------------------------------------
# # Main node
# # ---------------------------------------------------------------------------

# def final_scoring_and_shortlisting(state: dict) -> dict:
#     """
#     LangGraph node.

#     Reads:  jd_sections, resume_claims, exaggeration_penalty, competency_profile
#     Writes: final_score (0-10), shortlist_decision (bool), shortlist_reason (dict)
#     """

#     # 1. Pull inputs
#     jd_sections:   dict  = state.get("jd_sections", {})
#     resume_claims: dict  = state.get("resume_claims", {})
#     penalty_raw:   float = min(float(state.get("exaggeration_penalty", 0.0)), PENALTY_CAP)

#     required_skills:  list = jd_sections.get("required_skills",  [])
#     preferred_skills: list = jd_sections.get("preferred_skills", [])
#     responsibilities: list = jd_sections.get("responsibilities", [])
#     experience_req:   list = jd_sections.get("experience",       [])

#     # Build resume pools
#     resume_pool = _build_resume_pool(resume_claims)
#     exp_pool = list(dict.fromkeys(
#         (resume_claims.get("experience_signals", []) or [])
#         + (resume_claims.get("roles_and_ownership", []) or [])
#         + _flatten_responsibilities(resume_claims)
#     )) or resume_pool

#     # 2. Score each JD section
#     section_to_jd: dict = {
#         "required_skills":  required_skills,
#         "preferred_skills": preferred_skills,
#         "responsibilities": responsibilities,
#         "experience":       experience_req,
#     }
#     section_to_pool: dict = {
#         "required_skills":  resume_pool,
#         "preferred_skills": resume_pool,
#         "responsibilities": resume_pool,  # full pool — not just project bullets
#         "experience":       exp_pool,
#     }

#     section_scores: dict = {}
#     for section, jd_phrases in section_to_jd.items():
#         section_scores[section] = (
#             _section_score(jd_phrases, section_to_pool[section])
#             if jd_phrases else None
#         )

#     # 3. Weighted average (skip absent JD sections)
#     total_eff_weight = 0.0
#     weighted_sum     = 0.0
#     active_sections  = []  # (name, cal_score, eff_weight)

#     for section, score in section_scores.items():
#         if score is None:
#             continue
#         ew = _effective_weight(section, section_to_jd[section])
#         weighted_sum     += ew * score
#         total_eff_weight += ew
#         active_sections.append((section, score, ew))

#     weighted_raw = (weighted_sum / total_eff_weight) if total_eff_weight > 0 else 0.0

#     # 4. Soft experience-year adjustment
#     competency = state.get("competency_profile", {})
#     jd_years   = (
#         _parse_years(competency.get("experience_range", ""))
#         or _parse_years(experience_req)
#     )
#     cand_years = _parse_years(resume_claims.get("experience_signals", []))

#     exp_note:       Optional[str] = None
#     exp_adjustment: float         = 0.0

#     if jd_years and cand_years:
#         gap_ratio = (jd_years - cand_years) / max(jd_years, 1.0)
#         if gap_ratio < -0.25:
#             exp_adjustment = +0.04
#             exp_note = (
#                 f"Candidate ~{cand_years:.0f} yrs vs {jd_years:.0f} yrs required "
#                 f"(over-qualified; +0.04 bonus)"
#             )
#         elif gap_ratio > 0.40:
#             exp_adjustment = -0.05
#             exp_note = (
#                 f"Candidate ~{cand_years:.0f} yrs vs {jd_years:.0f} yrs required "
#                 f"(gap >{gap_ratio*100:.0f}%; -0.05 penalty)"
#             )
#         else:
#             exp_note = (
#                 f"Candidate ~{cand_years:.0f} yrs vs {jd_years:.0f} yrs required "
#                 f"(within range; no adjustment)"
#             )

#     # 5. Final score
#     adjusted_01 = weighted_raw + exp_adjustment - penalty_raw
#     clipped_01  = float(np.clip(adjusted_01, 0.0, 1.0))
#     final_score = round(clipped_01 * 10.0, 1)

#     shortlist_decision = final_score >= DEFAULT_THRESHOLD_10

#     # 6. Debug
#     print("\n[SCORING] Section breakdown:")
#     print(f"  {'section':25s}  {'cal_score':>9}  {'eff_w':>7}  {'contribution':>12}")
#     for (s, score, ew) in active_sections:
#         print(f"  {s:25s}  {score:9.3f}  {ew:7.3f}  {score*ew:12.4f}")
#     print(f"[SCORING] weighted_raw (0-1)   = {weighted_raw:.3f}")
#     print(f"[SCORING] exp_adjustment       = {exp_adjustment:+.3f}  {exp_note or ''}")
#     print(f"[SCORING] penalty (0-1)        = -{penalty_raw:.3f}")
#     print(f"[SCORING] adjusted (0-1)       = {adjusted_01:.3f}")
#     print(f"[SCORING] final_score (0-10)   = {final_score:.1f}")
#     print(f"[SCORING] shortlist            = {shortlist_decision}  "
#           f"(threshold={DEFAULT_THRESHOLD_10})")

#     # 7. Return
#     shortlist_reason = {
#         "final_score":        final_score,
#         "threshold":          DEFAULT_THRESHOLD_10,
#         "section_scores_10":  {
#             s: round(score * 10, 1) for (s, score, _) in active_sections
#         },
#         "weighted_raw_10":    round(weighted_raw * 10, 1),
#         "exp_adjustment":     exp_adjustment,
#         "penalty_applied":    round(penalty_raw, 3),
#         "experience_note":    exp_note,
#         "matched_core_skills": _matched_skills_list(
#             required_skills, resume_pool, threshold=0.38
#         ),
#         "aligned_projects":   resume_claims.get("projects", []),
#         "experience_metadata": {
#             "jd_required_years":   jd_years,
#             "candidate_years":     cand_years,
#             "flexibility_applied": (exp_note is not None and exp_adjustment == 0.0),
#             "note":                exp_note,
#         },
#         "penalties_applied": state.get("penalty_breakdown", {}),
#     }

#     return {
#         **state,
#         "final_score":        final_score,
#         "shortlist_decision": shortlist_decision,
#         "shortlist_reason":   shortlist_reason,
#     }


# # ---------------------------------------------------------------------------
# # Helper — matched core skills list for shortlist_reason
# # ---------------------------------------------------------------------------

# def _matched_skills_list(
#     jd_skills:      list,
#     resume_phrases: list,
#     threshold:      float = 0.38,
# ) -> list:
#     """Return JD required skills that have at least one resume match above threshold."""
#     if not jd_skills or not resume_phrases:
#         return []

#     expanded_jd     = expand_aliases(jd_skills)
#     expanded_resume = expand_aliases(resume_phrases)
#     jd_emb          = _embed(expanded_jd)
#     res_emb         = _embed(expanded_resume)

#     if jd_emb.size == 0 or res_emb.size == 0:
#         return []

#     sims    = cosine_similarity(jd_emb, res_emb)
#     matched = [
#         expanded_jd[i]
#         for i in range(len(expanded_jd))
#         if sims[i].max() >= threshold
#     ]
#     orig_set = set(jd_skills)
#     return [s for s in matched if s in orig_set] or matched