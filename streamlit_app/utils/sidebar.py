import streamlit as st

def render_sidebar(role: str):
    st.sidebar.title("Navigation")

    if role == "admin":
        st.sidebar.page_link("pages/admin_jd_upload.py", label="📄 Admin JD Upload")
        st.sidebar.page_link("pages/admin_candidates.py", label="👥 Candidates")
        st.sidebar.page_link("pages/admin_candidate_review.py", label="🔍 Candidate Review")

    elif role == "user":
        st.sidebar.page_link("pages/user_resume_upload.py", label="📄 Upload Resume")
        st.sidebar.page_link("pages/user_status.py", label="📊 Application Status")
        st.sidebar.page_link("pages/user_interview.py", label="🎤 Interview")

    st.sidebar.divider()
    if st.sidebar.button("🚪 Logout"):
        st.session_state.clear()
        st.switch_page("app.py")
