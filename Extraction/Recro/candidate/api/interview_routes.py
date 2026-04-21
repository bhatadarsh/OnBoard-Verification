"""
Interview Routes — schedule, retrieve and list interviews.
Sends email notification to candidate on scheduling.

Endpoints:
  POST /api/interview/schedule                      → Admin schedules interview
  GET  /api/interview/candidate/{candidate_id}      → Admin/candidate gets interview
  GET  /api/interviews                              → Admin lists all interviews
  PATCH /api/interview/{interview_id}/cancel        → Cancel an interview
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from candidate.db.database import get_db
from candidate.models.interview import Interview
from candidate.models.candidate_account import CandidateAccount
from candidate.models.applications import Application
from utils.logger import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/api/interview", tags=["interview"])


# ── Email helper ───────────────────────────────────────────────────────────────

def send_interview_email(
    to_email: str,
    candidate_name: str,
    scheduled_at: datetime,
    interview_link: Optional[str],
    notes: Optional[str],
):
    """Send interview notification email to candidate."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")

    if not smtp_user or not smtp_pass:
        log.warning("SMTP credentials not configured — skipping email notification.")
        return False

    try:
        date_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")
        link_line = f'<p><strong>Interview Link:</strong> <a href="{interview_link}">{interview_link}</a></p>' if interview_link else ""
        notes_line = f"<p><strong>Notes from HR:</strong> {notes}</p>" if notes else ""

        body = f"""
        <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <div style="background:#CC1B1B;padding:24px;border-radius:8px 8px 0 0">
            <h2 style="color:white;margin:0">🎙️ Interview Scheduled</h2>
          </div>
          <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
            <p>Hi <strong>{candidate_name}</strong>,</p>
            <p>We are pleased to inform you that your interview has been scheduled.</p>
            <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0">
              <p style="margin:0"><strong>📅 Date &amp; Time:</strong> {date_str}</p>
              {link_line}
              {notes_line}
            </div>
            <p>Please be ready 5 minutes before the interview starts.</p>
            <p>Best regards,<br><strong>HR Team — Sigmoid</strong></p>
          </div>
        </body></html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your Interview Has Been Scheduled — Sigmoid"
        msg["From"] = smtp_user
        msg["To"] = to_email
        msg.attach(MIMEText(body, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to_email, msg.as_string())

        log.info(f"Interview email sent to {to_email}")
        return True

    except Exception as e:
        log.error(f"Failed to send interview email to {to_email}: {e}")
        return False


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class ScheduleInterviewRequest(BaseModel):
    candidate_id:   str
    job_id:         Optional[str] = None
    scheduled_at:   str           # ISO 8601 datetime string e.g. "2025-04-20T10:00:00"
    interview_link: Optional[str] = None
    notes:          Optional[str] = None


class CancelInterviewRequest(BaseModel):
    reason: Optional[str] = None


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/schedule")
def schedule_interview(
    payload: ScheduleInterviewRequest,
    db: Session = Depends(get_db),
):
    """
    Admin schedules an interview for a candidate.
    - Creates/updates Interview record in DB
    - Updates Application status to 'Interview Scheduled'
    - Sends email notification to candidate
    """
    # Validate candidate exists
    candidate = db.query(CandidateAccount).filter(
        CandidateAccount.id == payload.candidate_id
    ).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Parse datetime
    try:
        scheduled_dt = datetime.fromisoformat(payload.scheduled_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO 8601 e.g. '2025-04-20T10:00:00'")

    application = None
    if payload.job_id:
        application = db.query(Application).filter(
            Application.candidate_id == payload.candidate_id,
            Application.job_id == payload.job_id,
        ).first()

    if application and application.ai_intelligence:
        import requests, logging
        log = logging.getLogger(__name__)
        try:
            sync_payload = {
                "job_id": application.job_id,
                "application_id": application.id,
                "ai_intelligence": application.ai_intelligence
            }
            res = requests.post("http://localhost:8003/admin/interview/sync-start", json=sync_payload, timeout=60)
            if res.status_code in [200, 201]:
                intel_sess = res.json()
                application.ai_interview_id = intel_sess.get("interview_id")
                application.status = "interview_scheduled"
                payload.interview_link = f"http://localhost:5173/interview/{application.ai_interview_id}"
            else:
                log.error(f"8003 returned status {res.status_code}: {res.text}")
        except Exception as e:
            log.error(f"Failed to sync AI Interview session: {e}")
    elif application:
        application.status = "interview_scheduled"

    # Check if interview already exists for this candidate+job
    existing = None
    if payload.job_id:
        existing = db.query(Interview).filter(
            Interview.candidate_id == payload.candidate_id,
            Interview.job_id == payload.job_id,
            Interview.status == "scheduled",
        ).first()
    else:
        existing = db.query(Interview).filter(
            Interview.candidate_id == payload.candidate_id,
            Interview.status == "scheduled",
        ).first()

    if existing:
        # Update existing
        existing.scheduled_at   = scheduled_dt
        existing.interview_link = payload.interview_link
        existing.notes          = payload.notes
        existing.updated_at     = datetime.utcnow()
        interview = existing
    else:
        # Create new
        interview = Interview(
            candidate_id   = payload.candidate_id,
            job_id         = payload.job_id,
            scheduled_at   = scheduled_dt,
            interview_link = payload.interview_link,
            notes          = payload.notes,
            status         = "scheduled",
        )
        db.add(interview)

    db.commit()
    db.refresh(interview)

    # Send email notification
    full_name = f"{candidate.first_name} {candidate.last_name}"
    email_sent = send_interview_email(
        to_email       = candidate.email,
        candidate_name = full_name,
        scheduled_at   = scheduled_dt,
        interview_link = payload.interview_link,
        notes          = payload.notes,
    )

    return {
        "status":       "success",
        "message":      "Interview scheduled successfully",
        "interview":    interview.to_dict(),
        "email_sent":   email_sent,
        "candidate": {
            "id":    candidate.id,
            "name":  full_name,
            "email": candidate.email,
        },
    }


@router.get("/candidate/{candidate_id}")
def get_candidate_interview(
    candidate_id: str,
    db: Session = Depends(get_db),
):
    """Get the active (scheduled) interview for a candidate."""
    interview = db.query(Interview).filter(
        Interview.candidate_id == candidate_id,
        Interview.status == "scheduled",
    ).order_by(Interview.scheduled_at.desc()).first()

    if not interview:
        return {"status": "no_interview", "interview": None}

    return {
        "status":    "found",
        "interview": interview.to_dict(),
    }


@router.get("/")
def list_all_interviews(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Admin: list all interviews, optionally filtered by status."""
    query = db.query(Interview)
    if status:
        query = query.filter(Interview.status == status)
    interviews = query.order_by(Interview.scheduled_at.desc()).all()

    results = []
    for iv in interviews:
        cand = db.query(CandidateAccount).filter(
            CandidateAccount.id == iv.candidate_id
        ).first()
        entry = iv.to_dict()
        if cand:
            entry["candidate_name"]  = f"{cand.first_name} {cand.last_name}"
            entry["candidate_email"] = cand.email
        results.append(entry)

    return {"total": len(results), "interviews": results}


@router.patch("/{interview_id}/cancel")
def cancel_interview(
    interview_id: str,
    payload: CancelInterviewRequest,
    db: Session = Depends(get_db),
):
    """Cancel a scheduled interview."""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview.status     = "cancelled"
    interview.notes      = payload.reason or interview.notes
    interview.updated_at = datetime.utcnow()
    db.commit()

    return {"status": "success", "message": "Interview cancelled", "interview_id": interview_id}
