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

class Resume(BaseModel):
    candidate_id: int
    resume_id: str
    resume_blob_path: str
    status: Literal["UNDER_REVIEW", "ACCEPTED", "REJECTED"] = "UNDER_REVIEW"
    uploaded_at: datetime
