"""
Main FastAPI Application - Production-grade Onboarding Validation System
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
import os

from app.api.routes import validation, auth

app = FastAPI(
    title="OnboardGuard",
    description="AI-Powered Onboarding Document Validation System",
    version="2.0.0"
)

# CORS Setup - Allow all for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(validation.router, prefix="/api/v1", tags=["validation"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "onboardguard", "version": "2.0.0"}


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
