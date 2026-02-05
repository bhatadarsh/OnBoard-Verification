from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # JWT Settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS Settings
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173"]
    
    # Azure Settings
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    
    class Config:
        env_file = "../.env"
        extra = "ignore"

settings = Settings()
