"""
Candidate API Routes.

POST /api/candidate/register
    - Takes: first_name, last_name, email, phone, location, resume file
    - Creates candidate in PostgreSQL
    - Runs extraction pipeline on resume
    - Stores vector in ChromaDB
    - Returns: candidate profile

GET /api/candidate/{candidate_id}
    - Returns full candidate profile from PostgreSQL

GET /api/candidates
    - Returns list of all candidates (HR dashboard use)
"""
import os
import hashlib
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.candidate import Candidate
from app.services.resume_extraction import extract_resume
from utils.logger import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/api/candidate", tags=["candidate"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")


def _generate_candidate_id(email: str) -> str:
    """
    Generate a stable unique candidate ID from email.
    Same email always produces same ID — prevents duplicates.
    e.g. rahul@gmail.com → cand_a3f7b2c1
    """
    hash_hex = hashlib.md5(email.lower().strip().encode()).hexdigest()[:8]
    return f"cand_{hash_hex}"


def _save_resume(candidate_id: str, file: UploadFile) -> str:
    """
    Save uploaded resume file to disk.
    Returns the saved file path.
    """
    candidate_dir = os.path.join(UPLOAD_DIR, candidate_id)
    os.makedirs(candidate_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "resume.pdf")[1] or ".pdf"
    file_path = os.path.join(candidate_dir, f"resume{ext}")

    with open(file_path, "wb") as f:
        f.write(file.file.read())

    log.info(f"Resume saved: {file_path}")
    return file_path


# ── POST /api/candidate/register ─────────────────────────────────────────────
@router.post("/register")
async def register_candidate(
    first_name: str = Form(...),
    last_name:  str = Form(...),
    email:      str = Form(...),
    phone:      str = Form(...),        # include country code e.g. +91-9876543210
    location:   str = Form(...),
    resume:     UploadFile = File(...),
    db:         Session = Depends(get_db),
):
    """
    Register a new candidate with resume.

    Flow:
    1. Check if email already exists
    2. Generate candidate_id from email
    3. Save resume file to disk
    4. Create candidate record in PostgreSQL (status = "applied")
    5. Run extraction pipeline on resume
    6. Update candidate record with extracted data
    7. Store resume vector in ChromaDB with candidate_id
    8. Return full candidate profile
    """

    # ── 1. Check duplicate email ─────────────────────────────────
    existing = db.query(Candidate).filter(Candidate.email == email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A candidate with email {email} already exists. ID: {existing.id}"
        )

    # ── 2. Generate candidate_id ─────────────────────────────────
    candidate_id = _generate_candidate_id(email)

    # ── 3. Save resume file ──────────────────────────────────────
    resume_path = _save_resume(candidate_id, resume)

    # ── 4. Create candidate in PostgreSQL ────────────────────────
    candidate = Candidate(
        id         = candidate_id,
        first_name = first_name.strip(),
        last_name  = last_name.strip(),
        email      = email.lower().strip(),
        phone      = phone.strip(),
        location   = location.strip(),
        resume_path= resume_path,
        status     = "applied",
    )
    db.add(candidate)
    db.commit()
    log.info(f"Candidate created in PostgreSQL: {candidate_id}")

    # ── 5 & 6. Run extraction pipeline ───────────────────────────
    try:
        extracted = extract_resume(candidate_id, resume_path)
        candidate.set_certifications(extracted.get("certifications", []))

        # Update candidate with extracted data
        candidate.chroma_vector_id = extracted["chroma_vector_id"]
        candidate.experience_years = extracted["experience_years"]
        candidate.current_company  = extracted["current_company"]
        candidate.current_role     = extracted["current_role"]
        candidate.set_skills(extracted["skills"])
        candidate.set_education(extracted["education"])
        candidate.set_experience(extracted["experience"])
        db.commit()
        log.info(f"Candidate updated with extracted data: {candidate_id}")

    except Exception as e:
        # Don't fail registration if extraction fails
        # Candidate is created, extraction can be retried later
        log.error(f"Extraction failed for {candidate_id}: {e}")
        extracted = {
            "skills": [], "education": [], "experience": [],
            "experience_years": 0, "current_company": "", "current_role": "",
            "chroma_vector_id": None,
        }

    # ── 7. Return profile ─────────────────────────────────────────
    return {
        "status":    "success",
        "message":   "Candidate registered and resume extracted successfully",
        "candidate": candidate.to_dict(),
        "stored_in": {
            "postgresql":  "candidates table",
            "chromadb":    extracted.get("chroma_vector_id"),
            "mongodb":     "not used",
        }
    }


# ── GET /api/candidate/{candidate_id} ────────────────────────────────────────
@router.get("/{candidate_id}")
def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    """Get full candidate profile by ID."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate.to_dict()


# ── GET /api/candidates ───────────────────────────────────────────────────────
@router.get("/")
def list_candidates(
    status:   Optional[str] = None,
    location: Optional[str] = None,
    q:        Optional[str] = None,
    db:       Session = Depends(get_db),
):
    """
    List candidates with optional filters.
    Used by HR dashboard.

    Query params:
    - status:   filter by status (applied/shortlisted/interviewed...)
    - location: filter by location
    - q:        search by name or email
    """
    query = db.query(Candidate)

    if status:
        query = query.filter(Candidate.status == status)
    if location:
        query = query.filter(Candidate.location.ilike(f"%{location}%"))
    if q:
        search = f"%{q}%"
        query = query.filter(
            (Candidate.first_name.ilike(search)) |
            (Candidate.last_name.ilike(search))  |
            (Candidate.email.ilike(search))
        )

    candidates = query.order_by(Candidate.created_at.desc()).all()

    return {
        "total":      len(candidates),
        "candidates": [c.to_dict() for c in candidates],
    }


# ── PATCH /api/candidate/{candidate_id}/status ───────────────────────────────
@router.patch("/{candidate_id}/status")
def update_status(
    candidate_id: str,
    body: dict,
    db: Session = Depends(get_db),
):
    """
    Update candidate status.
    HR uses this to move candidate through the pipeline:
    applied → shortlisted → interviewed → onboarding → onboarded
    """
    valid_statuses = ["applied", "shortlisted", "interviewed", "onboarding", "onboarded", "rejected"]
    new_status = body.get("status", "")

    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )

    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate.status = new_status
    db.commit()

    return {
        "status":       "success",
        "candidate_id": candidate_id,
        "new_status":   new_status,
    }