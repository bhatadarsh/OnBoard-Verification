import json
import hashlib
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    Text, Date, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship, declarative_base

from candidate.models.base import Base 
class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"
    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    candidate_id  = Column(String, ForeignKey("candidate_accounts.id"), unique=True, nullable=False)
    gender        = Column(String)           
    city          = Column(String)
    state         = Column(String)
    permanent_address = Column(Text)
    pincode       = Column(String)
    nationality   = Column(String)
    linkedin_url  = Column(String)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    account = relationship("CandidateAccount", back_populates="profile")
    def to_dict(self) -> dict:
        return {
            "gender":            self.gender,
            "city":              self.city,
            "state":             self.state,
            "permanent_address": self.permanent_address,
            "pincode":           self.pincode,
            "nationality":       self.nationality,
        }

