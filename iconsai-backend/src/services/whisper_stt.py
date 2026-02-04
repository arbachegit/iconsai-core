"""
OpenAI Whisper Speech-to-Text Service.
Provides transcription with optional word-level timestamps.
"""

import logging
from dataclasses import dataclass
from typing import List, Optional

import httpx

from ..config import get_settings
from .timestamp_utils import WordTimestamp

logger = logging.getLogger(__name__)


@dataclass
class TranscriptionResult:
    """Result from speech-to-text transcription."""
    text: str
    words: Optional[List[WordTimestamp]] = None
    duration: Optional[float] = None
    language: str = "pt"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        result = {"text": self.text}

        if self.words:
            result["words"] = [w.to_dict() for w in self.words]

        if self.duration is not None:
            result["duration"] = self.duration

        return result


class WhisperSTTService:
    """
    OpenAI Whisper Speech-to-Text service.

    Provides:
    - Basic transcription
    - Word-level timestamps for karaoke sync
    """

    WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions"

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Whisper STT service.

        Args:
            api_key: OpenAI API key. If None, uses settings.
        """
        self.settings = get_settings()
        self.api_key = api_key or self.settings.openai_api_key

        if not self.api_key:
            raise ValueError("OpenAI API key is required for Whisper STT")

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "audio.webm",
        mime_type: str = "audio/webm",
        language: str = "pt",
        include_word_timestamps: bool = False,
        prompt: Optional[str] = None
    ) -> TranscriptionResult:
        """
        Transcribe audio to text using OpenAI Whisper.

        Args:
            audio_bytes: Raw audio data
            filename: Filename with extension (helps Whisper detect format)
            mime_type: MIME type of audio
            language: Language code (default: pt for Portuguese)
            include_word_timestamps: Whether to include word-level timing
            prompt: Optional prompt to guide transcription

        Returns:
            TranscriptionResult with text and optional word timestamps

        Raises:
            httpx.HTTPStatusError: On API errors
            ValueError: On invalid input
        """
        if len(audio_bytes) < 1000:
            raise ValueError("Audio too short. Please record longer.")

        logger.info(
            f"[Whisper] Transcribing audio: {len(audio_bytes)} bytes, "
            f"format={mime_type}, lang={language}, timestamps={include_word_timestamps}"
        )

        # Prepare form data
        files = {
            "file": (filename, audio_bytes, mime_type),
        }

        data = {
            "model": "whisper-1",
            "language": language,
        }

        if prompt:
            data["prompt"] = prompt
        else:
            data["prompt"] = "Transcrição em português brasileiro."

        # Request word timestamps if needed
        if include_word_timestamps:
            data["response_format"] = "verbose_json"
            data["timestamp_granularities[]"] = "word"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.WHISPER_URL,
                headers={"Authorization": f"Bearer {self.api_key}"},
                files=files,
                data=data
            )

            # Handle errors
            if response.status_code == 400:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error", {}).get("message", "")

                if "too short" in error_msg.lower():
                    raise ValueError("Audio too short. Please record longer.")

                raise ValueError(f"Bad request: {error_msg}")

            if response.status_code == 401:
                raise ValueError("Invalid API key for transcription service")

            if response.status_code == 429:
                raise ValueError("Too many requests. Please wait a moment.")

            response.raise_for_status()

            result = response.json()

        # Parse response
        text = result.get("text", "").strip()

        if not text:
            raise ValueError("Could not understand audio. Please speak more clearly.")

        logger.info(f"[Whisper] Transcription complete: {text[:50]}...")

        # Extract word timestamps if present
        words = None
        if include_word_timestamps and "words" in result:
            words = [
                WordTimestamp(
                    word=w["word"],
                    start=w["start"],
                    end=w["end"]
                )
                for w in result["words"]
            ]
            logger.info(f"[Whisper] Found {len(words)} words with timestamps")

        return TranscriptionResult(
            text=text,
            words=words,
            duration=result.get("duration"),
            language=language
        )

    async def transcribe_with_fallback(
        self,
        audio_bytes: bytes,
        mime_type: str = "audio/webm",
        language: str = "pt",
        include_word_timestamps: bool = False
    ) -> TranscriptionResult:
        """
        Transcribe with format fallback on failure.

        If the initial format fails, tries alternative formats
        (ogg, m4a, mp3) which may work better with some audio.

        Args:
            audio_bytes: Raw audio data
            mime_type: Initial MIME type
            language: Language code
            include_word_timestamps: Include word timing

        Returns:
            TranscriptionResult
        """
        # Map MIME to extension
        mime_to_ext = {
            "audio/webm": "webm",
            "audio/mp4": "m4a",
            "audio/m4a": "m4a",
            "audio/mpeg": "mp3",
            "audio/mp3": "mp3",
            "audio/ogg": "ogg",
            "audio/wav": "wav",
            "audio/flac": "flac",
        }

        base_mime = mime_type.split(";")[0].strip().lower()
        extension = mime_to_ext.get(base_mime, "webm")

        # Try primary format
        try:
            return await self.transcribe(
                audio_bytes=audio_bytes,
                filename=f"audio.{extension}",
                mime_type=base_mime,
                language=language,
                include_word_timestamps=include_word_timestamps
            )
        except ValueError:
            # Re-raise user-facing errors
            raise
        except Exception as e:
            logger.warning(f"[Whisper] Primary format {extension} failed: {e}")

        # Fallback formats
        fallbacks = [
            ("audio/ogg", "ogg"),
            ("audio/mp4", "m4a"),
            ("audio/mpeg", "mp3"),
        ]

        for fallback_mime, fallback_ext in fallbacks:
            if fallback_mime == base_mime:
                continue

            try:
                logger.info(f"[Whisper] Trying fallback format: {fallback_ext}")
                return await self.transcribe(
                    audio_bytes=audio_bytes,
                    filename=f"audio.{fallback_ext}",
                    mime_type=fallback_mime,
                    language=language,
                    include_word_timestamps=include_word_timestamps
                )
            except Exception as fallback_error:
                logger.warning(f"[Whisper] Fallback {fallback_ext} failed: {fallback_error}")

        raise ValueError("Unsupported audio format. Please try recording again.")
