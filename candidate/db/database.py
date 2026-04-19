"""
Database Proxy — redirects to unified app/db/database.
"""
from app.db.database import get_db, SessionLocal, engine, init_db