import sys
import os
import streamlit as st

from utils.sidebar import render_sidebar

# -------------------------
# Fix import path
# -------------------------
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from jd_intelligence.graph import jd_graph
from utils.file_reader import read_docx

# -------------------------
# Role guard
# -------------------------
if "role" not in st.session_state or not st.session_state["role"]:
    st.warning("Please select a role first.")
    st.switch_page("app.py")

if st.session_state["role"] != "admin":
    st.error("Unauthorized access")
    st.stop()

render_sidebar("admin")
# -------------------------
# UI
# -------------------------
st.title("Upload Job Description")

jd_file = st.file_uploader("Upload JD (DOCX)", type=["docx"])

if jd_file:
    with st.spinner("Analyzing Job Description..."):
        jd_text = read_docx(jd_file)

        jd_state = {"raw_jd": jd_text}
        jd_output = jd_graph.invoke(jd_state)

        st.session_state["admin"]["jd_intelligence"] = jd_output
        st.session_state["admin"]["candidates"] = []  # reset candidates

        st.session_state["jd_uploaded"] = True

    st.success("Job Description processed successfully")

    if st.button("Go to Candidate Dashboard"):
        st.switch_page("pages/admin_candidates.py")
