from pydantic import BaseModel, EmailStr

from typing import List,Optional

class CandidateRegister(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    mobile: str
    password: str
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class EducationSchema(BaseModel):
    highest_qualification : str
    degree_name: str
    university:str
    start_month :int
    end_month :int
    start_year : int
    end_year : int
    score : float

class CertificateSchema(BaseModel):
    name: str
    provider: str
    year: int
    month: Optional[int] = None

class ProfileSchema(BaseModel):
    gender:            str
    city:              str
    state:             str
    permanent_address: str
    pincode:           str
    nationality:       str
    linkedin_url:      Optional[str] = None



class ExperienceSchema(BaseModel):
    total_experience  : float
    relevent_experience :float
    current_company  : str
    current_job_title: str
    notice_period    : str     
    current_ctc      : float             
    expected_ctc     : float
    location_preference :str
    open_to_relocate: bool
    start_date: Optional[str] = None   # YYYY-MM format
    end_date: Optional[str] = None     # YYYY-MM format
    is_current: Optional[bool] = False


class ApplyForJobSchema(BaseModel):

    # Account fields 
    first_name: Optional[str] = None
    last_name:  Optional[str] = None
    mobile:     Optional[str] = None
    resume_path: Optional[str] = None
    certificate_paths:Optional[List[str]] = None
    # profile details
    profile_details : Optional[ProfileSchema] = None

    # Education — full list replacement
    education: Optional[List[EducationSchema]] = None

    # Certificates — full list replacement
    certificates: Optional[List[CertificateSchema]] = None

    # experience details
    experiences : Optional[List[ExperienceSchema]] = None