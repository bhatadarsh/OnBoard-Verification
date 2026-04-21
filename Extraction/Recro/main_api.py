"""
Main FastAPI application entry point.

Run with:
    uvicorn main_api:app --reload --host 0.0.0.0 --port 8001

Environment variables for email (in .env):
    SMTP_HOST  = smtp.gmail.com
    SMTP_PORT  = 587
    SMTP_USER  = your_email@gmail.com
    SMTP_PASS  = your_app_password
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from candidate.db.database import init_db
from candidate.api.candidate_routes import router as candidate_router
from candidate.api.interview_routes  import router as interview_router
from candidate.api.admin_routes      import router as admin_router
from job_description.jd_routes.api   import router as job_router

app = FastAPI(
    title="HR Platform — Extraction & Scheduling Service",
    description="Candidate registration, resume extraction, job management, and interview scheduling API",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(candidate_router)
app.include_router(interview_router)
app.include_router(admin_router)
app.include_router(job_router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "extraction-scheduling", "version": "2.0.0"}