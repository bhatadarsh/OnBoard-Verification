"""
Authentication Routes - Google SSO Integration
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.config import config

router = APIRouter()


class GoogleTokenRequest(BaseModel):
    token: str


class UserResponse(BaseModel):
    email: str
    name: str
    picture: str
    verified: bool


@router.get("/google/config")
async def get_google_config():
    """Return Google OAuth client config for frontend."""
    if not config.GOOGLE_CLIENT_ID:
        return {
            "configured": False,
            "message": "Google OAuth not configured. Set GOOGLE_CLIENT_ID in .env"
        }
    
    return {
        "configured": True,
        "client_id": config.GOOGLE_CLIENT_ID
    }


@router.post("/google/verify", response_model=UserResponse)
async def verify_google_token(request: GoogleTokenRequest):
    """Verify Google ID token and return user info."""
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        
        idinfo = id_token.verify_oauth2_token(
            request.token,
            google_requests.Request(),
            config.GOOGLE_CLIENT_ID
        )
        
        if not idinfo.get('email_verified', False):
            raise HTTPException(status_code=400, detail="Email not verified")
        
        return UserResponse(
            email=idinfo.get('email', ''),
            name=idinfo.get('name', ''),
            picture=idinfo.get('picture', ''),
            verified=True
        )
    
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except ImportError:
        raise HTTPException(status_code=500, detail="google-auth library not installed")
