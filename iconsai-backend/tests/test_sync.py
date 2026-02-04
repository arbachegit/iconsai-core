"""
Tests for sync coordinator and session manager.
"""

import time
import pytest
from src.core.sync_coordinator import SyncCoordinator, SyncState
from src.core.session_manager import SessionManager


class TestSyncCoordinator:
    """Tests for sync coordinator."""

    def test_create_session(self):
        """Test session creation."""
        coordinator = SyncCoordinator()
        session = coordinator.get_or_create_session("test-session")

        assert session.session_id == "test-session"
        assert session.state == SyncState.IDLE

    def test_clock_sync(self):
        """Test clock synchronization."""
        coordinator = SyncCoordinator()

        result = coordinator.process_clock_sync(
            session_id="test-session",
            client_send_time=time.time()
        )

        assert "serverRecvTime" in result
        assert "serverSendTime" in result
        assert "lookaheadMs" in result

    def test_adjusted_timestamps(self):
        """Test timestamp adjustment with lookahead."""
        coordinator = SyncCoordinator()

        words = [
            {"word": "Olá", "start": 0.5, "end": 0.8},
            {"word": "mundo", "start": 1.0, "end": 1.3},
        ]

        adjusted = coordinator.get_adjusted_timestamps("test-session", words)

        # Default lookahead is 100ms
        assert adjusted[0]["start"] < 0.5
        assert adjusted[1]["start"] < 1.0

    def test_playback_state(self):
        """Test playback state transitions."""
        coordinator = SyncCoordinator()

        result = coordinator.start_playback("test-session")
        assert result["state"] == SyncState.PLAYING.value

        result = coordinator.pause_playback("test-session")
        assert result["state"] == SyncState.PAUSED.value

    def test_session_cleanup(self):
        """Test stale session cleanup."""
        coordinator = SyncCoordinator()

        # Create a session
        session = coordinator.get_or_create_session("test-session")
        session.last_activity = time.time() - 7200  # 2 hours ago

        # Cleanup with 1 hour threshold
        cleaned = coordinator.cleanup_stale_sessions(max_age_seconds=3600)

        assert cleaned == 1
        assert "test-session" not in coordinator.sessions


class TestSessionManager:
    """Tests for session manager."""

    def test_create_session(self):
        """Test session creation."""
        manager = SessionManager()
        session = manager.get_or_create_session("device-123")

        assert session.device_id == "device-123"
        assert session.session_id is not None

    def test_get_same_session(self):
        """Test getting same session for same device."""
        manager = SessionManager()

        session1 = manager.get_or_create_session("device-123")
        session2 = manager.get_or_create_session("device-123")

        assert session1.session_id == session2.session_id

    def test_save_message(self):
        """Test message saving."""
        manager = SessionManager()
        session = manager.get_or_create_session("device-123")

        msg_id = manager.save_message(
            session_id=session.session_id,
            role="user",
            content="Olá",
            module_slug="home"
        )

        assert msg_id is not None
        assert len(session.messages) == 1
        assert session.messages[0].content == "Olá"

    def test_get_recent_history(self):
        """Test getting recent history."""
        manager = SessionManager()
        session = manager.get_or_create_session("device-123")

        manager.save_message(session.session_id, "user", "Olá")
        manager.save_message(session.session_id, "assistant", "Olá! Como posso ajudar?")

        session_id, user_name, history = manager.get_recent_history("device-123")

        assert len(history) == 2
        assert history[0]["role"] == "user"
        assert history[1]["role"] == "assistant"

    def test_detect_name(self):
        """Test name detection from message."""
        manager = SessionManager()
        session = manager.get_or_create_session("device-123")

        name = manager.detect_and_save_name(
            session_id=session.session_id,
            message="Me chamo João",
            current_name=None
        )

        assert name == "João"
        assert session.user_name == "João"

    def test_detect_name_skip_if_exists(self):
        """Test name detection skips if name already set."""
        manager = SessionManager()
        session = manager.get_or_create_session("device-123")
        session.user_name = "Maria"

        name = manager.detect_and_save_name(
            session_id=session.session_id,
            message="Me chamo João",
            current_name="Maria"
        )

        assert name == "Maria"  # Should keep existing name

    def test_filter_by_module(self):
        """Test filtering messages by module."""
        manager = SessionManager()
        session = manager.get_or_create_session("device-123")

        manager.save_message(session.session_id, "user", "Msg 1", "health")
        manager.save_message(session.session_id, "user", "Msg 2", "world")
        manager.save_message(session.session_id, "user", "Msg 3", "health")

        _, _, history = manager.get_recent_history("device-123", module_slug="health")

        assert len(history) == 2
