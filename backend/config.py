from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # JWT Settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS Settings
    CORS_ORIGINS: list = ["*"]
    
    # Azure Settings
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    
    # Azure OpenAI Settings
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_API_VERSION: str = "2023-05-15"
    AZURE_OPENAI_DEPLOYMENT_NAME: str = ""
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
