from candidate.models.base import Base
from datetime import datetime
import uuid
from sqlalchemy.orm import relationship

from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    Text, Date, DateTime, ForeignKey, UniqueConstraint
) 
class CandidateExperience(Base):

    __tablename__ = "candidate_experience"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    candidate_id= Column(String, ForeignKey("candidate_accounts.id"), nullable=False)
    job_id = Column(String, ForeignKey("job_descriptions.id"), nullable=False)
    total_experience  = Column(Float)   
    relevent_experience = Column(Float)
    company   = Column(String)
    job_title = Column(String)
    notice_period     = Column(String)            # Immediate / 15 / 30 / 60 / 90 days
    current_ctc       = Column(Float)             # in LPA
    expected_ctc      = Column(Float)
    resume_path = Column(String)
    location_preference = Column(String)
    is_current_designation = Column(Boolean)
    start_month = Column(Integer)
    end_month = Column(Integer)
    start_year = Column(Integer)
    end_year = Column(Integer)
    open_to_relocate = Column(Boolean,default=False)
    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    account = relationship("CandidateAccount", back_populates="experience")
    job = relationship("JobDescription", back_populates="experience")
    

