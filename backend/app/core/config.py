"""
Configuration - All settings from environment variables.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration from environment."""
    
    # Groq API
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    
    # Models (configurable via .env)
    LLM_MODEL = os.getenv("LLM_MODEL")
    VISION_MODEL = os.getenv("VISION_MODEL")
    WHISPER_MODEL = os.getenv("WHISPER_MODEL")
    
    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./onboardguard.db")
    
    # Upload directory
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")


config = Config()
