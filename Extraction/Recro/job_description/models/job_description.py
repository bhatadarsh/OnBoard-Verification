import json
import hashlib
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    Text, Date, DateTime, ForeignKey, UniqueConstraint, JSON
)
from sqlalchemy.orm import relationship, declarative_base

from candidate.models.base import Base
class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id               = Column(String, primary_key=True,default=lambda: str(uuid.uuid4())[:8])   
    title            = Column(String, nullable=False)     
    company          = Column(String)                     
    location         = Column(String)                     
    department       = Column(String)                     
    employment_type  = Column(String)                     
    work_mode        = Column(String)                     
    min_experience   = Column(Integer)                    
    max_experience   = Column(Integer)                    
    experience_range = Column(String)                     
    required_skills  = Column(Text)                       

    # New fields for structured JD content
    subtitle           = Column(String)
    responsibilities   = Column(JSON)   # Store as a list of strings
    desired_experience = Column(JSON)   # Store as a list of strings
    primary_skills     = Column(JSON)   # Store as a list of strings
    secondary_skills   = Column(JSON)   # Store as a list of strings

    status           = Column(String, default="open")     
    posted_by        = Column(String)                     

    # Full content stored as-is
    content_raw      = Column(Text)     
    content_html     = Column(Text)   

    # ChromaDB link
    chroma_vector_id = Column(String)   

    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow)
    applications = relationship("Application", back_populates="job_description")
    experience = relationship("CandidateExperience", back_populates="job")

    def to_dict(self)->dict:
        return {
            "id": self.id,
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "department": self.department,
            "employment_type": self.employment_type,
            "work_mode": self.work_mode,
            "min_experience": self.min_experience,
            "max_experience": self.max_experience,
            "experience_range": self.experience_range,
            "required_skills": self.required_skills,
            "subtitle": self.subtitle,
            "responsibilities": self.responsibilities,
            "desired_experience": self.desired_experience,
            "primary_skills": self.primary_skills,
            "secondary_skills": self.secondary_skills,
            "status": self.status,
            "posted_by": self.posted_by,
            "content_raw": self.content_raw,
            "content_html": self.content_html,
            "chroma_vector_id": self.chroma_vector_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }