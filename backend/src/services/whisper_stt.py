"""
OpenAI Whisper Speech-to-Text Service with word-level timestamps
"""

import httpx
from typing import Dict, Any, List
from pathlib import Path


class WhisperSTTService:
    """
    OpenAI Whisper Speech-to-Text with word timestamps.

    Uses timestamp_granularities=["word"] for precise timing.
    """

    BASE_URL = "https://api.openai.com/v1"

    def __init__(self, api_key: str, model: str = "whisper-1"):
        self.api_key = api_key
        self.model = model

    async def transcribe_with_timestamps(self, audio_path: str) -> Dict[str, Any]:
        """
        Transcribe audio file with word-level timestamps.

        Args:
            audio_path: Path to audio file (webm, wav, mp3, m4a, etc.)

        Returns:
            {
                "text": str,
                "words": [{"word": str, "start": float, "end": float}, ...],
                "duration": float
            }
        """
        url = f"{self.BASE_URL}/audio/transcriptions"

        # Read audio file
        audio_path = Path(audio_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        async with httpx.AsyncClient(timeout=60.0) as client:
            # Prepare multipart form data
            with open(audio_path, "rb") as f:
                files = {
                    "file": (audio_path.name, f, self._get_mime_type(audio_path.suffix)),
                }
                data = {
                    "model": self.model,
                    "response_format": "verbose_json",
                    "timestamp_granularities[]": "word",
                    "language": "pt"  # Portuguese
                }

                response = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    files=files,
                    data=data
                )

            if response.status_code != 200:
                raise Exception(f"Whisper API error: {response.status_code} - {response.text}")

            result = response.json()

            # Extract text and words
            text = result.get("text", "")
            words_data = result.get("words", [])

            # Format words
            words = []
            for w in words_data:
                words.append({
                    "word": w.get("word", ""),
                    "start": round(w.get("start", 0), 3),
                    "end": round(w.get("end", 0), 3)
                })

            # Calculate duration
            duration = result.get("duration", 0)
            if not duration and words:
                duration = words[-1]["end"]

            return {
                "text": text.strip(),
                "words": words,
                "duration": round(duration, 3)
            }

    def _get_mime_type(self, suffix: str) -> str:
        """Get MIME type from file extension"""
        mime_types = {
            ".webm": "audio/webm",
            ".wav": "audio/wav",
            ".mp3": "audio/mpeg",
            ".m4a": "audio/mp4",
            ".ogg": "audio/ogg",
            ".flac": "audio/flac"
        }
        return mime_types.get(suffix.lower(), "audio/webm")
