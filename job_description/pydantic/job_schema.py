from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class JobCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    company: Optional[str] = "Sigmoid"
    location: Optional[str] = "Remote"
    department: Optional[str] = "Engineering"
    employment_type: Optional[str] = "Full-time"
    work_mode: Optional[str] = "Hybrid"
    min_experience: Optional[int] = 0
    max_experience: Optional[int] = 5
    experience_range: Optional[str] = "0–5 Years"
    required_skills: Optional[str] = ""
    responsibilities: Optional[List[str]] = []
    desired_experience: Optional[List[str]] = []
    primary_skills: Optional[List[str]] = []
    secondary_skills: Optional[List[str]] = []
    content_raw: Optional[str] = ""
    content_html: Optional[str] = ""

class JobResponse(JobCreate):
    id: str
    status: str
    applicant_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True
