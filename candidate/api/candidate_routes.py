import os
import uuid
import hashlib
import shutil
from datetime import datetime
from typing import Optional, List
import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import aiofiles
from app.db.database import get_db
from app.models.candidate import Candidate
from app.services.resume_extraction import extract_resume
from utils.logger import get_logger
from candidate.pydantic.candidate_registration import CandidateRegister
from candidate.services.candidate_registration import CandidateService
from candidate.pydantic.candidate_registration import LoginRequest
from candidate.pydantic.candidate_registration import ApplyForJobSchema
from candidate.models.candidate_account import CandidateAccount
from candidate.models.applications import Application
from candidate.jwt.jwt_validation import get_current_candidate

# New imports for KYC and Audio
from ingestion.file_loader import load_file
from ingestion.file_type_detector import detect_content
from extraction.audio_extractor import extract_audio_transcription
from storage.audio_storage_handler import audio_storage_handler
from candidate.services.document_service import DocumentService

log = get_logger(__name__)

router = APIRouter(prefix="/api/candidate", tags=["candidate"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")


def _generate_candidate_id(email: str) -> str:

    hash_hex = hashlib.md5(email.lower().strip().encode()).hexdigest()[:8]
    return f"cand_{hash_hex}"


# async def _save_resume(candidate_id: str, file: UploadFile) -> str:
#     """
#     Save uploaded resume file to disk asynchronously.
#     """
#     candidate_dir = os.path.join(UPLOAD_DIR, candidate_id)
#     os.makedirs(candidate_dir, exist_ok=True)

#     ext = os.path.splitext(file.filename or "resume.pdf")[1] or ".pdf"
#     file_path = os.path.join(candidate_dir, f"resume{ext}")

#     # Use aiofiles to write the file without blocking the event loop
#     async with aiofiles.open(file_path, "wb") as f:
#         # Read the file content in chunks
#         content = await file.read()
#         await f.write(content)

#     log.info(f"Resume saved: {file_path}")
#     return file_path

# async def save_user_file(candidate_id: str, file: UploadFile, category: str) -> str:
#     """
#     Saves a file into the candidate's folder: 
#     /uploads/{candidate_id}/{category}/{filename}
#     """
#     # Create path: uploads/candidate_id/category/
#     category_dir = os.path.join(UPLOAD_DIR, candidate_id, category)
#     os.makedirs(category_dir, exist_ok=True)

#     # Use original filename to prevent overwriting if multiple certificates are uploaded
#     file_path = os.path.join(category_dir, file.filename)

#     async with aiofiles.open(file_path, "wb") as f:
#         content = await file.read()
#         await f.write(content)

#     log.info(f"{category.capitalize()} saved: {file_path}")
#     return file_path
def _clear_category_folder(candidate_id: str, category: str) -> list:
    """
    Deletes all files inside uploads/{candidate_id}/{category}/
    Returns list of deleted file names for logging.
    """
    category_dir = os.path.join(UPLOAD_DIR, candidate_id, category)

    if not os.path.exists(category_dir):
        return []

    deleted_files = []
    for filename in os.listdir(category_dir):
        file_path = os.path.join(category_dir, filename)
        if os.path.isfile(file_path):
            os.remove(file_path)
            deleted_files.append(filename)
            log.info(f"Deleted old file: {file_path}")

    return deleted_files

async def save_user_file(
    candidate_id: str,
    file: UploadFile,
    category: str,
    clear_existing: bool = False
) -> str:
    """
    Saves a file into uploads/{candidate_id}/{category}/{filename}

    Args:
        candidate_id:   candidate's unique ID
        file:           uploaded file
        category:       folder name e.g. "certificates", "documents"
        clear_existing: if True, deletes ALL existing files in the
                        category folder before saving the new one.
                        Set True for the FIRST file in a batch,
                        False for subsequent files in the same batch.
    """
    category_dir = os.path.join(UPLOAD_DIR, candidate_id, category)
    os.makedirs(category_dir, exist_ok=True)

    # Clear old files only when processing first file of the batch
    if clear_existing:
        deleted = _clear_category_folder(candidate_id, category)
        if deleted:
            log.info(f"Cleared {len(deleted)} old {category} file(s) for {candidate_id}")

    file_path = os.path.join(category_dir, file.filename)

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    log.info(f"{category.capitalize()} saved: {file_path}")
    return file_path


async def save_category_files(
    candidate_id: str,
    files: list[UploadFile],
    category: str
) -> list[str]:
    """
    Saves multiple files for a category.
    Clears existing files first, then saves all new files.
    Use this when uploading a batch like multiple certificates.

    Returns list of saved file paths.
    """
    if not files:
        return []

    saved_paths = []
    for i, file in enumerate(files):
        # clear_existing=True only for the first file in the batch
        # This ensures old files are deleted once, not on every iteration
        path = await save_user_file(
            candidate_id   = candidate_id,
            file           = file,
            category       = category,
            clear_existing = False, # Changed to False to prevent wiping other documents
        )
        saved_paths.append(path)

    return saved_paths

@router.post("/register")
def register_candidate(payload: CandidateRegister, db: Session = Depends(get_db)):
    cand_id = _generate_candidate_id(payload.email)

    try:

        candidate = CandidateService.create_candidate(db, payload, cand_id)

        return {
            "status": "success",
            "message": "Candidate registered successfully",
            "data": {
                "candidate_id": candidate.id,
                "email": candidate.email
            }
        }
    except HTTPException as he:
        # Re-raise FastAPI HTTP exceptions so they reach the client
        raise he
    except Exception as e:
        log.error(f"Registration Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/login")
def login_candidate(payload: LoginRequest, db: Session = Depends(get_db)):
    if not payload.email or not payload.password:
        return {
            "status": "error",
            "message": "Email and password are required",
        }

    try:

        candidate = CandidateService.login_candidate(
            payload.email, payload.password, db)

        return {
            "status": "success",
            "message": "Candidate logged in successfully",
            "data": {
                "candidate_id": candidate["candidate_id"],
                "email": candidate["email"],
                "access_token": candidate["access_token"],

            }
        }
    except HTTPException as he:
        # Re-raise FastAPI HTTP exceptions so they reach the client
        raise he
    except Exception as e:
        log.error(f"Registration Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/apply/{jd_id}")
async def apply_jd(
    jd_id: str,
    payload: str                       = Form(...),
    resume: Optional[UploadFile]       = File(None),
    certificates: Optional[List[UploadFile]] = File(None),
    current_candidate: CandidateAccount = Depends(get_current_candidate),
    db: Session                        = Depends(get_db),
):
    payload_dict = json.loads(payload)
    candidate_id = current_candidate.id
 
    if resume:
        resume_path = await save_user_file(
            candidate_id   = candidate_id,
            file           = resume,
            category       = "resume",
            clear_existing = True,     # deletes previous resume.pdf before saving
        )
        payload_dict["resume_path"] = resume_path
 
    if certificates:
        cert_paths = await save_category_files(
            candidate_id = candidate_id,
            files        = certificates,
            category     = "certificates",
        )
        payload_dict["certificate_paths"] = cert_paths
    else:
        payload_dict["certificate_paths"] = []
 
    # ── 3. Validate payload and call service ──────────────────────────────────
    validated_payload = ApplyForJobSchema(**payload_dict)
    response = CandidateService.apply(
        jd_id, validated_payload, candidate_id, db
    )
 
    return {
        "status":           "success",
        "candidate_id":     candidate_id,
        "application_id":   response["application_id"],
        "profile_updated":  response["profile_updated"],
        "changes_detected": response["changes_detected"],
    }

@router.get("/applications")
def list_candidate_applications(
    current_candidate: CandidateAccount = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    """Return all job applications submitted by the logged-in candidate."""
    apps = (
        db.query(Application)
        .filter(Application.candidate_id == current_candidate.id)
        .order_by(Application.created_at.desc())
        .all()
    )
    result = []
    for a in apps:
        jd = a.job_description
        # Read ai_interview_id from stored ai_intelligence blob
        try:
            ai = json.loads(a.ai_intelligence) if a.ai_intelligence else {}
        except Exception:
            ai = {}
        sched = ai.get("interview_schedule", {})
        result.append({
            "application_id":  a.id,
            "job_id":          a.job_id,
            "job_title":       jd.title if jd else "Unknown Role",
            "department":      jd.department if jd else "",
            "status":          a.status,
            "pre_score":       a.pre_score,
            "created_at":      a.created_at.isoformat() if a.created_at else None,
            # The UUID that InterviewSession.jsx uses to call /interview/{id}/...
            "ai_interview_id": sched.get("ai_interview_id"),
            "scheduled_at":    sched.get("scheduled_at"),
            "interview_link":  sched.get("interview_link"),
            "notes":           sched.get("notes"),
        })
    return {"applications": result}


# ── Separate router for /api/interview/* (correct path without /api/candidate prefix)
interview_router = APIRouter(prefix="/api/interview", tags=["interview-candidate"])

@interview_router.get("/candidate/{candidate_id}")
def get_candidate_interview(
    candidate_id: str,
    db: Session = Depends(get_db),
):
    """Return scheduled interview details for a candidate if any exists."""
    # Check all applications for this candidate and look for interview_scheduled status
    apps = db.query(Application).filter(Application.candidate_id == candidate_id).all()
    for a in apps:
        if a.status and "interview" in a.status.lower():
            # Pull schedule info stored in ai_intelligence
            try:
                ai = json.loads(a.ai_intelligence) if a.ai_intelligence else {}
            except Exception:
                ai = {}
            sched = ai.get("interview_schedule", {})
            return {
                "interview": {
                    "job_id":         a.job_id,
                    "status":         a.status,
                    "scheduled_at":   sched.get("scheduled_at"),
                    "interview_link": sched.get("interview_link"),
                    "notes":          sched.get("notes"),
                }
            }
    return {"interview": None}


class ScheduleInterviewRequest(BaseModel):
    candidate_id:    str
    job_id:          Optional[str] = None
    scheduled_at:    Optional[str] = None
    interview_link:  Optional[str] = None
    notes:           Optional[str] = None
    ai_interview_id: Optional[str] = None  # LangGraph session ID if already created


@interview_router.post("/schedule")
def schedule_interview(
    payload: ScheduleInterviewRequest,
    db: Session = Depends(get_db),
):
    """
    Schedule an AI interview for a candidate.
    Generates a unique ai_interview_id, updates application status
    to 'Interview Scheduled', and stores all metadata in ai_intelligence.
    """
    # Find the application — prefer the specific job_id if given
    query = db.query(Application).filter(Application.candidate_id == payload.candidate_id)
    if payload.job_id:
        query = query.filter(Application.job_id == payload.job_id)
    app = query.order_by(Application.created_at.desc()).first()

    if not app:
        raise HTTPException(status_code=404, detail="No application found for this candidate.")

    # Merge schedule details into ai_intelligence blob
    try:
        ai = json.loads(app.ai_intelligence) if app.ai_intelligence else {}
    except Exception:
        ai = {}

    # Generate or reuse ai_interview_id — this is what the InterviewSession uses
    # Priority: (1) passed from frontend (LangGraph session ID), (2) stored, (3) new UUID
    ai_interview_id = (
        payload.ai_interview_id
        or ai.get("interview_schedule", {}).get("ai_interview_id")
        or str(uuid.uuid4())
    )

    ai["interview_schedule"] = {
        "ai_interview_id": ai_interview_id,
        "scheduled_at":    payload.scheduled_at,
        "interview_link":  payload.interview_link,
        "notes":           payload.notes,
    }

    app.ai_intelligence = json.dumps(ai)
    app.status = "Interview Scheduled"
    db.commit()
    db.refresh(app)

    # ── Send email notification (non-blocking background thread) ─────────────
    try:
        import threading
        from candidate.utils.email_service import send_interview_scheduled_email

        candidate = db.query(CandidateAccount).filter(
            CandidateAccount.id == app.candidate_id
        ).first()
        jd = app.job_description  # SQLAlchemy relationship

        if candidate and candidate.email:
            candidate_name = (
                f"{candidate.first_name or ''} {candidate.last_name or ''}".strip()
                or candidate.email
            )
            job_title = jd.title if jd else "the role you applied for"

            threading.Thread(
                target=send_interview_scheduled_email,
                kwargs={
                    "candidate_email": candidate.email,
                    "candidate_name":  candidate_name,
                    "job_title":       job_title,
                    "scheduled_at":    payload.scheduled_at,
                    "interview_link":  payload.interview_link,
                    "notes":           payload.notes,
                },
                daemon=True,
            ).start()
    except Exception as email_err:
        import logging
        logging.getLogger(__name__).warning(
            f"[schedule] Email notification skipped: {email_err}"
        )

    return {
        "success":          True,
        "application_id":   app.id,
        "candidate_id":     app.candidate_id,
        "job_id":           app.job_id,
        "status":           app.status,
        "ai_interview_id":  ai_interview_id,
        "scheduled_at":     payload.scheduled_at,
        "interview_link":   payload.interview_link,
        "notes":            payload.notes,
    }


@router.get("/application/{jd_id}")
def fetch_application_details(
        jd_id: str,
        current_candidate: CandidateAccount = Depends(get_current_candidate),
        db: Session = Depends(get_db)):
    
    candidate_id = current_candidate.id
    response = CandidateService.fetch_application(jd_id,current_candidate.id,db)
    return {
        "status":           "success",
        "candidate_id":     candidate_id,
        "candidate_data":   response
    }


@router.post("/selection/upload-goverment-docs")
async def upload_selection_documents(
    files: List[UploadFile] = File(...),
    current_candidate: CandidateAccount = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    """
    Bulk upload and process selection-phase documents.
    """
    candidate_id = current_candidate.id
    
    # ── 1. Save all files to the 'kyc' category ──────────────────────────────
    saved_paths = await save_category_files(
        candidate_id=candidate_id,
        files=files,
        category="kyc"
    )
    
    # ── 2. Process and extract data from each saved file ──────────────────────
    extracted_records = []
    errors = []
    
    for path in saved_paths:
        log.info(f"Processing document in bulk loop: {path}")
        try:
            extraction_result = await DocumentService.extract_and_store_document(
                db=db,
                file_path=path,
                candidate_id=candidate_id
            )
            log.info(f"Successfully processed {path} as {extraction_result.doc_type}")
            
            extracted_records.append({
                "filename": os.path.basename(path),
                "document_type": extraction_result.doc_type,
                "data": extraction_result.extracted_data
            })
            
        except Exception as e:
            errors.append(f"{os.path.basename(path)}: {str(e)}")
            log.error(f"Bulk Process Error for {path}: {str(e)}")

    return {
        "status": "success",
        "processed_count": len(extracted_records),
        "data": extracted_records,
        "errors": errors if errors else None
    }


@router.post("/audio/upload")
async def upload_audio_file(
    file: UploadFile = File(...),
    current_candidate: CandidateAccount = Depends(get_current_candidate),
):
    """Upload and transcribe an audio file."""
    candidate_id = current_candidate.id
    
    # 1. Save file
    file_path = await save_user_file(
        candidate_id=candidate_id,
        file=file,
        category="audio",
        clear_existing=False
    )
    
    # 2. Process audio
    try:
        loaded_file = load_file(file_path)
        profile = detect_content(loaded_file)
        
        if not profile.has_audio:
            raise HTTPException(status_code=400, detail="File does not contain a supported audio format")
            
        audio_result = extract_audio_transcription(profile)
        if not audio_result:
            raise HTTPException(status_code=500, detail="Failed to transcribe audio")
            
        # 3. Store in DB
        audio_storage_handler.store_transcript(audio_result, candidate_id)
        
        return {
            "status": "success",
            "filename": audio_result.filename,
            "summary": audio_result.summary,
            "transcript": audio_result.transcript
        }
    except Exception as e:
        log.error(f"Audio Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))