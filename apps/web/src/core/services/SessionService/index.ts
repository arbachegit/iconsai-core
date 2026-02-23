/**
 * SessionService - PWA Session Management
 * @version 1.0.0
 * @date 2026-01-27
 *
 * Manages PWA user sessions with smart session detection:
 * - Module change detection
 * - Timeout detection (10+ minutes)
 * - Keyword similarity analysis (<30% overlap = new session)
 * - Session summaries
 * - Returning user detection
 */

export { SessionService } from './SessionService';
export { useSession } from './useSession';
export type {
  Session,
  SessionConfig,
  SessionCallbacks,
  UserActivity,
} from './types';
