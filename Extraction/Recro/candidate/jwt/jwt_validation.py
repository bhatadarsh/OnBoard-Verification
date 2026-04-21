from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from candidate.db.database import get_db
from candidate.models.candidate_account import CandidateAccount

# This tells FastAPI to look for a "Bearer <token>" in the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/candidate/login")

def get_current_candidate(
    db: Session = Depends(get_db), 
    token: str = Depends(oauth2_scheme)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        
        payload = jwt.decode(token, "d2990fe34e25e0012e8312ea7aecd2202eae59a896410667612021fc60a018b5", algorithms="HS256")
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Fetch the candidate from the DB to ensure they still exist
    candidate = db.query(CandidateAccount).filter(CandidateAccount.email == email).first()
    if candidate is None:
        raise credentials_exception
        
    return candidate