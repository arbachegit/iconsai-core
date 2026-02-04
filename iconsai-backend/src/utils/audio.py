"""
Audio utilities for format detection and conversion.
"""

import base64
import io
from typing import Optional, Tuple

# Magic numbers for audio format detection
AUDIO_SIGNATURES = {
    b"\x1a\x45\xdf\xa3": "audio/webm",
    b"RIFF": "audio/wav",
    b"\xff\xfb": "audio/mpeg",
    b"\xff\xf3": "audio/mpeg",
    b"\xff\xf2": "audio/mpeg",
    b"ID3": "audio/mpeg",
    b"OggS": "audio/ogg",
    b"fLaC": "audio/flac",
}

# Extension mapping
MIME_TO_EXTENSION = {
    "audio/webm": "webm",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
    "audio/ogg": "ogg",
    "audio/opus": "ogg",
    "audio/flac": "flac",
}


def detect_audio_format(audio_bytes: bytes) -> Optional[str]:
    """
    Detect audio format from magic number (first few bytes).

    Args:
        audio_bytes: Raw audio data

    Returns:
        MIME type string or None if undetected
    """
    if len(audio_bytes) < 12:
        return None

    # Check for WebM (EBML header)
    if audio_bytes[:4] == b"\x1a\x45\xdf\xa3":
        return "audio/webm"

    # Check for MP4/M4A (ftyp at offset 4)
    if audio_bytes[4:8] == b"ftyp":
        return "audio/mp4"

    # Check for WAV (RIFF....WAVE)
    if audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE":
        return "audio/wav"

    # Check for MP3 (frame sync or ID3)
    if audio_bytes[:3] == b"ID3":
        return "audio/mpeg"
    if audio_bytes[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "audio/mpeg"

    # Check for OGG
    if audio_bytes[:4] == b"OggS":
        return "audio/ogg"

    # Check for FLAC
    if audio_bytes[:4] == b"fLaC":
        return "audio/flac"

    return None


def get_extension_for_mime(mime_type: str) -> str:
    """
    Get file extension for MIME type.

    Args:
        mime_type: MIME type string

    Returns:
        File extension without dot
    """
    # Remove codecs part (e.g., "audio/webm;codecs=opus" -> "audio/webm")
    base_mime = mime_type.split(";")[0].strip().lower()
    return MIME_TO_EXTENSION.get(base_mime, "webm")


def validate_and_normalize_mime(
    provided_mime: Optional[str],
    audio_bytes: bytes
) -> Tuple[str, str]:
    """
    Validate and normalize MIME type for audio data.

    Args:
        provided_mime: MIME type provided by client
        audio_bytes: Raw audio data

    Returns:
        Tuple of (mime_type, extension)
    """
    # Try to detect from magic number first (most reliable)
    detected_mime = detect_audio_format(audio_bytes)
    if detected_mime:
        return detected_mime, get_extension_for_mime(detected_mime)

    # Fall back to provided MIME if valid
    if provided_mime:
        base_mime = provided_mime.split(";")[0].strip().lower()
        if base_mime in MIME_TO_EXTENSION:
            return base_mime, MIME_TO_EXTENSION[base_mime]

    # Default fallback
    return "audio/webm", "webm"


def decode_base64_audio(audio_data: str) -> bytes:
    """
    Decode base64 audio data, handling data URL prefix if present.

    Args:
        audio_data: Base64 encoded audio, optionally with data URL prefix

    Returns:
        Raw audio bytes
    """
    # Strip data URL prefix if present
    if "," in audio_data:
        audio_data = audio_data.split(",")[1]

    return base64.b64decode(audio_data)


def encode_audio_base64(audio_bytes: bytes) -> str:
    """
    Encode audio bytes to base64 string.

    Args:
        audio_bytes: Raw audio data

    Returns:
        Base64 encoded string
    """
    return base64.b64encode(audio_bytes).decode("utf-8")


def convert_audio_format(
    audio_bytes: bytes,
    target_format: str = "mp3"
) -> bytes:
    """
    Convert audio to target format using pydub.

    Args:
        audio_bytes: Input audio data
        target_format: Target format (mp3, wav, ogg, etc.)

    Returns:
        Converted audio bytes

    Note:
        Requires ffmpeg to be installed on the system.
    """
    try:
        from pydub import AudioSegment

        # Detect input format
        input_format = detect_audio_format(audio_bytes)
        if input_format:
            input_ext = get_extension_for_mime(input_format)
        else:
            input_ext = "webm"  # Default assumption

        # Load audio
        audio = AudioSegment.from_file(
            io.BytesIO(audio_bytes),
            format=input_ext
        )

        # Export to target format
        output_buffer = io.BytesIO()
        audio.export(output_buffer, format=target_format)
        return output_buffer.getvalue()

    except Exception as e:
        raise RuntimeError(f"Audio conversion failed: {e}")
