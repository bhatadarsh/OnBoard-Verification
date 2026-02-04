# import streamlit as st
# from utils.file_reader import read_docx
# from resume_intelligence.graph import resume_graph



# import sys
# import os

# ROOT_DIR = os.path.abspath(
#     os.path.join(os.path.dirname(__file__), "..", "..")
# )

# if ROOT_DIR not in sys.path:
#     sys.path.insert(0, ROOT_DIR)




# # -------------------------
# # Role guard
# # -------------------------
# if st.session_state.get("role") != "user":
#     st.error("Unauthorized access")
#     st.stop()

# # -------------------------
# # JD must exist (stored under admin.jd_intelligence)
# # -------------------------
# admin_jd = st.session_state.get("admin", {}).get("jd_intelligence")
# if not admin_jd:
#     st.error("No active job opening. Please try again later.")
#     st.stop()

# st.title("Upload Your Resume")

# resume_file = st.file_uploader(
#     "Upload your resume (DOCX only)",
#     type=["docx"]
# )

# if resume_file:
#     # 🔥 HARD RESET candidate-specific state
#     for key in [
#         "shortlisted",
#         "candidate_result",
#     ]:
#         if key in st.session_state:
#             del st.session_state[key]

#     with st.spinner("Evaluating your resume..."):
#         resume_text = read_docx(resume_file)
#         jd_ctx = st.session_state["admin"]["jd_intelligence"]


#         resume_state = {
#             "candidate_id": "CAND_TEMP",
#             "raw_resume": resume_text,
#             "role_context": jd_ctx["role_context"],
#             "skill_intelligence": jd_ctx["skill_intelligence"],
#             "competency_profile": jd_ctx["competency_profile"],
#             "interview_requirements": jd_ctx["interview_requirements"],
#         }

#         resume_output = resume_graph.invoke(resume_state)

#         # 🔑 SINGLE SOURCE OF TRUTH
#         st.session_state["candidate_result"] = {
#             "candidate_id": resume_state["candidate_id"],
#             "final_score": resume_output["final_score"],
#             "shortlisted": resume_output["shortlist_decision"],
#             "reason": resume_output["shortlist_reason"],
#         }

#         #st.session_state["shortlisted"] = resume_output["shortlist_decision"]
#         candidate_id = "CAND_" + str(len(st.session_state["admin"]["candidates"]) + 1)

#         candidate_result = {
#             "candidate_id": candidate_id,
#             **resume_output
#         }

#         st.session_state["user"]["candidate_id"] = candidate_id
#         st.session_state["user"]["result"] = candidate_result


#         # Admin visibility
#         if "all_candidates" not in st.session_state:
#             st.session_state["all_candidates"] = []

#         st.session_state["admin"]["candidates"].append(candidate_result)


#     st.success("Resume processed successfully")
#     st.switch_page("pages/user_status.py")
import sys
import os
import streamlit as st

# -------------------------
# FIX IMPORT PATH (MUST BE FIRST)
# -------------------------
ROOT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from utils.file_reader import read_docx
from resume_intelligence.graph import resume_graph
from focus_area_selection.graph import stage3_graph
from storage.candidate_store import save_candidate, load_candidates

# -------------------------
# ROLE GUARD
# -------------------------
if st.session_state.get("role") != "user":
    st.error("Unauthorized access")
    st.switch_page("app.py")

# -------------------------
# JD MUST EXIST (ADMIN UPLOADED)
# -------------------------
admin_jd = st.session_state.get("admin", {}).get("jd_intelligence")
if not admin_jd:
    st.error("No active job opening. Please try again later.")
    st.stop()

# -------------------------
# UI
# -------------------------
st.title("Upload Your Resume")

resume_file = st.file_uploader(
    "Upload your resume (DOCX only)",
    type=["docx"]
)

if resume_file:
    # 🔥 Reset ONLY user-side state
    st.session_state.pop("user", None)

    with st.spinner("Evaluating your resume..."):
        resume_text = read_docx(resume_file)

        # ✅ Generate candidate ID from persistent store
        existing_candidates = load_candidates()
        candidate_id = f"CAND_{len(existing_candidates) + 1}"

        resume_state = {
            "candidate_id": candidate_id,
            "raw_resume": resume_text,
            "role_context": admin_jd["role_context"],
            "skill_intelligence": admin_jd["skill_intelligence"],
            "competency_profile": admin_jd["competency_profile"],
            "interview_requirements": admin_jd["interview_requirements"],
        }

        resume_output = resume_graph.invoke(resume_state)

        # -------------------------
        # Compute Stage 3 focus areas so interview can be started later
        # -------------------------
        try:
            stage3_state = {
                **resume_output,
                "interview_requirements": admin_jd["interview_requirements"],
                "skill_intelligence": admin_jd["skill_intelligence"],
            }
            stage3_output = stage3_graph.invoke(stage3_state)
        except Exception:
            stage3_output = {}

        # Attach focus areas into resume output for persistence
        resume_output["final_focus_areas"] = stage3_output.get("final_focus_areas", [])

        # -------------------------
        # USER VIEW (MINIMAL & ISOLATED)
        # -------------------------
        st.session_state["user"] = {
            "candidate_id": candidate_id,
            "result": {
                "final_score": resume_output["final_score"],
                "shortlisted": resume_output["shortlist_decision"],
                "reason": resume_output["shortlist_reason"],
            }
        }

        # -------------------------
        # ADMIN VIEW (PERSISTENT)
        # -------------------------
        save_candidate({
            "candidate_id": candidate_id,
            **resume_output
        })

    st.success("Resume processed successfully")
    st.switch_page("pages/user_status.py")
