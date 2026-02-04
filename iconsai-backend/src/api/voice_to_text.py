"""
Voice-to-Text API endpoint.
POST /functions/v1/voice-to-text

Compatible with existing Supabase Edge Function interface.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ..services.whisper_stt import WhisperSTTService
from ..utils.audio import decode_base64_audio, validate_and_normalize_mime

logger = logging.getLogger(__name__)

router = APIRouter()


class VoiceToTextRequest(BaseModel):
    """Request body for voice-to-text endpoint."""
    audio: str = Field(..., description="Base64 encoded audio data")
    mimeType: Optional[str] = Field(None, description="MIME type of audio")
    language: Optional[str] = Field("pt", description="Language code")
    includeWordTimestamps: Optional[bool] = Field(
        False,
        description="Include word-level timestamps for karaoke"
    )


class WordTimestampResponse(BaseModel):
    """Word with timing information."""
    word: str
    start: float
    end: float


class VoiceToTextResponse(BaseModel):
    """Response from voice-to-text endpoint."""
    text: str
    words: Optional[list[WordTimestampResponse]] = None
    duration: Optional[float] = None


class ErrorResponse(BaseModel):
    """Error response."""
    error: str


@router.post(
    "/functions/v1/voice-to-text",
    response_model=VoiceToTextResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        429: {"model": ErrorResponse, "description": "Rate limit"},
        500: {"model": ErrorResponse, "description": "Server error"},
    },
    summary="Transcribe audio to text",
    description="""
    Transcribe audio to text using OpenAI Whisper.

    Supports multiple audio formats: webm, mp3, wav, ogg, m4a, flac.

    When includeWordTimestamps is true, returns word-level timing
    for karaoke synchronization.
    """
)
async def voice_to_text(request: VoiceToTextRequest):
    """
    Transcribe audio to text.

    Maintains compatibility with existing Supabase Edge Function interface.
    """
    logger.info(
        f"[voice-to-text] Request: mimeType={request.mimeType}, "
        f"timestamps={request.includeWordTimestamps}"
    )

    try:
        # Decode base64 audio
        audio_bytes = decode_base64_audio(request.audio)

        if len(audio_bytes) < 1000:
            raise HTTPException(
                status_code=400,
                detail={"error": "Áudio muito curto. Grave por mais tempo."}
            )

        logger.info(f"[voice-to-text] Audio size: {len(audio_bytes)} bytes")

        # Validate and normalize MIME type
        mime_type, extension = validate_and_normalize_mime(
            request.mimeType,
            audio_bytes
        )

        logger.info(f"[voice-to-text] Format: {mime_type} (.{extension})")

        # Initialize STT service
        stt_service = WhisperSTTService()

        # Transcribe with fallback
        result = await stt_service.transcribe_with_fallback(
            audio_bytes=audio_bytes,
            mime_type=mime_type,
            language=request.language or "pt",
            include_word_timestamps=request.includeWordTimestamps or False
        )

        logger.info(f"[voice-to-text] Success: {result.text[:50]}...")

        # Build response
        response_data = {"text": result.text}

        if result.words:
            response_data["words"] = [
                {"word": w.word, "start": w.start, "end": w.end}
                for w in result.words
            ]

        if result.duration is not None:
            response_data["duration"] = result.duration

        return response_data

    except ValueError as e:
        # User-facing errors
        logger.warning(f"[voice-to-text] ValueError: {e}")
        raise HTTPException(status_code=400, detail={"error": str(e)})

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"[voice-to-text] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "Erro interno no servidor"}
        )
