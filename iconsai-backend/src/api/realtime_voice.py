"""
Real-time Voice API - WebSocket endpoint for streaming transcription

This module provides WebSocket endpoints for real-time speech-to-text
with live word-level timestamps for karaoke synchronization.

Endpoints:
- WS /functions/v1/realtime-stt - Real-time transcription stream

Protocol:
1. Client connects to WebSocket
2. Client sends audio chunks (binary WebM/PCM)
3. Server sends JSON events (partial/final transcriptions)
4. Client closes connection to end session

Version: 1.0.0
"""

import asyncio
import base64
import json
import logging
import time
from typing import Optional, Dict, Any
from dataclasses import dataclass
import io

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse

from ..services.realtime_stt import (
    get_realtime_stt_service,
    TranscriptionEvent,
    TranscriptionStatus,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@dataclass
class SessionState:
    """State for a WebSocket session."""
    session_id: str
    start_time: float
    language: str
    sample_rate: int
    audio_format: str
    total_audio_bytes: int = 0
    total_transcriptions: int = 0
    is_active: bool = True


class AudioConverter:
    """
    Utility class to convert various audio formats to raw PCM.
    """

    @staticmethod
    async def webm_to_pcm(webm_data: bytes, target_sample_rate: int = 16000) -> bytes:
        """
        Convert WebM/Opus audio to raw PCM.

        Args:
            webm_data: WebM audio data
            target_sample_rate: Target sample rate for output

        Returns:
            Raw PCM audio data (16-bit signed, mono)
        """
        try:
            from pydub import AudioSegment

            # Load WebM audio
            audio = AudioSegment.from_file(io.BytesIO(webm_data), format="webm")

            # Convert to mono, 16-bit, target sample rate
            audio = audio.set_channels(1)
            audio = audio.set_sample_width(2)  # 16-bit
            audio = audio.set_frame_rate(target_sample_rate)

            return audio.raw_data

        except Exception as e:
            logger.error(f"Audio conversion failed: {e}")
            raise ValueError(f"Failed to convert audio: {e}")

    @staticmethod
    async def base64_to_bytes(base64_data: str) -> bytes:
        """Decode base64 audio data."""
        try:
            return base64.b64decode(base64_data)
        except Exception as e:
            raise ValueError(f"Invalid base64 data: {e}")


@router.websocket("/functions/v1/realtime-stt")
async def realtime_stt_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time speech-to-text.

    Client Protocol:
    1. Connect to WebSocket
    2. Send configuration message (JSON):
       {"type": "config", "language": "pt", "sampleRate": 16000, "format": "webm"}
    3. Send audio chunks (binary or base64 JSON):
       Binary: raw audio bytes
       JSON: {"type": "audio", "data": "<base64>"}
    4. Receive transcription events (JSON):
       {"status": "partial|final", "text": "...", "words": [...]}
    5. Send end message to close:
       {"type": "end"}

    Server Events:
    - listening: Ready to receive audio
    - speech_start: Speech detected
    - partial: Partial transcription (while speaking)
    - final: Final transcription (end of speech segment)
    - end: Session ended
    - error: Error occurred
    """
    await websocket.accept()

    session = SessionState(
        session_id=f"rt-{int(time.time() * 1000)}",
        start_time=time.time(),
        language="pt",
        sample_rate=16000,
        audio_format="webm",
    )

    logger.info(f"[{session.session_id}] WebSocket connected")

    # Get STT service
    stt_service = get_realtime_stt_service(
        model_size="base",  # Use base for real-time (good balance)
        language=session.language,
    )

    # Audio buffer for accumulating chunks
    audio_buffer = bytearray()
    min_process_bytes = session.sample_rate * 2 * 1  # 1 second of audio minimum

    try:
        # Send initial status
        await websocket.send_json({
            "status": "listening",
            "sessionId": session.session_id,
            "message": "Ready for audio",
        })

        while session.is_active:
            try:
                # Receive message (can be binary or text)
                message = await asyncio.wait_for(
                    websocket.receive(),
                    timeout=30.0,  # 30 second timeout
                )

                if message.get("type") == "websocket.disconnect":
                    break

                # Handle binary audio data
                if "bytes" in message:
                    audio_data = message["bytes"]
                    session.total_audio_bytes += len(audio_data)

                    # Convert to PCM if needed
                    if session.audio_format in ["webm", "opus"]:
                        try:
                            pcm_data = await AudioConverter.webm_to_pcm(
                                audio_data,
                                target_sample_rate=session.sample_rate,
                            )
                            audio_buffer.extend(pcm_data)
                        except Exception as e:
                            logger.warning(f"[{session.session_id}] Audio conversion error: {e}")
                            continue
                    else:
                        # Assume raw PCM
                        audio_buffer.extend(audio_data)

                    # Process when we have enough audio
                    if len(audio_buffer) >= min_process_bytes:
                        event = await stt_service.transcribe_audio_chunk(
                            bytes(audio_buffer),
                            sample_rate=session.sample_rate,
                            include_timestamps=True,
                        )

                        if event.text:
                            session.total_transcriptions += 1
                            await websocket.send_json(event.to_dict())

                        # Keep last portion for context overlap
                        overlap_bytes = session.sample_rate * 2 // 4  # 0.25s overlap
                        audio_buffer = audio_buffer[-overlap_bytes:] if len(audio_buffer) > overlap_bytes else bytearray()

                # Handle text message (JSON)
                elif "text" in message:
                    try:
                        data = json.loads(message["text"])
                        msg_type = data.get("type", "")

                        if msg_type == "config":
                            # Update session configuration
                            session.language = data.get("language", session.language)
                            session.sample_rate = data.get("sampleRate", session.sample_rate)
                            session.audio_format = data.get("format", session.audio_format)

                            logger.info(f"[{session.session_id}] Config updated: lang={session.language}, rate={session.sample_rate}, format={session.audio_format}")

                            await websocket.send_json({
                                "status": "configured",
                                "config": {
                                    "language": session.language,
                                    "sampleRate": session.sample_rate,
                                    "format": session.audio_format,
                                },
                            })

                        elif msg_type == "audio":
                            # Base64 encoded audio
                            audio_b64 = data.get("data", "")
                            if audio_b64:
                                audio_data = await AudioConverter.base64_to_bytes(audio_b64)
                                session.total_audio_bytes += len(audio_data)

                                # Convert and buffer
                                if session.audio_format in ["webm", "opus"]:
                                    pcm_data = await AudioConverter.webm_to_pcm(
                                        audio_data,
                                        target_sample_rate=session.sample_rate,
                                    )
                                    audio_buffer.extend(pcm_data)
                                else:
                                    audio_buffer.extend(audio_data)

                        elif msg_type == "end":
                            logger.info(f"[{session.session_id}] Client requested end")
                            session.is_active = False

                        elif msg_type == "ping":
                            await websocket.send_json({"type": "pong", "timestamp": time.time()})

                    except json.JSONDecodeError:
                        logger.warning(f"[{session.session_id}] Invalid JSON received")

            except asyncio.TimeoutError:
                # Send keep-alive
                await websocket.send_json({"status": "listening", "keepalive": True})

    except WebSocketDisconnect:
        logger.info(f"[{session.session_id}] WebSocket disconnected")

    except Exception as e:
        logger.error(f"[{session.session_id}] WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "status": "error",
                "error": str(e),
            })
        except:
            pass

    finally:
        # Process any remaining audio
        if len(audio_buffer) > 0:
            try:
                event = await stt_service.transcribe_audio_chunk(
                    bytes(audio_buffer),
                    sample_rate=session.sample_rate,
                    include_timestamps=True,
                )
                if event.text:
                    event.status = TranscriptionStatus.FINAL
                    await websocket.send_json(event.to_dict())
            except:
                pass

        # Send end status
        try:
            duration = time.time() - session.start_time
            await websocket.send_json({
                "status": "end",
                "sessionId": session.session_id,
                "stats": {
                    "duration": round(duration, 2),
                    "totalAudioBytes": session.total_audio_bytes,
                    "totalTranscriptions": session.total_transcriptions,
                },
            })
        except:
            pass

        logger.info(
            f"[{session.session_id}] Session ended - "
            f"duration={time.time() - session.start_time:.1f}s, "
            f"audio={session.total_audio_bytes} bytes, "
            f"transcriptions={session.total_transcriptions}"
        )


@router.get("/functions/v1/realtime-stt/info")
async def realtime_stt_info():
    """
    Get information about the real-time STT service.

    Returns service status and configuration.
    """
    stt_service = get_realtime_stt_service()

    return {
        "service": "realtime-stt",
        "version": "1.0.0",
        "initialized": stt_service.is_initialized(),
        "config": {
            "modelSize": stt_service.model_size,
            "language": stt_service.language,
            "vadThreshold": stt_service.vad_threshold,
            "minSilenceDuration": stt_service.min_silence_duration,
        },
        "wsEndpoint": "/functions/v1/realtime-stt",
        "protocol": {
            "configMessage": {"type": "config", "language": "pt", "sampleRate": 16000, "format": "webm"},
            "audioMessage": "binary WebM/Opus or JSON {type: 'audio', data: '<base64>'}",
            "endMessage": {"type": "end"},
        },
    }


# Export router
realtime_voice_router = router
