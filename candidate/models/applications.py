import json
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Float,
    Text, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship

from candidate.models.base import Base


class Application(Base):

    __tablename__ = "applications"

    id              = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    candidate_id    = Column(String, ForeignKey("candidate_accounts.id"), nullable=False)
    job_id          = Column(String, ForeignKey("job_descriptions.id"), nullable=False)
    status          = Column(String, default="applied")
    ai_intelligence = Column(Text, default="{}")    # JSON blob from resume_graph scoring pipeline
    pre_score       = Column(Float, default=-1)     # Fast pre-screening score 0-10 (no LLM cost)
    created_at      = Column(DateTime, default=datetime.utcnow)

    account         = relationship("CandidateAccount", back_populates="applications")
    job_description = relationship("JobDescription", back_populates="applications")

    def to_dict(self) -> dict:
        try:
            ai = json.loads(self.ai_intelligence) if self.ai_intelligence else {}
        except Exception:
            ai = {}
        return {
            "candidate_id":    self.candidate_id,
            "job_id":          self.job_id,
            "status":          self.status,
            "ai_intelligence": ai,
            "pre_score":       self.pre_score,
            "created_at":      self.created_at.isoformat() if self.created_at else None,
        }