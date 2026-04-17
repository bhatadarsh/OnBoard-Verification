"""
Main FastAPI application entry point.

Run with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8001
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from candidate.db.database import init_db
# from app.api.candidate_routes import router as candidate_router
from candidate.api.candidate_routes import router as candidate_router

app = FastAPI(
    title="HR Platform — Extraction Service",
    description="Candidate registration + resume extraction API",
    version="1.0.0",
)

# Allow frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
@app.on_event("startup")
def startup():
    init_db()

# Register routes
app.include_router(candidate_router)

@app.get("/health")
def health():
    print("Inside main")
    return {"status": "ok", "service": "extraction"}