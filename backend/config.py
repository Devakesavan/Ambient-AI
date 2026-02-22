"""
Configuration for Ambient AI Healthcare backend.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = "change-me-in-production"
    database_url: str = "sqlite:///./ambient_ai.db"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    storage_path: str = "./storage"
    gemini_api_key: str = ""
    whisper_model: str = "base"  # "base"=faster, "small"=better Tamil/accuracy

    class Config:
        env_file = ".env"


settings = Settings()
