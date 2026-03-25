import streamlit as st

st.set_page_config(page_title="AI Interview System", page_icon="🎯")


if "admin" not in st.session_state:
    st.session_state["admin"] = {
        "jd_intelligence": None,
        "candidates": []
    }

if "user" not in st.session_state:
    st.session_state["user"] = {
        "candidate_id": None,
        "result": None
    }



st.set_page_config(
    page_title="AI Interview System",
    page_icon="🎯",
    layout="centered"
)



# -------------------------
# Initialize session state
# -------------------------
if "role" not in st.session_state:
    st.session_state["role"] = ""

st.markdown("### Select your role to continue")

col1, col2 = st.columns(2)

with col1:
    if st.button("👤 Candidate", use_container_width=True):
        st.session_state["role"] = "user"
        st.switch_page("pages/user_resume_upload.py")

with col2:
    if st.button("🧑‍💼 Admin", use_container_width=True):
        st.session_state["role"] = "admin"
        st.switch_page("pages/admin_login.py")
