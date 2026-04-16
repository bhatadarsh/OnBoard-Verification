import sys
# Backend - Peak Intelligence Scoring
# Updated: 2026-02-08T12:59:00
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, HTTPException, status, Depends, File, UploadFile, Form, Query
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta, datetime
from typing import List, Optional, Literal, Dict
import uuid
import json
import logging
import time
from pydub import AudioSegment
from pydub.utils import mediainfo_json
# ── Point pydub at the snap-installed ffmpeg/ffprobe binaries ────────────────
_FFMPEG_BIN  = "/snap/bin/ffmpeg"
_FFPROBE_BIN = "/snap/bin/ffmpeg.ffprobe"
AudioSegment.converter  = _FFMPEG_BIN
AudioSegment.ffmpeg     = _FFMPEG_BIN
AudioSegment.ffprobe    = _FFPROBE_BIN
# ─────────────────────────────────────────────────────────────────────────────
import asyncio
import io
import base64
import mimetypes

from backend.config import settings
from backend.models import UserCreate, UserLogin, User, Token, TokenData, JobDescription, Resume, InterviewSession
from backend.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin,
    require_user
)
from backend.database import db
# ── Local filesystem storage (replaces Azure Blob) ──────────────────────────
from backend.infra.local_storage_helper import local_storage_helper as storage
# ─────────────────────────────────────────────────────────────────────────────
from backend.infra.text_extraction import extract_text
from jd_intelligence.graph import jd_graph
from resume_intelligence.graph import resume_graph
from focus_area_selection.graph import stage3_graph
from interview_orchestration.graph import stage4_graph
from fastapi.security import HTTPBearer

security_optional = HTTPBearer(auto_error=False)
from interview_orchestration.nodes.initialize_interview import initialize_interview
from interview_orchestration.nodes.evaluator import evaluate_interview
from interview_orchestration.nodes.cheating_detector import analyze_single_frame
from interview_orchestration.stt.factory import get_stt_engine

app = FastAPI(title="Interview System API - Stage 5: Interview In-Progress")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_request_size(request, call_next):
    content_length = request.headers.get("Content-Length")
    if content_length and int(content_length) > 1024 * 1024:
        print(f"CRITICAL DEBUG: Large Request Detected! Path: {request.url.path}, Size: {content_length} bytes")
    return await call_next(request)


# ─────────────────────────────────────────────────────────────────────────────
# Local file-serving endpoint  (replaces Azure SAS / blob URLs)
# GET /files/{container}/{blob_path:path}
# ─────────────────────────────────────────────────────────────────────────────

# Add this helper function near the top (after imports)
def create_interview_session_for_candidate(candidate_id: int, resume_id: Optional[str] = None) -> InterviewSession:
    """Shared logic to create an interview session for a candidate."""
    db.load()
    
    # Find resume
    if resume_id:
        resume = next((r for r in db.resumes if r["resume_id"] == resume_id), None)
    else:
        cand_resumes = [r for r in db.resumes if r["candidate_id"] == candidate_id]
        resume = cand_resumes[-1] if cand_resumes else None
    
    if not resume:
        raise HTTPException(status_code=404, detail="Candidate resume not found")
    
    if resume["status"] != "SHORTLISTED":
        raise HTTPException(status_code=400, detail="Candidate must be SHORTLISTED to start interview")
    
    job_id = resume.get("job_id")
    jd = db.jds.get(job_id) if job_id else None
    if not jd or jd.get("is_deleted") or not jd.get("intelligence"):
        raise HTTPException(status_code=400, detail="Associated Job description is deleted or intelligence missing")
    
    jd_intel = jd["intelligence"]
    res_intel = resume.get("intelligence", {})
    
    s3_input = {
        "interview_requirements": jd_intel.get("interview_requirements", {}),
        "skill_intelligence": jd_intel.get("skill_intelligence", {}),
        "resume_claims": res_intel.get("resume_claims", {}),
        "evidence_map": res_intel.get("evidence_map", {}),
        "match_scores": res_intel.get("match_scores", {}),
        "final_score": res_intel.get("final_score", 0.0)
    }
    
    try:
        from focus_area_selection.graph import stage3_graph
        s3_res = stage3_graph.invoke(s3_input)
        final_focus_areas = s3_res.get("final_focus_areas", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Focus area selection failed: {str(e)}")
    
    if not final_focus_areas:
        raise HTTPException(status_code=400, detail="No focus areas could be determined for this candidate")
    
    try:
        from interview_orchestration.graph import stage4_graph
        from interview_orchestration.nodes.initialize_interview import initialize_interview
        s4_state = initialize_interview({"candidate_id": str(candidate_id), "final_focus_areas": final_focus_areas})
        s4_res = stage4_graph.invoke(s4_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interview initiation failed: {str(e)}")
    
    session = InterviewSession(
        interview_id=str(uuid.uuid4()), candidate_id=candidate_id,
        current_question=s4_res.get("current_question"),
        status="IN_PROGRESS" if s4_res.get("current_question") else "NOT_STARTED",
        created_at=datetime.now(), focus_areas=final_focus_areas,
        current_topic=s4_res.get("current_topic"),
        current_topic_index=s4_res.get("current_topic_index", 0),
        current_followup_count=s4_res.get("current_followup_count", 0),
        interview_trace=[]
    )
    
    # Remove any existing session for this candidate (idempotent)
    db.interviews = [i for i in db.interviews if i["candidate_id"] != candidate_id]
    db.interviews.append(session.dict())
    db.save()
    
    return session

@app.get("/files/{container}/{blob_path:path}")
async def serve_local_file(
    container: str,
    blob_path: str,
    
):
    """Serve a locally-stored file (replaces Azure blob download)."""
    try:
        local_path = storage.get_local_path(container, blob_path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")

    if not local_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    media_type, _ = mimetypes.guess_type(str(local_path))
    media_type = media_type or "application/octet-stream"
    return FileResponse(str(local_path), media_type=media_type, filename=local_path.name)


@app.get("/")
async def root():
    return {"status": "ok", "stage": "2 - Persistence & Files"}

@app.post("/auth/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    user_data.email = user_data.email.lower()
    if user_data.email in db.users:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    hashed_password = get_password_hash(user_data.password)
    user_id = db.user_id_counter
    db.user_id_counter += 1
    user = {
        "id": user_id, "name": user_data.name, "email": user_data.email,
        "role": user_data.role, "status": "active", "hashed_password": hashed_password
    }
    db.users[user_data.email] = user
    db.save()
    return User(**{k: v for k, v in user.items() if k != "hashed_password"})

@app.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    email = credentials.email.lower()
    user = db.users.get(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    if user["status"] != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"user_id": user["id"], "role": user["role"]}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=User)
async def get_me(current_user: TokenData = Depends(get_current_user)):
    for user in db.users.values():
        if user["id"] == current_user.user_id:
            return User(**{k: v for k, v in user.items() if k != "hashed_password"})
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

@app.get("/admin/dashboard")
async def admin_dashboard(current_user: TokenData = Depends(require_admin)):
    return {"message": "Welcome to Admin Dashboard", "user_id": current_user.user_id}

@app.get("/user/dashboard")
async def user_dashboard(current_user: TokenData = Depends(require_user)):
    return {"message": "Welcome to User Dashboard", "user_id": current_user.user_id}


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: JD and Resume Upload
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/admin/jd/upload", response_model=JobDescription, status_code=status.HTTP_201_CREATED)
async def upload_jd(file: UploadFile = File(...), current_user: TokenData = Depends(require_admin)):
    """Admin uploads Job Description — saved to datasets/job_descriptions/."""
    if not file.filename.lower().endswith(('.pdf', '.docx')):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF and DOCX files are supported")

    job_id = f"JOB_{len(db.jds) + 1}"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    blob_name = f"job_descriptions/{job_id}/{timestamp}_{file.filename}"

    file_content = await file.read()
    storage.upload_file("job-descriptions", blob_name, file_content)

    intelligence = {}
    try:
        text = extract_text(file_content, file.filename)
        if text:
            print(f"Running JD Intelligence for {job_id}...")
            res = jd_graph.invoke({"raw_jd": text})
            intelligence = res
    except Exception as e:
        print(f"JD Graph Error: {e}")

    jd_name = intelligence.get("role_context", {}).get("primary_role") or file.filename

    jd = JobDescription(
        job_id=job_id, jd_name=jd_name, jd_blob_path=blob_name,
        status="ACTIVE", uploaded_at=datetime.now(), intelligence=intelligence
    )
    db.jds[job_id] = jd.dict()
    db.save()
    return jd

@app.get("/admin/jd", response_model=List[JobDescription])
async def get_all_jds(current_user: TokenData = Depends(require_admin)):
    jds = []
    for jd_data in db.jds.values():
        if jd_data.get("is_deleted", False):
            continue
        if not jd_data.get("jd_name"):
            intel = jd_data.get("intelligence", {})
            name = intel.get("role_context", {}).get("primary_role")
            if not name and jd_data.get("jd_blob_path"):
                name = jd_data["jd_blob_path"].split("/")[-1].split("_", 2)[-1]
            jd_data["jd_name"] = name or "JD (Name unavailable)"
        jds.append(JobDescription(**jd_data))
    return jds

@app.delete("/admin/job-descriptions/{job_id}")
async def delete_jd(job_id: str, current_user: TokenData = Depends(require_admin)):
    if job_id not in db.jds:
        raise HTTPException(status_code=404, detail="Job description not found")
    jd_data = db.jds[job_id]
    jd_data["is_deleted"] = True
    jd_data["deleted_at"] = datetime.now().isoformat()
    jd_data["status"] = "INACTIVE"
    db.save()
    print(f"JD {job_id} soft-deleted by admin {current_user.user_id}")
    return {"status": "success", "message": f"Job description {job_id} has been deleted"}

@app.get("/user/jd", response_model=Optional[JobDescription])
async def get_active_jd(current_user: TokenData = Depends(require_user)):
    for jd_data in db.jds.values():
        if jd_data.get("status") == "ACTIVE" and not jd_data.get("is_deleted", False):
            if not jd_data.get("jd_name"):
                intel = jd_data.get("intelligence", {})
                name = intel.get("role_context", {}).get("primary_role")
                if not name and jd_data.get("jd_blob_path"):
                    name = jd_data["jd_blob_path"].split("/")[-1].split("_", 2)[-1]
                jd_data["jd_name"] = name or "JD (Name unavailable)"
            return JobDescription(**jd_data)
    return None

@app.get("/user/jds", response_model=List[JobDescription])
async def get_all_active_jds(current_user: TokenData = Depends(require_user)):
    jds = []
    for jd_data in db.jds.values():
        if jd_data.get("status") == "ACTIVE" and not jd_data.get("is_deleted", False):
            if not jd_data.get("jd_name"):
                intel = jd_data.get("intelligence", {})
                name = intel.get("role_context", {}).get("primary_role")
                if not name and jd_data.get("jd_blob_path"):
                    name = jd_data["jd_blob_path"].split("/")[-1].split("_", 2)[-1]
                jd_data["jd_name"] = name or "JD (Name unavailable)"
            jds.append(JobDescription(**jd_data))
    return jds

@app.post("/user/resume/upload", response_model=Resume, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    job_id: Optional[str] = Form(None),
    current_user: TokenData = Depends(require_user)
):
    """User uploads resume — saved to datasets/uploaded_docs/resumes/CAND_<id>/…"""
    if job_id and job_id in db.jds:
        target_jd = db.jds[job_id]
        if target_jd.get("status") != "ACTIVE" or target_jd.get("is_deleted", False):
            raise HTTPException(status_code=400, detail="The selected job is no longer active")
    else:
        target_jd = next(
            (j for j in db.jds.values() if j.get("status") == "ACTIVE" and not j.get("is_deleted", False)),
            None
        )

    if not target_jd:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job description not uploaded yet")

    if not file.filename.lower().endswith(('.pdf', '.docx')):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF and DOCX files are supported")

    resume_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Stored at:  datasets/uploaded_docs/resumes/CAND_<id>/<timestamp>_<filename>
    blob_name = f"resumes/CAND_{current_user.user_id}/{timestamp}_{file.filename}"

    file_content = await file.read()
    storage.upload_file("resumes", blob_name, file_content)

    intelligence = {}
    job_id_used = target_jd.get("job_id")
    jd_intel = target_jd.get("intelligence", {})

    try:
        text = extract_text(file_content, file.filename)
        if text:
            print(f"Running Resume Intelligence linked to {job_id_used}...")
            state_input = {
                "candidate_id": str(current_user.user_id),
                "raw_resume": text,
                "role_context": jd_intel.get("role_context", {}),
                "skill_intelligence": jd_intel.get("skill_intelligence", {}),
                "competency_profile": jd_intel.get("competency_profile", {}),
                "interview_requirements": jd_intel.get("interview_requirements", {})
            }
            res = resume_graph.invoke(state_input)
            intelligence = res
    except Exception as e:
        print(f"Resume Graph Error: {e}")

    resume = Resume(
        candidate_id=current_user.user_id, job_id=job_id_used,
        resume_id=resume_id, resume_blob_path=blob_name,
        status="UNDER_REVIEW", uploaded_at=datetime.now(), intelligence=intelligence
    )
    db.resumes.append(resume.dict())
    db.save()
    return resume

@app.get("/admin/resumes", response_model=List[Resume])
async def list_resumes(current_user: TokenData = Depends(require_admin)):
    return [Resume(**r) for r in db.resumes]

@app.get("/user/resume/status")
async def get_resume_status(current_user: TokenData = Depends(require_user)):
    for resume_data in db.resumes:
        if resume_data["candidate_id"] == current_user.user_id:
            return Resume(**resume_data)
    return None

from pydantic import BaseModel

class ShortlistRequest(BaseModel):
    decision: Literal["SHORTLISTED", "REJECTED", "SELECTED"]

class CandidateResponse(BaseModel):
    candidate_id: int
    candidate_name: str = "Candidate (Name unavailable)"
    resume_id: str
    resume_blob_url: str
    jd_id: Optional[str] = None
    jd_name: Optional[str] = None
    system_score: float = 0.0
    system_shortlisted: bool = False
    system_reason: Optional[dict] = None
    admin_status: str
    interview_unlocked: bool
    interview_status: Literal["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "COMPLETED_EARLY", "N/A"] = "N/A"
    cheating_score: float = 0.0
    misconduct_events: list = []
    interview_trace: list = []
    tab_change_count: int = 0
    evaluation_results: Optional[dict] = None
    total_interview_score: float = 0.0
    total_confidence_level: str = "N/A"
    cheating_severity: str = "LOW"
    interview_recommendation: str = "PENDING"
    admin_insights: Optional[Dict[str, str]] = None

@app.get("/admin/candidates", response_model=List[CandidateResponse])
async def get_candidates(current_user: TokenData = Depends(require_admin)):
    db.load()
    candidates = []
    for r_dict in db.resumes:
        intel = r_dict.get("intelligence", {}) or {}

        # Local URL for resume (replaces SAS URL)
        try:
            blob_url = f"http://localhost:8000{storage.generate_sas_url('resumes', r_dict['resume_blob_path'])}"
        except Exception:
            blob_url = ""

        reason_data = intel.get("shortlist_reason", "No reasoning available")
        if isinstance(reason_data, dict):
            matched = len(reason_data.get("matched_core_skills", []))
            summary = f"Matched {matched} core skills."
            exp_meta = reason_data.get("experience_metadata", {})
            if exp_meta.get("flexibility_applied"):
                summary += " Shortlisted via skill-alignment flexibility."
            penalties = reason_data.get("penalties_applied", {}).get("buzzword_only_claims", [])
            if penalties:
                summary += f" ({len(penalties)} penalties applied for buzzwords)."
        else:
            summary = str(reason_data)

        interview = next((i for i in db.interviews if str(i["candidate_id"]) == str(r_dict["candidate_id"])), None)

        total_score = 0.0
        confidence = "N/A"
        severity = "LOW"
        c_score = interview.get("cheating_score", 0.0) if interview else 0.0

        if c_score > 3.0:   severity = "HIGH"
        elif c_score > 2.0: severity = "MEDIUM"
        else:               severity = "LOW"

        if interview and interview.get("evaluation"):
            eval_data = interview["evaluation"]
            total_score = eval_data.get("overall_score", 0.0)
            total_score = max(0.0, round(total_score - c_score, 2))
            results = eval_data.get("per_answer_results", [])
            conf_levels = [r.get("confidence_level", "MEDIUM") for r in results if "confidence_level" in r]
            confidence = max(set(conf_levels), key=conf_levels.count) if conf_levels else "MEDIUM"

        interview_rec = "PENDING"
        if interview and interview.get("status") in ["COMPLETED", "COMPLETED_EARLY"]:
            if severity == "HIGH":          interview_rec = "NO HIRE (Integrity)"
            elif total_score >= 7.5:        interview_rec = "STRONG HIRE"
            elif total_score >= 5.0:        interview_rec = "HIRE"
            else:                           interview_rec = "NO HIRE"

        user_obj = next((u for u in db.users.values() if str(u.get("id")) == str(r_dict["candidate_id"])), None)
        candidate_name = user_obj.get("name", "Candidate (Name unavailable)") if user_obj else "Candidate (Name unavailable)"

        target_jd_id = r_dict.get("job_id")
        jd_info = db.jds.get(target_jd_id)
        jd_name = "Unassigned"
        if jd_info:
            jd_name = jd_info.get("jd_name")
            if not jd_name:
                jd_intel = jd_info.get("intelligence", {})
                jd_name = jd_intel.get("role_context", {}).get("primary_role")
                if not jd_name and jd_info.get("jd_blob_path"):
                    jd_name = jd_info["jd_blob_path"].split("/")[-1].split("_", 2)[-1]
            jd_name = jd_name or "JD (Name unavailable)"

        c = CandidateResponse(
            candidate_id=r_dict["candidate_id"], candidate_name=candidate_name,
            resume_id=r_dict["resume_id"], resume_blob_url=blob_url,
            jd_id=target_jd_id, jd_name=jd_name,
            system_score=r_dict.get("intelligence", {}).get("final_score", 0.0) * 10,
            system_shortlisted=intel.get("shortlist_decision", False),
            system_reason={"summary": summary},
            admin_status=r_dict["status"],
            interview_unlocked=r_dict.get("interview_unlocked", False),
            interview_status=interview["status"] if interview else "N/A",
            cheating_score=interview.get("cheating_score", 0.0) if interview else 0.0,
            misconduct_events=interview.get("cheating_events", []) if interview else [],
            interview_trace=interview.get("interview_trace", []) if interview else [],
            tab_change_count=interview.get("tab_change_count", 0) if interview else 0,
            evaluation_results=interview.get("evaluation") if interview else None,
            total_interview_score=total_score, total_confidence_level=confidence,
            cheating_severity=severity, interview_recommendation=interview_rec,
            admin_insights=intel.get("admin_insights")
        )
        candidates.append(c)
    return candidates

def build_comprehensive_report_data(candidate_id: int):
    resume = next((r for r in db.resumes if str(r["candidate_id"]) == str(candidate_id)), None)
    if not resume:
        return {}
    user_obj = next((u for u in db.users.values() if str(u.get("id")) == str(candidate_id)), None)
    job_id = resume.get("job_id")
    jd = db.jds.get(job_id) if job_id else None
    jd_intel = jd.get("intelligence", {}) if jd else {}
    res_intel = resume.get("intelligence", {})
    shortlist_reason = res_intel.get("shortlist_reason", {})
    exp_meta = shortlist_reason.get("experience_metadata", {})

    personal_details = {
        "candidate_name": user_obj.get("name", "Unknown") if user_obj else "Unknown",
        "candidate_id": str(candidate_id),
        "email": user_obj.get("email", "N/A") if user_obj else "N/A",
        "applied_role": jd_intel.get("role_context", {}).get("job_title") or job_id or "N/A",
        "total_years_experience": f"{exp_meta.get('candidate_years', 'N/A')} years"
    }
    match_score = round(res_intel.get("final_score", 0.0) * 100, 1)
    shortlisting_summary = {
        "jd_experience_required": f"{exp_meta.get('jd_required_years', 'N/A')}+ years",
        "candidate_experience": f"{exp_meta.get('candidate_years', 'N/A')} years",
        "resume_jd_match_score": match_score
    }
    insights = res_intel.get("admin_insights", {})
    alignment_para = insights.get("matched_skills_summary", "The candidate's profile shows a professional alignment with the technical requirements of the role.")
    shortlisting_insights = alignment_para
    if exp_meta.get("flexibility_applied"):
        shortlisting_insights += " While the candidate's aggregate years of experience were slightly below the stated requirement, their exceptionally strong alignment in core technical skills and project relevance qualified them for shortlisting through our experience-flexibility framework."
    else:
        shortlisting_insights += " The candidate was shortlisted due to their robust match in key competencies and meeting the foundational experience criteria defined for this position."

    return {
        "candidate_personal_details": personal_details,
        "shortlisting_summary": shortlisting_summary,
        "shortlisting_insights": shortlisting_insights
    }

async def admin_report_auth(token: Optional[str] = Query(None), credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)):
    auth_token = token or (credentials.credentials if credentials else None)
    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication required")
    from auth import decode_token
    user = decode_token(auth_token)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@app.get("/admin/candidates/{candidate_id}/report", response_class=HTMLResponse)
async def generate_interview_report(candidate_id: int, current_user: TokenData = Depends(admin_report_auth)):
    resume = next((r for r in db.resumes if r["candidate_id"] == candidate_id), None)
    if not resume:
        raise HTTPException(status_code=404, detail="Candidate not found")
    interview = next((i for i in db.interviews if i["candidate_id"] == candidate_id), None)
    if not interview or interview["status"] not in ["COMPLETED", "COMPLETED_EARLY"]:
        return f"<html><body><h1>Report not ready</h1><p>Interview for candidate {candidate_id} is not yet completed (Current Status: {interview['status'] if interview else 'None'}).</p></body></html>"
    eval_data = interview.get("evaluation", {})
    trace = interview.get("interview_trace", [])
    if not eval_data:
        return f"""<html><body style="padding: 50px; font-family: system-ui;"><h1>Report Generation Error</h1><p>No evaluation data found for candidate {candidate_id}.</p></body></html>"""

    total_score = eval_data.get("overall_score", 0.0)
    c_score = interview.get("cheating_score", 0.0)
    penalty = min(0.5, (c_score / 5.0))
    final_score = round(total_score * (1.0 - penalty), 2)
    results = eval_data.get("per_answer_results", [])
    conf_levels = [r.get("confidence_level", "MEDIUM") for r in results if r and "confidence_level" in r]
    avg_conf = max(set(conf_levels), key=conf_levels.count) if conf_levels else "MEDIUM"
    if c_score > 3.0:   severity = "HIGH"
    elif c_score > 2.0: severity = "MEDIUM"
    else:               severity = "LOW"

    unified_data = build_comprehensive_report_data(candidate_id)
    pers = unified_data.get("candidate_personal_details", {})
    sh_sum = unified_data.get("shortlisting_summary", {})
    sh_ins = unified_data.get("shortlisting_insights", "")

    # (HTML report body unchanged — keeping original for brevity)
    html_content = f"""<!DOCTYPE html><html><head><title>Interview Report - {pers.get('candidate_name', str(candidate_id))}</title>
    <style>
        body {{ font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: #1a202c; max-width: 900px; margin: 0 auto; padding: 40px; background: #fff; }}
        .header {{ border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }}
        .header h1 {{ margin: 0; color: #2d3748; font-size: 28px; }}
        .metric-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }}
        .metric-box {{ background: #f7fafc; padding: 20px; border-radius: 8px; border: 1px solid #edf2f7; text-align: center; }}
        .metric-box .label {{ font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }}
        .metric-box .value {{ font-size: 24px; font-weight: bold; color: #2d3748; }}
        .section {{ margin-bottom: 40px; }}
        .section-title {{ font-size: 18px; font-weight: bold; color: #4a5568; margin-bottom: 15px; border-left: 4px solid #4299e1; padding-left: 12px; }}
        .personal-details {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }}
        .shortlist-summary {{ background: #ebf8ff; padding: 20px; border-radius: 8px; border: 1px solid #bee3f8; margin-bottom: 30px; }}
        .turn {{ background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }}
        .turn-header {{ display: flex; justify-content: space-between; margin-bottom: 15px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; }}
        .question {{ font-weight: bold; color: #2d3748; margin-bottom: 10px; font-size: 15px; }}
        .answer {{ color: #4a5568; margin-bottom: 20px; font-style: italic; white-space: pre-wrap; }}
        .eval-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 13px; }}
        .eval-points ul {{ padding-left: 18px; margin: 0; }}
        .score-tag {{ background: #4299e1; color: white; padding: 2px 8px; border-radius: 4px; }}
        @media print {{ body {{ padding: 0; }} .no-print {{ display: none; }} }}
    </style></head><body>
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #4299e1; color: white; border: none; border-radius: 6px; cursor: pointer;">Print to PDF</button>
    </div>
    <div class="header">
        <div><h1>Shortlisting & Interview Report</h1>
        <div style="color: #718096; margin-top: 5px;">Candidate ID: {candidate_id} | Status: {resume['status']}</div></div>
        <div style="text-align: right;">
            <div style="font-size: 12px; color: #a0aec0;">Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
            <div style="font-size: 12px; color: #a0aec0;">System Ver: 2.0-Audit-Ready</div>
        </div>
    </div>
    <div class="section">
        <div class="section-title">Candidate Personal Details</div>
        <div class="personal-details">
            <div><strong>Name:</strong> {pers.get('candidate_name', 'N/A')}</div>
            <div><strong>Candidate ID:</strong> {pers.get('candidate_id', 'N/A')}</div>
            <div><strong>Email:</strong> {pers.get('email', 'N/A')}</div>
            <div><strong>Applied Role:</strong> {pers.get('applied_role', 'N/A')}</div>
            <div><strong>Total Experience:</strong> {pers.get('total_years_experience', 'N/A')}</div>
        </div>
    </div>
    <div class="section">
        <div class="section-title">Resume & JD Shortlisting Summary</div>
        <div class="shortlist-summary">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center;">
                <div><div style="font-size: 12px; color: #2b6cb0;">JD Experience Req.</div><div style="font-size: 18px; font-weight: bold;">{sh_sum.get('jd_experience_required', 'N/A')}</div></div>
                <div><div style="font-size: 12px; color: #2b6cb0;">Candidate Experience</div><div style="font-size: 18px; font-weight: bold;">{sh_sum.get('candidate_experience', 'N/A')}</div></div>
                <div><div style="font-size: 12px; color: #2b6cb0;">Resume-JD Match</div><div style="font-size: 18px; font-weight: bold; color: #2b6cb0;">{sh_sum.get('resume_jd_match_score', 0)}%</div></div>
            </div>
        </div>
        <div style="background: #f0faff; padding: 15px; border-radius: 8px; border-left: 4px solid #4299e1; font-size: 14px; color: #2c5282;">
            <strong>Shortlisting Insights:</strong> {sh_ins}
        </div>
    </div>
    <div class="section-title" style="margin-top: 50px;">Interview Performance Metrics</div>
    <div class="metric-grid">
        <div class="metric-box"><div class="label">Total Adjusted Score</div><div class="value">{final_score}/10</div></div>
        <div class="metric-box"><div class="label">Decision Confidence</div><div class="value" style="color: {'#38a169' if avg_conf == 'HIGH' else '#ecc94b'}">{avg_conf}</div></div>
        <div class="metric-box"><div class="label">Cheating Severity</div><div class="value" style="color: {'#e53e3e' if severity == 'HIGH' else '#ecc94b' if severity == 'MEDIUM' else '#38a169'}">{severity}</div></div>
    </div>
    <div class="section">
        <div class="section-title">Interview Evaluation Summary</div>
        <p style="font-size: 14px;">This candidate was evaluated across {len(trace)} interactive turns. {f'A cheating penalty was applied (Score: {c_score}).' if c_score > 0 else 'No major misconduct was detected.'}</p>
    </div>
    <div class="section"><div class="section-title">Question by Question Breakdown</div>"""

    for i, t in enumerate(trace):
        t_eval = t.get("evaluation", {})
        ev_v_ac = t_eval.get("expected_vs_actual", {})
        html_content += f"""
        <div class="turn">
            <div class="turn-header">
                <span style="font-weight: bold; color: #4a5568;">Turn {i+1}: {t.get('topic', 'General')}</span>
                <span class="score-tag">Score: {t_eval.get('score', 0.0)}/10</span>
            </div>
            <div class="question">Q: {t.get('question')}</div>
            <div class="answer">A: {t.get('answer_text')}</div>
            <div class="eval-grid">
                <div class="eval-points"><div style="font-weight: bold; color: #38a169; margin-bottom: 5px;">Strengths</div><ul>{"".join([f"<li>{s}</li>" for s in t_eval.get('strengths', [])])}</ul></div>
                <div class="eval-points"><div style="font-weight: bold; color: #e53e3e; margin-bottom: 5px;">Weaknesses</div><ul>{"".join([f"<li>{w}</li>" for w in t_eval.get('weaknesses', [])])}</ul></div>
            </div>
            <div style="margin-top: 15px; font-size: 13px; border-top: 1px dashed #e2e8f0; padding-top: 10px;"><strong>Reasoning Notes:</strong> {t_eval.get('reasoning_notes', 'N/A')}</div>
        </div>"""

    html_content += """</div>
    <div style="margin-top: 50px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #a0aec0;">
        Confidential - AI Interview Intelligence Report - &copy; 2026 Sigmoid Analytics
    </div></body></html>"""
    return html_content

@app.post("/admin/candidates/{candidate_id}/shortlist")
async def shortlist_candidate(candidate_id: int, request: ShortlistRequest, current_user: TokenData = Depends(require_admin)):
    resume = next((r for r in db.resumes if r["candidate_id"] == candidate_id), None)
    if not resume:
        raise HTTPException(status_code=404, detail="Candidate not found")
    interview = next((i for i in db.interviews if i["candidate_id"] == candidate_id), None)
    if request.decision == "SELECTED":
        if not interview or interview["status"] not in ["COMPLETED", "COMPLETED_EARLY"]:
            raise HTTPException(status_code=400, detail="Cannot SELECT a candidate before they have COMPLETED the interview.")
    resume["status"] = request.decision
    resume["interview_unlocked"] = request.decision == "SHORTLISTED"
    db.save()
    return {"status": "success", "new_status": request.decision}

@app.delete("/admin/candidates/{candidate_id}")
async def delete_candidate(candidate_id: int, current_user: TokenData = Depends(require_admin)):
    resume_idx = next((i for i, r in enumerate(db.resumes) if r["candidate_id"] == candidate_id), None)
    if resume_idx is None:
        raise HTTPException(status_code=404, detail="Candidate record not found")
    resume = db.resumes[resume_idx]
    if resume["status"] not in ["REJECTED", "SELECTED"]:
        raise HTTPException(status_code=400, detail=f"Cannot delete candidate with status: {resume['status']}.")
    db.resumes.pop(resume_idx)
    interview_idx = next((i for i, inter in enumerate(db.interviews) if inter["candidate_id"] == candidate_id), None)
    if interview_idx is not None:
        db.interviews.pop(interview_idx)
    db.users = {email: u for email, u in db.users.items() if u.get("id") != candidate_id}
    db.save()
    print(f"Candidate {candidate_id} permanently deleted by Admin {current_user.user_id}")
    return {"status": "success", "message": f"Candidate {candidate_id} has been permanently removed."}


# ─────────────────────────────────────────────────────────────────────────────
# Stage 4: Interview Session Initialization
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/admin/interview/start/{candidate_id}", response_model=InterviewSession)
async def start_interview_admin(candidate_id: int, resume_id: Optional[str] = Query(None), current_user: TokenData = Depends(require_admin)):
    return create_interview_session_for_candidate(candidate_id, resume_id)

@app.post("/user/interview/start", response_model=InterviewSession)
async def start_interview_user(current_user: TokenData = Depends(require_user)):
    """Allow a shortlisted user to start their own interview."""
    return create_interview_session_for_candidate(current_user.user_id, None)
    
@app.get("/user/interview/status", response_model=Optional[InterviewSession])
async def get_interview_status(current_user: TokenData = Depends(require_user)):
    session_data = next((i for i in db.interviews if i["candidate_id"] == current_user.user_id), None)
    if session_data:
        return InterviewSession(**session_data)
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Stage 5: Interview In-Progress Flow
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/interview/{interview_id}/question")
async def get_current_question(interview_id: str, current_user: TokenData = Depends(require_user)):
    session_data = next((i for i in db.interviews if i["interview_id"] == interview_id), None)
    if not session_data:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if session_data["candidate_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized for this interview")
    if session_data["status"] in ["COMPLETED", "COMPLETED_EARLY"]:
        return {"status": session_data["status"], "question_text": "Interview already completed."}
    total_expected = len(session_data.get("focus_areas", [])) * 3
    session_data["last_question_served_at"] = datetime.now().timestamp()
    db.save()
    return {
        "question_id": f"q_{len(session_data['interview_trace'])}",
        "question_text": session_data["current_question"],
        "question_index": len(session_data["interview_trace"]) + 1,
        "total_questions": total_expected,
        "status": session_data["status"]
    }

@app.post("/interview/{interview_id}/video-frame")
async def store_video_frame(interview_id: str, frame_data: dict, current_user: TokenData = Depends(require_user)):
    session_data = next((i for i in db.interviews if i["interview_id"] == interview_id), None)
    if not session_data:
        return {"status": "error", "message": "Session not found"}
    frame_str = frame_data.get("frame")
    if frame_str:
        frames = session_data.setdefault("buffered_video_frames", [])
        if len(frames) < 90:
            frames.append(frame_str)
            if len(frames) % 10 == 0:
                print(f"DEBUG: Interview {interview_id} has {len(frames)} frames buffered.")
        if len(frames) % 1 == 0:
            loop = asyncio.get_running_loop()
            real_time_flags = await loop.run_in_executor(None, analyze_single_frame, frame_str)
            if real_time_flags:
                print(f"🚨 REAL-TIME MISCONDUCT: {real_time_flags}")
                event = {"answer_id": f"realtime_{int(time.time() * 1000)}", "cheating_flags": real_time_flags, "timestamp": time.time(), "event_type": "REAL_TIME_DETECTION"}
                session_data.setdefault("cheating_events", []).append(event)
                penalty = 0.0
                if "MULTIPLE_PEOPLE_DETECTED" in real_time_flags: penalty += 1.0
                if "MOBILE_DETECTED" in real_time_flags: penalty += 1.0
                if "COMBINED_MISCONDUCT_PEOPLE_AND_MOBILE" in real_time_flags: penalty += 1.5
                if "CANDIDATE_OUT_OF_FRAME" in real_time_flags: penalty += 0.3
                if "SUSPICIOUS_OBJECT_DETECTED" in real_time_flags: penalty += 0.5
                session_data["cheating_score"] = min(20.0, session_data.get("cheating_score", 0.0) + penalty)
                db.save()
    return {"status": "success"}

@app.post("/interview/{interview_id}/event")
async def log_interview_event(interview_id: str, event_data: dict, current_user: TokenData = Depends(require_user)):
    session_data = next((i for i in db.interviews if i["interview_id"] == interview_id), None)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    event_type = event_data.get("event_type")
    if event_type == "TAB_CHANGE":
        session_data["tab_change_count"] = session_data.get("tab_change_count", 0) + 1
        session_data.setdefault("cheating_events", []).append({"answer_id": "REALTIME", "cheating_flags": ["TAB_CHANGE"], "cheating_score": 0.1, "timestamp": datetime.now().timestamp()})
        session_data["cheating_score"] = round(session_data.get("cheating_score", 0.0) + 0.1, 2)
        db.save()
        return {"status": "success", "tab_change_count": session_data["tab_change_count"]}
    return {"status": "ignored"}

@app.post("/interview/{interview_id}/answer")
async def submit_answer(
    interview_id: str,
    submission_type: str = Form(...),
    audio_file: UploadFile = File(None),
    current_user: TokenData = Depends(require_user)
):
    session_data = next((i for i in db.interviews if i["interview_id"] == interview_id), None)
    if not session_data:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if session_data["candidate_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized for this interview")
    if session_data["status"] in ["COMPLETED", "COMPLETED_EARLY"]:
        return {"status": session_data["status"], "next_question": None}

    transcript = ""
    error_info = None
    file_path = None

    if audio_file:
        temp_dir = os.path.join(os.getcwd(), "temp_audio")
        os.makedirs(temp_dir, exist_ok=True)
        ext = audio_file.filename.split('.')[-1] if '.' in audio_file.filename else 'webm'
        original_path = os.path.join(temp_dir, f"{interview_id}_{uuid.uuid4()}.{ext}")
        wav_path = original_path + ".wav"
        file_path = wav_path
        try:
            audio_content = await audio_file.read()
            print(f"DEBUG: Received audio '{audio_file.filename}' size: {len(audio_content)} bytes")
            # Guard: reject suspiciously small blobs (likely a truncated/empty recording)
            MIN_AUDIO_BYTES = 1000
            if audio_content and len(audio_content) >= MIN_AUDIO_BYTES:
                with open(original_path, "wb") as buffer:
                    buffer.write(audio_content)
                try:
                    fmt = ext if ext != 'wav' else None
                    # Use ffmpeg directly for WebM/Opus — more tolerant of truncated packets
                    if ext in ('webm', 'ogg', 'opus'):
                        import subprocess
                        result = subprocess.run(
                            [
                                _FFMPEG_BIN, "-y",
                                "-err_detect", "ignore_err",   # ignore Opus packet errors
                                "-i", original_path,
                                "-ar", "16000",                 # 16kHz
                                "-ac", "1",                     # mono
                                "-sample_fmt", "s16",           # 16-bit PCM
                                wav_path
                            ],
                            capture_output=True, text=True, timeout=60
                        )
                        if result.returncode != 0:
                            print(f"DEBUG: ffmpeg stderr: {result.stderr[-500:]}")
                            raise RuntimeError(f"ffmpeg conversion failed: {result.stderr[-200:]}")
                        print(f"DEBUG: ffmpeg direct conversion OK → {wav_path}")
                    else:
                        audio = AudioSegment.from_file(original_path, format=fmt)
                        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
                        audio.export(wav_path, format="wav")
                        print(f"DEBUG: pydub conversion OK. Duration: {len(audio)/1000.0}s")
                    try:
                        stt = get_stt_engine()
                        transcript = stt.transcribe(wav_path)
                        if not transcript:
                            error_info = "STT_NO_SPEECH_RECOGNIZED"
                    except Exception as stt_err:
                        error_info = f"STT_FAILED: {str(stt_err)}"
                except Exception as conv_err:
                    print(f"DEBUG: Conversion error: {conv_err}")
                    error_info = f"CONVERSION_FAILED: {str(conv_err)}"
                    # Last-resort: try Whisper on the raw file
                    try:
                        stt = get_stt_engine()
                        transcript = stt.transcribe(original_path)
                    except: pass
            elif audio_content:
                print(f"DEBUG: Audio blob too small ({len(audio_content)} bytes) — treating as silence")
                error_info = "AUDIO_TOO_SHORT"
            else:
                error_info = "EMPTY_AUDIO_CONTENT"
        except Exception as audio_err:
            error_info = f"AUDIO_PERSISTENCE_FAILED: {str(audio_err)}"
    else:
        error_info = "NO_AUDIO_PROVIDED"

    try:
        final_answer_text = transcript if transcript else f"[{submission_type}] (No audible response captured: {error_info or 'STT completed'})"
        now = datetime.now().timestamp()
        served_at = session_data.get("last_question_served_at", now - 30)
        time_taken = max(1, now - served_at)

        graph_state = {
            **session_data,
            "final_focus_areas": session_data.get("focus_areas", []),
            "interview_status": "WAITING_FOR_ANSWER",
            "simulated_answer": final_answer_text,
            "stt_engine": None,
            "current_followup_count": session_data.get("current_followup_count", 0),
            "time_taken": time_taken,
            "buffered_video_frames": session_data.get("buffered_video_frames", [])
        }

        print(f"--- STAGE 5 GRAPH INVOCATION START --- ID: {interview_id}, Topic: {session_data.get('current_topic')}, Answer: {final_answer_text[:50]}...")
        new_state = stage4_graph.invoke(graph_state)
        print(f"--- GRAPH INVOCATION END --- Next Q: {new_state.get('current_question', 'N/A')[:50]}..., Status: {new_state.get('interview_status')}")

        session_data["current_question"] = new_state.get("current_question")
        session_data["current_topic"] = new_state.get("current_topic")
        session_data["current_topic_index"] = new_state.get("current_topic_index", 0)
        session_data["current_followup_count"] = new_state.get("current_followup_count", 0)
        session_data["interview_trace"] = new_state.get("interview_trace", [])
        session_data["cheating_score"] = new_state.get("cheating_score", 0.0)
        session_data["cheating_events"] = new_state.get("cheating_events", [])
        session_data["warnings"] = new_state.get("warnings", [])
        session_data["latest_warning"] = new_state.get("latest_warning")
        session_data["evaluation"] = new_state.get("evaluation")
        session_data["buffered_video_frames"] = []

        if new_state.get("interview_status") == "COMPLETED" or not session_data["current_question"]:
            session_data["status"] = "COMPLETED"
        else:
            session_data["status"] = "IN_PROGRESS"
            session_data["last_question_served_at"] = datetime.now().timestamp()

        db.save()

        # ── Persist trace to local filesystem ─────────────────────────────
        try:
            trace = session_data.get("interview_trace", [])
            if trace:
                last_turn = trace[-1]
                blob_payload = {
                    "candidate_id": str(session_data["candidate_id"]),
                    "interview_id": str(session_data["interview_id"]),
                    "topic": last_turn.get("topic"), "question": last_turn.get("question"),
                    "answer_text": last_turn.get("answer_text") or final_answer_text,
                    "question_type": last_turn.get("question_type"),
                    "followup_index": last_turn.get("followup_index"),
                    "stt_error": error_info, "submission_type": submission_type,
                    "timestamp": datetime.now().isoformat()
                }
                turn_n = len(session_data["interview_trace"])
                storage.upload_file("interview-traces", f"{interview_id}/turn_{turn_n}.json", json.dumps(blob_payload).encode(), content_type="application/json")
                storage.upload_file("interview-traces", f"{interview_id}/turn_{turn_n}_answer.txt", (last_turn.get("answer_text") or final_answer_text or "").encode(), content_type="text/plain")
                print(f"DEBUG: Turn trace persisted locally under datasets/interview_traces/")

                if session_data["status"] in ["COMPLETED", "COMPLETED_EARLY"]:
                    if session_data.get("evaluation"):
                        storage.upload_file("interview-traces", f"{interview_id}/evaluation.json", json.dumps(session_data["evaluation"]).encode(), content_type="application/json")
                    unified = build_comprehensive_report_data(session_data["candidate_id"])
                    full_report = {
                        "candidate_id": str(session_data["candidate_id"]), "interview_id": str(session_data["interview_id"]),
                        "overall_metrics": {"total_score": session_data.get("evaluation", {}).get("overall_score", 0.0), "cheating_score": session_data.get("cheating_score", 0.0), "completed_at": datetime.now().isoformat()},
                        **unified, "interview_trace": session_data["interview_trace"], "evaluation_summary": session_data.get("evaluation")
                    }
                    storage.upload_file("interview-traces", f"{interview_id}/full_interview_report.json", json.dumps(full_report).encode(), content_type="application/json")
                    print(f"DEBUG: Full report persisted locally under datasets/interview_traces/")
        except Exception as storage_err:
            print(f"Trace Storage Warning (Non-blocking): {storage_err}")

        return {
            "status": session_data["status"],
            "next_question": {
                "question_id": f"q_{len(session_data['interview_trace'])}",
                "question_text": session_data["current_question"],
                "question_index": len(session_data["interview_trace"]) + 1,
                "total_questions": len(session_data.get("focus_areas", [])) * 3
            } if session_data["current_question"] else None,
            "transcript": transcript, "error": error_info,
            "warning": session_data.get("latest_warning"),
            "cheating_score": session_data.get("cheating_score", 0)
        }
    except Exception as e:
        print(f"Graph Advance Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to advance interview: {str(e)}")
    finally:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

@app.post("/interview/{interview_id}/end")
async def end_interview_early(interview_id: str, audio_file: UploadFile = File(None), current_user: TokenData = Depends(require_user)):
    session_data = next((i for i in db.interviews if i["interview_id"] == interview_id), None)
    if not session_data:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if session_data["candidate_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if session_data["status"] in ["COMPLETED", "COMPLETED_EARLY"]:
        return {"status": session_data["status"]}

    transcript = ""
    error_info = None
    file_path = None

    if audio_file:
        temp_dir = os.path.join(os.getcwd(), "temp_audio")
        os.makedirs(temp_dir, exist_ok=True)
        ext = audio_file.filename.split('.')[-1] if '.' in audio_file.filename else 'webm'
        original_path = os.path.join(temp_dir, f"end_{interview_id}_{uuid.uuid4()}.{ext}")
        wav_path = original_path + ".wav"
        try:
            audio_content = await audio_file.read()
            if audio_content:
                with open(original_path, "wb") as buffer:
                    buffer.write(audio_content)
                audio = AudioSegment.from_file(original_path)
                audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
                audio.export(wav_path, format="wav")
                stt = get_stt_engine()
                transcript = stt.transcribe(wav_path)
                file_path = wav_path
            else:
                error_info = "EMPTY_AUDIO"
        except Exception as e:
            error_info = str(e)

    if session_data.get("current_question"):
        answer_text = transcript if transcript else "[SKIPPED] (Candidate ended interview early)"
        turn = {
            "topic": session_data.get("current_topic", "General"),
            "question": session_data["current_question"], "answer_text": answer_text,
            "timestamp": datetime.now().timestamp(),
            "followup_index": session_data.get("current_followup_count", 0),
            "question_type": "initial" if session_data.get("current_followup_count", 0) == 0 else "followup"
        }
        session_data.setdefault("interview_trace", []).append(turn)

    session_data["status"] = "COMPLETED_EARLY"
    session_data["ended_at"] = datetime.now().isoformat()
    session_data["termination_metadata"] = {"ended_by": "CANDIDATE", "end_reason": "MANUAL_SUBMISSION", "questions_at_termination": len(session_data["interview_trace"])}

    try:
        eval_state = {**session_data, "final_focus_areas": session_data.get("focus_areas", [])}
        evaluated_state = evaluate_interview(eval_state)
        session_data["evaluation"] = evaluated_state.get("evaluation")
    except Exception as eval_err:
        print(f"DEBUG: Early termination evaluation failed: {eval_err}")

    db.save()

    try:
        unified = build_comprehensive_report_data(session_data["candidate_id"])
        full_report = {
            "candidate_id": str(session_data["candidate_id"]), "interview_id": str(session_data["interview_id"]),
            "overall_metrics": {"total_score": session_data.get("evaluation", {}).get("overall_score", 0.0), "cheating_score": session_data.get("cheating_score", 0.0), "completed_at": datetime.now().isoformat(), "termination_type": "EARLY_SUBMISSION"},
            **unified, "interview_trace": session_data.get("interview_trace", []), "evaluation_summary": session_data.get("evaluation")
        }
        storage.upload_file("interview-traces", f"{interview_id}/early_termination_report.json", json.dumps(full_report).encode(), content_type="application/json")
    except Exception as e:
        print(f"Early termination report save warning: {e}")

    if file_path and os.path.exists(file_path):
        os.remove(file_path)

    return {"status": "COMPLETED_EARLY", "message": "Interview ended successfully by candidate."}


# ─────────────────────────────────────────────────────────────────────────────
# /blob/url compatibility shim  (returns local /files/… URL)
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/blob/url")
async def get_blob_url(container: str, blob_path: str, current_user: TokenData = Depends(get_current_user)):
    """Compatibility shim — returns local file-serving URL instead of SAS URL."""
    local_path = storage.generate_sas_url(container, blob_path)   # returns /files/…
    return {"url": f"http://localhost:8000{local_path}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)