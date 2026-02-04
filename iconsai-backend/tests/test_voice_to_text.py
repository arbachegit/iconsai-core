"""
Tests for voice-to-text endpoint.
"""

import base64
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from src.main import app

client = TestClient(app)


# Sample audio data (minimal valid WebM header)
SAMPLE_AUDIO_BASE64 = base64.b64encode(
    b"\x1a\x45\xdf\xa3" + b"\x00" * 1000  # WebM magic + padding
).decode()


class TestVoiceToText:
    """Tests for /functions/v1/voice-to-text endpoint."""

    def test_health_endpoint(self):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_missing_audio(self):
        """Test error when audio is missing."""
        response = client.post(
            "/functions/v1/voice-to-text",
            json={"mimeType": "audio/webm"}
        )
        assert response.status_code == 422  # Validation error

    def test_short_audio(self):
        """Test error when audio is too short."""
        short_audio = base64.b64encode(b"short").decode()
        response = client.post(
            "/functions/v1/voice-to-text",
            json={"audio": short_audio, "mimeType": "audio/webm"}
        )
        assert response.status_code == 400
        assert "muito curto" in response.json()["detail"]["error"].lower()

    @patch("src.api.voice_to_text.WhisperSTTService")
    def test_transcription_success(self, mock_service_class):
        """Test successful transcription."""
        # Mock the service
        mock_service = AsyncMock()
        mock_service.transcribe_with_fallback.return_value = AsyncMock(
            text="Olá, como vai?",
            words=None,
            duration=1.5
        )
        mock_service_class.return_value = mock_service

        response = client.post(
            "/functions/v1/voice-to-text",
            json={
                "audio": SAMPLE_AUDIO_BASE64,
                "mimeType": "audio/webm",
                "language": "pt"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["text"] == "Olá, como vai?"

    @patch("src.api.voice_to_text.WhisperSTTService")
    def test_transcription_with_timestamps(self, mock_service_class):
        """Test transcription with word timestamps."""
        from src.services.timestamp_utils import WordTimestamp

        mock_service = AsyncMock()
        mock_service.transcribe_with_fallback.return_value = AsyncMock(
            text="Olá mundo",
            words=[
                WordTimestamp(word="Olá", start=0.0, end=0.3),
                WordTimestamp(word="mundo", start=0.4, end=0.8),
            ],
            duration=1.0
        )
        mock_service_class.return_value = mock_service

        response = client.post(
            "/functions/v1/voice-to-text",
            json={
                "audio": SAMPLE_AUDIO_BASE64,
                "mimeType": "audio/webm",
                "includeWordTimestamps": True
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "words" in data
        assert len(data["words"]) == 2
        assert data["words"][0]["word"] == "Olá"


class TestAudioUtils:
    """Tests for audio utilities."""

    def test_detect_webm_format(self):
        """Test WebM format detection."""
        from src.utils.audio import detect_audio_format

        webm_header = b"\x1a\x45\xdf\xa3" + b"\x00" * 8
        assert detect_audio_format(webm_header) == "audio/webm"

    def test_detect_mp3_format(self):
        """Test MP3 format detection."""
        from src.utils.audio import detect_audio_format

        mp3_header = b"\xff\xfb" + b"\x00" * 10
        assert detect_audio_format(mp3_header) == "audio/mpeg"

    def test_decode_base64_with_prefix(self):
        """Test base64 decoding with data URL prefix."""
        from src.utils.audio import decode_base64_audio

        data = "data:audio/webm;base64,SGVsbG8="
        result = decode_base64_audio(data)
        assert result == b"Hello"

    def test_decode_base64_without_prefix(self):
        """Test base64 decoding without prefix."""
        from src.utils.audio import decode_base64_audio

        data = "SGVsbG8="
        result = decode_base64_audio(data)
        assert result == b"Hello"
