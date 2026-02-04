"""
Tests for text-to-speech endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from src.main import app

client = TestClient(app)


class TestTextToSpeech:
    """Tests for TTS endpoints."""

    def test_missing_text(self):
        """Test error when text is missing."""
        response = client.post(
            "/functions/v1/text-to-speech-karaoke",
            json={"chatType": "home"}
        )
        assert response.status_code == 422  # Validation error

    def test_empty_text(self):
        """Test error when text is empty."""
        response = client.post(
            "/functions/v1/text-to-speech-karaoke",
            json={"text": "", "chatType": "home"}
        )
        assert response.status_code == 400
        assert "obrigatório" in response.json()["detail"]["error"].lower()

    def test_text_too_long(self):
        """Test error when text exceeds limit."""
        response = client.post(
            "/functions/v1/text-to-speech-karaoke",
            json={"text": "a" * 6000, "chatType": "home"}
        )
        assert response.status_code == 400
        assert "muito longo" in response.json()["detail"]["error"].lower()

    @patch("src.api.text_to_speech.ElevenLabsTTSService")
    @patch("src.api.text_to_speech.get_settings")
    def test_tts_with_elevenlabs(self, mock_settings, mock_service_class):
        """Test TTS using ElevenLabs."""
        from src.services.timestamp_utils import WordTimestamp

        # Mock settings
        mock_settings.return_value.has_elevenlabs.return_value = True
        mock_settings.return_value.tts_provider = "elevenlabs"

        # Mock service
        mock_service = AsyncMock()
        mock_service.synthesize_with_timestamps.return_value = AsyncMock(
            audio_base64="dGVzdA==",
            audio_mime_type="audio/mpeg",
            words=[WordTimestamp(word="Olá", start=0.0, end=0.3)],
            duration=0.5,
            text="Olá",
            to_dict=lambda: {
                "audioBase64": "dGVzdA==",
                "audioMimeType": "audio/mpeg",
                "words": [{"word": "Olá", "start": 0.0, "end": 0.3}],
                "duration": 0.5,
                "text": "Olá",
            }
        )
        mock_service_class.return_value = mock_service

        response = client.post(
            "/functions/v1/text-to-speech-karaoke",
            json={"text": "Olá", "chatType": "home", "voice": "nova"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "audioBase64" in data
        assert "words" in data


class TestTextNormalizer:
    """Tests for text normalization utilities."""

    def test_number_to_words(self):
        """Test number conversion to words."""
        from src.utils.text_normalizer import number_to_words

        assert number_to_words(0) == "zero"
        assert number_to_words(1) == "um"
        assert number_to_words(10) == "dez"
        assert number_to_words(21) == "vinte e um"
        assert number_to_words(100) == "cem"
        assert number_to_words(101) == "cento e um"
        assert number_to_words(1000) == "mil"
        assert number_to_words(2000) == "dois mil"

    def test_currency_to_words(self):
        """Test currency conversion to words."""
        from src.utils.text_normalizer import currency_to_words

        assert "um real" in currency_to_words("R$ 1,00")
        assert "dez reais" in currency_to_words("R$ 10,00")
        assert "centavos" in currency_to_words("R$ 0,50")

    def test_percentage_to_words(self):
        """Test percentage conversion to words."""
        from src.utils.text_normalizer import percentage_to_words

        assert "dez por cento" in percentage_to_words("10%")
        assert "vírgula" in percentage_to_words("12,5%")

    def test_normalize_numbers(self):
        """Test number normalization in text."""
        from src.utils.text_normalizer import normalize_numbers

        text = "O PIB cresceu 2,5% e o dólar está em R$ 5,00."
        result = normalize_numbers(text)

        assert "por cento" in result
        assert "reais" in result
        assert "%" not in result
        assert "R$" not in result

    def test_phonetic_map_application(self):
        """Test phonetic map application."""
        from src.utils.text_normalizer import normalize_text_for_tts

        text = "O IPCA e a SELIC são indicadores importantes."
        result = normalize_text_for_tts(text)

        # Should replace with phonetic versions
        assert "IPCA" not in result or "ípeca" in result
        assert "SELIC" not in result or "séliqui" in result


class TestTimestampUtils:
    """Tests for timestamp utilities."""

    def test_chars_to_words(self):
        """Test character to word timestamp conversion."""
        from src.services.timestamp_utils import chars_to_words

        text = "Olá mundo"
        characters = list("Olá mundo")
        starts = [0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4]
        ends = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45]

        words = chars_to_words(text, characters, starts, ends)

        assert len(words) == 2
        assert words[0].word == "Olá"
        assert words[1].word == "mundo"

    def test_add_lookahead(self):
        """Test lookahead addition to timestamps."""
        from src.services.timestamp_utils import WordTimestamp, add_lookahead

        words = [
            WordTimestamp(word="Olá", start=0.5, end=0.8),
            WordTimestamp(word="mundo", start=1.0, end=1.3),
        ]

        adjusted = add_lookahead(words, lookahead_ms=100)

        # Should shift by 0.1 seconds
        assert adjusted[0].start == pytest.approx(0.4)
        assert adjusted[0].end == pytest.approx(0.7)
