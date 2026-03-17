"""
API Routes - Validation workflow using LangGraph.
Candidates are auto-created from onboarding form.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import os
import re
import csv
import io
import json
from datetime import datetime

from sqlalchemy.orm import Session
from app.core.database import get_db, Candidate
from app.core.config import config
from app.langgraph.orchestration import run_extraction_workflow, run_validation_workflow

router = APIRouter()

UPLOAD_DIR = config.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)


def generate_candidate_id(name: str, email: str = "") -> str:
    """Generate unique ID from candidate name + email (for deduplication)."""
    clean_name = re.sub(r'[^a-z0-9]', '_', name.lower().strip())
    clean_name = re.sub(r'_+', '_', clean_name).strip('_')
    
    # Use email hash for uniqueness (same person = same ID)
    if email:
        import hashlib
        email_hash = hashlib.md5(email.lower().strip().encode()).hexdigest()[:6]
        return f"{clean_name}_{email_hash}"
    
    # Fallback: use timestamp
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"{clean_name}_{timestamp}"


# ============ ONBOARDING FORM UPLOAD ============

@router.post("/onboarding/upload")
async def upload_onboarding_form(
    form_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload onboarding form (CSV/Excel) with multiple candidates.
    Auto-creates candidates from the form.
    """
    filename = (form_file.filename or "").lower()
    content = await form_file.read()
    
    candidates_created = []
    
    if filename.endswith('.csv'):
        decoded = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        
        for row in reader:
            # Normalize keys using LangGraph validation tools
            from app.langgraph.subgraphs.validation.tools import normalize_form_data
            raw_form = {k: v.strip() for k, v in row.items() if k and v}
            form_data = normalize_form_data(raw_form)
            
            # Get name and email using canonical field names
            name = form_data.get('full_name') or form_data.get('name') or form_data.get('candidate_name')
            email = form_data.get('email', '')
            if not name:
                continue
            
            candidate_id = generate_candidate_id(name, email)
            
            # Check if exists (by ID or email)
            existing = db.query(Candidate).filter(
                (Candidate.id == candidate_id) | (Candidate.email == email)
            ).first() if email else db.query(Candidate).filter(Candidate.id == candidate_id).first()
            
            if existing:
                # Merge form data with existing
                old_form = existing.get_form() or {}
                for k, v in form_data.items():
                    if v and (k not in old_form or not old_form[k]):
                        old_form[k] = v
                    elif v:
                        old_form[k] = v  # Override with new value
                existing.set_form(old_form)
                candidates_created.append({"id": candidate_id, "name": name, "status": "updated"})
            else:
                candidate = Candidate(
                    id=candidate_id,
                    full_name=name,
                    email=form_data.get('email', ''),
                    phone=form_data.get('phone', '')
                )
                candidate.set_form(form_data)
                db.add(candidate)
                candidates_created.append({"id": candidate_id, "name": name, "status": "created"})
        
        db.commit()
    
    elif filename.endswith(('.xlsx', '.xls')):
        try:
            import openpyxl
            from io import BytesIO
            wb = openpyxl.load_workbook(BytesIO(content))
            ws = wb.active
            
            headers = [str(c.value).lower().replace(' ', '_') if c.value else '' for c in ws[1]]
            
            for row in ws.iter_rows(min_row=2, values_only=True):
                form_data = {headers[i]: str(v) for i, v in enumerate(row) if i < len(headers) and v}
                
                name = form_data.get('full_name') or form_data.get('name')
                if not name:
                    continue
                
                candidate_id = generate_candidate_id(name)
                
                existing = db.query(Candidate).filter(Candidate.id == candidate_id).first()
                if existing:
                    existing.set_form(form_data)
                    candidates_created.append({"id": candidate_id, "name": name, "status": "updated"})
                else:
                    candidate = Candidate(
                        id=candidate_id,
                        full_name=name,
                        email=form_data.get('email', ''),
                        phone=form_data.get('phone', '')
                    )
                    candidate.set_form(form_data)
                    db.add(candidate)
                    candidates_created.append({"id": candidate_id, "name": name, "status": "created"})
            
            db.commit()
        except ImportError:
            raise HTTPException(status_code=400, detail="Use CSV format (Excel requires openpyxl)")
    else:
        raise HTTPException(status_code=400, detail="Upload CSV or Excel file")
    
    return {
        "status": "success",
        "candidates_count": len(candidates_created),
        "candidates": candidates_created
    }


# ============ DOCUMENT UPLOAD ============

@router.post("/documents/{candidate_id}")
async def upload_documents(
    candidate_id: str,
    resume: Optional[UploadFile] = File(None),
    hr_transcript: Optional[UploadFile] = File(None),
    hr_audio: Optional[UploadFile] = File(None),
    aadhar: Optional[UploadFile] = File(None),
    pan: Optional[UploadFile] = File(None),
    marksheet_10th: Optional[UploadFile] = File(None),
    marksheet_12th: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Upload documents for a candidate."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found. Upload form first.")
    
    candidate_dir = os.path.join(UPLOAD_DIR, candidate_id)
    os.makedirs(candidate_dir, exist_ok=True)
    
    docs = candidate.get_documents()
    uploaded = []
    
    files = [
        ("resume", resume),
        ("hr_transcript", hr_transcript),
        ("hr_audio", hr_audio),
        ("aadhar", aadhar),
        ("pan", pan),
        ("marksheet_10th", marksheet_10th),
        ("marksheet_12th", marksheet_12th)
    ]
    
    for name, file in files:
        if file and file.filename:
            ext = os.path.splitext(file.filename)[1] or '.txt'
            path = os.path.join(candidate_dir, f"{name}{ext}")
            content = await file.read()
            with open(path, "wb") as f:
                f.write(content)
            docs[name] = path
            uploaded.append(name)
    
    candidate.set_documents(docs)
    db.commit()
    
    return {
        "status": "success",
        "candidate_id": candidate_id,
        "uploaded": uploaded
    }


# ============ EXTRACTION (via LangGraph) ============

@router.post("/extract/{candidate_id}")
async def extract_knowledge_base(
    candidate_id: str,
    db: Session = Depends(get_db)
):
    """Extract knowledge base from uploaded documents using LangGraph."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    docs = candidate.get_documents()
    if not docs:
        raise HTTPException(status_code=400, detail="No documents uploaded")
    
    # Run extraction through LangGraph
    knowledge_base = await run_extraction_workflow(docs)
    sources = list(knowledge_base.keys())
    
    candidate.set_knowledge_base(knowledge_base)
    db.commit()
    
    return {
        "status": "success",
        "candidate_id": candidate_id,
        "sources_extracted": sources,
        "knowledge_base": knowledge_base
    }


# ============ VALIDATION (via LangGraph) ============

@router.post("/validate/{candidate_id}")
async def validate_candidate(
    candidate_id: str,
    db: Session = Depends(get_db)
):
    """Validate candidate's onboarding form against knowledge base using LangGraph."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    kb = candidate.get_knowledge_base()
    form = candidate.get_form()
    
    if not kb:
        raise HTTPException(status_code=400, detail="Extract knowledge base first")
    if not form:
        raise HTTPException(status_code=400, detail="No onboarding form data")
    
    # Fetch existing validation to preserve manual overrides
    existing_validation_data = candidate.get_validation()
    existing_validations_list = existing_validation_data.get("validations", []) if existing_validation_data else []
    
    # Run validation through LangGraph
    result = await run_validation_workflow(kb, form, existing_validations_list)
    
    # Store validation result
    validation_data = {
        "validations": result.get("validations", []),
        "overall_score": result.get("overall_score", 0),
        "correct_count": result.get("correct_count", 0),
        "incorrect_count": result.get("incorrect_count", 0),
        "ambiguous_count": result.get("ambiguous_count", 0)
    }
    candidate.set_validation(validation_data)
    candidate.validation_score = validation_data["overall_score"]
    db.commit()
    
    return {
        "status": "success",
        "candidate_id": candidate_id,
        "candidate_name": candidate.full_name,
        "summary": {
            "overall_score": validation_data["overall_score"],
            "correct": validation_data["correct_count"],
            "incorrect": validation_data["incorrect_count"],
            "ambiguous": validation_data["ambiguous_count"]
        },
        "details": validation_data
    }


# ============ RESOLVE AMBIGUOUS FIELDS ============

@router.post("/resolve/{candidate_id}")
async def resolve_ambiguous(
    candidate_id: str,
    body: dict,
    db: Session = Depends(get_db)
):
    """Mark an AMBIGUOUS field as CORRECT or INCORRECT."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    field = body.get("field")
    resolution = body.get("resolution", "").upper()
    
    if resolution not in ("CORRECT", "INCORRECT"):
        raise HTTPException(status_code=400, detail="Resolution must be CORRECT or INCORRECT")
    
    validation_data = candidate.get_validation()
    if not validation_data:
        raise HTTPException(status_code=400, detail="No validation result to resolve")
    
    # Find and update the field
    validations = validation_data.get("validations", [])
    updated = False
    for v in validations:
        if v.get("field") == field and v.get("status") == "AMBIGUOUS":
            v["status"] = resolution
            v["reason"] = f"Manually marked as {resolution} by reviewer"
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="Ambiguous field not found")
    
    # Recalculate counts
    correct = sum(1 for v in validations if v["status"] == "CORRECT")
    incorrect = sum(1 for v in validations if v["status"] == "INCORRECT")
    ambiguous = sum(1 for v in validations if v["status"] == "AMBIGUOUS")
    total = correct + incorrect + ambiguous
    score = round((correct / total * 100), 1) if total else 0
    
    validation_data["validations"] = validations
    validation_data["correct_count"] = correct
    validation_data["incorrect_count"] = incorrect
    validation_data["ambiguous_count"] = ambiguous
    validation_data["overall_score"] = score
    
    candidate.set_validation(validation_data)
    candidate.validation_score = score
    db.commit()
    
    return {"status": "success", "field": field, "resolution": resolution, "new_score": score}


# ============ CANDIDATE MANAGEMENT ============

@router.get("/candidates")
async def list_candidates(
    q: str = "",
    db: Session = Depends(get_db)
):
    """List/search candidates. Use ?q=query to search by name/email."""
    query = db.query(Candidate)
    
    if q:
        search = f"%{q}%"
        query = query.filter(
            (Candidate.full_name.ilike(search)) | 
            (Candidate.email.ilike(search)) |
            (Candidate.id.ilike(search))
        )
    
    candidates = query.order_by(Candidate.created_at.desc()).limit(50).all()
    return {
        "candidates": [c.to_dict() for c in candidates],
        "total": len(candidates)
    }


@router.get("/candidate/{candidate_id}")
async def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    """Get full candidate details."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return {
        **candidate.to_dict(),
        "knowledge_base": candidate.get_knowledge_base(),
        "form_data": candidate.get_form(),
        "validation_result": candidate.get_validation() if candidate.is_validated else None
    }


@router.delete("/candidate/{candidate_id}")
async def delete_candidate(candidate_id: str, db: Session = Depends(get_db)):
    """Delete a candidate."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    db.delete(candidate)
    db.commit()
    
    return {"status": "deleted", "candidate_id": candidate_id}
