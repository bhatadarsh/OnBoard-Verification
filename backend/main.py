from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
from config import settings
from models import UserCreate, UserLogin, User, Token, TokenData, JobDescription, Resume
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin,
    require_user
)
from database import users_db, user_id_counter, jd_db, resume_db
from utils.azure_blob import azure_blob_helper
from fastapi import File, UploadFile
from typing import List, Optional
import uuid
from datetime import datetime

app = FastAPI(title="Interview System API - Stage 1: Authentication")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("\n!!! BACKEND STARTING - STAGE 2 ENDPOINTS REGISTERED !!!\n")

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "stage": "1 - Authentication"}

@app.post("/auth/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user."""
    global user_id_counter
    
    # Check if user already exists
    if user_data.email in users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user_id = user_id_counter
    user_id_counter += 1
    
    user = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "role": user_data.role,
        "status": "active",
        "hashed_password": hashed_password
    }
    
    users_db[user_data.email] = user
    
    # Return user without password
    return User(**{k: v for k, v in user.items() if k != "hashed_password"})

@app.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login and get JWT token."""
    # Find user
    user = users_db.get(credentials.email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if user["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"user_id": user["id"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=User)
async def get_me(current_user: TokenData = Depends(get_current_user)):
    """Get current user info."""
    # Find user by ID
    for user in users_db.values():
        if user["id"] == current_user.user_id:
            return User(**{k: v for k, v in user.items() if k != "hashed_password"})
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found"
    )

@app.get("/admin/dashboard")
async def admin_dashboard(current_user: TokenData = Depends(require_admin)):
    """Admin dashboard endpoint."""
    return {"message": "Welcome to Admin Dashboard", "user_id": current_user.user_id}

@app.get("/user/dashboard")
async def user_dashboard(current_user: TokenData = Depends(require_user)):
    """User dashboard endpoint."""
    return {"message": "Welcome to User Dashboard", "user_id": current_user.user_id}

# Stage 2: JD and Resume Upload

@app.post("/admin/jd/upload", response_model=JobDescription, status_code=status.HTTP_201_CREATED)
async def upload_jd(
    file: UploadFile = File(...),
    current_user: TokenData = Depends(require_admin)
):
    """Admin uploads Job Description."""
    if not file.filename.lower().endswith(('.pdf', '.docx')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are supported"
        )
    
    job_id = f"JOB_{len(jd_db) + 1}"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    blob_name = f"job_descriptions/{job_id}/{timestamp}_{file.filename}"
    
    file_content = await file.read()
    blob_url = azure_blob_helper.upload_file("job-descriptions", blob_name, file_content)
    
    jd = JobDescription(
        job_id=job_id,
        jd_blob_path=blob_name,
        status="ACTIVE",
        uploaded_at=datetime.now()
    )
    
    # Store JD metadata (only one active JD for simplicity in Stage 2)
    jd_db[job_id] = jd
    return jd

@app.get("/admin/jd", response_model=List[JobDescription])
async def get_all_jds(current_user: TokenData = Depends(require_admin)):
    """List all JDs for admin."""
    return list(jd_db.values())

@app.get("/user/jd", response_model=Optional[JobDescription])
async def get_active_jd(current_user: TokenData = Depends(require_user)):
    """Candidate previews the active JD."""
    # Return the first active JD found
    for jd in jd_db.values():
        if jd.status == "ACTIVE":
            return jd
    return None

@app.post("/user/resume/upload", response_model=Resume, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: TokenData = Depends(require_user)
):
    """User uploads resume. Gated by existence of active JD."""
    # Check if an active JD exists
    active_jd = None
    for jd in jd_db.values():
        if jd.status == "ACTIVE":
            active_jd = jd
            break
    
    if not active_jd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description not uploaded yet"
        )
    
    if not file.filename.lower().endswith(('.pdf', '.docx')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are supported"
        )
    
    resume_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    blob_name = f"resumes/CAND_{current_user.user_id}/{timestamp}_{file.filename}"
    
    file_content = await file.read()
    azure_blob_helper.upload_file("resumes", blob_name, file_content)
    
    resume = Resume(
        candidate_id=current_user.user_id,
        resume_id=resume_id,
        resume_blob_path=blob_name,
        status="UNDER_REVIEW",
        uploaded_at=datetime.now()
    )
    
    resume_db.append(resume)
    return resume

@app.get("/admin/resumes", response_model=List[Resume])
async def list_resumes(current_user: TokenData = Depends(require_admin)):
    """Admin lists all candidate resumes."""
    return resume_db

@app.get("/user/resume/status")
async def get_resume_status(current_user: TokenData = Depends(require_user)):
    """Candidate checks their resume status."""
    for resume in resume_db:
        if resume.candidate_id == current_user.user_id:
            return resume
    return None

@app.get("/blob/url")
async def get_blob_url(container: str, blob_path: str, current_user: TokenData = Depends(get_current_user)):
    """Get a signed URL for a blob (placeholder for Stage 2)."""
    # For Stage 2, we'll return the direct URL if public, 
    # but in a real app this would be a SAS URL.
    return {"url": azure_blob_helper.get_blob_url(container, blob_path)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
