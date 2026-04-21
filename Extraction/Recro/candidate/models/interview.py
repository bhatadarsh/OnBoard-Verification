"""
Interview model — stores scheduled interview details for a candidate.
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from candidate.models.base import Base


class Interview(Base):
    __tablename__ = "interviews"

    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:12])
    candidate_id   = Column(String, ForeignKey("candidate_accounts.id", ondelete="CASCADE"), nullable=False)
    job_id         = Column(String, nullable=True)          # which JD this interview is for
    scheduled_at   = Column(DateTime, nullable=False)       # datetime of interview
    interview_link = Column(String, nullable=True)          # Zoom / Meet link
    notes          = Column(Text, nullable=True)            # admin notes to candidate
    status         = Column(String, default="scheduled")   # scheduled | completed | cancelled
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship back to CandidateAccount
    account = relationship("CandidateAccount", back_populates="interviews")

    def to_dict(self) -> dict:
        return {
            "id":             self.id,
            "candidate_id":   self.candidate_id,
            "job_id":         self.job_id,
            "scheduled_at":   self.scheduled_at.isoformat() if self.scheduled_at else None,
            "interview_link": self.interview_link,
            "notes":          self.notes,
            "status":         self.status,
            "created_at":     self.created_at.isoformat() if self.created_at else None,
        }
