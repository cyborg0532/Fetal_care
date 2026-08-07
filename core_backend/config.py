import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load defaults from .env, while preserving explicit runtime configuration.
# This lets local development select SQLite with DATABASE_URL.
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=False)

class Settings(BaseSettings):
    PROJECT_NAME: str = "MaternalCare Backend"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./maternalcare.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "maternalcare-secret-key-123456789")
    OVERPASS_API_URL: str = os.getenv("OVERPASS_API_URL", "https://overpass-api.de/api/interpreter")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    # Keep AI credentials on the server. Set this in backend/.env, never in Expo.
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # Cloud SMS Provider Credentials (Twilio)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")

    class Config:
        case_sensitive = True

settings = Settings()
