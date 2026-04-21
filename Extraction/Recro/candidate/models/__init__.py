# candidate/models/__init__.py

from candidate.models.base import Base          # ← shared Base

from candidate.models.candidate_account   import CandidateAccount
from candidate.models.candidate_profile   import CandidateProfile
from candidate.models.candidate_education import CandidateEducation
from candidate.models.certificates        import Certificate
from candidate.models.applications        import Application
from job_description.models.job_description import JobDescription
from candidate.models.candidate_experience        import CandidateExperience
from candidate.models.document_extraction        import DocumentExtraction
from candidate.models.interview                  import Interview

__all__ = [
    "Base",
    "CandidateAccount",
    "CandidateProfile",
    "CandidateEducation",
    "Certificate",
    "Application",
    "JobDescription",
    "CandidateExperience",
    "DocumentExtraction",
    "Interview",
]