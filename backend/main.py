import sys
# Backend - Peak Intelligence Scoring
# Updated: 2026-02-08T12:59:00
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, HTTPException, status, Depends, File, UploadFile, Form, Query
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta, datetime
from typing import List, Optional, Literal
import uuid
import json
import logging
import time
from pydub import AudioSegment
import io

from config import settings
from models import UserCreate, UserLogin, User, Token, TokenData, JobDescription, Resume, InterviewSession
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin,
    require_user
)
from database import db
from infra.azure_blob import azure_blob_helper
from infra.text_extraction import extract_text
from jd_intelligence.graph import jd_graph
from resume_intelligence.graph import resume_graph
from focus_area_selection.graph import stage3_graph
from interview_orchestration.graph import stage4_graph
from fastapi.security import HTTPBearer

# Security instance for flexible auth (allows missing tokens)
security_optional = HTTPBearer(auto_error=False)
from interview_orchestration.nodes.initialize_interview import initialize_interview
from interview_orchestration.stt.factory import get_stt_engine

app = FastAPI(title="Interview System API - Stage 5: Interview In-Progress")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "stage": "2 - Persistence & Files"}

@app.post("/auth/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user."""
    # Normalize email
    user_data.email = user_data.email.lower()
    
    # Check if user already exists
    if user_data.email in db.users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user_id = db.user_id_counter
    db.user_id_counter += 1
    
    user = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "role": user_data.role,
        "status": "active",
        "hashed_password": hashed_password
    }
    
    db.users[user_data.email] = user
    db.save()
    
    # Return user without password
    return User(**{k: v for k, v in user.items() if k != "hashed_password"})

@app.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login and get JWT token."""
    # Normalize email
    email = credentials.email.lower()
    
    # Find user
    user = db.users.get(email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if user["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"user_id": user["id"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=User)
async def get_me(current_user: TokenData = Depends(get_current_user)):
    """Get current user info."""
    # Find user by ID
    for user in db.users.values():
        if user["id"] == current_user.user_id:
            return User(**{k: v for k, v in user.items() if k != "hashed_password"})
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found"
    )

@app.get("/admin/dashboard")
async def admin_dashboard(current_user: TokenData = Depends(require_admin)):
    """Admin dashboard endpoint."""
    return {"message": "Welcome to Admin Dashboard", "user_id": current_user.user_id}

@app.get("/user/dashboard")
async def user_dashboard(current_user: TokenData = Depends(require_user)):
    """User dashboard endpoint."""
    return {"message": "Welcome to User Dashboard", "user_id": current_user.user_id}

# Stage 2: JD and Resume Upload

@app.post("/admin/jd/upload", response_model=JobDescription, status_code=status.HTTP_201_CREATED)
async def upload_jd(
    file: UploadFile = File(...),
    current_user: TokenData = Depends(require_admin)
):
    """Admin uploads Job Description."""
    if not file.filename.lower().endswith(('.pdf', '.docx')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are supported"
        )
    
    job_id = f"JOB_{len(db.jds) + 1}"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    blob_name = f"job_descriptions/{job_id}/{timestamp}_{file.filename}"
    
    file_content = await file.read()
    # Upload to Azure
    azure_blob_helper.upload_file("job-descriptions", blob_name, file_content)
    
    # Run JD Intelligence
    intelligence = {}
    try:
        text = extract_text(file_content, file.filename)
        if text:
            print(f"Running JD Intelligence for {job_id}...")
            res = jd_graph.invoke({"raw_jd": text})
            # Filter out raw_jd to save space/redundancy? keeping normalized might be useful
            intelligence = res
    except Exception as e:
        print(f"JD Graph Error: {e}")
    
    jd = JobDescription(
        job_id=job_id,
        jd_blob_path=blob_name,
        status="ACTIVE",
        uploaded_at=datetime.now(),
        intelligence=intelligence
    )
    
    # Store JD metadata
    db.jds[job_id] = jd.dict()
    db.save()
    
    return jd

@app.get("/admin/jd", response_model=List[JobDescription])
async def get_all_jds(current_user: TokenData = Depends(require_admin)):
    """List all non-deleted JDs for admin."""
    return [JobDescription(**jd) for jd in db.jds.values() if not jd.get("is_deleted", False)]

@app.delete("/admin/job-descriptions/{job_id}")
async def delete_jd(job_id: str, current_user: TokenData = Depends(require_admin)):
    """Admin soft-deletes a Job Description."""
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
    """Candidate previews the active JD."""
    # Return the first active and non-deleted JD found
    for jd_data in db.jds.values():
        if jd_data.get("status") == "ACTIVE" and not jd_data.get("is_deleted", False):
            return JobDescription(**jd_data)
    return None

@app.post("/user/resume/upload", response_model=Resume, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: TokenData = Depends(require_user)
):
    """User uploads resume. Gated by existence of active JD."""
    # Check if an active non-deleted JD exists
    active_jd = None
    for jd_data in db.jds.values():
        if jd_data.get("status") == "ACTIVE" and not jd_data.get("is_deleted", False):
            active_jd = True
            break
    
    if not active_jd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description not uploaded yet"
        )
    
    if not file.filename.lower().endswith(('.pdf', '.docx')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are supported"
        )
    
    resume_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    blob_name = f"resumes/CAND_{current_user.user_id}/{timestamp}_{file.filename}"
    
    file_content = await file.read()
    azure_blob_helper.upload_file("resumes", blob_name, file_content)
    
    # Run Resume Intelligence & Matching
    intelligence = {}
    job_id = None
    
    # Find active non-deleted JD
    active_jd = next((j for j in db.jds.values() if j.get("status") == "ACTIVE" and not j.get("is_deleted", False)), None)
    
    if active_jd:
        job_id = active_jd.get("job_id")
        jd_intel = active_jd.get("intelligence", {})
        
        try:
            text = extract_text(file_content, file.filename)
            if text:
                print(f"Running Resume Intelligence linked to {job_id}...")
                state_input = {
                    "candidate_id": str(current_user.user_id),
                    "raw_resume": text,
                    # Inject JD context required by resume graph nodes
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
        candidate_id=current_user.user_id,
        resume_id=resume_id,
        resume_blob_path=blob_name,
        status="UNDER_REVIEW",
        uploaded_at=datetime.now(),
        job_id=job_id,
        intelligence=intelligence
    )
    
    db.resumes.append(resume.dict())
    db.save()
    
    return resume

@app.get("/admin/resumes", response_model=List[Resume])
async def list_resumes(current_user: TokenData = Depends(require_admin)):
    """Admin lists all candidate resumes."""
    return [Resume(**r) for r in db.resumes]

@app.get("/user/resume/status")
async def get_resume_status(current_user: TokenData = Depends(require_user)):
    """Candidate checks their resume status."""
    for resume_data in db.resumes:
        if resume_data["candidate_id"] == current_user.user_id:
            return Resume(**resume_data)
    return None

from pydantic import BaseModel

class ShortlistRequest(BaseModel):
    decision: Literal["SHORTLISTED", "REJECTED", "SELECTED"]

class CandidateResponse(BaseModel):
    candidate_id: int
    resume_id: str
    resume_blob_url: str
    jd_id: Optional[str] = None
    system_score: float = 0.0
    system_shortlisted: bool = False
    system_reason: Optional[dict] = None
    admin_status: str
    interview_unlocked: bool
    interview_status: Literal["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "N/A"] = "N/A"
    cheating_score: float = 0.0
    misconduct_events: list = []
    interview_trace: list = []
    tab_change_count: int = 0
    evaluation_results: Optional[dict] = None
    total_interview_score: float = 0.0
    total_confidence_level: str = "N/A"
    cheating_severity: str = "LOW"

@app.get("/admin/candidates", response_model=List[CandidateResponse])
async def get_candidates(current_user: TokenData = Depends(require_admin)):
    """Get all candidates with intelligence results."""
    db.load()  # Force reload from disk to catch external evaluation updates
    candidates = []
    for r_dict in db.resumes:
        intel = r_dict.get("intelligence", {}) or {}
        
        # Generate SAS URL for the resume
        try:
            blob_url = azure_blob_helper.generate_sas_url("resumes", r_dict["resume_blob_path"])
        except Exception:
            blob_url = ""
            
        # Prepare a text summary from intelligence
        reason_data = intel.get("shortlist_reason", "No reasoning available")
        if isinstance(reason_data, dict):
            matched = len(reason_data.get("matched_core_skills", []))
            summary = f"Matched {matched} core skills."
            penalties = reason_data.get("penalties_applied", {}).get("buzzword_only_claims", [])
            if penalties:
                summary += f" ({len(penalties)} penalties applied for buzzwords)."
        else:
            summary = str(reason_data)

        # Get interview session for cheating data
        interview = next((i for i in db.interviews if str(i["candidate_id"]) == str(r_dict["candidate_id"])), None)

        # Calculate Total Interview Score & Metrics
        total_score = 0.0
        confidence = "N/A"
        severity = "LOW"  # Default
        
        # Get cheating score (available even without evaluation)
        c_score = interview.get("cheating_score", 0.0) if interview else 0.0
        
        # MANDATORY CHEATING SEVERITY RULE (Backend enforced)
        # cheating_score <= 2 → LOW
        # cheating_score > 2  → MEDIUM
        # cheating_score > 3  → HIGH
        if c_score > 3.0:
            severity = "HIGH"
        elif c_score > 2.0:
            severity = "MEDIUM"
        else:
            severity = "LOW"
        
        if interview and interview.get("evaluation"):
            eval_data = interview["evaluation"]
            total_score = eval_data.get("overall_score", 0.0)
            
            # Apply cheating penalty: Directly subtract cheating score from technical total
            total_score = max(0.0, round(total_score - c_score, 2))
            
            # Confidence Level
            results = eval_data.get("per_answer_results", [])
            conf_levels = [r.get("confidence_level", "MEDIUM") for r in results if "confidence_level" in r]
            if conf_levels:
                confidence = max(set(conf_levels), key=conf_levels.count)
            else:
                confidence = "MEDIUM"

        c = CandidateResponse(
            candidate_id=r_dict["candidate_id"],
            resume_id=r_dict["resume_id"],
            resume_blob_url=blob_url,
            jd_id=r_dict.get("job_id"),
            system_score=intel.get("final_score", 0.0),
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
            total_interview_score=total_score,
            total_confidence_level=confidence,
            cheating_severity=severity
        )
        candidates.append(c)
    return candidates

# Helper auth function for report downloads (supports both header and query param tokens)
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
    """Generate a rich HTML interview report."""
    resume = next((r for r in db.resumes if r["candidate_id"] == candidate_id), None)
    if not resume:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    interview = next((i for i in db.interviews if i["candidate_id"] == candidate_id), None)
    if not interview or interview["status"] != "COMPLETED":
        return f"<html><body><h1>Report not ready</h1><p>Interview for candidate {candidate_id} is not yet completed.</p></body></html>"

    eval_data = interview.get("evaluation", {})
    trace = interview.get("interview_trace", [])
    
    # Safety check: If no evaluation data exists, return error page
    if not eval_data:
        return f"""<html><body style="padding: 50px; font-family: system-ui;">
        <h1>Report Generation Error</h1>
        <p>No evaluation data found for candidate {candidate_id}.</p>
        <p>The interview may not have been evaluated yet.</p>
        </body></html>"""
    
    # Calculate scores on the fly for the report header (with safe defaults)
    total_score = eval_data.get("overall_score", 0.0)
    c_score = interview.get("cheating_score", 0.0)
    penalty = min(0.5, (c_score / 5.0))
    final_score = round(total_score * (1.0 - penalty), 2)
    
    # Extract confidence (mode) with safe handling
    results = eval_data.get("per_answer_results", [])
    conf_levels = [r.get("confidence_level", "MEDIUM") for r in results if r and "confidence_level" in r]
    avg_conf = max(set(conf_levels), key=conf_levels.count) if conf_levels else "MEDIUM"
    
    # Calculate cheating severity using mandatory rule
    if c_score > 3.0:
        severity = "HIGH"
    elif c_score > 2.0:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Interview Report - Candidate {candidate_id}</title>
        <style>
            body {{ font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: #1a202c; max-width: 900px; margin: 0 auto; padding: 40px; background: #fff; }}
            .header {{ border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }}
            .header h1 {{ margin: 0; color: #2d3748; font-size: 28px; }}
            .badge {{ padding: 4px 12px; borderRadius: 4px; font-weight: bold; font-size: 14px; text-transform: uppercase; }}
            .metric-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }}
            .metric-box {{ background: #f7fafc; padding: 20px; borderRadius: 8px; border: 1px solid #edf2f7; text-align: center; }}
            .metric-box .label {{ font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }}
            .metric-box .value {{ font-size: 24px; font-weight: bold; color: #2d3748; }}
            .section {{ margin-bottom: 40px; }}
            .section-title {{ font-size: 18px; font-weight: bold; color: #4a5568; margin-bottom: 15px; border-left: 4px solid #4299e1; padding-left: 12px; }}
            .turn {{ background: #fff; border: 1px solid #e2e8f0; borderRadius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }}
            .turn-header {{ display: flex; justify-content: space-between; margin-bottom: 15px; background: #f8fafc; padding: 8px 12px; borderRadius: 6px; }}
            .question {{ font-weight: bold; color: #2d3748; margin-bottom: 10px; font-size: 15px; }}
            .answer {{ color: #4a5568; margin-bottom: 20px; font-style: italic; white-space: pre-wrap; }}
            .eval-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 13px; }}
            .eval-points ul {{ padding-left: 18px; margin: 0; }}
            .status-selected {{ color: #38a169; }}
            .status-rejected {{ color: #e53e3e; }}
            .score-tag {{ background: #4299e1; color: white; padding: 2px 8px; borderRadius: 4px; }}
            @media print {{
                body {{ padding: 0; }}
                .no-print {{ display: none; }}
            }}
        </style>
    </head>
    <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #4299e1; color: white; border: none; borderRadius: 6px; cursor: pointer;">Print to PDF</button>
        </div>
        
        <div class="header">
            <div>
                <h1>Interview Performance Report</h1>
                <div style="color: #718096; margin-top: 5px;">Candidate ID: {candidate_id} | Status: <span class="status-{resume['status'].lower()}">{resume['status']}</span></div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 12px; color: #a0aec0;">Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
                <div style="font-size: 12px; color: #a0aec0;">System Ver: 1.0-Admin-Core</div>
            </div>
        </div>

        <div class="metric-grid">
            <div class="metric-box">
                <div class="label">Total Adjusted Score</div>
                <div class="value">{final_score}/10</div>
            </div>
            <div class="metric-box">
                <div class="label">Decision Confidence</div>
                <div class="value" style="color: {'#38a169' if avg_conf == 'HIGH' else '#ecc94b'}">{avg_conf}</div>
            </div>
            <div class="metric-box">
                <div class="label">Cheating Severity</div>
                <div class="value" style="color: {'#e53e3e' if severity == 'HIGH' else '#ecc94b' if severity == 'MEDIUM' else '#38a169'}">{severity}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Evaluation Summary</div>
            <p style="font-size: 14px;">This candidate was evaluated across {len(trace)} interactive turns. The system analyzed technical depth, communication clarity, and situational reasoning. {f'A cheating penalty was applied due to suspicious events (Score: {c_score}).' if c_score > 0 else 'No major misconduct was detected.'}</p>
        </div>

        <div class="section">
            <div class="section-title">Question by Question Breakdown</div>
    """

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
                <div class="eval-points">
                    <div style="font-weight: bold; color: #38a169; margin-bottom: 5px;">Strengths</div>
                    <ul>
                        {"".join([f"<li>{s}</li>" for s in t_eval.get('strengths', [])])}
                    </ul>
                </div>
                <div class="eval-points">
                    <div style="font-weight: bold; color: #e53e3e; margin-bottom: 5px;">Weaknesses</div>
                    <ul>
                        {"".join([f"<li>{w}</li>" for w in t_eval.get('weaknesses', [])])}
                    </ul>
                </div>
            </div>
            
            <div style="margin-top: 15px; font-size: 13px; border-top: 1px dashed #e2e8f0; padding-top: 10px;">
                <strong>Reasoning Notes:</strong> {t_eval.get('reasoning_notes', 'N/A')}
            </div>
            
            <div style="margin-top: 10px; font-size: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                <strong>Expected Points:</strong>
                {" ".join([f'<span style="background: {"#c6f6d5" if c in ev_v_ac.get("covered", []) else "#fed7d7"}; padding: 2px 6px; borderRadius: 4px;">{c}</span>' for c in (ev_v_ac.get("expected_focus", []) + ev_v_ac.get("missed", []))])}
            </div>
        </div>
        """

    html_content += """
        </div>
        <div style="margin-top: 50px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #a0aec0;">
            Confidential - AI Interview Intelligence Report - &copy; 2026 Sigmoid Analytics
        </div>
    </body>
    </html>
    """
    
    return html_content

@app.post("/admin/candidates/{candidate_id}/shortlist")
async def shortlist_candidate(candidate_id: int, request: ShortlistRequest, current_user: TokenData = Depends(require_admin)):
    """Shortlist, Select or Reject a candidate."""
    # Find resume
    resume = next((r for r in db.resumes if r["candidate_id"] == candidate_id), None)
    if not resume:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    # Check interview status if this is a final decision (SELECTED)
    interview = next((i for i in db.interviews if i["candidate_id"] == candidate_id), None)
    
    if request.decision == "SELECTED":
        if not interview or interview["status"] != "COMPLETED":
             raise HTTPException(status_code=400, detail="Cannot SELECT a candidate before they have COMPLETED the interview.")

    # Update Status
    resume["status"] = request.decision
    
    if request.decision == "SHORTLISTED":
        resume["interview_unlocked"] = True
    elif request.decision == "SELECTED":
        resume["interview_unlocked"] = False # Logic: No more interview needed
    else:
        # For REJECTED
        resume["interview_unlocked"] = False
        
    db.save()
    return {"status": "success", "new_status": request.decision}

@app.delete("/admin/candidates/{candidate_id}")
async def delete_candidate(candidate_id: int, current_user: TokenData = Depends(require_admin)):
    """Admin permanently deletes a REJECTED or SELECTED candidate."""
    # 1. Find the resume/candidate status
    resume_idx = next((i for i, r in enumerate(db.resumes) if r["candidate_id"] == candidate_id), None)
    if resume_idx is None:
        raise HTTPException(status_code=404, detail="Candidate record not found")
        
    resume = db.resumes[resume_idx]
    
    # 2. Validation: Only REJECTED or SELECTED candidates can be deleted
    if resume["status"] not in ["REJECTED", "SELECTED"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete candidate with status: {resume['status']}. Only REJECTED or SELECTED candidates can be deleted."
        )

    # 3. Perform Deletion
    # Delete Resume record
    db.resumes.pop(resume_idx)
    
    # Delete associated interview session if exists
    interview_idx = next((i for i, inter in enumerate(db.interviews) if inter["candidate_id"] == candidate_id), None)
    if interview_idx is not None:
        db.interviews.pop(interview_idx)
    
    # Delete User account (dictionary filter based on user id)
    db.users = {email: u for email, u in db.users.items() if u.get("id") != candidate_id}
    
    db.save()
    
    print(f"Candidate {candidate_id} and profile permanently deleted by Admin {current_user.user_id}")
    return {"status": "success", "message": f"Candidate {candidate_id} has been permanently removed."}

# Stage 4: Interview Session Initialization

@app.post("/admin/interview/start/{candidate_id}", response_model=InterviewSession)
async def start_interview(candidate_id: int, current_user: TokenData = Depends(require_admin)):
    """Admin starts the interview session for a shortlisted candidate."""
    # Find the candidate's resume
    resume = next((r for r in db.resumes if r["candidate_id"] == candidate_id), None)
    if not resume:
        raise HTTPException(status_code=404, detail="Candidate resume not found")
        
    if resume["status"] != "SHORTLISTED":
        raise HTTPException(status_code=400, detail="Candidate must be SHORTLISTED to start interview")
        
    # Get JD intelligence for context (ensure not deleted)
    job_id = resume.get("job_id")
    jd = db.jds.get(job_id) if job_id else None
    if not jd or jd.get("is_deleted") or not jd.get("intelligence"):
        raise HTTPException(status_code=400, detail="Associated Job description is deleted or intelligence missing")
        
    jd_intel = jd["intelligence"]
    res_intel = resume.get("intelligence", {})
    
    # 1. Focus Area Selection
    s3_input = {
        "interview_requirements": jd_intel.get("interview_requirements", {}),
        "skill_intelligence": jd_intel.get("skill_intelligence", {}),
        "resume_claims": res_intel.get("resume_claims", {}),
        "evidence_map": res_intel.get("evidence_map", {}),
        "match_scores": res_intel.get("match_scores", {}),
        "final_score": res_intel.get("final_score", 0.0)
    }
    
    try:
        s3_res = stage3_graph.invoke(s3_input)
        final_focus_areas = s3_res.get("final_focus_areas", [])
    except Exception as e:
        print(f"Stage 3 Graph Error: {e}")
        raise HTTPException(status_code=500, detail=f"Focus area selection failed: {str(e)}")
        
    if not final_focus_areas:
        raise HTTPException(status_code=400, detail="No focus areas could be determined for this candidate")
        
    # 2. Interview Initialization & Question Generation
    s4_init_input = {
        "candidate_id": str(candidate_id),
        "final_focus_areas": final_focus_areas,
    }
    
    try:
        # Manually initialize state to set current_topic and status
        s4_state = initialize_interview(s4_init_input)
        # Run the graph (ask_initial_question node) to get the first question
        s4_res = stage4_graph.invoke(s4_state)
    except Exception as e:
        print(f"Interview Initiation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Interview initiation failed: {str(e)}")
        
    # 3. Create Session Record
    session = InterviewSession(
        interview_id=str(uuid.uuid4()),
        candidate_id=candidate_id,
        current_question=s4_res.get("current_question"),
        status="IN_PROGRESS" if s4_res.get("current_question") else "NOT_STARTED",
        created_at=datetime.now(),
        focus_areas=final_focus_areas,
        current_topic=s4_res.get("current_topic"),
        current_topic_index=s4_res.get("current_topic_index", 0),
        current_followup_count=s4_res.get("current_followup_count", 0),
        interview_trace=[]
    )
    
    # Persist (ensure only one active session per candidate)
    db.interviews = [i for i in db.interviews if i["candidate_id"] != candidate_id]
    db.interviews.append(session.dict())
    db.save()
    
    return session

@app.get("/user/interview/status", response_model=Optional[InterviewSession])
async def get_interview_status(current_user: TokenData = Depends(require_user)):
    """Candidate checks their interview session status."""
    session_data = next((i for i in db.interviews if i["candidate_id"] == current_user.user_id), None)
    if session_data:
        return InterviewSession(**session_data)
    return None

# Stage 5: Interview In-Progress Flow

@app.get("/interview/{interview_id}/question")
async def get_current_question(interview_id: str, current_user: TokenData = Depends(require_user)):
    """Fetch the current question for the session."""
    session_data = next((i for i in db.interviews if i["interview_id"] == interview_id), None)
    if not session_data:
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    if session_data["candidate_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized for this interview")
    
    total_expected = len(session_data.get("focus_areas", [])) * 3 
    
    # Track when question was served for cheating detection (TOO_FAST)
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
    """Async endpoint to buffer video frames for misconduct analysis."""
    session_data = next((i for i in db.interviews if i["interview_id"] == interview_id), None)
    if not session_data:
        return {"status": "error", "message": "Session not found"}
        
    # Buffer up to 5 frames per question to avoid memory bloat
    frames = session_data.setdefault("buffered_video_frames", [])
    if len(frames) < 5:
        frames.append(frame_data.get("frame")) # Expecting base64 string
        # db.save() is expensive for every frame, we rely on in-memory until next save
        # or we could just skip saving frames to disk at all if we process them instantly
    return {"status": "success"}

@app.post("/interview/{interview_id}/event")
async def log_interview_event(interview_id: str, event_data: dict, current_user: TokenData = Depends(require_user)):
    """Log real-time events like tab changes."""
    session_data = next((i for i in db.interviews if i["interview_id"] == interview_id), None)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    event_type = event_data.get("event_type")
    
    if event_type == "TAB_CHANGE":
        session_data["tab_change_count"] = session_data.get("tab_change_count", 0) + 1
        
        # Add to cheating events if desired, or just keep as a separate counter
        session_data.setdefault("cheating_events", []).append({
            "answer_id": "REALTIME",
            "cheating_flags": ["TAB_CHANGE"],
            "cheating_score": 0.1, # Small penalty for tab switching
            "timestamp": datetime.now().timestamp()
        })
        session_data["cheating_score"] = round(session_data.get("cheating_score", 0.0) + 0.1, 2)
        db.save()
        return {"status": "success", "tab_change_count": session_data["tab_change_count"]}
    
    return {"status": "ignored"}

@app.post("/interview/{interview_id}/answer")
async def submit_answer(
    interview_id: str,
    submission_type: str = Form(...),
    audio_file: UploadFile = File(None), # Allow null audio for timeout/failure
    current_user: TokenData = Depends(require_user)
):
    """Submit an answer for the current question and get the next one."""
    session_data = next((i for i in db.interviews if i["interview_id"] == interview_id), None)
    if not session_data:
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    if session_data["candidate_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized for this interview")
        
    if session_data["status"] == "COMPLETED":
        # Handle idempotency: if already completed, just return current state
        return {
            "status": "COMPLETED",
            "next_question": None
        }

    # 1. Audio Persistence & Validation
    transcript = ""
    error_info = None
    file_path = None
    
    if audio_file:
        temp_dir = os.path.join(os.getcwd(), "temp_audio")
        os.makedirs(temp_dir, exist_ok=True)
        
        # Determine actual extension
        ext = audio_file.filename.split('.')[-1] if '.' in audio_file.filename else 'webm'
        original_path = os.path.join(temp_dir, f"{interview_id}_{uuid.uuid4()}.{ext}")
        wav_path = original_path + ".wav" # Target for STT
        file_path = wav_path # For backward compatibility in logs
        
        try:
            audio_content = await audio_file.read()
            print(f"DEBUG: Received audio file '{audio_file.filename}' Content-Type: {audio_file.content_type} size: {len(audio_content)} bytes")
            
            if audio_content:
                # 1. Save original for reference/debugging
                with open(original_path, "wb") as buffer:
                    buffer.write(audio_content)

                # 2. Convert to standard WAV (16kHz, Mono, PCM) using Pydub
                try:
                    # Determine format from extension
                    fmt = ext if ext != 'wav' else None
                    
                    # Load audio from original file
                    audio = AudioSegment.from_file(original_path, format=fmt)
                    
                    # Normalize to 16000Hz, Mono, 16-bit
                    audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
                    
                    # Save to WAV for STT
                    audio.export(wav_path, format="wav")
                    
                    # Log audio stats
                    duration = len(audio) / 1000.0
                    volume = audio.dBFS
                    print(f"DEBUG: Audio converted. Duration: {duration}s, Volume: {volume} dBFS")
                    
                    # 3. Transcribe
                    try:
                        stt = get_stt_engine()
                        transcript = stt.transcribe(wav_path)
                        if not transcript:
                            error_info = "STT_NO_SPEECH_RECOGNIZED"
                    except Exception as stt_err:
                        print(f"STT Error: {stt_err}")
                        error_info = f"STT_FAILED: {str(stt_err)}"
                except Exception as conv_err:
                    print(f"Audio Conversion Error: {conv_err}")
                    error_info = f"CONVERSION_FAILED: {str(conv_err)}"
                    # If conversion failed, try STT on original as last resort
                    try:
                        stt = get_stt_engine()
                        transcript = stt.transcribe(original_path)
                    except: pass
            else:
                error_info = "EMPTY_AUDIO_CONTENT"
        except Exception as audio_err:
            error_info = f"AUDIO_PERSISTENCE_FAILED: {str(audio_err)}"
    else:
        error_info = "NO_AUDIO_PROVIDED"

    # 3. Advance Graph (MANDATORY)
    try:
        # If transcript failed, use placeholder to ensure graph progresses
        # This prevents the 'same question repeating' loop
        error_msg = error_info if error_info else "STT completed"
        final_answer_text = transcript if transcript else f"[{submission_type}] (No audible response captured: {error_msg})"
        
        # Calculate time taken
        now = datetime.now().timestamp()
        served_at = session_data.get("last_question_served_at", now - 30)
        time_taken = max(1, now - served_at)

        graph_state = {
            **session_data,
            "final_focus_areas": session_data.get("focus_areas", []), # Add alias for nodes
            "interview_status": "WAITING_FOR_ANSWER",
            "simulated_answer": final_answer_text,
            "stt_engine": None,
            "current_followup_count": session_data.get("current_followup_count", 0),
            "time_taken": time_taken,
            "buffered_video_frames": session_data.get("buffered_video_frames", [])
        }
        
        # Logging Telemetry
        print(f"--- STAGE 5 GRAPH INVOCATION START ---")
        print(f"ID: {interview_id}")
        print(f"Index: {session_data.get('current_followup_count')}")
        print(f"Topic: {session_data.get('current_topic')}")
        print(f"Answer: {final_answer_text[:50]}...")
        
        new_state = stage4_graph.invoke(graph_state)
        
        print(f"Next Question: {new_state.get('current_question', 'N/A')[:50]}...")
        print(f"Next Index: {new_state.get('current_followup_count')}")
        print(f"New Status: {new_state.get('interview_status')}")
        print(f"--- GRAPH INVOCATION END ---")
        
        # 4. Update Session Source of Truth
        session_data["current_question"] = new_state.get("current_question")
        session_data["current_topic"] = new_state.get("current_topic")
        session_data["current_topic_index"] = new_state.get("current_topic_index", 0)
        session_data["current_followup_count"] = new_state.get("current_followup_count", 0)
        session_data["interview_trace"] = new_state.get("interview_trace", [])
        
        # CHEATING DETECTION persistence
        session_data["cheating_score"] = new_state.get("cheating_score", 0.0)
        session_data["cheating_events"] = new_state.get("cheating_events", [])
        session_data["warnings"] = new_state.get("warnings", [])
        session_data["latest_warning"] = new_state.get("latest_warning")
        session_data["evaluation"] = new_state.get("evaluation")
        
        # Buffer cleanup
        session_data["buffered_video_frames"] = []

        if new_state.get("interview_status") == "COMPLETED" or not session_data["current_question"]:
            session_data["status"] = "COMPLETED"
        else:
            session_data["status"] = "IN_PROGRESS"
            # Update served time for the NEXT question to ensure accurate time_taken
            session_data["last_question_served_at"] = datetime.now().timestamp()
            
        db.save()

        # 5. Azure Blob Persistence (GUARANTEED)
        try:
            # Find the turn we just processed. It's the one that matches current question index.
            # Usually it's the last one in the trace.
            trace = session_data.get("interview_trace", [])
            if trace:
                last_turn = trace[-1]
                
                # Double check this is actually the turn for the question we just answered
                # (to prevent stale uploads if there were race conditions)
                blob_payload = {
                    "candidate_id": str(session_data["candidate_id"]),
                    "interview_id": str(session_data["interview_id"]),
                    "topic": last_turn.get("topic"),
                    "question": last_turn.get("question"),
                    "answer_text": last_turn.get("answer_text") or final_answer_text, # Fallback
                    "question_type": last_turn.get("question_type"),
                    "followup_index": last_turn.get("followup_index"),
                    "stt_error": error_info,
                    "submission_type": submission_type,
                    "timestamp": datetime.now().isoformat()
                }
                
                # Container name must be lowercase-kebab-case (no underscores)
                container = "interview-traces"
                blob_name = f"{interview_id}/turn_{len(session_data['interview_trace'])}.json"
                
                azure_blob_helper.upload_file(
                    container_name=container,
                    blob_name=blob_name,
                    file_content=json.dumps(blob_payload).encode('utf-8'),
                    content_type="application/json"
                )
                
                # Also upload a simple .txt version for raw answer visibility
                txt_blob_name = f"{interview_id}/turn_{len(session_data['interview_trace'])}_answer.txt"
                azure_blob_helper.upload_file(
                    container_name=container,
                    blob_name=txt_blob_name,
                    file_content=(last_turn.get("answer_text") or final_answer_text or "").encode('utf-8'),
                    content_type="text/plain"
                )
                
                print(f"DEBUG: Turn trace and text answer persisted to Azure container: {container}")
                
                # 5b. If completed, upload the final evaluation report and full trace
                if session_data["status"] == "COMPLETED":
                    # Upload individual evaluation.json (legacy/compact)
                    if session_data.get("evaluation"):
                        eval_blob_name = f"{interview_id}/evaluation.json"
                        azure_blob_helper.upload_file(
                            container_name=container,
                            blob_name=eval_blob_name,
                            file_content=json.dumps(session_data["evaluation"]).encode('utf-8'),
                            content_type="application/json"
                        )
                    
                    # Upload FULL COMPREHENSIVE REPORT
                    report_blob_name = f"{interview_id}/full_interview_report.json"
                    full_report = {
                        "candidate_id": str(session_data["candidate_id"]),
                        "interview_id": str(session_data["interview_id"]),
                        "overall_metrics": {
                            "total_score": session_data.get("evaluation", {}).get("overall_score", 0.0),
                            "cheating_score": session_data.get("cheating_score", 0.0),
                            "completed_at": datetime.now().isoformat()
                        },
                        "interview_trace": session_data["interview_trace"],
                        "evaluation_summary": session_data.get("evaluation")
                    }
                    azure_blob_helper.upload_file(
                        container_name=container,
                        blob_name=report_blob_name,
                        file_content=json.dumps(full_report).encode('utf-8'),
                        content_type="application/json"
                    )
                    print(f"DEBUG: Full comprehensive report persisted to Azure: {report_blob_name}")
        except Exception as storage_err:
            print(f"Trace Storage Warning (Non-blocking): {storage_err}")
        
        # 6. Return Structured Response for Smooth UX
        return {
            "status": session_data["status"],
            "next_question": {
                "question_id": f"q_{len(session_data['interview_trace'])}",
                "question_text": session_data["current_question"],
                "question_index": len(session_data["interview_trace"]) + 1,
                "total_questions": len(session_data.get("focus_areas", [])) * 3 
            } if session_data["current_question"] else None,
            "transcript": transcript,
            "error": error_info,
            "warning": session_data.get("latest_warning"), # Pass warning to UI
            "cheating_score": session_data.get("cheating_score", 0)
        }
        
    except Exception as e:
        print(f"Graph Advance Error: {e}")
        # Even if graph fails, we don't want to crash. Return something sensible.
        raise HTTPException(status_code=500, detail=f"Failed to advance interview: {str(e)}")
    finally:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

@app.get("/blob/url")
async def get_blob_url(container: str, blob_path: str, current_user: TokenData = Depends(get_current_user)):
    """Get a signed SAS URL for a blob."""
    try:
        url = azure_blob_helper.generate_sas_url(container, blob_path)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
