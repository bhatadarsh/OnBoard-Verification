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
from sqlalchemy.orm import joinedload, selectinload
class CandidateAccount(Base):

    __tablename__ = "candidate_accounts"

    id            = Column(String, primary_key=True)        
    first_name    = Column(String, nullable=False)
    last_name     = Column(String, nullable=False)
    email         = Column(String, unique=True, nullable=False)
    mobile        = Column(String, nullable=False)
    password_hash = Column(String, nullable=False) 
    role          = Column(String, default="candidate")      # candidate / hr / admin
    chroma_vector_id  = Column(String)
    is_verified   = Column(Boolean, default=False)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    
    profile      = relationship("CandidateProfile",      back_populates="account", uselist=False, cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="account", cascade="all, delete-orphan")
    education    = relationship("CandidateEducation",back_populates="account", cascade="all, delete-orphan")
    certificates = relationship("Certificate",back_populates="account", cascade="all, delete-orphan")
    experience   = relationship("CandidateExperience",back_populates="account", cascade="all, delete-orphan")
    interviews   = relationship("Interview", back_populates="account", cascade="all, delete-orphan")
    def set_password(self, plain_password: str):
        try:
            import bcrypt
            self.password_hash = bcrypt.hashpw(
                plain_password.encode(), bcrypt.gensalt()
            ).decode()
        except ImportError:
            import hashlib
            self.password_hash = hashlib.sha256(plain_password.encode()).hexdigest()


    
    def verify_password(self, plain_password: str) -> bool:
        """Check plain password against stored hash."""
        try:
            import bcrypt
            return bcrypt.checkpw(plain_password.encode(), self.password_hash.encode())
        except ImportError:
            import hashlib
            return self.password_hash == hashlib.sha256(plain_password.encode()).hexdigest()

    def to_dict(self) -> dict:
        return {
            "id":          self.id,
            "first_name":  self.first_name,
            "last_name":   self.last_name,
            "email":       self.email,
            "mobile":      self.mobile,
            "role":        self.role,
            "is_verified": self.is_verified,
            "created_at":  str(self.created_at),
        }