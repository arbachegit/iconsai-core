"""
Sync Coordinator for Voice Assistant.

Manages synchronization between client and server for karaoke timing.
Implements:
- Clock sync (NTP-like) for latency compensation
- Lookahead for smooth word highlighting
- State machine for sync session lifecycle
"""

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class SyncState(Enum):
    """Sync session states."""
    IDLE = "idle"
    SYNCING = "syncing"
    READY = "ready"
    PLAYING = "playing"
    PAUSED = "paused"
    ERROR = "error"


@dataclass
class ClockSyncSample:
    """Single clock sync measurement."""
    client_send_time: float  # When client sent request
    server_recv_time: float  # When server received
    server_send_time: float  # When server sent response
    client_recv_time: float  # When client received

    @property
    def round_trip_time(self) -> float:
        """Calculate RTT in milliseconds."""
        return (self.client_recv_time - self.client_send_time) * 1000

    @property
    def estimated_offset(self) -> float:
        """Estimate clock offset (client - server) in milliseconds."""
        # NTP algorithm
        t1 = self.client_send_time
        t2 = self.server_recv_time
        t3 = self.server_send_time
        t4 = self.client_recv_time
        return ((t2 - t1) + (t3 - t4)) / 2 * 1000


@dataclass
class SyncSession:
    """Synchronization session state."""
    session_id: str
    state: SyncState = SyncState.IDLE
    clock_samples: List[ClockSyncSample] = field(default_factory=list)
    estimated_offset_ms: float = 0.0
    estimated_rtt_ms: float = 0.0
    lookahead_ms: float = 100.0  # Default lookahead
    last_activity: float = field(default_factory=time.time)

    def update_clock_estimate(self):
        """Update clock offset estimate from samples."""
        if not self.clock_samples:
            return

        # Use median of recent samples for robustness
        recent = self.clock_samples[-5:]  # Last 5 samples

        offsets = [s.estimated_offset for s in recent]
        rtts = [s.round_trip_time for s in recent]

        # Median
        offsets.sort()
        rtts.sort()

        mid = len(offsets) // 2
        self.estimated_offset_ms = offsets[mid]
        self.estimated_rtt_ms = rtts[mid]

        # Adjust lookahead based on RTT
        # More RTT = more lookahead needed
        self.lookahead_ms = max(50, min(200, self.estimated_rtt_ms / 2 + 50))


class SyncCoordinator:
    """
    Coordinates synchronization between client and server.

    Key responsibilities:
    1. Clock sync: Estimate client-server time offset
    2. Lookahead: Compensate for network latency in karaoke
    3. Session management: Track sync state per client
    """

    def __init__(self):
        """Initialize sync coordinator."""
        self.sessions: Dict[str, SyncSession] = {}

    def get_or_create_session(self, session_id: str) -> SyncSession:
        """Get existing session or create new one."""
        if session_id not in self.sessions:
            self.sessions[session_id] = SyncSession(session_id=session_id)
            logger.info(f"[SyncCoordinator] Created session: {session_id}")

        session = self.sessions[session_id]
        session.last_activity = time.time()
        return session

    def process_clock_sync(
        self,
        session_id: str,
        client_send_time: float,
        client_recv_time: Optional[float] = None
    ) -> dict:
        """
        Process clock sync request from client.

        Args:
            session_id: Session identifier
            client_send_time: When client sent the request (client clock)
            client_recv_time: When client received response (for completing sample)

        Returns:
            Dict with server times and current estimates
        """
        session = self.get_or_create_session(session_id)
        session.state = SyncState.SYNCING

        server_recv_time = time.time()

        # If this is completing a previous sample
        if client_recv_time is not None and session.clock_samples:
            last_sample = session.clock_samples[-1]
            last_sample.client_recv_time = client_recv_time
            session.update_clock_estimate()
            session.state = SyncState.READY

        # Create new sample (will be completed on next request)
        sample = ClockSyncSample(
            client_send_time=client_send_time,
            server_recv_time=server_recv_time,
            server_send_time=time.time(),
            client_recv_time=0  # Will be filled on completion
        )
        session.clock_samples.append(sample)

        return {
            "serverRecvTime": server_recv_time,
            "serverSendTime": sample.server_send_time,
            "estimatedOffsetMs": session.estimated_offset_ms,
            "estimatedRttMs": session.estimated_rtt_ms,
            "lookaheadMs": session.lookahead_ms,
            "state": session.state.value,
        }

    def get_adjusted_timestamps(
        self,
        session_id: str,
        words: List[dict]
    ) -> List[dict]:
        """
        Adjust word timestamps with lookahead for latency compensation.

        Args:
            session_id: Session identifier
            words: List of word timestamps (word, start, end)

        Returns:
            Adjusted word timestamps
        """
        session = self.get_or_create_session(session_id)

        if not words:
            return words

        # Apply lookahead (shift earlier by lookahead_ms)
        lookahead_sec = session.lookahead_ms / 1000

        adjusted = []
        for w in words:
            adjusted.append({
                "word": w["word"],
                "start": max(0, w["start"] - lookahead_sec),
                "end": max(0, w["end"] - lookahead_sec),
            })

        return adjusted

    def start_playback(self, session_id: str) -> dict:
        """Mark session as playing."""
        session = self.get_or_create_session(session_id)
        session.state = SyncState.PLAYING
        return {"state": session.state.value}

    def pause_playback(self, session_id: str) -> dict:
        """Mark session as paused."""
        session = self.get_or_create_session(session_id)
        session.state = SyncState.PAUSED
        return {"state": session.state.value}

    def end_session(self, session_id: str):
        """Clean up session."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"[SyncCoordinator] Ended session: {session_id}")

    def cleanup_stale_sessions(self, max_age_seconds: float = 3600):
        """Remove sessions inactive for more than max_age_seconds."""
        now = time.time()
        stale = [
            sid for sid, session in self.sessions.items()
            if now - session.last_activity > max_age_seconds
        ]
        for sid in stale:
            del self.sessions[sid]
            logger.info(f"[SyncCoordinator] Cleaned up stale session: {sid}")

        return len(stale)


# Global coordinator instance
_coordinator: Optional[SyncCoordinator] = None


def get_sync_coordinator() -> SyncCoordinator:
    """Get global sync coordinator instance."""
    global _coordinator
    if _coordinator is None:
        _coordinator = SyncCoordinator()
    return _coordinator
