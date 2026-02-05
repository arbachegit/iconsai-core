"""
Configuration settings via pydantic-settings
"""

from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # API Keys
    openai_api_key: str = ""
    elevenlabs_api_key: str = ""

    # ElevenLabs Config
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel - default
    elevenlabs_model_id: str = "eleven_turbo_v2_5"

    # Server
    port: int = 8000
    host: str = "0.0.0.0"
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Feature Flags
    tts_provider: str = "elevenlabs"  # "elevenlabs" or "openai"

    # Whisper Config
    whisper_model: str = "whisper-1"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
