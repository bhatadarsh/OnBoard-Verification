import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float,
    DateTime, ForeignKey
)
from sqlalchemy.orm import relationship

from candidate.models.base import Base


class CandidateEducation(Base):
    __tablename__ = "candidate_education"

    # DB columns (matches SQLite schema exactly)
    id                    = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    candidate_id          = Column(String, ForeignKey("candidate_accounts.id"), nullable=False)
    highest_qualification = Column(String)          # Graduate / Post Graduate / Diploma / 10th / 12th
    degree_name           = Column(String)
    university            = Column(String)
    start_month           = Column(Integer)
    end_month             = Column(Integer)
    start_year            = Column(Integer)
    end_year              = Column(Integer)
    score                 = Column(Float)

    account = relationship("CandidateAccount", back_populates="education")

    def to_dict(self) -> dict:
        return {
            "id":                    self.id,
            "highest_qualification": self.highest_qualification,
            "degree_name":           self.degree_name,
            "university":            self.university,
            "start_year":            self.start_year,
            "end_year":              self.end_year,
            "start_month":           self.start_month,
            "end_month":             self.end_month,
            "score":                 self.score,
        }