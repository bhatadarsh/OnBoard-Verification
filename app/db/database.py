from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

from config.settings import settings
from app.db.base_class import Base

# --- IMPORT ALL MODELS HERE so SQLAlchemy knows about them ---
try:
    from app.models.candidate import Candidate
    from candidate.models.candidate_account import CandidateAccount
    from candidate.models.candidate_profile import CandidateProfile
    from candidate.models.candidate_education import CandidateEducation
    from candidate.models.certificates import Certificate
    from candidate.models.candidate_experience import CandidateExperience
    from candidate.models.applications import Application
    from candidate.models.document_extraction import DocumentExtraction
    from job_description.models.job_description import JobDescription
except ImportError as e:
    print(f"Warning: Could not import some models: {e}")

# Determine database URL
db_url = os.getenv("DATABASE_URL") or settings.postgres_uri
if not db_url or "postgresql" not in db_url:
    # Fallback to local SQLite for OnboardGuard
    db_url = "sqlite:///./onboardguard.db"
    connect_args = {"check_same_thread": False}
else:
    connect_args = {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True if "postgresql" in db_url else False,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_db():
    """Create all tables if they don't exist."""
    print(f"Initializing database at: {db_url}")
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session and closes it after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auto-initialize on import
init_db()