import streamlit as st
from storage.candidate_store import load_candidates, update_candidate

if st.session_state.get("role") != "admin":
    st.error("Unauthorized")
    st.stop()

st.title("Applied Candidates")

candidates = load_candidates()

if not candidates:
    st.info("No candidates applied yet.")
else:
    for c in candidates:
        with st.expander(f"Candidate ID: {c['candidate_id']}"):
            st.markdown(f"**System Score:** {c.get('system_score', 0):.2f}")
            st.markdown(f"**System Shortlisted:** {c.get('system_shortlisted')}")
            st.markdown(f"**Admin Status:** {c.get('admin_status')}")

            st.markdown("---")
            st.markdown("### Resume Summary (system output)")
            ro = c.get("resume_output", {})
            st.write(f"Final score: {ro.get('final_score')}")

            col1, col2 = st.columns(2)
            from streamlit_app.utils.st_helpers import safe_rerun

            with col1:
                if st.button(f"Approve {c['candidate_id']}", key=f"approve_{c['candidate_id']}"):
                    update_candidate(c['candidate_id'], {"admin_status": "APPROVED", "interview_unlocked": True})
                    st.success("Candidate approved and interview unlocked.")
                    safe_rerun()
            with col2:
                if st.button(f"Reject {c['candidate_id']}", key=f"reject_{c['candidate_id']}"):
                    update_candidate(c['candidate_id'], {"admin_status": "REJECTED", "interview_unlocked": False})
                    st.error("Candidate rejected.")
                    safe_rerun()

            st.divider()
