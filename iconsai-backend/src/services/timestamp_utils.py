"""
Utilities for converting character-level timestamps to word-level timestamps.
Used with ElevenLabs API which returns per-character timing.
"""

import re
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class WordTimestamp:
    """Word with timing information."""
    word: str
    start: float
    end: float

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "word": self.word,
            "start": round(self.start, 3),
            "end": round(self.end, 3),
        }


def chars_to_words(
    text: str,
    characters: List[str],
    char_starts: List[float],
    char_ends: List[float]
) -> List[WordTimestamp]:
    """
    Convert character-level timestamps to word-level timestamps.

    This function handles the conversion from ElevenLabs' character alignment
    to word-level timing needed for karaoke display.

    Args:
        text: Original text that was synthesized
        characters: List of characters from alignment
        char_starts: Start time for each character (seconds)
        char_ends: End time for each character (seconds)

    Returns:
        List of WordTimestamp objects with word-level timing
    """
    if not characters or not char_starts or not char_ends:
        return []

    words: List[WordTimestamp] = []
    current_word = ""
    word_start: Optional[float] = None
    word_end: float = 0.0

    for i, char in enumerate(characters):
        if i >= len(char_starts) or i >= len(char_ends):
            break

        # Whitespace or punctuation marks word boundary
        if char in ' \t\n' or char in '.,!?;:':
            if current_word:
                words.append(WordTimestamp(
                    word=current_word,
                    start=word_start or 0.0,
                    end=word_end
                ))
                current_word = ""
                word_start = None

            # If it's punctuation, optionally add it as separate token
            # For karaoke, we usually skip standalone punctuation
            continue

        # Building a word
        if word_start is None:
            word_start = char_starts[i]

        current_word += char
        word_end = char_ends[i]

    # Don't forget the last word
    if current_word:
        words.append(WordTimestamp(
            word=current_word,
            start=word_start or 0.0,
            end=word_end
        ))

    return words


def align_words_to_text(
    original_text: str,
    transcribed_words: List[WordTimestamp]
) -> List[WordTimestamp]:
    """
    Align transcribed words back to original text.

    Sometimes Whisper transcription differs slightly from original text
    (punctuation, capitalization, etc.). This function tries to match
    transcribed words to original text positions.

    Args:
        original_text: The original text that was synthesized
        transcribed_words: Words from Whisper transcription with timestamps

    Returns:
        Aligned words matching original text where possible
    """
    if not transcribed_words:
        return []

    # Split original text into words
    original_words = re.findall(r'\S+', original_text)

    if not original_words:
        return transcribed_words

    # Simple alignment: match by position
    aligned: List[WordTimestamp] = []

    # Use transcribed timing but prefer original word spelling
    for i, tw in enumerate(transcribed_words):
        if i < len(original_words):
            # Use original word if similar enough
            orig = original_words[i]
            trans = tw.word

            # Normalize for comparison
            orig_norm = re.sub(r'[^\w]', '', orig.lower())
            trans_norm = re.sub(r'[^\w]', '', trans.lower())

            # Use original if they match (ignoring case/punctuation)
            if orig_norm == trans_norm or orig_norm.startswith(trans_norm) or trans_norm.startswith(orig_norm):
                aligned.append(WordTimestamp(
                    word=orig.rstrip('.,!?;:'),  # Strip trailing punctuation
                    start=tw.start,
                    end=tw.end
                ))
            else:
                # Use transcribed word
                aligned.append(tw)
        else:
            aligned.append(tw)

    return aligned


def merge_adjacent_words(
    words: List[WordTimestamp],
    max_gap: float = 0.1
) -> List[WordTimestamp]:
    """
    Merge words that are very close together (for smoother karaoke).

    Args:
        words: List of word timestamps
        max_gap: Maximum gap between words to consider merging (seconds)

    Returns:
        Potentially merged word list
    """
    if len(words) < 2:
        return words

    merged: List[WordTimestamp] = []
    current = words[0]

    for next_word in words[1:]:
        gap = next_word.start - current.end

        # If gap is small, extend current word to include it
        if gap < max_gap and gap > 0:
            # Extend current word's end time
            current = WordTimestamp(
                word=current.word,
                start=current.start,
                end=next_word.start  # Extend to next word's start
            )

        merged.append(current)
        current = next_word

    merged.append(current)
    return merged


def add_lookahead(
    words: List[WordTimestamp],
    lookahead_ms: float = 100
) -> List[WordTimestamp]:
    """
    Add lookahead offset to word timestamps for latency compensation.

    The karaoke display needs words to highlight slightly before
    the audio plays due to network/rendering latency.

    Args:
        words: List of word timestamps
        lookahead_ms: Milliseconds to shift earlier

    Returns:
        Words with adjusted timestamps
    """
    if not words:
        return words

    offset_sec = lookahead_ms / 1000.0

    return [
        WordTimestamp(
            word=w.word,
            start=max(0, w.start - offset_sec),
            end=max(0, w.end - offset_sec)
        )
        for w in words
    ]
