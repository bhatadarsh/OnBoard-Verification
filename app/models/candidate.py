"""
Candidate Model — SQLAlchemy table definition.

This single table serves all 3 applications:
  - Extraction  : resume_path, chroma_vector_id, skills, education, experience
  - Interview   : interview_id, interview_score, interview_status
  - OnboardGuard: aadhar_number, pan_number, dob, validation_score
"""
import json
from datetime import datetime

from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Boolean
from app.db.base_class import Base


class Candidate(Base):
    __tablename__ = "candidates"

    # ── Identity (filled at registration) ───────────────────────
    id               = Column(String, primary_key=True)   # cand_<md5>
    first_name       = Column(String)
    last_name        = Column(String)
    full_name        = Column(String) # for compatibility with legacy validation scripts
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

    # ── OnboardGuard Pipeline Data (Merged from legacy validation core) ──
    documents = Column(Text, default="{}")        # JSON: raw document paths/metadata
    knowledge_base = Column(Text, default="{}")   # JSON: extracted data from documents
    onboarding_form = Column(Text, default="{}")  # JSON: original CSV/Form data
    validation_result = Column(Text, default="{}") # JSON: detailed validation breakdown
    is_validated = Column(Boolean, default=False)
    tamper_warning = Column(Boolean, default=False)

    # ── Meta ────────────────────────────────────────────────────
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── Legacy Helpers for OnboardGuard ─────────────────────────
    def set_documents(self, data):
        self.documents = json.dumps(data)
    
    def get_documents(self):
        return json.loads(self.documents) if self.documents else {}
    
    def set_knowledge_base(self, data):
        self.knowledge_base = json.dumps(data)
    
    def get_knowledge_base(self):
        return json.loads(self.knowledge_base) if self.knowledge_base else {}
    
    def set_form(self, data):
        self.onboarding_form = json.dumps(data)
    
    def get_form(self):
        return json.loads(self.onboarding_form) if self.onboarding_form else {}
    
    def set_validation(self, data):
        self.validation_result = json.dumps(data)
        self.validation_score = data.get("overall_score", 0)
        self.validation_status = "validated"
        self.is_validated = True
    
    def get_validation(self):
        return json.loads(self.validation_result) if self.validation_result else {}

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
        # Use stored full_name as fallback if first/last are missing
        display_name = self.full_name
        if not display_name and self.first_name:
            display_name = f"{self.first_name} {self.last_name or ''}".strip()

        return {
            "id":               self.id,
            "first_name":       self.first_name,
            "last_name":        self.last_name,
            "full_name":        display_name,
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
            "is_validated":     self.is_validated,
            "has_knowledge_base": bool(self.knowledge_base and self.knowledge_base != "{}"),
            "has_form":          bool(self.onboarding_form and self.onboarding_form != "{}"),
            "uploaded_documents": [k for k, v in self.get_documents().items() if k != "forensic_alerts" and isinstance(v, str)] if self.documents else [],
            "forensic_alerts":   self.get_documents().get("forensic_alerts", []) if self.documents else [],
            "validation_score": self.validation_score,
            "validation_status":self.validation_status,
            "created_at":       str(self.created_at),
            "updated_at":       str(self.updated_at)
        }