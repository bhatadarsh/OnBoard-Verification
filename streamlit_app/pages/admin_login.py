import streamlit as st

if st.session_state.get("role") != "admin":
    st.error("Unauthorized access")
    st.stop()

st.title("Admin Login")

# Simple placeholder login (replace later)
if st.button("Login as Admin"):
    st.switch_page("pages/admin_jd_upload.py")
