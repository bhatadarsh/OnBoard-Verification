"""
Database — PostgreSQL connection and session management.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config.settings import settings
from app.models.candidate import Base


engine = create_engine(
    settings.postgres_uri,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_pre_ping=True,    # test connection before using, avoids stale connection errors
    echo=False,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_db():
    """Create all tables if they don't exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session and closes it after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()