import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    Text, Date, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship, declarative_base

from candidate.models.base import Base
class CandidateEducation(Base):
    __tablename__ = "candidate_education"

    id                    = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    candidate_id          = Column(String, ForeignKey("candidate_accounts.id"), nullable=False)
    highest_qualification = Column(String,nullable=False)   # Graduate / Post Graduate / Diploma / 10th / 12th
    degree_name           = Column(String,nullable=False)
    university            = Column(String,nullable=False)
    start_month = Column(Integer,nullable=False)
    end_month = Column(Integer,nullable=False)
    start_year = Column(Integer,nullable=False)
    end_year = Column(Integer,nullable=False)
    score = Column(Float,nullable=False)
    account = relationship("CandidateAccount", back_populates="education")

    def to_dict(self) -> dict:
        return {
            "id":                    self.id,
            "highest_qualification": self.highest_qualification,
            "degree_name":           self.degree_name,
            "university":            self.university,
            "start_year":       self.start_year,
            "end_year":       self.end_year,
            "start_month":       self.start_month,
            "end_month":       self.end_month,
            "score":       self.score,
        }