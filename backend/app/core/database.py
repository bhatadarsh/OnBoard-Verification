"""
Database Models - SQLite storage for candidates and knowledge base.
"""
import os
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Text, DateTime, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import config

Base = declarative_base()


class Candidate(Base):
    """Candidate model - stores all candidate data."""
    __tablename__ = "candidates"
    
    id = Column(String, primary_key=True)  # Auto-generated from name
    full_name = Column(String, nullable=False)
    email = Column(String)
    phone = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Raw document paths (JSON)
    documents = Column(Text, default="{}")
    
    # Knowledge base (extracted from documents) - JSON
    knowledge_base = Column(Text, default="{}")
    
    # Onboarding form data - JSON
    onboarding_form = Column(Text, default="{}")
    
    # Validation result - JSON
    validation_result = Column(Text, default="{}")
    validation_score = Column(Float, default=0.0)
    is_validated = Column(Boolean, default=False)
    
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
        self.is_validated = True
    
    def get_validation(self):
        return json.loads(self.validation_result) if self.validation_result else {}
    
    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "documents": self.get_documents(),
            "has_knowledge_base": bool(self.knowledge_base and self.knowledge_base != "{}"),
            "has_form": bool(self.onboarding_form and self.onboarding_form != "{}"),
            "is_validated": self.is_validated,
            "validation_score": self.validation_score
        }


# Database setup
engine = create_engine(config.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Initialize on import
init_db()
