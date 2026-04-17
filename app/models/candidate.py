"""
Candidate Model — SQLAlchemy table definition.

This single table serves all 3 applications:
  - Extraction  : resume_path, chroma_vector_id, skills, education, experience
  - Interview   : interview_id, interview_score, interview_status
  - OnboardGuard: aadhar_number, pan_number, dob, validation_score
"""
import json
from datetime import datetime

from sqlalchemy import Column, String, Integer, Float, Text, DateTime, create_engine
from sqlalchemy.orm import declarative_base, Session

Base = declarative_base()


class Candidate(Base):
    __tablename__ = "candidates"

    # ── Identity (filled at registration) ───────────────────────
    id               = Column(String, primary_key=True)   # cand_<md5>
    first_name       = Column(String, nullable=False)
    last_name        = Column(String, nullable=False)
    email            = Column(String, unique=True, nullable=False)
    phone            = Column(String)                     # with country code
    location         = Column(String)
    status           = Column(String, default="applied")  
    # applied → shortlisted → interviewed → onboarding → onboarded

    # ── Resume (filled after extraction) ────────────────────────
    resume_path      = Column(String)                     # uploads/cand_001/resume.pdf
    chroma_vector_id = Column(String)                     # ID inside ChromaDB
    raw_skills       = Column(Text)                       # JSON list ["Python","SQL"]
    raw_education    = Column(Text)                       # JSON list of dicts
    raw_experience   = Column(Text)                       # JSON list of dicts
    experience_years = Column(Float)
    current_company  = Column(String)
    current_role     = Column(String)

    # ── JD matching (filled when shortlisted) ───────────────────
    applied_jd_id    = Column(String)                     # FK → job_descriptions.id
    match_score      = Column(Float)                      # ChromaDB similarity score

    # ── Interview (filled after interview) ──────────────────────
    interview_id     = Column(String)                     # FK → interviews.id
    interview_score  = Column(Float)
    interview_status = Column(String)                     # scheduled/completed/cancelled

       # ── OnboardGuard (filled after selection) ───────────────────
    aadhar_number    = Column(String)
    pan_number       = Column(String)
    dob              = Column(String)                     # YYYY-MM-DD
    validation_score = Column(Float)
    validation_status = Column(String)   
    raw_certifications = Column(Text)                 
    # ── Meta ────────────────────────────────────────────────────
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── Helpers for JSON fields ──────────────────────────────────
    def set_skills(self, skills: list):
        self.raw_skills = json.dumps(skills)

    def get_skills(self) -> list:
        return json.loads(self.raw_skills) if self.raw_skills else []

    def set_education(self, education: list):
        self.raw_education = json.dumps(education)

    def get_education(self) -> list:
        return json.loads(self.raw_education) if self.raw_education else []

    def set_experience(self, experience: list):
        self.raw_experience = json.dumps(experience)

    def get_experience(self) -> list:
        return json.loads(self.raw_experience) if self.raw_experience else []
    
    def set_certifications(self, certifications: list):
        self.raw_certifications = json.dumps(certifications)

    def get_certifications(self) -> list:
        return json.loads(self.raw_certifications) if self.raw_certifications else []

    def to_dict(self) -> dict:
        return {
            "id":               self.id,
            "first_name":       self.first_name,
            "last_name":        self.last_name,
            "full_name":        f"{self.first_name} {self.last_name}",
            "email":            self.email,
            "phone":            self.phone,
            "location":         self.location,
            "status":           self.status,
            "resume_path":      self.resume_path,
            "skills":           self.get_skills(),
            "certifications":   self.get_certifications(),
            "education":        self.get_education(),
            "experience":       self.get_experience(),
            "experience_years": self.experience_years,
            "current_company":  self.current_company,
            "current_role":     self.current_role,
            "match_score":      self.match_score,
            "interview_score":  self.interview_score,
            "interview_status": self.interview_status,
            "validation_score": self.validation_score,
            "validation_status":self.validation_status,
            "created_at":       str(self.created_at),
        }