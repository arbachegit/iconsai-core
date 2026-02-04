"""
Real-time Speech-to-Text Service using Faster-Whisper

This service provides real-time transcription with word-level timestamps,
optimized for streaming audio input via WebSocket.

Features:
- Uses Faster-Whisper (CTranslate2) for fast inference
- Voice Activity Detection (VAD) to detect speech segments
- Partial transcriptions as user speaks
- Word-level timestamps for karaoke sync
- Buffer management for continuous streaming

Version: 1.0.0
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import AsyncGenerator, Callable, Optional, List, Dict, Any
from enum import Enum
import io
import wave
import tempfile
import os

logger = logging.getLogger(__name__)


class TranscriptionStatus(str, Enum):
    """Status of transcription events."""
    LISTENING = "listening"       # Waiting for speech
    SPEECH_START = "speech_start" # Speech detected
    PARTIAL = "partial"           # Partial transcription
    FINAL = "final"               # Final transcription for segment
    END = "end"                   # Stream ended
    ERROR = "error"               # Error occurred


@dataclass
class WordTiming:
    """Word with timing information."""
    word: str
    start: float
    end: float


@dataclass
class TranscriptionEvent:
    """Event emitted during transcription."""
    status: TranscriptionStatus
    text: str = ""
    words: List[WordTiming] = field(default_factory=list)
    confidence: float = 0.0
    timestamp: float = field(default_factory=time.time)
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "status": self.status.value,
            "text": self.text,
            "words": [{"word": w.word, "start": w.start, "end": w.end} for w in self.words],
            "confidence": self.confidence,
            "timestamp": self.timestamp,
            "error": self.error,
        }


class RealtimeSTTService:
    """
    Real-time Speech-to-Text service using Faster-Whisper.

    Designed for WebSocket streaming where audio chunks arrive continuously.
    Emits partial transcriptions as the user speaks for live karaoke effect.
    """

    def __init__(
        self,
        model_size: str = "base",
        language: str = "pt",
        device: str = "auto",
        compute_type: str = "auto",
        vad_threshold: float = 0.5,
        min_silence_duration: float = 0.5,
        chunk_duration: float = 0.5,
    ):
        """
        Initialize the real-time STT service.

        Args:
            model_size: Whisper model size (tiny, base, small, medium, large-v2, large-v3)
            language: Target language code (pt for Portuguese)
            device: Device to use (auto, cpu, cuda)
            compute_type: Compute type (auto, int8, float16, float32)
            vad_threshold: Voice activity detection threshold
            min_silence_duration: Minimum silence to consider end of speech
            chunk_duration: Duration of audio chunks to process
        """
        self.model_size = model_size
        self.language = language
        self.device = device
        self.compute_type = compute_type
        self.vad_threshold = vad_threshold
        self.min_silence_duration = min_silence_duration
        self.chunk_duration = chunk_duration

        self._model = None
        self._vad_model = None
        self._is_initialized = False

    async def initialize(self):
        """
        Initialize the Whisper model and VAD.

        Called lazily on first use or explicitly.
        """
        if self._is_initialized:
            return

        logger.info(f"Initializing Faster-Whisper model: {self.model_size}")

        try:
            from faster_whisper import WhisperModel

            # Determine device and compute type
            device = self.device
            compute_type = self.compute_type

            if device == "auto":
                try:
                    import torch
                    device = "cuda" if torch.cuda.is_available() else "cpu"
                except ImportError:
                    device = "cpu"

            if compute_type == "auto":
                compute_type = "float16" if device == "cuda" else "int8"

            logger.info(f"Using device: {device}, compute_type: {compute_type}")

            # Load the model
            self._model = WhisperModel(
                self.model_size,
                device=device,
                compute_type=compute_type,
            )

            # Initialize VAD (using Silero VAD)
            try:
                import torch
                self._vad_model, utils = torch.hub.load(
                    repo_or_dir='snakers4/silero-vad',
                    model='silero_vad',
                    force_reload=False,
                    onnx=True,  # Use ONNX for faster inference
                )
                self._vad_utils = utils
                logger.info("Silero VAD initialized")
            except Exception as e:
                logger.warning(f"VAD initialization failed: {e}. Continuing without VAD.")
                self._vad_model = None

            self._is_initialized = True
            logger.info("Faster-Whisper model initialized successfully")

        except ImportError as e:
            logger.error(f"Failed to import faster-whisper: {e}")
            raise RuntimeError(
                "faster-whisper not installed. Run: pip install faster-whisper"
            ) from e

    def is_initialized(self) -> bool:
        """Check if the service is initialized."""
        return self._is_initialized

    async def transcribe_audio_chunk(
        self,
        audio_data: bytes,
        sample_rate: int = 16000,
        include_timestamps: bool = True,
    ) -> TranscriptionEvent:
        """
        Transcribe a single audio chunk.

        Args:
            audio_data: Raw PCM audio data (16-bit signed, mono)
            sample_rate: Sample rate of the audio
            include_timestamps: Whether to include word-level timestamps

        Returns:
            TranscriptionEvent with transcription result
        """
        if not self._is_initialized:
            await self.initialize()

        try:
            # Save audio to temporary file (faster-whisper needs file path)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                temp_path = f.name

                # Write WAV file
                with wave.open(f, 'wb') as wav_file:
                    wav_file.setnchannels(1)  # Mono
                    wav_file.setsampwidth(2)  # 16-bit
                    wav_file.setframerate(sample_rate)
                    wav_file.writeframes(audio_data)

            try:
                # Transcribe
                segments, info = self._model.transcribe(
                    temp_path,
                    language=self.language,
                    word_timestamps=include_timestamps,
                    vad_filter=True,
                    vad_parameters=dict(
                        threshold=self.vad_threshold,
                        min_silence_duration_ms=int(self.min_silence_duration * 1000),
                    ),
                )

                # Collect results
                full_text = ""
                words = []

                for segment in segments:
                    full_text += segment.text

                    if include_timestamps and segment.words:
                        for word_info in segment.words:
                            words.append(WordTiming(
                                word=word_info.word.strip(),
                                start=word_info.start,
                                end=word_info.end,
                            ))

                return TranscriptionEvent(
                    status=TranscriptionStatus.FINAL,
                    text=full_text.strip(),
                    words=words,
                    confidence=0.9,  # faster-whisper doesn't expose confidence
                )

            finally:
                # Clean up temp file
                os.unlink(temp_path)

        except Exception as e:
            logger.error(f"Transcription error: {e}", exc_info=True)
            return TranscriptionEvent(
                status=TranscriptionStatus.ERROR,
                error=str(e),
            )

    async def process_stream(
        self,
        audio_stream: AsyncGenerator[bytes, None],
        sample_rate: int = 16000,
        on_event: Optional[Callable[[TranscriptionEvent], None]] = None,
    ) -> AsyncGenerator[TranscriptionEvent, None]:
        """
        Process a continuous audio stream with real-time transcription.

        Args:
            audio_stream: Async generator yielding audio chunks
            sample_rate: Sample rate of the audio
            on_event: Optional callback for each event

        Yields:
            TranscriptionEvent for each transcription result
        """
        if not self._is_initialized:
            await self.initialize()

        # Buffer for accumulating audio
        audio_buffer = bytearray()
        chunk_samples = int(self.chunk_duration * sample_rate * 2)  # 16-bit = 2 bytes
        last_speech_time = 0
        is_speaking = False
        segment_start_time = 0

        yield TranscriptionEvent(status=TranscriptionStatus.LISTENING)

        try:
            async for chunk in audio_stream:
                audio_buffer.extend(chunk)
                current_time = time.time()

                # Process when we have enough audio
                if len(audio_buffer) >= chunk_samples:
                    # Check for voice activity if VAD is available
                    has_speech = True
                    if self._vad_model is not None:
                        has_speech = await self._check_vad(bytes(audio_buffer), sample_rate)

                    if has_speech:
                        if not is_speaking:
                            is_speaking = True
                            segment_start_time = current_time
                            yield TranscriptionEvent(status=TranscriptionStatus.SPEECH_START)

                        last_speech_time = current_time

                        # Transcribe the buffer
                        event = await self.transcribe_audio_chunk(
                            bytes(audio_buffer),
                            sample_rate=sample_rate,
                            include_timestamps=True,
                        )

                        if event.text:
                            event.status = TranscriptionStatus.PARTIAL
                            if on_event:
                                on_event(event)
                            yield event

                    elif is_speaking and (current_time - last_speech_time) > self.min_silence_duration:
                        # End of speech segment
                        is_speaking = False

                        # Final transcription for this segment
                        if len(audio_buffer) > 0:
                            event = await self.transcribe_audio_chunk(
                                bytes(audio_buffer),
                                sample_rate=sample_rate,
                                include_timestamps=True,
                            )
                            event.status = TranscriptionStatus.FINAL
                            if on_event:
                                on_event(event)
                            yield event

                        audio_buffer.clear()
                        yield TranscriptionEvent(status=TranscriptionStatus.LISTENING)

        except Exception as e:
            logger.error(f"Stream processing error: {e}", exc_info=True)
            yield TranscriptionEvent(
                status=TranscriptionStatus.ERROR,
                error=str(e),
            )

        # Final transcription for remaining audio
        if len(audio_buffer) > 0:
            event = await self.transcribe_audio_chunk(
                bytes(audio_buffer),
                sample_rate=sample_rate,
                include_timestamps=True,
            )
            event.status = TranscriptionStatus.FINAL
            yield event

        yield TranscriptionEvent(status=TranscriptionStatus.END)

    async def _check_vad(self, audio_data: bytes, sample_rate: int) -> bool:
        """
        Check if audio contains speech using VAD.

        Args:
            audio_data: Raw PCM audio data
            sample_rate: Sample rate

        Returns:
            True if speech is detected
        """
        if self._vad_model is None:
            return True  # Assume speech if no VAD

        try:
            import torch
            import numpy as np

            # Convert to float tensor
            audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
            audio_tensor = torch.from_numpy(audio_np)

            # Run VAD
            speech_prob = self._vad_model(audio_tensor, sample_rate).item()

            return speech_prob >= self.vad_threshold

        except Exception as e:
            logger.warning(f"VAD check failed: {e}")
            return True  # Assume speech on error

    def cleanup(self):
        """Clean up resources."""
        self._model = None
        self._vad_model = None
        self._is_initialized = False
        logger.info("RealtimeSTT service cleaned up")


# Singleton instance
_realtime_stt_service: Optional[RealtimeSTTService] = None


def get_realtime_stt_service(
    model_size: str = "base",
    language: str = "pt",
) -> RealtimeSTTService:
    """
    Get or create the singleton RealtimeSTT service.

    Args:
        model_size: Whisper model size
        language: Target language

    Returns:
        RealtimeSTTService instance
    """
    global _realtime_stt_service

    if _realtime_stt_service is None:
        _realtime_stt_service = RealtimeSTTService(
            model_size=model_size,
            language=language,
        )

    return _realtime_stt_service
