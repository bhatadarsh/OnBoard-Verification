"""
Main FastAPI Application - Production-grade Onboarding Validation System
"""
import os
import sys
from pathlib import Path

# Add project root to path for cross-imports
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))

from dotenv import load_dotenv
load_dotenv()
import sys
print(f"DEBUG SYS.PATH: {sys.path}")
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from app.api.routes import validation, auth

# Import unified routers
from candidate.api.candidate_routes import router as candidate_router
from backend.main import router as whisper_router

app = FastAPI(
    title="OnboardGuard",
    description="AI-Powered Onboarding Document Validation System",
    version="2.0.0"
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(validation.router, prefix="/api/v1", tags=["validation"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])

# Integrated Routes
app.include_router(whisper_router, tags=["interview"])
app.include_router(candidate_router, prefix="/api/v1/extract", tags=["extraction"])


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "onboardguard", "version": "2.0.0"}


@app.get("/api/v1/health/db")
def db_health_check():
    """Database health check for AdminPortal status pills."""
    status = {}
    # Check ChromaDB
    try:
        from storage.chroma_handler import ChromaHandler
        ch = ChromaHandler()
        ch.collection.count()
        status["chromadb"] = "ok"
    except Exception:
        status["chromadb"] = "offline"
    # Check MongoDB
    try:
        from storage.mongo_handler import MongoHandler
        mh = MongoHandler()
        mh.client.server_info()
        status["mongodb"] = "ok"
    except Exception:
        status["mongodb"] = "offline"
    return status


# Serve React Frontend
FRONTEND_DIR = "../frontend/dist"

if os.path.exists(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=f"{FRONTEND_DIR}/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve React SPA for all non-API routes."""
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        index_path = f"{FRONTEND_DIR}/index.html"
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"error": "Frontend not built. Run 'npm run build' in frontend/"}
