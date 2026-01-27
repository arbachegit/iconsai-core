/**
 * SessionService Types
 * @version 1.0.0
 * @date 2026-01-27
 */

export interface Session {
  id: string;
  deviceId: string;
  userId?: string;
  moduleSlug: string;
  startedAt: string;
  endedAt?: string;
  summary?: string;
  summaryKeywords?: string[];
  isNew: boolean;
}

export interface SessionConfig {
  /** Device ID for session tracking */
  deviceId: string;
  /** Current module slug */
  moduleSlug: string;
  /** User ID if authenticated */
  userId?: string;
  /** Timeout in minutes before creating new session (default: 10) */
  timeoutMinutes?: number;
  /** Keyword similarity threshold (0-1) for new session (default: 0.3) */
  keywordSimilarityThreshold?: number;
}

export interface SessionCallbacks {
  /** Called when a new session is created */
  onNewSession?: (session: Session) => void;
  /** Called when returning to an existing session */
  onResumeSession?: (session: Session, lastModule: string) => void;
  /** Called when session is ended */
  onEndSession?: (session: Session) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

export interface UserActivity {
  deviceId: string;
  lastModuleSlug: string;
  lastSessionId: string;
  lastActiveAt: string;
}

export interface Conversation {
  id: string;
  sessionId: string;
  question: string;
  response: string;
  keywordsUser?: string[];
  keywordsAi?: string[];
  intonationUser?: IntonationData;
  intonationAi?: IntonationData;
  createdAt: string;
}

export interface IntonationData {
  /** Fundamental frequency (F0) in Hz */
  f0Mean?: number;
  f0Min?: number;
  f0Max?: number;
  /** Pitch contour points */
  pitchContour?: number[];
  /** Detected emotion */
  emotion?: string;
  /** Confidence score 0-1 */
  confidence?: number;
}
