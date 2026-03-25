import streamlit as st

# -------------------------
# Role Guard
# -------------------------
if st.session_state.get("role") != "admin":
    st.error("Unauthorized access")
    st.stop()

st.title("🧑‍💼 Shortlisted Candidates – Interview Focus Preview")

# -------------------------
# Check candidates exist
# -------------------------
candidates = st.session_state["admin"]["candidates"]


shortlisted = [
    c for c in candidates if c.get("shortlist_decision") is True
]

if not shortlisted:
    st.info("No shortlisted candidates yet.")
    st.stop()

# -------------------------
# Render each candidate
# -------------------------
for idx, candidate in enumerate(shortlisted, start=1):

    with st.expander(f"Candidate {idx} – ID: {candidate['candidate_id']}"):

        st.markdown("### 📊 Evaluation Summary")
        st.write(f"**Final Score:** `{candidate['final_score']}`")

        st.markdown("### ✅ Why Shortlisted")
        reason = candidate.get("shortlist_reason", {})
        st.json(reason)

        st.markdown("### 🎯 Interview Focus Areas")

        focus_areas = candidate.get("final_focus_areas", [])

        if not focus_areas:
            st.warning("No focus areas generated.")
        else:
            for area in focus_areas:
                st.markdown(
                    f"""
**{area['order']}. {area['topic']}**
- Priority: {area['priority']}
- Depth Score: {area['depth_score']}
- Confidence: {area['confidence']}
- Interview Goal: {area['interview_goal']}
"""
                )

                with st.expander("🔍 Evidence"):
                    for ev in area.get("evidence", []):
                        st.write(f"- {ev}")

        st.markdown("---")
