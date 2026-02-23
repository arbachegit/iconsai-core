/**
 * useSession - React Hook for Session Management
 * @version 1.0.0
 * @date 2026-01-27
 *
 * React hook that provides session management capabilities.
 * Handles session initialization, conversation tracking, and returning user detection.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { SessionService } from './SessionService';
import type { Session, SessionConfig, Conversation } from './types';

export interface UseSessionOptions {
  /** Device ID for session tracking */
  deviceId: string;
  /** Current module slug */
  moduleSlug: string;
  /** User ID if authenticated */
  userId?: string;
  /** Auto-initialize session on mount */
  autoInit?: boolean;
}

export interface UseSessionReturn {
  /** Current session */
  session: Session | null;
  /** Whether this is a new session */
  isNewSession: boolean;
  /** Whether user is returning from a different module */
  isReturningFromDifferentModule: boolean;
  /** Last module the user was using */
  lastModule: string | null;
  /** Conversations in current session */
  conversations: Conversation[];
  /** Whether session is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;

  // Actions
  /** Initialize the session */
  initSession: () => Promise<void>;
  /** Add a conversation to the session */
  addConversation: (
    question: string,
    response: string,
    keywordsUser?: string[],
    keywordsAi?: string[]
  ) => Promise<string | null>;
  /** End the current session */
  endSession: (summary?: string) => Promise<void>;
  /** Refresh conversations */
  refreshConversations: () => Promise<void>;
}

export function useSession(options: UseSessionOptions): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [isNewSession, setIsNewSession] = useState(false);
  const [isReturningFromDifferentModule, setIsReturningFromDifferentModule] = useState(false);
  const [lastModule, setLastModule] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serviceRef = useRef<SessionService | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Initialize service (only once)
  useEffect(() => {
    const opts = optionsRef.current;

    const config: SessionConfig = {
      deviceId: opts.deviceId,
      moduleSlug: opts.moduleSlug,
      userId: opts.userId,
    };

    const service = new SessionService(config);

    service.setCallbacks({
      onNewSession: (sess) => {
        console.log('[useSession] New session:', sess.id);
      },
      onResumeSession: (sess, lastMod) => {
        console.log('[useSession] Resuming session:', sess.id, 'from', lastMod);
      },
      onEndSession: (sess) => {
        console.log('[useSession] Session ended:', sess.id);
      },
      onError: (err) => {
        console.error('[useSession] Error:', err);
        setError(err.message);
      },
    });

    serviceRef.current = service;

    // Auto-init if enabled
    if (opts.autoInit !== false) {
      initSessionInternal(service);
    }

    return () => {
      serviceRef.current = null;
    };
  }, []);

  // Update service config when options change
  useEffect(() => {
    // If deviceId or moduleSlug changes, we might need to reinitialize
    // For now, we'll just log it
    if (serviceRef.current && session) {
      if (options.moduleSlug !== session.moduleSlug) {
        console.log('[useSession] Module changed, consider reinitializing session');
      }
    }
  }, [options.deviceId, options.moduleSlug, session]);

  const initSessionInternal = async (service: SessionService) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await service.initSession();

      setSession(result.session);
      setIsNewSession(result.session.isNew);
      setIsReturningFromDifferentModule(result.isResuming);
      setLastModule(result.lastModule || null);

      // Load existing conversations
      const convs = await service.getConversations();
      setConversations(convs);
    } catch (err) {
      console.error('[useSession] Init error:', err);
      setError(err instanceof Error ? err.message : 'Session initialization failed');
    } finally {
      setIsLoading(false);
    }
  };

  const initSession = useCallback(async () => {
    if (!serviceRef.current) return;
    await initSessionInternal(serviceRef.current);
  }, []);

  const addConversation = useCallback(
    async (
      question: string,
      response: string,
      keywordsUser?: string[],
      keywordsAi?: string[]
    ): Promise<string | null> => {
      if (!serviceRef.current) return null;

      const id = await serviceRef.current.addConversation(
        question,
        response,
        keywordsUser,
        keywordsAi
      );

      // Refresh conversations
      if (id) {
        const convs = await serviceRef.current.getConversations();
        setConversations(convs);
      }

      return id;
    },
    []
  );

  const endSession = useCallback(async (summary?: string) => {
    if (!serviceRef.current) return;

    await serviceRef.current.endSession(summary);
    setSession(null);
    setConversations([]);
    setIsNewSession(false);
    setIsReturningFromDifferentModule(false);
    setLastModule(null);
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!serviceRef.current) return;

    const convs = await serviceRef.current.getConversations();
    setConversations(convs);
  }, []);

  return {
    // State
    session,
    isNewSession,
    isReturningFromDifferentModule,
    lastModule,
    conversations,
    isLoading,
    error,

    // Actions
    initSession,
    addConversation,
    endSession,
    refreshConversations,
  };
}

export default useSession;
