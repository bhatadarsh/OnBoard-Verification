import sys
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, HTTPException, status, Depends, File, UploadFile, Form
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
    decision: Literal["SHORTLISTED", "REJECTED"]

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

@app.get("/admin/candidates", response_model=List[CandidateResponse])
async def get_candidates(current_user: TokenData = Depends(require_admin)):
    """Get all candidates with intelligence results."""
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
            interview_status=next((i["status"] for i in db.interviews if i["candidate_id"] == r_dict["candidate_id"]), "N/A")
        )
        candidates.append(c)
    return candidates

@app.post("/admin/candidates/{candidate_id}/shortlist")
async def shortlist_candidate(candidate_id: int, request: ShortlistRequest, current_user: TokenData = Depends(require_admin)):
    """Shortlist or reject a candidate."""
    # Find resume
    resume = next((r for r in db.resumes if r["candidate_id"] == candidate_id), None)
    
    if not resume:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    resume["status"] = request.decision
    if request.decision == "SHORTLISTED":
        resume["interview_unlocked"] = True
    else:
        resume["interview_unlocked"] = False
        
    db.save()
    return {"status": "success", "new_status": request.decision}

@app.delete("/admin/candidates/{candidate_id}")
async def delete_candidate(candidate_id: int, current_user: TokenData = Depends(require_admin)):
    """Admin permanently deletes a REJECTED candidate."""
    # 1. Find the resume/candidate status
    resume_idx = next((i for i, r in enumerate(db.resumes) if r["candidate_id"] == candidate_id), None)
    if resume_idx is None:
        raise HTTPException(status_code=404, detail="Candidate record not found")
        
    resume = db.resumes[resume_idx]
    
    # 2. Validation: Only REJECTED candidates can be deleted
    if resume["status"] != "REJECTED":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete candidate with status: {resume['status']}. Only REJECTED candidates can be deleted."
        )

    # 3. Check for associated interview
    interview = next((i for i in db.interviews if i["candidate_id"] == candidate_id), None)
    if interview:
         raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete candidate with an associated interview (Status: {interview['status']})."
        )

    # 4. Perform Deletion
    # Delete Resume record
    db.resumes.pop(resume_idx)
    
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
    
    return {
        "question_id": f"q_{len(session_data['interview_trace'])}",
        "question_text": session_data["current_question"],
        "question_index": len(session_data["interview_trace"]) + 1,
        "total_questions": total_expected,
        "status": session_data["status"]
    }

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
        file_path = os.path.join(temp_dir, f"{interview_id}_{uuid.uuid4()}.wav")
        
        try:
            audio_content = await audio_file.read()
            print(f"DEBUG: Received audio file '{audio_file.filename}' size: {len(audio_content)} bytes")
            
            if audio_content:
                # 2. Convert to standard WAV (16kHz, Mono, PCM) using Pydub
                # This fixes the INVALID_WAV_HEADER issue by normalizing the format
                try:
                    # Load audio from bytes
                    audio = AudioSegment.from_file(io.BytesIO(audio_content))
                    
                    # Normalize to 16000Hz, Mono, 16-bit (Preferred by Azure Speech SDK)
                    audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
                    
                    # Save locally for STT
                    audio.export(file_path, format="wav")
                    
                    # Log audio stats
                    duration = len(audio) / 1000.0
                    volume = audio.dBFS
                    print(f"DEBUG: Audio converted. Duration: {duration}s, Volume: {volume} dBFS")
                    
                    if volume < -60: # Threshold for very quiet/silent
                        print("WARNING: Audio is extremely quiet. STT might fail.")
                        
                    print(f"DEBUG: Saved to: {file_path}")

                    # 3. Transcribe
                    try:
                        stt = get_stt_engine()
                        transcript = stt.transcribe(file_path)
                        if not transcript:
                            error_info = "STT_NO_SPEECH_RECOGNIZED"
                    except Exception as stt_err:
                        print(f"STT Error: {stt_err}")
                        error_info = f"STT_FAILED: {str(stt_err)}"
                except Exception as conv_err:
                    print(f"Audio Conversion Error: {conv_err}")
                    error_info = f"CONVERSION_FAILED: {str(conv_err)}"
                    # Fallback: save original and try STT anyway
                    with open(file_path, "wb") as buffer:
                        buffer.write(audio_content)
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
        
        graph_state = {
            **session_data,
            "final_focus_areas": session_data.get("focus_areas", []), # Add alias for nodes
            "interview_status": "WAITING_FOR_ANSWER",
            "simulated_answer": final_answer_text,
            "stt_engine": None,
            "current_followup_count": session_data.get("current_followup_count", 0)
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
        
        if new_state.get("interview_status") == "COMPLETED" or not session_data["current_question"]:
            session_data["status"] = "COMPLETED"
        else:
            session_data["status"] = "IN_PROGRESS"
            
        db.save()

        # 5. Azure Blob Persistence (GUARANTEED)
        try:
            if session_data["interview_trace"]:
                last_turn = session_data["interview_trace"][-1]
                blob_payload = {
                    "candidate_id": str(session_data["candidate_id"]),
                    "interview_id": str(session_data["interview_id"]),
                    "topic": last_turn.get("topic"),
                    "question": last_turn.get("question"),
                    "answer_text": last_turn.get("answer_text"),
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
                print(f"DEBUG: Turn trace persisted to Azure container: {container}")
        except Exception as storage_err:
            print(f"Trace Storage Warning (Non-blocking): {storage_err}")
        
        # 6. Return Structured Response for Smooth UX
        next_question = None
        if session_data["status"] == "IN_PROGRESS":
            next_question = {
                "question_id": f"q_{len(session_data['interview_trace'])}",
                "question_text": session_data["current_question"],
                "question_index": len(session_data["interview_trace"]) + 1,
                "total_questions": len(session_data.get("focus_areas", [])) * 3 
            }

        return {
            "status": session_data["status"],
            "transcript": transcript,
            "error": error_info,
            "next_question": next_question
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
