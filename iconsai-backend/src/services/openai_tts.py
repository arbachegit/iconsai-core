"""
OpenAI Text-to-Speech Service with Whisper re-alignment.

This is the fallback TTS provider when ElevenLabs is unavailable.
Uses a two-step process:
1. Generate audio with OpenAI TTS (gpt-4o-mini-tts)
2. Transcribe the generated audio with Whisper to get word timestamps
"""

import base64
import logging
from dataclasses import dataclass
from typing import List, Optional

import httpx

from ..config import get_settings
from ..utils.text_normalizer import prepare_text_for_tts
from .timestamp_utils import WordTimestamp, align_words_to_text

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


class OpenAITTSService:
    """
    OpenAI Text-to-Speech service with Whisper timestamp extraction.

    This is a fallback for when ElevenLabs is unavailable.
    Uses gpt-4o-mini-tts for synthesis and whisper-1 for timestamp extraction.

    Note: This adds ~1-2s latency compared to ElevenLabs' native timestamps.
    """

    TTS_URL = "https://api.openai.com/v1/audio/speech"
    WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions"

    # Available voices for gpt-4o-mini-tts
    VOICES = [
        "alloy", "ash", "ballad", "coral", "echo",
        "fable", "onyx", "nova", "sage", "shimmer",
        "verse", "marin", "cedar"
    ]

    # Voice instructions per module for humanized speech
    VOICE_INSTRUCTIONS = {
        "default": """
Voice Affect: Warm, calm, and genuinely welcoming.
Tone: Conversational with Brazilian Portuguese warmth.
Pacing: Natural and unhurried with organic rhythm.
Emotion: Subtly expressive with genuine warmth.
        """.strip(),

        "health": """
Voice Affect: Warm, caring, and gently reassuring.
Tone: Compassionate and supportive with calm confidence.
Pacing: Calm and unhurried, creating safety.
Emotion: Deeply empathetic with subtle warmth.
        """.strip(),

        "ideas": """
Voice Affect: Enthusiastic, curious, and energized.
Tone: Playful yet thoughtful, encouraging exploration.
Pacing: Dynamic - speeds up with excitement.
Emotion: Openly enthusiastic and curious.
        """.strip(),

        "world": """
Voice Affect: Knowledgeable, clear, and engaging.
Tone: Educational but never condescending.
Pacing: Steady with natural pauses between points.
Emotion: Curious and genuinely interested.
        """.strip(),

        "help": """
Voice Affect: Warm, friendly, and helpful.
Tone: Approachable like a knowledgeable friend.
Pacing: Natural rhythm with patient explanations.
Emotion: Genuinely interested and engaged.
        """.strip(),
    }

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize OpenAI TTS service.

        Args:
            api_key: OpenAI API key. If None, uses settings.
        """
        self.settings = get_settings()
        self.api_key = api_key or self.settings.openai_api_key

        if not self.api_key:
            raise ValueError("OpenAI API key is required")

    def _get_voice(self, voice_name: Optional[str] = None) -> str:
        """Get valid voice name."""
        if voice_name and voice_name.lower() in self.VOICES:
            return voice_name.lower()
        return "nova"  # Good default for PT-BR

    def _get_instructions(self, chat_type: Optional[str] = None) -> str:
        """Get voice instructions for module type."""
        if chat_type and chat_type in self.VOICE_INSTRUCTIONS:
            return self.VOICE_INSTRUCTIONS[chat_type]
        return self.VOICE_INSTRUCTIONS["default"]

    async def _generate_audio(
        self,
        text: str,
        voice: str,
        speed: float = 1.0,
        chat_type: Optional[str] = None
    ) -> bytes:
        """
        Generate audio using OpenAI TTS.

        Args:
            text: Text to synthesize
            voice: Voice name
            speed: Speech speed multiplier
            chat_type: Module type for voice instructions

        Returns:
            Raw audio bytes (MP3)
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "gpt-4o-mini-tts",
            "input": text,
            "voice": voice,
            "response_format": "mp3",
            "speed": speed,
        }

        # Add voice instructions for humanization
        instructions = self._get_instructions(chat_type)
        if instructions:
            payload["instructions"] = instructions

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.TTS_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            return response.content

    async def _get_word_timestamps(
        self,
        audio_bytes: bytes,
        language: str = "pt"
    ) -> tuple[List[WordTimestamp], float]:
        """
        Extract word timestamps using Whisper.

        Args:
            audio_bytes: MP3 audio data
            language: Language code

        Returns:
            Tuple of (word timestamps, duration)
        """
        files = {
            "file": ("audio.mp3", audio_bytes, "audio/mpeg"),
        }

        data = {
            "model": "whisper-1",
            "language": language,
            "response_format": "verbose_json",
            "timestamp_granularities[]": "word",
            "prompt": "Transcrição em português brasileiro.",
        }

        headers = {"Authorization": f"Bearer {self.api_key}"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.WHISPER_URL,
                headers=headers,
                files=files,
                data=data
            )
            response.raise_for_status()
            result = response.json()

        words = [
            WordTimestamp(
                word=w["word"],
                start=w["start"],
                end=w["end"]
            )
            for w in result.get("words", [])
        ]

        duration = result.get("duration", 0)

        return words, duration

    async def synthesize_with_timestamps(
        self,
        text: str,
        voice: Optional[str] = None,
        phonetic_map: Optional[dict] = None,
        speed: float = 1.0,
        chat_type: Optional[str] = None
    ) -> TTSResult:
        """
        Synthesize speech with word timestamps via Whisper re-alignment.

        Args:
            text: Text to synthesize
            voice: Voice name
            phonetic_map: Optional phonetic substitution map
            speed: Speech speed multiplier
            chat_type: Module type for voice customization

        Returns:
            TTSResult with audio and word timestamps
        """
        if not text or not text.strip():
            raise ValueError("Text is required")

        max_length = 5000
        if len(text) > max_length:
            raise ValueError(f"Text too long. Maximum {max_length} characters.")

        # Prepare text
        normalized_text = prepare_text_for_tts(text, phonetic_map)
        voice_name = self._get_voice(voice)

        logger.info(
            f"[OpenAI-TTS] Synthesizing: {len(normalized_text)} chars, "
            f"voice={voice_name}, type={chat_type}"
        )

        # Step 1: Generate audio
        try:
            audio_bytes = await self._generate_audio(
                text=normalized_text,
                voice=voice_name,
                speed=speed,
                chat_type=chat_type
            )
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                raise ValueError("Rate limit exceeded. Please wait.")
            raise

        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        logger.info(f"[OpenAI-TTS] Audio generated: {len(audio_bytes)} bytes")

        # Step 2: Get word timestamps via Whisper
        try:
            words, duration = await self._get_word_timestamps(audio_bytes)
            logger.info(f"[OpenAI-TTS] Got {len(words)} words, duration={duration:.2f}s")

            # Align transcribed words to original text
            if words:
                words = align_words_to_text(text, words)

        except Exception as e:
            logger.warning(f"[OpenAI-TTS] Whisper timestamp extraction failed: {e}")
            words = None
            duration = None

        return TTSResult(
            audio_base64=audio_base64,
            audio_mime_type="audio/mpeg",
            words=words,
            duration=duration,
            text=text,
        )

    async def synthesize_simple(
        self,
        text: str,
        voice: Optional[str] = None,
        phonetic_map: Optional[dict] = None,
        chat_type: Optional[str] = None
    ) -> TTSResult:
        """
        Simple synthesis without timestamps (faster).

        Args:
            text: Text to synthesize
            voice: Voice name
            phonetic_map: Optional phonetic map
            chat_type: Module type

        Returns:
            TTSResult with audio only
        """
        normalized_text = prepare_text_for_tts(text, phonetic_map)
        voice_name = self._get_voice(voice)

        audio_bytes = await self._generate_audio(
            text=normalized_text,
            voice=voice_name,
            chat_type=chat_type
        )

        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        return TTSResult(
            audio_base64=audio_base64,
            audio_mime_type="audio/mpeg",
            words=None,
            duration=None,
            text=text,
        )
