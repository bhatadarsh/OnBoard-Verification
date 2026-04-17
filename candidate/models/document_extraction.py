from sqlalchemy import Column, String, Text, DateTime, Integer, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from candidate.models.base import Base

class DocumentExtraction(Base):
    __tablename__ = "document_extractions"

    id = Column(String, primary_key=True,default=lambda: str(uuid.uuid4())[:8])
    candidate_id = Column(String, ForeignKey("candidate_accounts.id"), nullable=True)
    file_name = Column(String(255))
    file_path = Column(Text)
    doc_type = Column(String(50))   # e.g., 'aadhar', 'pan', 'resume'
    
    # The literal text extracted by the OCR
    raw_text = Column(Text)
    
    # The structured data (Name, DOB, ID Number, etc.)
    # Use JSON column if using PostgreSQL/MySQL, or Text for SQLite
    extracted_data = Column(JSON) 
    
    status = Column(String(20), default="processed")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Optional: Relationship back to candidate
    candidate = relationship("CandidateAccount")
