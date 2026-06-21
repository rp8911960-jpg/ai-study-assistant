import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PORT: int = 8000
    DATABASE_URL: str = "sqlite:///./data/sqlite.db"
    UPLOAD_DIR: str = "./data/uploads"
    VECTOR_INDEX_DIR: str = "./data/vector_indices"
    GEMINI_API_KEY: str = ""
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "ai_study_assistant_secret_key_dev_1234567890"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def create_directories(self):
        """Ensure upload and vector indices directories exist."""
        # Convert relative database path or other paths to absolute or relative under root
        # Make directories
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)
        os.makedirs(self.VECTOR_INDEX_DIR, exist_ok=True)
        
        # SQLite db directory setup
        if self.DATABASE_URL.startswith("sqlite:///"):
            db_path = self.DATABASE_URL.replace("sqlite:///", "")
            # If relative, get parent dir
            if db_path and not os.path.isabs(db_path):
                db_dir = os.path.dirname(db_path)
                if db_dir:
                    os.makedirs(db_dir, exist_ok=True)

settings = Settings()
settings.create_directories()
