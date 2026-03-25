import streamlit as st
from storage.candidate_store import get_candidate

# Role guard
if st.session_state.get("role") != "user":
    st.error("Unauthorized access")
    st.stop()

st.title("Application Status")

# Expect `st.session_state['user']['candidate_id']` to exist after upload
user = st.session_state.get("user")
candidate_id = None
if user and "candidate_id" in user:
    candidate_id = user["candidate_id"]
else:
    # Fallback: allow user to enter their candidate ID if session state is missing
    candidate_id = st.text_input("Enter your Candidate ID (e.g. CAND_1)")
    if not candidate_id:
        st.info("Your application is under review. If you have a Candidate ID, enter it above to check status.")
        st.stop()

candidate = get_candidate(candidate_id)
if not candidate:
    st.info("No application found for that Candidate ID. Please check the ID or upload again.")
    st.stop()

# Admin decision controls visibility
admin_status = candidate.get("admin_status", "PENDING")

if admin_status == "PENDING":
    st.info("Your application is under review by admin.")
    st.write(f"System score: {candidate.get('system_score', 0):.2f}")
    st.write("Status: Under Review")
    st.stop()

if admin_status == "REJECTED":
    st.error("Your application was rejected by the admin.")
    st.write(f"System score: {candidate.get('system_score', 0):.2f}")
    st.stop()

if admin_status == "APPROVED":
    st.success("🎉 Congratulations! Admin has approved your application.")
    st.write(f"System score: {candidate.get('system_score', 0):.2f}")

    if not candidate.get("interview_unlocked"):
        st.info("Interview will be scheduled by admin shortly.")
        st.stop()

    # Interview unlocked — allow start
    if st.button("Start Interview"):
        # Initialize interview state using the node directly (avoid full graph invoke)
        from interview_orchestration.nodes.initialize_interview import initialize_interview

        stage4_state = {
            "candidate_id": candidate["candidate_id"],
            "final_focus_areas": candidate.get("final_focus_areas", []),
        }

        # Initialize interview state only. Per the Streamlit contract the
        # UI will invoke the graph when it observes `interview_status == NOT_STARTED`.
        state = initialize_interview(stage4_state)
        st.session_state["interview_state"] = state
        st.session_state["current_candidate"] = candidate["candidate_id"]
        from streamlit_app.utils.st_helpers import safe_rerun
        safe_rerun()
