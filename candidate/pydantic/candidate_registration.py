from pydantic import BaseModel, EmailStr
from typing import List, Optional


# ─── Auth ──────────────────────────────────────────────────────────────────────

class CandidateRegister(BaseModel):
    first_name: str
    last_name:  str
    email:      EmailStr
    mobile:     str
    password:   str


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


# ─── Education ─────────────────────────────────────────────────────────────────
# DB: candidate_education (highest_qualification, degree_name, university,
#                           start_month, end_month, start_year, end_year, score)

class EducationSchema(BaseModel):
    highest_qualification: Optional[str] = None   # stored in DB, optional at submit
    degree_name:  str
    university:   str
    start_month:  int
    end_month:    int
    start_year:   int
    end_year:     int
    score:        float


# ─── Certificates ──────────────────────────────────────────────────────────────
# DB: certificates (name, provider, year, certificate_path)

class CertificateSchema(BaseModel):
    name:     str
    provider: str
    year:     int


# ─── Profile ───────────────────────────────────────────────────────────────────
# DB: candidate_profiles (gender, city, state, permanent_address,
#                          pincode, nationality, linkedin_url)

class ProfileSchema(BaseModel):
    gender:            Optional[str] = ''
    city:              Optional[str] = ''
    state:             Optional[str] = ''
    permanent_address: Optional[str] = ''
    pincode:           Optional[str] = ''
    nationality:       Optional[str] = ''
    linkedin_url:      Optional[str] = None


# ─── Experience ────────────────────────────────────────────────────────────────
# DB: candidate_experience
#   Columns:  company, job_title, notice_period, current_ctc, expected_ctc,
#             total_experience, relevent_experience, location_preference,
#             open_to_relocate, resume_path, is_current_designation,
#             start_month, end_month, start_year, end_year
#
# NOTE: Pydantic uses  current_company / current_job_title as human-friendly names.
#       The service layer maps them → company / job_title before DB insert.

class ExperienceSchema(BaseModel):
    total_experience:    Optional[float] = 0.0
    relevent_experience: Optional[float] = 0.0     # intentional typo kept for DB compat
    current_company:     Optional[str]   = ''       # → maps to DB column: company
    current_job_title:   Optional[str]   = ''       # → maps to DB column: job_title
    notice_period:       Optional[str]   = ''
    current_ctc:         Optional[float] = 0.0
    expected_ctc:        Optional[float] = 0.0
    location_preference: Optional[str]   = ''
    open_to_relocate:    Optional[bool]  = False
    is_current_designation: Optional[bool] = False
    start_month:         Optional[int]   = None
    end_month:           Optional[int]   = None
    start_year:          Optional[int]   = None
    end_year:            Optional[int]   = None


# ─── Full Application Payload ──────────────────────────────────────────────────

class ApplyForJobSchema(BaseModel):
    # Account fields (optional — updates existing account)
    first_name:        Optional[str]             = None
    last_name:         Optional[str]             = None
    mobile:            Optional[str]             = None
    resume_path:       Optional[str]             = None
    certificate_paths: Optional[List[str]]       = None

    # Sub-schemas
    profile_details: Optional[ProfileSchema]         = None
    education:       Optional[List[EducationSchema]] = None
    certificates:    Optional[List[CertificateSchema]] = None
    experiences:     Optional[List[ExperienceSchema]]  = None