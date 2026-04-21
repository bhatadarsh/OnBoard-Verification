import sys
import os
import hashlib
sys.path.append(os.path.abspath('.'))

from app.db.database import get_db
from candidate.models.candidate_account import CandidateAccount
from candidate.models.candidate_experience import CandidateExperience

def debug_candidate(email):
    db = next(get_db())
    candidate = db.query(CandidateAccount).filter(CandidateAccount.email == email).first()
    if not candidate:
        print(f"No candidate found with email: {email}")
        return
    
    print(f"Candidate ID: {candidate.id}")
    print(f"Email: {candidate.email}")
    
    experiences = db.query(CandidateExperience).filter(CandidateExperience.candidate_id == candidate.id).all()
    print(f"Found {len(experiences)} experience records.")
    for i, exp in enumerate(experiences):
        print(f"Record {i+1}:")
        print(f"  Job ID: {exp.job_id}")
        print(f"  Total Experience: {exp.total_experience}")
        print(f"  Relevant Experience: {exp.relevent_experience}")
        print(f"  Company: {exp.company}")
        print(f"  Job Title: {exp.job_title}")

if __name__ == '__main__':
    debug_candidate("rugwed8181@gmail.com")
