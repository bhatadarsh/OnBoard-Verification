from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from candidate.db.database import get_db
from candidate.models.candidate_account import CandidateAccount
from job_description.models.job_description import JobDescription
from candidate.models.applications import Application

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Return high-level metrics for the HR dashboard."""
    total_candidates = db.query(func.count(CandidateAccount.id)).scalar()
    active_jobs      = db.query(func.count(JobDescription.id)).filter(JobDescription.status == "open").scalar()
    total_apps       = db.query(func.count(Application.id)).scalar()
    
    # Get recent applicants (last 5)
    recent_applicants = (
        db.query(CandidateAccount)
        .order_by(CandidateAccount.created_at.desc())
        .limit(5)
        .all()
    )
    
    return {
        "stats": {
            "total_candidates": total_candidates,
            "active_jobs": active_jobs,
            "total_applications": total_apps,
            "shortlisted": 0, # Placeholder for now unless we have a specific field
        },
        "recent_applicants": [
            {
                "id": c.id,
                "email": c.email,
                "name": f"{c.first_name or ''} {c.last_name or ''}".strip() or c.email.split('@')[0],
                "created_at": c.created_at
            }
            for c in recent_applicants
        ]
    }

@router.get("/job/{job_id}/applicants")
def get_job_applicants(job_id: str, db: Session = Depends(get_db)):
    """Fetch all candidates who applied for a specific job."""
    apps = (
        db.query(Application)
        .filter(Application.job_id == job_id)
        .order_by(Application.created_at.desc())
        .all()
    )
    
    return [
        {
            "id": a.id,
            "candidate_id": a.candidate_id,
            "job_id": job_id,
            "status": a.status,
            "ai_intelligence": a.ai_intelligence,
            "applied_on": a.created_at.strftime("%d %b %Y"),
            "candidate": {
                "name": f"{a.account.first_name or ''} {a.account.last_name or ''}".strip() or a.account.email.split('@')[0],
                "email": a.account.email,
                "experience": "N/A" # Could be derived from profile later
            }
        }
        for a in apps
    ]

from pydantic import BaseModel
from fastapi import HTTPException

class StatusUpdate(BaseModel):
    status: str

@router.patch("/application/{application_id}/status")
def update_application_status(application_id: str, payload: StatusUpdate, db: Session = Depends(get_db)):
    """Update the status of a specific job application."""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Update the status. If it's a frontend label like 'rejected', capitalize it.
    app.status = payload.status.title() if payload.status.islower() else payload.status
    db.commit()
    
    return {"status": "success", "new_status": app.status}
