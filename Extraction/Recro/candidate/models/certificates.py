import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    Text, Date, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship, declarative_base

from candidate.models.base import Base
class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    candidate_id = Column(String, ForeignKey("candidate_accounts.id"), nullable=False)
    name = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=True)
    certificate_path = Column(String)
    account = relationship("CandidateAccount", back_populates="certificates")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "candidate_id": self.candidate_id,
            "name": self.name,
            "provider": self.provider,
            "year": self.year,
        }