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


class Application(Base):

    __tablename__ = "applications"

    id                = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    candidate_id      = Column(String, ForeignKey("candidate_accounts.id"), nullable=False)
    job_id            = Column(String, ForeignKey("job_descriptions.id"), nullable=False)
    status           = Column(String, default="applied")
    created_at    = Column(DateTime, default=datetime.utcnow)


    account = relationship("CandidateAccount", back_populates="applications")
    job_description = relationship("JobDescription", back_populates="applications")

    def to_dict(self) -> dict:
        return {
            "candidate_id":self.candidate_id,
            "job_id":self.job_id,
            "status":self.status
        }
    