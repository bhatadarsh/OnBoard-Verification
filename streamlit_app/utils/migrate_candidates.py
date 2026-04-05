from streamlit_app.storage.candidate_store import load_candidates, save_candidates


def migrate_promote_focus():
    candidates = load_candidates()
    updated = False
    for c in candidates:
        if not c.get("final_focus_areas"):
            ff = None
            ro = c.get("resume_output") or {}
            ff = ro.get("final_focus_areas")
            if ff:
                c["final_focus_areas"] = ff
                updated = True

    if updated:
        save_candidates(candidates)
    return updated


if __name__ == "__main__":
    updated = migrate_promote_focus()
    print("Migration applied:" , updated)
