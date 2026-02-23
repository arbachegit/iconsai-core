/**
 * SessionService - Session Management for PWA
 * @version 1.0.0
 * @date 2026-01-27
 *
 * Manages user sessions with intelligent session detection:
 * - New session on module change
 * - New session on timeout (10+ minutes)
 * - New session on keyword difference (>70% different)
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Session,
  SessionConfig,
  SessionCallbacks,
  UserActivity,
  Conversation,
} from './types';

export class SessionService {
  private config: Required<SessionConfig>;
  private callbacks: SessionCallbacks = {};
  private currentSession: Session | null = null;
  private lastActivity: UserActivity | null = null;

  constructor(config: SessionConfig) {
    this.config = {
      timeoutMinutes: 10,
      keywordSimilarityThreshold: 0.3,
      userId: undefined,
      ...config,
    };
  }

  /**
   * Set callbacks for session events
   */
  setCallbacks(callbacks: SessionCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Get current session
   */
  getSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Initialize session - called when module loads
   * Returns true if this is a new session, false if resuming
   */
  async initSession(): Promise<{ session: Session; isResuming: boolean; lastModule?: string }> {
    try {
      // First check if there's existing activity for this device
      const activity = await this.getLastActivity();
      this.lastActivity = activity;

      // Try to get or create session using database function
      const { data, error } = await supabase.rpc('get_or_create_session', {
        p_device_id: this.config.deviceId,
        p_module_slug: this.config.moduleSlug,
        p_user_id: this.config.userId || null,
      });

      if (error) {
        console.error('[SessionService] RPC error:', error);
        // Fallback: create session manually
        return this.createSessionFallback();
      }

      const sessionData = data as {
        session_id: string;
        is_new: boolean;
        previous_module: string | null;
      };

      // Fetch full session details
      const { data: sessionDetails, error: sessionError } = await supabase
        .from('pwa_sessions')
        .select('*')
        .eq('id', sessionData.session_id)
        .single();

      if (sessionError) {
        console.error('[SessionService] Session fetch error:', sessionError);
        return this.createSessionFallback();
      }

      this.currentSession = {
        id: sessionDetails.id,
        deviceId: sessionDetails.device_id,
        userId: sessionDetails.user_id,
        moduleSlug: sessionDetails.module_slug,
        startedAt: sessionDetails.started_at,
        endedAt: sessionDetails.ended_at,
        summary: sessionDetails.summary,
        summaryKeywords: sessionDetails.summary_keywords,
        isNew: sessionData.is_new,
      };

      const isResuming = !sessionData.is_new && !!sessionData.previous_module;

      if (sessionData.is_new) {
        this.callbacks.onNewSession?.(this.currentSession);
      } else if (isResuming) {
        this.callbacks.onResumeSession?.(
          this.currentSession,
          sessionData.previous_module || this.config.moduleSlug
        );
      }

      // Update user activity
      await this.updateActivity();

      return {
        session: this.currentSession,
        isResuming,
        lastModule: sessionData.previous_module || undefined,
      };
    } catch (err) {
      console.error('[SessionService] Init error:', err);
      this.callbacks.onError?.(err instanceof Error ? err : new Error('Session init failed'));
      return this.createSessionFallback();
    }
  }

  /**
   * Add a conversation to the current session
   */
  async addConversation(
    question: string,
    response: string,
    keywordsUser?: string[],
    keywordsAi?: string[]
  ): Promise<string | null> {
    if (!this.currentSession) {
      console.warn('[SessionService] No active session');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('pwa_conversations')
        .insert({
          session_id: this.currentSession.id,
          question,
          response,
          keywords_user: keywordsUser || [],
          keywords_ai: keywordsAi || [],
        })
        .select('id')
        .single();

      if (error) {
        console.error('[SessionService] Add conversation error:', error);
        return null;
      }

      // Update activity timestamp
      await this.updateActivity();

      return data.id;
    } catch (err) {
      console.error('[SessionService] Add conversation error:', err);
      return null;
    }
  }

  /**
   * End the current session
   */
  async endSession(summary?: string): Promise<void> {
    if (!this.currentSession) return;

    try {
      const updateData: Record<string, unknown> = {
        ended_at: new Date().toISOString(),
      };

      if (summary) {
        updateData.summary = summary;
        updateData.summary_keywords = this.extractKeywords(summary);
      }

      await supabase
        .from('pwa_sessions')
        .update(updateData)
        .eq('id', this.currentSession.id);

      this.callbacks.onEndSession?.(this.currentSession);
      this.currentSession = null;
    } catch (err) {
      console.error('[SessionService] End session error:', err);
    }
  }

  /**
   * Get conversations for current session
   */
  async getConversations(): Promise<Conversation[]> {
    if (!this.currentSession) return [];

    try {
      const { data, error } = await supabase
        .from('pwa_conversations')
        .select('*')
        .eq('session_id', this.currentSession.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[SessionService] Get conversations error:', error);
        return [];
      }

      return (data || []).map(c => ({
        id: c.id,
        sessionId: c.session_id,
        question: c.question,
        response: c.response,
        keywordsUser: c.keywords_user,
        keywordsAi: c.keywords_ai,
        intonationUser: c.intonation_user,
        intonationAi: c.intonation_ai,
        createdAt: c.created_at,
      }));
    } catch (err) {
      console.error('[SessionService] Get conversations error:', err);
      return [];
    }
  }

  /**
   * Check if user is returning to a different module
   */
  isReturningFromDifferentModule(): boolean {
    return (
      !!this.lastActivity &&
      this.lastActivity.lastModuleSlug !== this.config.moduleSlug
    );
  }

  /**
   * Get the last module the user was using
   */
  getLastModule(): string | null {
    return this.lastActivity?.lastModuleSlug || null;
  }

  // Private methods

  private async getLastActivity(): Promise<UserActivity | null> {
    try {
      const { data, error } = await supabase
        .from('pwa_user_activity')
        .select('*')
        .eq('device_id', this.config.deviceId)
        .single();

      if (error || !data) return null;

      return {
        deviceId: data.device_id,
        lastModuleSlug: data.last_module_slug,
        lastSessionId: data.last_session_id,
        lastActiveAt: data.last_active_at,
      };
    } catch {
      return null;
    }
  }

  private async updateActivity(): Promise<void> {
    if (!this.currentSession) return;

    try {
      await supabase.from('pwa_user_activity').upsert(
        {
          device_id: this.config.deviceId,
          last_module_slug: this.config.moduleSlug,
          last_session_id: this.currentSession.id,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: 'device_id' }
      );
    } catch (err) {
      console.error('[SessionService] Update activity error:', err);
    }
  }

  private async createSessionFallback(): Promise<{
    session: Session;
    isResuming: boolean;
    lastModule?: string;
  }> {
    // Create new session directly
    const { data, error } = await supabase
      .from('pwa_sessions')
      .insert({
        device_id: this.config.deviceId,
        user_id: this.config.userId,
        module_slug: this.config.moduleSlug,
      })
      .select()
      .single();

    if (error || !data) {
      // Create a temporary session if database fails
      const tempSession: Session = {
        id: `temp-${Date.now()}`,
        deviceId: this.config.deviceId,
        moduleSlug: this.config.moduleSlug,
        startedAt: new Date().toISOString(),
        isNew: true,
      };
      this.currentSession = tempSession;
      return { session: tempSession, isResuming: false };
    }

    this.currentSession = {
      id: data.id,
      deviceId: data.device_id,
      userId: data.user_id,
      moduleSlug: data.module_slug,
      startedAt: data.started_at,
      isNew: true,
    };

    return { session: this.currentSession, isResuming: false };
  }

  /**
   * Simple keyword extraction from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
      'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos',
      'por', 'para', 'com', 'sem', 'que', 'e', 'ou', 'se', 'mas',
      'como', 'quando', 'onde', 'porque', 'qual', 'quem',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'can',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where',
      'how', 'what', 'which', 'who', 'whom', 'this', 'that',
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\sáéíóúâêîôûãõàèìòùäëïöüç]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Count frequency
    const freq = new Map<string, number>();
    words.forEach(word => {
      freq.set(word, (freq.get(word) || 0) + 1);
    });

    // Return top keywords
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
}

export default SessionService;
