"""
Centralized Configuration — reads all settings from .env file.
No hardcoded values. Every parameter is overridable.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field


# Resolve project root (data_extraction/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    """All configurable parameters for the pipeline."""

    # --- LLM (Gemini) ---
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    gemini_model: str = Field(default="gemini-2.0-flash", description="Gemini model name")

    groq_api_key: str = Field(default="", description="Groq API key")
    llm_model: str = Field(default="llama-3.3-70b-versatile", description="Groq LLM model")


    # --- Embeddings ---
    embedding_provider: str = Field(default="huggingface", description="Embedding provider: 'huggingface' or 'openai'")
    openai_api_key: str = Field(default="", description="OpenAI API key (only needed if provider=openai)")
    embedding_model: str = Field(default="BAAI/bge-base-en-v1.5", description="Embedding model name")
    embedding_dimensions: int = Field(default=768, description="Embedding vector dimensions")
    hf_device: str = Field(default="cpu", description="Device for HuggingFace model: 'cpu', 'cuda', 'mps'")
    hf_token: str = Field(default="", description="HuggingFace token (needed for gated models only)")
    # --- PostgreSQL ---
    postgres_uri: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/data_extraction",
        description="PostgreSQL connection URI"
    )

    # --- MongoDB ---
    mongo_uri: str = Field(default="mongodb://localhost:27017", description="MongoDB connection URI")
    mongo_db_name: str = Field(default="data_extraction", description="MongoDB database name")

    # --- ChromaDB ---
    chroma_persist_dir: str = Field(default="./chroma_db", description="ChromaDB persistence directory")
    chroma_collection_name: str = Field(
        default="document_embeddings",
        description="ChromaDB collection name"
    )

    # --- Processing ---
    max_workers: int = Field(default=2, description="Max parallel workers for extraction")
    log_level: str = Field(default="INFO", description="Logging level")

    # --- Input ---
    default_input_path: str = Field(default="../sample docs", description="Default input directory")
    
    upload_dir: str = Field(default="./uploads", description="Resume upload directory")


    class Config:
        env_file = str(ENV_FILE)
        env_file_encoding = "utf-8"
        case_sensitive = False


# Singleton instance
settings = Settings()
