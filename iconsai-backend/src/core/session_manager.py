"""
Session Manager for PWA Voice Sessions.

Manages user sessions and conversation history.
This is a simple in-memory implementation.
For production, integrate with Supabase or Redis.
"""

import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional
import logging
import uuid

logger = logging.getLogger(__name__)


@dataclass
class ConversationMessage:
    """Single conversation message."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: float = field(default_factory=time.time)
    module_slug: Optional[str] = None


@dataclass
class Session:
    """User session state."""
    session_id: str
    device_id: str
    user_name: Optional[str] = None
    messages: List[ConversationMessage] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)

    def add_message(
        self,
        role: str,
        content: str,
        module_slug: Optional[str] = None
    ):
        """Add message to conversation history."""
        self.messages.append(ConversationMessage(
            role=role,
            content=content,
            module_slug=module_slug,
        ))
        self.last_activity = time.time()

    def get_recent_messages(
        self,
        limit: int = 50,
        module_slug: Optional[str] = None
    ) -> List[ConversationMessage]:
        """Get recent messages, optionally filtered by module."""
        msgs = self.messages
        if module_slug:
            msgs = [m for m in msgs if m.module_slug == module_slug]
        return msgs[-limit:]


class SessionManager:
    """
    Manages user sessions and conversation history.

    In-memory implementation for development.
    For production, replace with Supabase/Redis backend.
    """

    def __init__(self):
        """Initialize session manager."""
        self.sessions: Dict[str, Session] = {}  # session_id -> Session
        self.device_sessions: Dict[str, str] = {}  # device_id -> session_id

    def get_or_create_session(self, device_id: str) -> Session:
        """
        Get existing session for device or create new one.

        Args:
            device_id: Device identifier

        Returns:
            Session object
        """
        # Check if device has existing session
        if device_id in self.device_sessions:
            session_id = self.device_sessions[device_id]
            if session_id in self.sessions:
                session = self.sessions[session_id]
                session.last_activity = time.time()
                return session

        # Create new session
        session_id = str(uuid.uuid4())
        session = Session(
            session_id=session_id,
            device_id=device_id,
        )

        self.sessions[session_id] = session
        self.device_sessions[device_id] = session_id

        logger.info(f"[SessionManager] Created session {session_id} for device {device_id[:15]}...")
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """Get session by ID."""
        return self.sessions.get(session_id)

    def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        module_slug: Optional[str] = None
    ) -> Optional[str]:
        """
        Save message to session history.

        Args:
            session_id: Session identifier
            role: Message role (user/assistant)
            content: Message content
            module_slug: Module/agent slug

        Returns:
            Message ID (for database compatibility)
        """
        session = self.sessions.get(session_id)
        if not session:
            logger.warning(f"[SessionManager] Session not found: {session_id}")
            return None

        session.add_message(role, content, module_slug)

        # Return fake message ID for compatibility
        return str(uuid.uuid4())

    def get_recent_history(
        self,
        device_id: str,
        limit: int = 50,
        module_slug: Optional[str] = None
    ) -> tuple[str, Optional[str], List[Dict]]:
        """
        Get recent conversation history for device.

        Args:
            device_id: Device identifier
            limit: Maximum messages to return
            module_slug: Filter by module

        Returns:
            Tuple of (session_id, user_name, messages)
        """
        session = self.get_or_create_session(device_id)
        messages = session.get_recent_messages(limit, module_slug)

        # Convert to dict format
        history = [
            {"role": m.role, "content": m.content}
            for m in messages
        ]

        return session.session_id, session.user_name, history

    def set_user_name(self, session_id: str, name: str):
        """Set user name for session."""
        session = self.sessions.get(session_id)
        if session:
            session.user_name = name
            logger.info(f"[SessionManager] Set user name: {name}")

    def detect_and_save_name(
        self,
        session_id: str,
        message: str,
        current_name: Optional[str]
    ) -> Optional[str]:
        """
        Detect user name from message and save.

        Args:
            session_id: Session identifier
            message: User message
            current_name: Current user name (skip if already set)

        Returns:
            Detected name or None
        """
        if current_name:
            return current_name

        # Simple name detection patterns
        import re

        patterns = [
            r'(?:me chamo|meu nome é|pode me chamar de|sou o|sou a)\s+(\w+)',
            r'^(\w+)(?:\s+aqui)?$',
        ]

        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match and match.group(1):
                name = match.group(1)
                if 2 <= len(name) <= 20:
                    # Capitalize
                    name = name.capitalize()
                    self.set_user_name(session_id, name)
                    return name

        return None

    def cleanup_stale_sessions(self, max_age_seconds: float = 86400):
        """
        Remove sessions inactive for more than max_age_seconds.

        Args:
            max_age_seconds: Maximum inactivity before cleanup (default 24h)

        Returns:
            Number of sessions cleaned up
        """
        now = time.time()
        stale = [
            sid for sid, session in self.sessions.items()
            if now - session.last_activity > max_age_seconds
        ]

        for sid in stale:
            session = self.sessions[sid]
            if session.device_id in self.device_sessions:
                del self.device_sessions[session.device_id]
            del self.sessions[sid]
            logger.info(f"[SessionManager] Cleaned up stale session: {sid}")

        return len(stale)


# Global session manager instance
_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """Get global session manager instance."""
    global _manager
    if _manager is None:
        _manager = SessionManager()
    return _manager
