import json
import os

# Use a path relative to this module so the store works regardless of CWD
MODULE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(MODULE_DIR, "..", "data", "candidates.json")
DATA_PATH = os.path.normpath(DATA_PATH)

def load_candidates():
    if not os.path.exists(DATA_PATH):
        return []
    with open(DATA_PATH, "r") as f:
        return json.load(f).get("candidates", [])

def save_candidates(candidates):
    data = {"candidates": candidates}
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w") as f:
        json.dump(data, f, indent=2)


def save_candidate(candidate):
    """
    Accept either a pre-built canonical candidate dict or a resume_output-style dict.
    If the latter, wrap it into the canonical shape required by the app.
    """
    candidates = load_candidates()

    # If candidate already has our canonical keys, use as-is
    if "system_score" in candidate or "admin_status" in candidate:
        wrapped = candidate
    else:
        # resume_output-style input
        wrapped = {
            "candidate_id": candidate.get("candidate_id"),
            "system_score": float(candidate.get("final_score", 0.0)),
            "system_shortlisted": bool(candidate.get("shortlist_decision", False)),
            "system_reason": candidate.get("shortlist_reason", {}),
            "admin_status": "PENDING",
            "interview_unlocked": False,
            "interview_completed": False,
            "resume_output": candidate,
        }
    # Promote final_focus_areas to top-level for easy access in UI
    ff = None
    if isinstance(candidate, dict):
        ff = candidate.get("final_focus_areas") or candidate.get("resume_output", {}).get("final_focus_areas")
    if ff:
        wrapped["final_focus_areas"] = ff

    candidates.append(wrapped)
    save_candidates(candidates)


def get_candidate(candidate_id: str):
    for c in load_candidates():
        if c.get("candidate_id") == candidate_id:
            return c
    return None


def update_candidate(candidate_id: str, updates: dict):
    candidates = load_candidates()
    modified = False
    for i, c in enumerate(candidates):
        if c.get("candidate_id") == candidate_id:
            candidates[i] = {**c, **updates}
            modified = True
            break
    if modified:
        save_candidates(candidates)
    return modified
