"""
final_scoring.py

Produces a single composite score (0–1) and a shortlist decision.

Design principles
-----------------
1. JD sections drive weights — required_skills > experience > preferred_skills
   > responsibilities.  Weights come from jd_sections["weights"] so they can
   be tuned in one place (jd_parser.py / SECTION_WEIGHTS).

2. Alias-aware matching — "k8s" in the resume matches "kubernetes" in the JD.
   Handled by utils.skill_aliases before embedding comparison.

3. No hard override conditions or magic thresholds with special-case logic.
   The score is purely a weighted average of section scores.  One soft
   threshold decides shortlist: candidates at or above it are shortlisted,
   below it are not.  The threshold itself (DEFAULT_THRESHOLD) is the only
   tuning knob for the recruiter.

4. Candidate-friendly — we try to find alignment, not punish its absence.
   The exaggeration penalty is capped and applied after the base score so a
   strong match is never killed by minor overstatements.

Score anatomy
-------------
  section_score(section)  = mean of per-skill best-semantic-similarity scores
                            after alias expansion on both sides

  weighted_raw  = sum( weight_i * section_score_i ) / sum( weight_i )

  adjusted      = weighted_raw - exaggeration_penalty   (capped at 0.20)
                              +/- experience adjustment  (soft, max 0.05)

  final_score   = round(adjusted, 3), clipped to [0, 1]

  shortlist     = final_score >= DEFAULT_THRESHOLD
"""

from __future__ import annotations

import re
from typing import Optional

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from utils.skill_aliases import expand_aliases

# ---------------------------------------------------------------------------
# Configuration  (only tuning knobs — no other magic numbers in this file)
# ---------------------------------------------------------------------------
DEFAULT_THRESHOLD = 0.45   # tune to change selectivity
PENALTY_CAP       = 0.20   # exaggeration penalty never exceeds this

_model = SentenceTransformer("all-MiniLM-L6-v2")


# ---------------------------------------------------------------------------
# Internal helpers
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


def _section_score(jd_phrases: list, resume_phrases: list) -> float:
    """
    For each JD phrase find the best semantic match in the resume phrases.
    Return the mean of those best scores.

    Both sides are alias-expanded before embedding so "k8s" <-> "kubernetes"
    are treated as equivalent.
    """
    if not jd_phrases or not resume_phrases:
        return 0.0

    expanded_jd     = expand_aliases(jd_phrases)
    expanded_resume = expand_aliases(resume_phrases)

    jd_emb  = _embed(expanded_jd)
    res_emb = _embed(expanded_resume)

    if jd_emb.size == 0 or res_emb.size == 0:
        return 0.0

    sims        = cosine_similarity(jd_emb, res_emb)   # (n_jd, n_resume)
    best_scores = sims.max(axis=1)                      # best resume match per JD phrase
    return float(np.mean(best_scores))


def _parse_years(value) -> Optional[float]:
    """Extract a numeric year value from a string or list of strings."""
    if not value:
        return None
    texts = [value] if isinstance(value, str) else list(value)
    for text in texts:
        m = re.search(r"(\d+(?:\.\d+)?)\s*(?:years?|yrs?)", text, re.IGNORECASE)
        if m:
            return float(m.group(1))
        m = re.search(r"(\d+(?:\.\d+)?)\s*-\s*\d+", text)
        if m:
            return float(m.group(1))
        m = re.search(r"(\d+(?:\.\d+)?)\s*\+", text)
        if m:
            return float(m.group(1))
    return None


def _flatten_responsibilities(resume_claims: dict) -> list:
    """Pull all project responsibility strings out of resume_claims."""
    return [
        resp
        for project in resume_claims.get("projects", [])
        for resp in project.get("responsibilities", [])
    ]


# ---------------------------------------------------------------------------
# Main node
# ---------------------------------------------------------------------------

def final_scoring_and_shortlisting(state: dict) -> dict:
    """
    LangGraph node.

    Reads
    -----
    state["jd_sections"]          from jd_parser node
    state["resume_claims"]        from extract_resume_claims node
    state["evidence_map"]         from map_evidence node
    state["exaggeration_penalty"] from exaggeration_penalty node
    state["competency_profile"]   for experience year comparison (optional)

    Writes
    ------
    state["final_score"]          float 0-1
    state["shortlist_decision"]   bool
    state["shortlist_reason"]     dict with per-section breakdown
    """

    # ------------------------------------------------------------------
    # Pull inputs from state
    # ------------------------------------------------------------------
    jd_sections:   dict  = state.get("jd_sections", {})
    resume_claims: dict  = state.get("resume_claims", {})
    penalty:       float = min(
        float(state.get("exaggeration_penalty", 0.0)),
        PENALTY_CAP,
    )

    # Section lists from the parsed JD
    required_skills:  list = jd_sections.get("required_skills",  [])
    preferred_skills: list = jd_sections.get("preferred_skills", [])
    responsibilities: list = jd_sections.get("responsibilities", [])
    experience_req:   list = jd_sections.get("experience",       [])
    weights:          dict = jd_sections.get("weights", {
        "required_skills":  1.0,
        "preferred_skills": 0.6,
        "responsibilities": 0.5,
        "experience":       0.8,
    })
    print(required_skills,preferred_skills,responsibilities,experience_req)
    # Resume signals — build a broad pool to match against
    resume_skills   = resume_claims.get("skills_claimed", [])
    resume_resps    = _flatten_responsibilities(resume_claims)
    resume_exp_sigs = resume_claims.get("experience_signals", []) or resume_resps
    # Deduplicated union of all resume text for required/preferred matching
    resume_all = list(dict.fromkeys(resume_skills + resume_resps + resume_exp_sigs))

    # ------------------------------------------------------------------
    # Score each JD section against the resume
    # ------------------------------------------------------------------
    section_scores: dict = {}

    # Required skills — compare against everything on the resume
    section_scores["required_skills"] = _section_score(
        required_skills, resume_all
    ) if required_skills else 0.0

    # Preferred skills — same broad pool
    section_scores["preferred_skills"] = _section_score(
        preferred_skills, resume_all
    ) if preferred_skills else 0.0

    # Responsibilities — JD duties vs resume project work
    section_scores["responsibilities"] = _section_score(
        responsibilities, resume_resps or resume_all
    ) if responsibilities else 0.0

    # Experience — JD experience phrases vs resume experience signals
    section_scores["experience"] = _section_score(
        experience_req, resume_exp_sigs or resume_all
    ) if experience_req else 0.0

    print("Detials of employ uploaded")
    print(resume_claims)
    # ------------------------------------
    # ------------------------------
    # Weighted average — only over sections actually present in the JD
    # ------------------------------------------------------------------
    total_weight  = 0.0
    weighted_sum  = 0.0
    active_sections = []

    section_to_data = {
        "required_skills":  required_skills,
        "preferred_skills": preferred_skills,
        "responsibilities": responsibilities,
        "experience":       experience_req,
    }

    for section, score in section_scores.items():
        if not section_to_data.get(section):
            # Section absent from JD — don't count it at all
            continue
        w = weights.get(section, 0.0)
        weighted_sum  += w * score
        total_weight  += w
        active_sections.append(section)

    weighted_raw = (weighted_sum / total_weight) if total_weight > 0 else 0.0

    # ------------------------------------------------------------------
    # Soft experience-year adjustment (not a hard gate)
    # ------------------------------------------------------------------
    competency = state.get("competency_profile", {})
    jd_years   = _parse_years(competency.get("experience_range", "")) or \
                 _parse_years(experience_req)
    cand_years = _parse_years(resume_claims.get("experience_signals", []))

    exp_note: Optional[str] = None
    exp_adjustment = 0.0

    if jd_years and cand_years:
        gap_ratio = (jd_years - cand_years) / jd_years
        if gap_ratio > 0.30:
            # More than 30% short — apply a small penalty
            exp_adjustment = -0.05
            exp_note = (
                f"Candidate ~{cand_years:.0f} yrs vs {jd_years:.0f} yrs required "
                f"(gap >30%%; minor penalty applied)"
            )
        elif gap_ratio > 0:
            exp_note = (
                f"Candidate ~{cand_years:.0f} yrs vs {jd_years:.0f} yrs required "
                f"(within flexibility range, no penalty)"
            )

    # ------------------------------------------------------------------
    # Final score
    # ------------------------------------------------------------------
    adjusted    = weighted_raw + exp_adjustment - penalty
    final_score = round(float(np.clip(adjusted, 0.0, 1.0)), 3)

    # Shortlist: single soft threshold, no override conditions
    shortlist_decision = final_score >= DEFAULT_THRESHOLD

    # ------------------------------------------------------------------
    # Debug
    # ------------------------------------------------------------------
    print("\n[SCORING] Section breakdown:")
    for s in active_sections:
        print(f"  {s:25s}  score={section_scores[s]:.3f}  weight={weights.get(s,0):.1f}")
    print(f"[SCORING] weighted_raw      = {weighted_raw:.3f}")
    print(f"[SCORING] exp_adjustment    = {exp_adjustment:+.3f}")
    print(f"[SCORING] penalty           = -{penalty:.3f}")
    print(f"[SCORING] final_score       = {final_score:.3f}")
    print(f"[SCORING] shortlist         = {shortlist_decision}  (threshold={DEFAULT_THRESHOLD})")

    # ------------------------------------------------------------------
    # Shortlist reason — kept backward-compatible with admin_insights
    # ------------------------------------------------------------------
    shortlist_reason = {
        "final_score":        final_score,
        "threshold":          DEFAULT_THRESHOLD,
        "section_scores":     {s: round(section_scores[s], 3) for s in active_sections},
        "weighted_raw":       round(weighted_raw, 3),
        "exp_adjustment":     exp_adjustment,
        "penalty_applied":    round(penalty, 3),
        "experience_note":    exp_note,
        # backward-compat fields used by admin_insights
        "matched_core_skills": _matched_skills_list(
            required_skills, resume_all, threshold=0.40
        ),
        "aligned_projects":   resume_claims.get("projects", []),
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
# Helper used by shortlist_reason["matched_core_skills"]
# ---------------------------------------------------------------------------

def _matched_skills_list(
    jd_skills: list,
    resume_phrases: list,
    threshold: float = 0.40,
) -> list:
    """Return JD required skills that have at least one resume match above threshold."""
    if not jd_skills or not resume_phrases:
        return []

    expanded_jd     = expand_aliases(jd_skills)
    expanded_resume = expand_aliases(resume_phrases)
    jd_emb          = _embed(expanded_jd)
    res_emb         = _embed(expanded_resume)

    if jd_emb.size == 0 or res_emb.size == 0:
        return []

    sims    = cosine_similarity(jd_emb, res_emb)
    matched = [
        expanded_jd[i]
        for i in range(len(expanded_jd))
        if sims[i].max() >= threshold
    ]
    # Prefer original JD names in the output
    orig_set = set(jd_skills)
    return [s for s in matched if s in orig_set] or matched