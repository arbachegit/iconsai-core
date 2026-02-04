"""
Configuration module using pydantic-settings.
All settings are loaded from environment variables.
"""

from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # API Keys
    openai_api_key: str = ""
    elevenlabs_api_key: str = ""
    perplexity_api_key: str = ""
    gemini_api_key: str = ""

    # Supabase Config (for admin operations)
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # ElevenLabs Config
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel - good for PT-BR
    elevenlabs_model_id: str = "eleven_turbo_v2_5"

    # Server Config
    port: int = 8000
    host: str = "0.0.0.0"
    debug: bool = False

    # CORS - comma-separated string, converted to list
    cors_origins: str = "https://app.iconsai.com.br,https://core.iconsai.ai,https://iconsai.com.br,http://localhost:5173,http://localhost:3000"

    # Feature Flags
    tts_provider: str = "elevenlabs"  # elevenlabs or openai

    # Logging
    log_level: str = "INFO"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string to list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def has_elevenlabs(self) -> bool:
        """Check if ElevenLabs is configured."""
        return bool(self.elevenlabs_api_key)

    def has_openai(self) -> bool:
        """Check if OpenAI is configured."""
        return bool(self.openai_api_key)

    def has_perplexity(self) -> bool:
        """Check if Perplexity is configured."""
        return bool(self.perplexity_api_key)

    def has_gemini(self) -> bool:
        """Check if Gemini is configured."""
        return bool(self.gemini_api_key)

    def has_supabase(self) -> bool:
        """Check if Supabase is configured for admin operations."""
        return bool(self.supabase_url and self.supabase_service_role_key)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
