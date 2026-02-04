"""
ElevenLabs Text-to-Speech Service with native timestamps.
This is the preferred TTS provider as it provides character-level timestamps
directly, eliminating the need for Whisper re-alignment.
"""

import logging
from dataclasses import dataclass
from typing import List, Optional

import httpx

from ..config import get_settings
from ..utils.text_normalizer import prepare_text_for_tts
from .timestamp_utils import WordTimestamp, chars_to_words

logger = logging.getLogger(__name__)


@dataclass
class TTSResult:
    """Result from text-to-speech synthesis."""
    audio_base64: str
    audio_mime_type: str = "audio/mpeg"
    words: Optional[List[WordTimestamp]] = None
    duration: Optional[float] = None
    text: str = ""

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            "audioBase64": self.audio_base64,
            "audioMimeType": self.audio_mime_type,
            "words": [w.to_dict() for w in self.words] if self.words else None,
            "duration": self.duration,
            "text": self.text,
        }


class ElevenLabsTTSService:
    """
    ElevenLabs Text-to-Speech service with native timestamps.

    Key advantage over OpenAI TTS:
    - Returns character-level timestamps directly from synthesis
    - No need for Whisper re-alignment (saves ~1-2s latency)
    - Higher quality voice with better PT-BR support

    Uses the `/text-to-speech/{voice_id}/with-timestamps` endpoint.
    """

    BASE_URL = "https://api.elevenlabs.io/v1"

    # Voice IDs for different use cases
    VOICES = {
        "default": "21m00Tcm4TlvDq8ikWAM",  # Rachel - good for PT-BR
        "nova": "21m00Tcm4TlvDq8ikWAM",  # Map OpenAI voice name
        "alloy": "pNInz6obpgDQGcFmaJgB",  # Adam
        "shimmer": "MF3mGyEYCl7XYWbV9V6O",  # Elli
        "echo": "VR6AewLTigWG4xSOukaG",  # Arnold
        "fable": "jsCqWAovK2LkecY7zXl4",  # Callum
        "onyx": "ODq5zmih8GrVes37Dizd",  # Patrick
    }

    def __init__(
        self,
        api_key: Optional[str] = None,
        voice_id: Optional[str] = None,
        model_id: Optional[str] = None
    ):
        """
        Initialize ElevenLabs TTS service.

        Args:
            api_key: ElevenLabs API key. If None, uses settings.
            voice_id: Voice ID to use. If None, uses settings.
            model_id: Model ID. If None, uses settings (eleven_turbo_v2_5).
        """
        self.settings = get_settings()
        self.api_key = api_key or self.settings.elevenlabs_api_key
        self.voice_id = voice_id or self.settings.elevenlabs_voice_id
        self.model_id = model_id or self.settings.elevenlabs_model_id

        if not self.api_key:
            raise ValueError("ElevenLabs API key is required")

    def _get_voice_id(self, voice_name: Optional[str] = None) -> str:
        """Get voice ID from name or return default."""
        if not voice_name:
            return self.voice_id

        # Check if it's already a voice ID (starts with specific pattern)
        if len(voice_name) > 15:  # ElevenLabs IDs are ~20 chars
            return voice_name

        return self.VOICES.get(voice_name.lower(), self.voice_id)

    async def synthesize_with_timestamps(
        self,
        text: str,
        voice: Optional[str] = None,
        phonetic_map: Optional[dict] = None,
        stability: float = 0.5,
        similarity_boost: float = 0.75,
        style: float = 0.0,
        speed: float = 1.0
    ) -> TTSResult:
        """
        Synthesize speech with native character-level timestamps.

        Args:
            text: Text to synthesize
            voice: Voice name or ID
            phonetic_map: Optional phonetic substitution map
            stability: Voice stability (0-1)
            similarity_boost: Voice similarity (0-1)
            style: Style exaggeration (0-1)
            speed: Speech speed multiplier

        Returns:
            TTSResult with audio and word timestamps

        Raises:
            httpx.HTTPStatusError: On API errors
            ValueError: On invalid input
        """
        if not text or not text.strip():
            raise ValueError("Text is required")

        # Limit text length
        max_length = 5000
        if len(text) > max_length:
            raise ValueError(f"Text too long. Maximum {max_length} characters.")

        # Prepare text with phonetic normalization
        normalized_text = prepare_text_for_tts(text, phonetic_map)

        logger.info(
            f"[ElevenLabs] Synthesizing: {len(normalized_text)} chars, "
            f"voice={voice or 'default'}"
        )
        logger.debug(f"[ElevenLabs] Normalized text: {normalized_text[:100]}...")

        voice_id = self._get_voice_id(voice)
        url = f"{self.BASE_URL}/text-to-speech/{voice_id}/with-timestamps"

        payload = {
            "text": normalized_text,
            "model_id": self.model_id,
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost,
                "style": style,
            }
        }

        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)

            if response.status_code == 401:
                raise ValueError("Invalid ElevenLabs API key")

            if response.status_code == 429:
                raise ValueError("Rate limit exceeded. Please wait.")

            if response.status_code == 400:
                error = response.json() if response.content else {}
                raise ValueError(f"Bad request: {error.get('detail', 'Unknown error')}")

            response.raise_for_status()
            data = response.json()

        # Extract audio and alignment
        audio_base64 = data.get("audio_base64", "")
        alignment = data.get("alignment", {})

        characters = alignment.get("characters", [])
        char_starts = alignment.get("character_start_times_seconds", [])
        char_ends = alignment.get("character_end_times_seconds", [])

        # Convert character timestamps to word timestamps
        words = chars_to_words(normalized_text, characters, char_starts, char_ends)

        # Calculate duration from last word
        duration = words[-1].end if words else None

        logger.info(
            f"[ElevenLabs] Synthesis complete: {len(words)} words, "
            f"duration={duration:.2f}s" if duration else "[ElevenLabs] Synthesis complete"
        )

        return TTSResult(
            audio_base64=audio_base64,
            audio_mime_type="audio/mpeg",
            words=words,
            duration=duration,
            text=text,  # Return original text, not normalized
        )

    async def synthesize_simple(
        self,
        text: str,
        voice: Optional[str] = None,
        phonetic_map: Optional[dict] = None
    ) -> TTSResult:
        """
        Simple synthesis without timestamps (faster).

        Use when timestamps are not needed.

        Args:
            text: Text to synthesize
            voice: Voice name or ID
            phonetic_map: Optional phonetic map

        Returns:
            TTSResult with audio only (no timestamps)
        """
        if not text or not text.strip():
            raise ValueError("Text is required")

        normalized_text = prepare_text_for_tts(text, phonetic_map)
        voice_id = self._get_voice_id(voice)
        url = f"{self.BASE_URL}/text-to-speech/{voice_id}"

        payload = {
            "text": normalized_text,
            "model_id": self.model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            }
        }

        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()

            import base64
            audio_base64 = base64.b64encode(response.content).decode("utf-8")

        return TTSResult(
            audio_base64=audio_base64,
            audio_mime_type="audio/mpeg",
            words=None,
            duration=None,
            text=text,
        )


async def test_elevenlabs():
    """Quick test of ElevenLabs service."""
    service = ElevenLabsTTSService()
    result = await service.synthesize_with_timestamps(
        "Olá, como posso ajudar você hoje?"
    )
    print(f"Got {len(result.words or [])} words")
    for w in (result.words or [])[:5]:
        print(f"  {w.word}: {w.start:.2f}-{w.end:.2f}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_elevenlabs())
