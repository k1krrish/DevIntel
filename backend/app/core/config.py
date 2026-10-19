from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "DevIntel V1"
    # Fallback to sqlite if DATABASE_URL is not provided
    DATABASE_URL: str = "sqlite+aiosqlite:///./devintel.db"
    
    # Qdrant configuration - if QDRANT_URL is not set, we'll use local disk mode
    QDRANT_URL: str | None = None
    QDRANT_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    
    # Storage for cloned repos
    REPOS_DIR: str = os.path.join(os.getcwd(), "data", "repos")
    QDRANT_LOCAL_DIR: str = os.path.join(os.getcwd(), "data", "qdrant")

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"), 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

settings = Settings()
