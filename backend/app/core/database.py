"""
Database Proxy — redirects to unified app/db/database and app/models/candidate.
"""
import sys
from pathlib import Path

# Ensure root is in path
root_dir = Path(__file__).resolve().parent.parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app.db.database import get_db, SessionLocal, engine, init_db
from app.models.candidate import Candidate
