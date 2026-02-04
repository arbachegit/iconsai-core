"""
Text-to-Speech with Karaoke API endpoint.
POST /functions/v1/text-to-speech-karaoke

Uses ElevenLabs for native timestamps or OpenAI TTS + Whisper as fallback.
Compatible with existing Supabase Edge Function interface.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import get_settings
from ..services.elevenlabs_tts import ElevenLabsTTSService
from ..services.openai_tts import OpenAITTSService

logger = logging.getLogger(__name__)

router = APIRouter()


class TextToSpeechRequest(BaseModel):
    """Request body for TTS karaoke endpoint."""
    text: str = Field(..., description="Text to synthesize")
    chatType: Optional[str] = Field("home", description="Module type for voice style")
    voice: Optional[str] = Field("nova", description="Voice name")
    speed: Optional[float] = Field(1.0, description="Speech speed (0.5-2.0)")
    phoneticMapOverride: Optional[dict] = Field(
        None,
        description="Custom phonetic map for term pronunciation"
    )


class WordTimestampResponse(BaseModel):
    """Word with timing information."""
    word: str
    start: float
    end: float


class TextToSpeechResponse(BaseModel):
    """Response from TTS karaoke endpoint."""
    audioBase64: str
    audioMimeType: str = "audio/mpeg"
    words: Optional[list[WordTimestampResponse]] = None
    duration: Optional[float] = None
    text: str


class ErrorResponse(BaseModel):
    """Error response."""
    error: str


@router.post(
    "/functions/v1/text-to-speech-karaoke",
    response_model=TextToSpeechResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        429: {"model": ErrorResponse, "description": "Rate limit"},
        500: {"model": ErrorResponse, "description": "Server error"},
    },
    summary="Synthesize speech with word timestamps",
    description="""
    Generate speech audio with word-level timestamps for karaoke display.

    Primary: ElevenLabs with native character timestamps (converted to words)
    Fallback: OpenAI TTS + Whisper re-alignment

    ElevenLabs is preferred as it provides timestamps directly from synthesis,
    eliminating the ~1-2s latency of Whisper re-alignment.
    """
)
async def text_to_speech_karaoke(request: TextToSpeechRequest):
    """
    Synthesize text to speech with word timestamps.

    Maintains compatibility with existing Supabase Edge Function interface.
    """
    settings = get_settings()

    logger.info(
        f"[tts-karaoke] Request: {len(request.text)} chars, "
        f"voice={request.voice}, type={request.chatType}"
    )

    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=400,
            detail={"error": "Texto é obrigatório"}
        )

    if len(request.text) > 5000:
        raise HTTPException(
            status_code=400,
            detail={"error": "Texto muito longo. Máximo 5000 caracteres."}
        )

    try:
        # Try ElevenLabs first (preferred - native timestamps)
        if settings.has_elevenlabs() and settings.tts_provider == "elevenlabs":
            logger.info("[tts-karaoke] Using ElevenLabs (native timestamps)")

            try:
                tts_service = ElevenLabsTTSService()
                result = await tts_service.synthesize_with_timestamps(
                    text=request.text,
                    voice=request.voice,
                    phonetic_map=request.phoneticMapOverride,
                    speed=request.speed or 1.0
                )

                logger.info(
                    f"[tts-karaoke] ElevenLabs success: "
                    f"{len(result.words or [])} words, "
                    f"duration={result.duration}"
                )

                return result.to_dict()

            except Exception as e:
                logger.warning(f"[tts-karaoke] ElevenLabs failed: {e}")
                # Fall through to OpenAI

        # Fallback: OpenAI TTS + Whisper
        if settings.has_openai():
            logger.info("[tts-karaoke] Using OpenAI TTS + Whisper (fallback)")

            tts_service = OpenAITTSService()
            result = await tts_service.synthesize_with_timestamps(
                text=request.text,
                voice=request.voice,
                phonetic_map=request.phoneticMapOverride,
                speed=request.speed or 1.0,
                chat_type=request.chatType
            )

            logger.info(
                f"[tts-karaoke] OpenAI success: "
                f"{len(result.words or [])} words, "
                f"duration={result.duration}"
            )

            return result.to_dict()

        # No TTS service available
        raise HTTPException(
            status_code=500,
            detail={"error": "Nenhum serviço TTS disponível"}
        )

    except ValueError as e:
        logger.warning(f"[tts-karaoke] ValueError: {e}")
        raise HTTPException(status_code=400, detail={"error": str(e)})

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"[tts-karaoke] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "Erro ao gerar áudio"}
        )


# Also support the original text-to-speech endpoint (without karaoke)
@router.post(
    "/functions/v1/text-to-speech",
    response_model=TextToSpeechResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        500: {"model": ErrorResponse, "description": "Server error"},
    },
    summary="Synthesize speech (simple)",
    description="Generate speech audio without word timestamps."
)
async def text_to_speech_simple(request: TextToSpeechRequest):
    """
    Simple text-to-speech without timestamps.

    Faster than karaoke endpoint when timestamps aren't needed.
    """
    settings = get_settings()

    logger.info(f"[tts-simple] Request: {len(request.text)} chars")

    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=400,
            detail={"error": "Texto é obrigatório"}
        )

    try:
        if settings.has_elevenlabs():
            tts_service = ElevenLabsTTSService()
            result = await tts_service.synthesize_simple(
                text=request.text,
                voice=request.voice,
                phonetic_map=request.phoneticMapOverride
            )
        elif settings.has_openai():
            tts_service = OpenAITTSService()
            result = await tts_service.synthesize_simple(
                text=request.text,
                voice=request.voice,
                phonetic_map=request.phoneticMapOverride,
                chat_type=request.chatType
            )
        else:
            raise HTTPException(
                status_code=500,
                detail={"error": "Nenhum serviço TTS disponível"}
            )

        return result.to_dict()

    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": str(e)})

    except Exception as e:
        logger.error(f"[tts-simple] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "Erro ao gerar áudio"}
        )
