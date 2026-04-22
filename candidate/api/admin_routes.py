from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, text
import json
import re

from candidate.db.database import get_db
from candidate.models.candidate_account import CandidateAccount
from app.models.candidate import Candidate as OnboardCandidate
from job_description.models.job_description import JobDescription
from candidate.models.applications import Application
from candidate.models.candidate_experience import CandidateExperience
from candidate.models.candidate_education import CandidateEducation

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _ensure_ai_intelligence_column(db: Session):
    """Add ai_intelligence and pre_score columns if they don't exist (safe migration)."""
    for col_def in [
        "ALTER TABLE applications ADD COLUMN ai_intelligence TEXT DEFAULT '{}'",
        "ALTER TABLE applications ADD COLUMN pre_score REAL DEFAULT -1",
    ]:
        try:
            db.execute(text(col_def))
            db.commit()
        except Exception:
            db.rollback()


# ─────────────────────────────────────────────────────────────────────────────
#  Resume text extraction (reads actual uploaded file)
# ─────────────────────────────────────────────────────────────────────────────

import os, io

UPLOAD_BASE = os.path.join(os.path.dirname(__file__), "..", "..", "backend", "uploads")

def _extract_resume_text(resume_path: str) -> str:
    """
    Read the actual uploaded resume file (PDF or DOCX) and return plain text.
    resume_path is relative like 'uploads/cand_xxx/resume/resume.pdf'.
    We search from UPLOAD_BASE and from the backend/ working dir.
    """
    if not resume_path:
        return ""
    
    # Try multiple root locations
    candidates = [
        resume_path,
        os.path.join(os.path.dirname(__file__), "..", "..", "backend", resume_path),
        os.path.join(os.path.dirname(__file__), "..", "..", resume_path),
        os.path.join("/home/sigmoid/Desktop/Recro/backend", resume_path),
        os.path.join("/home/sigmoid/Desktop/Recro", resume_path),
    ]
    
    for path in candidates:
        path = os.path.normpath(path)
        if not os.path.exists(path):
            continue
        try:
            with open(path, "rb") as f:
                data = f.read()
            name = path.lower()
            if name.endswith(".pdf"):
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(data))
                return "\n".join(p.extract_text() or "" for p in reader.pages).strip()
            elif name.endswith(".docx"):
                from docx import Document
                doc = Document(io.BytesIO(data))
                return "\n".join(p.text for p in doc.paragraphs).strip()
            else:
                return data.decode("utf-8", errors="ignore")
        except Exception as e:
            print(f"[pre_score] resume read error {path}: {e}")
    return ""


def _fuzzy_skill_match(skill: str, text: str) -> bool:
    """
    True if the skill appears in the text using flexible matching:
    - exact substring
    - all words of skill appear near each other (token match)
    - common abbreviation variants (e.g. 'rest api' ↔ 'restful api')
    """
    skill = skill.strip().lower()
    text  = text.lower()
    if not skill:
        return False
    # Direct substring
    if skill in text:
        return True
    # All tokens of the skill present anywhere in text
    tokens = [t for t in re.split(r"[\s\-/,()]+", skill) if len(t) > 2]
    if tokens and all(tok in text for tok in tokens):
        return True
    # Abbreviation / alias variants
    aliases = {
        "rest api": ["restful api", "rest apis", "restful apis"],
        "rest apis": ["restful api", "restful apis", "rest api"],
        "js": ["javascript"],
        "javascript": ["js"],
        "k8s": ["kubernetes"],
        "kubernetes": ["k8s"],
        "ml": ["machine learning"],
        "ai": ["artificial intelligence"],
        "postgresql": ["postgres", "psql"],
        "postgres": ["postgresql"],
        "mysql": ["sql"],
        "react": ["reactjs", "react.js"],
        "node": ["nodejs", "node.js"],
        "spring boot": ["springboot", "spring-boot"],
    }
    for variant in aliases.get(skill, []):
        if variant in text:
            return True
    return False


def _compute_pre_score(candidate_id: str, jd, db: Session) -> float:
    """
    Pre-screening score 0-10. Reads the actual uploaded resume for skill matching.

    Weights:
      50%  — skill keyword match (reads PDF/DOCX resume, falls back to DB text)
      25%  — experience years vs JD minimum
      15%  — education record present
      10%  — profile completeness
    """

    # ── Get all experience records ────────────────────────────────────────────
    exps = db.query(CandidateExperience).filter(
        CandidateExperience.candidate_id == candidate_id
    ).all()

    # ── Build rich text corpus ────────────────────────────────────────────────
    # Priority: actual resume file → DB text → nothing
    resume_file_text = ""
    for exp in exps:
        if exp.resume_path:
            resume_file_text = _extract_resume_text(exp.resume_path)
            if resume_file_text:
                break

    # Augment with DB fields regardless (catches skills typed into the form)
    db_text_parts = [_build_resume_text(candidate_id, jd, db)]
    # Also pull in job titles and companies from ALL experience, not just this JD
    for e in exps:
        if e.job_title and e.job_title != "N/A":
            db_text_parts.append(e.job_title)
        if e.company and e.company != "N/A":
            db_text_parts.append(e.company)

    full_text = (resume_file_text + "\n" + "\n".join(db_text_parts)).lower()
    used_pdf   = bool(resume_file_text)

    # ── 1. Skill keyword match (50 pts) ──────────────────────────────────────
    required_raw = jd.required_skills or ""
    # Parse primary_skills (stored as JSON array or comma string)
    ps = jd.primary_skills or []
    try:
        ps = json.loads(ps) if isinstance(ps, str) else ps
    except Exception:
        ps = [ps] if isinstance(ps, str) else []
    # Flatten: split long bullet-point strings from primary_skills into shorter tokens
    short_primary = []
    for item in ps:
        # Each item may be a full sentence like "Hands-on experience with Spring Boot"
        # Extract skill-like tokens (capitalized words, known tech names)
        short_primary.extend(re.findall(r"[A-Za-z][A-Za-z0-9\.\-\+\# ]{1,20}", str(item)))

    all_required = [s.strip().lower() for s in required_raw.split(",") if s.strip()]
    # Add short_primary tokens but skip long sentences
    all_required += [s.strip().lower() for s in short_primary if 2 < len(s.strip()) < 25]
    # Deduplicate
    seen = set(); all_required = [x for x in all_required if x not in seen and not seen.add(x)]

    if all_required:
        matched = sum(1 for skill in all_required if _fuzzy_skill_match(skill, full_text))
        skill_score = round(matched / len(all_required) * 50, 1)
        print(f"[pre_score] skills matched {matched}/{len(all_required)} "
              f"({'PDF' if used_pdf else 'DB text'}) → {skill_score}/50")
    else:
        skill_score = 25.0   # no skills defined on JD → neutral
        print("[pre_score] no JD skills defined → neutral 25/50")

    # ── 2. Experience match (25 pts) ─────────────────────────────────────────
    total_exp = max((e.total_experience or 0 for e in exps), default=0)
    min_exp   = jd.min_experience or 0
    if min_exp == 0:
        exp_score = 25          # fresher role → full marks
    elif total_exp >= min_exp:
        exp_score = 25
    elif total_exp >= min_exp * 0.7:
        exp_score = 18
    elif total_exp >= min_exp * 0.4:
        exp_score = 10
    else:
        exp_score = max(0, 25 - (min_exp - total_exp) * 4)

    # ── 3. Education (15 pts) ─────────────────────────────────────────────────
    edu = db.query(CandidateEducation).filter(
        CandidateEducation.candidate_id == candidate_id
    ).first()
    if edu:
        edu_score = 15
    elif "bachelor" in full_text or "b.e" in full_text or "b.tech" in full_text \
            or "degree" in full_text or "university" in full_text or "college" in full_text:
        # Mentioned in resume even if not in DB form
        edu_score = 12
    else:
        edu_score = 8   # unknown — don't penalize harshly for a missing form

    # ── 4. Profile completeness (10 pts) ─────────────────────────────────────
    acc = db.query(CandidateAccount).filter(CandidateAccount.id == candidate_id).first()
    flags = [
        bool(acc and acc.first_name and acc.first_name != ""),
        bool(acc and acc.last_name  and acc.last_name  != ""),
        bool(acc and acc.mobile     and acc.mobile     != ""),
        bool(exps),
        bool(resume_file_text),   # bonus for uploading resume
    ]
    comp_score = sum(flags) * 2   # max 10

    total = skill_score + exp_score + edu_score + comp_score
    final = round(min(total, 100) / 10, 1)
    print(f"[pre_score] candidate={candidate_id} skill={skill_score} exp={exp_score} "
          f"edu={edu_score} comp={comp_score} → {final}/10")
    return final


def _tier(score: float) -> str:
    """Return tier label based on pre-screening score."""
    if score < 5:
        return "reject"
    elif score <= 8:
        return "review"
    else:
        return "shortlist"



# ─────────────────────────────────────────────────────────────────────────────
#  Admin Stats
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Return high-level metrics for the HR dashboard."""
    _ensure_ai_intelligence_column(db)

    total_candidates = db.query(func.count(CandidateAccount.id)).scalar()
    active_jobs      = db.query(func.count(JobDescription.id)).filter(JobDescription.status == "open").scalar()
    total_apps       = db.query(func.count(Application.id)).scalar()

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
            "shortlisted": 0,
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


# ─────────────────────────────────────────────────────────────────────────────
#  Applicants for a Job (with pre-screening score)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/job/{job_id}/applicants")
def get_job_applicants(job_id: str, db: Session = Depends(get_db)):
    """
    Fetch all candidates who applied for a specific job.
    Runs fast pre-screening scoring on first load and stores the result.
    """
    _ensure_ai_intelligence_column(db)

    apps = (
        db.query(Application)
        .filter(Application.job_id == job_id)
        .order_by(Application.created_at.desc())
        .all()
    )

    results = []
    for a in apps:
        account = a.account
        if not account:
            continue

        # ── Run pre-screening score if not done yet ──────────────────────────
        try:
            existing_pre = getattr(a, "pre_score", -1)
            if existing_pre is None or existing_pre < 0:
                pre_score = _compute_pre_score(a.candidate_id, a.job_description, db)
                db.execute(
                    text("UPDATE applications SET pre_score=:s WHERE id=:id"),
                    {"s": pre_score, "id": a.id}
                )
                db.commit()
            else:
                pre_score = existing_pre
        except Exception:
            pre_score = -1

        tier = _tier(pre_score)

        # Statuses that must NEVER be auto-overwritten by scoring logic
        LOCKED_STATUSES = {"Shortlisted", "Rejected", "Interview Scheduled", "Interviewed", "Offered"}

        # ── Auto-reject low scorers (only if never touched by a human) ────────
        if tier == "reject" and a.status not in LOCKED_STATUSES:
            a.status = "Rejected"
            db.commit()

        # ── Auto-shortlist high scorers (only if never touched by a human) ────
        if tier == "shortlist" and a.status not in LOCKED_STATUSES:
            a.status = "Shortlisted"
            db.commit()

        # Parse stored ai_intelligence JSON
        try:
            ai_intel = json.loads(a.ai_intelligence) if a.ai_intelligence else {}
        except Exception:
            ai_intel = {}

        # Cross-reference OnboardGuard DB for forensic alerts
        try:
            onboard_cand = db.query(OnboardCandidate).filter(
                OnboardCandidate.email == account.email
            ).first()
            forensic_alerts = onboard_cand.to_dict().get("forensic_alerts", []) if onboard_cand else []
        except Exception:
            forensic_alerts = []

        # Fetch resume path from candidate experience
        exp = db.query(CandidateExperience).filter(
            CandidateExperience.candidate_id == a.candidate_id,
            CandidateExperience.job_id == job_id
        ).first()
        resume_path = exp.resume_path if exp else None

        results.append({
            "id": a.id,
            "candidate_id": a.candidate_id,
            "job_id": job_id,
            "status": a.status,
            "pre_score": pre_score,
            "score_tier": tier,
            "ai_intelligence": ai_intel,
            "applied_on": a.created_at.strftime("%d %b %Y") if a.created_at else "—",
            "candidate": {
                "name": f"{account.first_name or ''} {account.last_name or ''}".strip()
                         or account.email.split('@')[0],
                "email": account.email,
                "experience": "N/A",
                "resume_path": resume_path
            },
            "forensic_alerts": forensic_alerts
        })

    return results


# ─────────────────────────────────────────────────────────────────────────────
#  Run Full AI Assessment (LangGraph)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/application/{application_id}/run-ai")
def run_ai_assessment(application_id: str, db: Session = Depends(get_db)):
    """
    Run the Resume Intelligence LangGraph pipeline for a specific application.
    Blocked if pre_score < 5 (auto-rejected) — saves LLM cost.
    """
    _ensure_ai_intelligence_column(db)

    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    account = app.account
    jd      = app.job_description

    if not account or not jd:
        raise HTTPException(status_code=400, detail="Cannot score — missing candidate or JD")

    # Block if pre-score disqualifies
    try:
        pre = getattr(app, "pre_score", -1)
        if pre is None or pre < 0:
            pre = _compute_pre_score(app.candidate_id, jd, db)
        if pre < 5:
            raise HTTPException(
                status_code=403,
                detail=f"Pre-screening score {pre}/10 is below 5. Candidate auto-rejected. AI assessment skipped."
            )
    except HTTPException:
        raise
    except Exception:
        pass  # if pre-score fails, let AI run anyway

    # Build resume text
    resume_text = _build_resume_text(app.candidate_id, jd, db)

    # Build JD text
    jd_text = _build_jd_text(jd)

    # Build skill_intelligence from JD required_skills so evidence_mapping doesn't fail
    required_skills = [s.strip() for s in (jd.required_skills or "").split(",") if s.strip()]
    primary_skills  = jd.primary_skills if isinstance(jd.primary_skills, list) else \
                      [s.strip() for s in (jd.primary_skills or "").split(",") if s.strip()]
    secondary_skills = jd.secondary_skills if isinstance(jd.secondary_skills, list) else \
                       [s.strip() for s in (jd.secondary_skills or "").split(",") if s.strip()]

    skill_intelligence = {
        "core_skills":     required_skills + primary_skills,
        "secondary_skills": secondary_skills,
        "required_skills": required_skills,
        "technical_skills": primary_skills,
    }

    interview_requirements = {
        "primary_focus_areas":    required_skills[:5],
        "evaluation_dimensions":  [],
        "secondary_skills":       secondary_skills,
    }

    role_context = {
        "title":           jd.title,
        "department":      jd.department or "",
        "responsibilities": jd.responsibilities if isinstance(jd.responsibilities, list) else [],
    }

    competency_profile = {
        "experience_range":  jd.experience_range or "",
        "seniority_level":   "junior" if (jd.min_experience or 0) < 2 else "mid" if (jd.min_experience or 0) < 5 else "senior",
    }

    try:
        from resume_intelligence.graph import resume_graph
        state_input = {
            "candidate_id":         app.candidate_id,
            "raw_resume":           resume_text,
            "raw_jd":               jd_text,
            "skill_intelligence":   skill_intelligence,
            "interview_requirements": interview_requirements,
            "role_context":         role_context,
            "competency_profile":   competency_profile,
        }
        result = resume_graph.invoke(state_input)

        ai_data = {
            "final_score":        result.get("final_score", 0),
            "shortlist_decision": result.get("shortlist_decision", False),
            "shortlist_reason":   result.get("shortlist_reason", {}),
            "admin_insights":     result.get("admin_insights", {}),
            "match_scores":       result.get("match_scores", {}),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI scoring failed: {str(e)}")

    app.ai_intelligence = json.dumps(ai_data)

    # Auto-shortlist if AI also recommends it
    if ai_data.get("shortlist_decision") and app.status in ("applied", "Shortlisted"):
        app.status = "Shortlisted"

    db.commit()
    return {"status": "success", "ai_intelligence": ai_data, "new_status": app.status}


# ─────────────────────────────────────────────────────────────────────────────
#  Status Update
# ─────────────────────────────────────────────────────────────────────────────

class StatusUpdate(BaseModel):
    status: str


@router.patch("/application/{application_id}/status")
def update_application_status(
    application_id: str,
    payload: StatusUpdate,
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app.status = payload.status.title() if payload.status.islower() else payload.status
    db.commit()
    return {"status": "success", "new_status": app.status}


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_resume_text(candidate_id: str, jd, db: Session) -> str:
    lines = []

    acc = db.query(CandidateAccount).filter(CandidateAccount.id == candidate_id).first()
    if acc:
        lines.append(f"Name: {acc.first_name} {acc.last_name}")
        lines.append(f"Email: {acc.email}")

    exps = db.query(CandidateExperience).filter(
        CandidateExperience.candidate_id == candidate_id
    ).all()
    if exps:
        lines.append("\nEXPERIENCE:")
        for e in exps:
            lines.append(f"  - {e.job_title or 'N/A'} at {e.company or 'N/A'}")
            lines.append(f"    Total Experience: {e.total_experience or 0} years")
            lines.append(f"    Notice Period: {e.notice_period or 'N/A'}")
            lines.append(f"    Current CTC: {e.current_ctc or 0} LPA | Expected CTC: {e.expected_ctc or 0} LPA")

    edus = db.query(CandidateEducation).filter(
        CandidateEducation.candidate_id == candidate_id
    ).all()
    if edus:
        lines.append("\nEDUCATION:")
        for edu in edus:
            lines.append(f"  - {edu.degree_name or ''} from {edu.university or ''} ({edu.end_year or ''})")
            lines.append(f"    Score: {edu.score or 'N/A'}")

    if not lines:
        lines.append("Resume not available.")
    return "\n".join(lines)


def _build_jd_text(jd) -> str:
    parts = [
        f"Title: {jd.title}",
        f"Department: {jd.department or ''}",
        f"Required Skills: {jd.required_skills or ''}",
        f"Experience: {jd.experience_range or ''}",
    ]
    if jd.content_raw:
        parts.append(f"Description: {jd.content_raw}")
    if jd.responsibilities:
        resp = jd.responsibilities if isinstance(jd.responsibilities, str) else ", ".join(jd.responsibilities)
        parts.append(f"Responsibilities: {resp}")
    if jd.primary_skills:
        ps = jd.primary_skills if isinstance(jd.primary_skills, str) else ", ".join(jd.primary_skills)
        parts.append(f"Primary Skills: {ps}")
    if jd.secondary_skills:
        ss = jd.secondary_skills if isinstance(jd.secondary_skills, str) else ", ".join(jd.secondary_skills)
        parts.append(f"Secondary Skills: {ss}")
    return "\n".join(parts)
