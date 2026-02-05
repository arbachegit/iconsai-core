"""
POST /functions/v1/voice-to-text
Speech-to-text using OpenAI Whisper with word-level timestamps
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List
import tempfile
import os

from src.services.whisper_stt import WhisperSTTService
from src.config import get_settings


router = APIRouter()


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float


class VoiceToTextResponse(BaseModel):
    text: str
    words: List[WordTimestamp]
    duration: float


@router.post("/voice-to-text", response_model=VoiceToTextResponse)
async def voice_to_text(audio: UploadFile = File(...)):
    """
    Transcribe audio to text with word-level timestamps.

    Accepts: webm, wav, mp3, m4a, ogg
    Returns: text, words with timestamps, duration
    """
    settings = get_settings()

    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    # Validate file type
    allowed_types = ["audio/webm", "audio/wav", "audio/mpeg", "audio/mp3",
                     "audio/mp4", "audio/m4a", "audio/ogg", "audio/x-m4a"]

    content_type = audio.content_type or ""
    if not any(t in content_type for t in ["audio", "webm", "wav", "mp3", "m4a", "ogg"]):
        # Be lenient - try anyway
        pass

    # Save to temp file (Whisper needs a file path)
    suffix = ".webm"
    if "wav" in content_type:
        suffix = ".wav"
    elif "mp3" in content_type or "mpeg" in content_type:
        suffix = ".mp3"
    elif "m4a" in content_type or "mp4" in content_type:
        suffix = ".m4a"

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Transcribe with Whisper
        stt_service = WhisperSTTService(settings.openai_api_key)
        result = await stt_service.transcribe_with_timestamps(tmp_path)

        return VoiceToTextResponse(
            text=result["text"],
            words=[WordTimestamp(**w) for w in result["words"]],
            duration=result["duration"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Cleanup temp file
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass
