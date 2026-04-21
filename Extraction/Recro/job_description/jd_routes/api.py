from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from candidate.db.database import get_db
from job_description.models.job_description import JobDescription
from job_description.pydantic.job_schema import JobCreate, JobResponse
from storage.chroma_handler import chroma_handler
from embeddings.embedding_generator import embed_and_prepare
import uuid
from sqlalchemy import func
from candidate.models.applications import Application

router = APIRouter(prefix="/api/job", tags=["job"])

@router.get("/", response_model=List[JobResponse])
def list_jobs(db: Session = Depends(get_db)):
    """List all ACTIVE job descriptions with application counts."""
    results = db.query(JobDescription, func.count(Application.id).label("app_count"))\
                .outerjoin(Application, JobDescription.id == Application.job_id)\
                .filter(JobDescription.status != "closed")\
                .group_by(JobDescription.id)\
                .all()
    
    jobs = []
    for job, count in results:
        job_data = job.to_dict()
        job_data["applicant_count"] = count
        jobs.append(job_data)
    return jobs

@router.post("/", response_model=JobResponse)
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    """Create a new job posting."""
    job = JobDescription(
        title=payload.title,
        subtitle=payload.subtitle,
        company=payload.company,
        location=payload.location,
        department=payload.department,
        employment_type=payload.employment_type,
        work_mode=payload.work_mode,
        min_experience=payload.min_experience,
        max_experience=payload.max_experience,
        experience_range=payload.experience_range,
        required_skills=payload.required_skills,
        responsibilities=payload.responsibilities,
        desired_experience=payload.desired_experience,
        primary_skills=payload.primary_skills,
        secondary_skills=payload.secondary_skills,
        content_raw=payload.content_raw,
        content_html=payload.content_html,
        status="open"
    )
    
    # Generate ID for vector embedding
    vector_id = f"job_{uuid.uuid4().hex[:8]}"
    job.chroma_vector_id = vector_id
    
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Store in ChromaDB
    try:
        desired_exp_text = "\n".join(job.desired_experience or [])
        combined_text = f"{job.title} at {job.department}\n\n{job.content_raw}\n\nDesired Experience:\n{desired_exp_text}\n\nResponsibilities:\n" + "\n".join(job.responsibilities or []) + "\n\nSkills:\n" + "\n".join((job.primary_skills or []) + (job.secondary_skills or []))
        
        prepared = embed_and_prepare(
            content_id=vector_id,
            text=combined_text,
            metadata={
                "type": "job_description",
                "job_id": job.id,
                "title": job.title,
                "department": job.department,
            }
        )
        
        chroma_handler.store_embeddings(
            ids=[prepared["id"]],
            embeddings=[prepared["embedding"]],
            documents=[prepared["document"]],
            metadatas=[prepared["metadata"]],
        )
    except Exception as e:
        print(f"Error storing job in ChromaDB: {e}")

    # Forward the text and ID to the intelligence backend on port 8003
    try:
        import requests
        sync_payload = {
            "job_id": job.id,
            "jd_name": job.title,
            "raw_text": combined_text
        }
        print("combinedd ---",combined_text)
        # Call 8003 without requiring a file
        response = requests.post("http://localhost:8003/admin/jd/sync", json=sync_payload, timeout=15)
        if response.status_code == 201:
            print(f"✅ Fast-forwarded JD {job.id} intelligence sync to 8003")
        else:
            print(f"⚠️ Failed to sync JD {job.id} to 8003. Status: {response.status_code}, Res: {response.text}")
    except Exception as e:
        print(f"Error calling 8003 backend: {e}")

    return job

@router.put("/{job_id}", response_model=JobResponse)
def update_job(job_id: str, payload: JobCreate, db: Session = Depends(get_db)):
    """Update an existing job posting."""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Update fields
    job.title = payload.title
    job.subtitle = payload.subtitle
    job.company = payload.company
    job.location = payload.location
    job.department = payload.department
    job.employment_type = payload.employment_type
    job.work_mode = payload.work_mode
    job.min_experience = payload.min_experience
    job.max_experience = payload.max_experience
    job.experience_range = payload.experience_range
    job.required_skills = payload.required_skills
    job.responsibilities = payload.responsibilities
    job.desired_experience = payload.desired_experience
    job.primary_skills = payload.primary_skills
    job.secondary_skills = payload.secondary_skills
    job.content_raw = payload.content_raw
    job.content_html = payload.content_html
    
    db.commit()
    db.refresh(job)
    
    # Update in ChromaDB
    try:
        if not job.chroma_vector_id:
            job.chroma_vector_id = f"job_{uuid.uuid4().hex[:8]}"
            db.commit()

        desired_exp_text = "\n".join(job.desired_experience or [])
        combined_text = f"{job.title} at {job.department}\n\n{job.content_raw}\n\nDesired Experience:\n{desired_exp_text}\n\nResponsibilities:\n" + "\n".join(job.responsibilities or []) + "\n\nSkills:\n" + "\n".join((job.primary_skills or []) + (job.secondary_skills or []))
        
        prepared = embed_and_prepare(
            content_id=job.chroma_vector_id,
            text=combined_text,
            metadata={
                "type": "job_description",
                "job_id": job.id,
                "title": job.title,
                "department": job.department,
            }
        )
        
        chroma_handler.store_embeddings(
            ids=[prepared["id"]],
            embeddings=[prepared["embedding"]],
            documents=[prepared["document"]],
            metadatas=[prepared["metadata"]],
        )
    except Exception as e:
        print(f"Error updating job in ChromaDB: {e}")
        
    # Forward the updated text and ID to the intelligence backend on port 8003
    try:
        import requests
        sync_payload = {
            "job_id": job.id,
            "jd_name": job.title,
            "raw_text": combined_text
        }
        # Call 8003 without requiring a file
        response = requests.post("http://localhost:8003/admin/jd/sync", json=sync_payload, timeout=15)
        if response.status_code == 201:
            print(f"✅ Fast-forwarded JD {job.id} intelligence sync to 8003 (Update)")
        else:
            print(f"⚠️ Failed to sync JD {job.id} to 8003 (Update). Status: {response.status_code}, Res: {response.text}")
    except Exception as e:
        print(f"Error calling 8003 backend: {e}")

    return job

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Get details of a specific job including application count."""
    result = db.query(JobDescription, func.count(Application.id).label("app_count"))\
               .outerjoin(Application, JobDescription.id == Application.job_id)\
               .filter(JobDescription.id == job_id)\
               .group_by(JobDescription.id)\
               .first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job, count = result
    job_data = job.to_dict()
    job_data["applicant_count"] = count
    return job_data

@router.delete("/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db)):
    """Soft delete a job: close it and its 'applied' applications."""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # 1. Update Job Status
    job.status = "closed"
    
    # 2. Update Application Statuses
    # Only change status if it was "applied"
    db.query(Application).filter(
        Application.job_id == job_id,
        Application.status == "applied"
    ).update({"status": "application closed"}, synchronize_session=False)

    # 3. Update ChromaDB metadata
    try:
        chroma_handler.update_metadata(
            ids=[job.chroma_vector_id],
            metadatas=[{"status": "closed"}]
        )
    except Exception as e:
        print(f"Error updating ChromaDB status for {job_id}: {e}")

    db.commit()
    return {"status": "success", "message": f"Job {job_id} closed."}
