"""
ElevenLabs TTS Service with native character-level timestamps
Converts character timestamps to word timestamps for karaoke sync
"""

import httpx
import base64
import re
from typing import List, Dict, Any


class ElevenLabsTTSService:
    """
    ElevenLabs Text-to-Speech with timestamps.

    Uses the /text-to-speech/{voice_id}/with-timestamps endpoint
    which returns character-level timing that we convert to word-level.
    """

    BASE_URL = "https://api.elevenlabs.io/v1"

    def __init__(self, api_key: str, voice_id: str, model_id: str = "eleven_turbo_v2_5"):
        self.api_key = api_key
        self.voice_id = voice_id
        self.model_id = model_id

    async def synthesize_with_timestamps(self, text: str) -> Dict[str, Any]:
        """
        Synthesize speech with word-level timestamps.

        Returns:
            {
                "audio_base64": str,
                "words": [{"word": str, "start": float, "end": float}, ...],
                "duration": float
            }
        """
        url = f"{self.BASE_URL}/text-to-speech/{self.voice_id}/with-timestamps"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                headers={
                    "xi-api-key": self.api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "text": text,
                    "model_id": self.model_id,
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                        "style": 0.0,
                        "use_speaker_boost": True
                    }
                }
            )

            if response.status_code != 200:
                raise Exception(f"ElevenLabs API error: {response.status_code} - {response.text}")

            data = response.json()

            # Extract alignment data
            alignment = data.get("alignment", {})
            characters = alignment.get("characters", [])
            char_starts = alignment.get("character_start_times_seconds", [])
            char_ends = alignment.get("character_end_times_seconds", [])

            # Convert character timestamps to word timestamps
            words = self._chars_to_words(text, characters, char_starts, char_ends)

            # Get audio as base64
            audio_base64 = data.get("audio_base64", "")

            # Calculate duration
            duration = words[-1]["end"] if words else 0.0

            return {
                "audio_base64": audio_base64,
                "words": words,
                "duration": duration
            }

    def _chars_to_words(
        self,
        text: str,
        characters: List[str],
        char_starts: List[float],
        char_ends: List[float]
    ) -> List[Dict[str, Any]]:
        """
        Convert character-level timestamps to word-level timestamps.

        Algorithm:
        1. Find word boundaries in the original text
        2. Map each word to its character range
        3. Get start time from first char, end time from last char
        """
        if not characters or not char_starts or not char_ends:
            # Fallback: create approximate timestamps
            return self._create_approximate_timestamps(text)

        words = []
        current_word = ""
        word_start_idx = None

        for i, char in enumerate(characters):
            if char.strip():  # Non-whitespace
                if word_start_idx is None:
                    word_start_idx = i
                current_word += char
            else:  # Whitespace or empty
                if current_word:
                    # Word completed
                    words.append({
                        "word": current_word,
                        "start": round(char_starts[word_start_idx], 3),
                        "end": round(char_ends[i - 1], 3) if i > 0 else round(char_starts[word_start_idx] + 0.1, 3)
                    })
                    current_word = ""
                    word_start_idx = None

        # Don't forget the last word
        if current_word and word_start_idx is not None:
            words.append({
                "word": current_word,
                "start": round(char_starts[word_start_idx], 3),
                "end": round(char_ends[-1], 3)
            })

        return words

    def _create_approximate_timestamps(self, text: str, words_per_second: float = 2.5) -> List[Dict[str, Any]]:
        """
        Create approximate timestamps when real ones aren't available.
        Assumes ~150 words per minute (2.5 words/second).
        """
        # Split into words, keeping punctuation attached
        word_pattern = r'\S+'
        word_matches = list(re.finditer(word_pattern, text))

        if not word_matches:
            return []

        avg_word_duration = 1.0 / words_per_second
        words = []
        current_time = 0.0

        for match in word_matches:
            word = match.group()
            # Longer words take slightly longer
            duration = avg_word_duration * (0.8 + 0.4 * min(len(word) / 8, 1))

            words.append({
                "word": word,
                "start": round(current_time, 3),
                "end": round(current_time + duration, 3)
            })
            current_time += duration + 0.05  # Small gap between words

        return words
