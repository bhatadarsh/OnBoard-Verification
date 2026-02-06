from pydantic import BaseModel, EmailStr
from typing import Literal, Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: Literal["user", "admin"]

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    status: Literal["active", "inactive"] = "active"
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: int
    role: str

class JobDescription(BaseModel):
    job_id: str
    jd_blob_path: str
    status: Literal["ACTIVE", "INACTIVE"] = "ACTIVE"
    uploaded_at: datetime
    intelligence: Optional[dict] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None

class Resume(BaseModel):
    candidate_id: int
    job_id: Optional[str] = None
    resume_id: str
    resume_blob_path: str
    status: Literal["UNDER_REVIEW", "SHORTLISTED", "REJECTED"] = "UNDER_REVIEW"
    interview_unlocked: bool = False
    uploaded_at: datetime
    intelligence: Optional[dict] = None

class InterviewSession(BaseModel):
    interview_id: str
    candidate_id: int
    current_question: Optional[str] = None
    status: Literal["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] = "NOT_STARTED"
    created_at: datetime
    focus_areas: Optional[list] = None
    current_topic: Optional[str] = None
    current_topic_index: int = 0
    current_followup_count: int = 0
    interview_trace: list = []
