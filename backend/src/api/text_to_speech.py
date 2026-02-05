"""
POST /functions/v1/text-to-speech-karaoke
Text-to-speech with word-level timestamps for karaoke sync
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from src.services.elevenlabs_tts import ElevenLabsTTSService
from src.services.whisper_stt import WhisperSTTService
from src.config import get_settings


router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    chatType: str = "assistant"  # assistant, user, system
    voice: Optional[str] = None  # voice override


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float


class TTSResponse(BaseModel):
    audioBase64: str
    audioMimeType: str
    words: List[WordTimestamp]
    duration: float


@router.post("/text-to-speech-karaoke", response_model=TTSResponse)
async def text_to_speech_karaoke(request: TTSRequest):
    """
    Generate speech from text with word-level timestamps.

    Uses ElevenLabs with native timestamps when available,
    falls back to OpenAI TTS + Whisper re-alignment.
    """
    settings = get_settings()

    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        if settings.tts_provider == "elevenlabs" and settings.elevenlabs_api_key:
            # Primary: ElevenLabs with native timestamps
            tts_service = ElevenLabsTTSService(
                api_key=settings.elevenlabs_api_key,
                voice_id=request.voice or settings.elevenlabs_voice_id,
                model_id=settings.elevenlabs_model_id
            )
            result = await tts_service.synthesize_with_timestamps(request.text)

            return TTSResponse(
                audioBase64=result["audio_base64"],
                audioMimeType="audio/mpeg",
                words=[WordTimestamp(**w) for w in result["words"]],
                duration=result["duration"]
            )

        elif settings.openai_api_key:
            # Fallback: OpenAI TTS + Whisper re-alignment
            # This adds latency but works as backup
            raise HTTPException(
                status_code=501,
                detail="OpenAI TTS fallback not yet implemented"
            )

        else:
            raise HTTPException(
                status_code=500,
                detail="No TTS provider configured"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
