/**
 * useHomeConversation - Conversation State Hook
 * @version 1.0.0
 * @date 2026-01-25
 *
 * Manages conversation state and history for Home Agent.
 */

import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ConversationMessage, AgentConversation } from '@/core/types';
import { processVoiceInput, textToSpeech } from '../services/homeAgentService';
import { HOME_WELCOME_MESSAGE } from '../config';

interface UseHomeConversationProps {
  deviceId: string;
  sessionId: string;
  agentName: string;
}

interface UseHomeConversationReturn {
  /** Current conversation */
  conversation: AgentConversation | null;
  /** All messages in current conversation */
  messages: ConversationMessage[];
  /** Whether a request is in progress */
  isProcessing: boolean;
  /** Current error if any */
  error: string | null;
  /** Add a user message and get AI response */
  sendAudioMessage: (audioBase64: string) => Promise<{
    success: boolean;
    audioUrl?: string;
    error?: string;
  }>;
  /** Get welcome message audio */
  getWelcomeAudio: () => Promise<string | null>;
  /** Clear conversation */
  clearConversation: () => void;
  /** Mark first interaction complete */
  setFirstInteractionComplete: () => void;
  /** Whether first interaction is complete */
  isFirstInteractionComplete: boolean;
}

export function useHomeConversation({
  deviceId,
  sessionId,
  agentName,
}: UseHomeConversationProps): UseHomeConversationReturn {
  const [conversation, setConversation] = useState<AgentConversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstInteractionComplete, setIsFirstInteractionComplete] = useState(false);
  const welcomeAudioUrlRef = useRef<string | null>(null);

  // Initialize conversation if needed
  const ensureConversation = useCallback(() => {
    if (!conversation) {
      const newConversation: AgentConversation = {
        id: uuidv4(),
        agentName,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setConversation(newConversation);
      return newConversation;
    }
    return conversation;
  }, [conversation, agentName]);

  // Get welcome audio
  const getWelcomeAudio = useCallback(async (): Promise<string | null> => {
    if (welcomeAudioUrlRef.current) {
      return welcomeAudioUrlRef.current;
    }

    try {
      const result = await textToSpeech(HOME_WELCOME_MESSAGE.text);
      if (result.success && result.audioUrl) {
        welcomeAudioUrlRef.current = result.audioUrl;
        return result.audioUrl;
      }
      return null;
    } catch (err) {
      console.error('[useHomeConversation] Failed to get welcome audio:', err);
      return null;
    }
  }, []);

  // Send audio message and get response
  const sendAudioMessage = useCallback(async (audioBase64: string): Promise<{
    success: boolean;
    audioUrl?: string;
    error?: string;
  }> => {
    setIsProcessing(true);
    setError(null);

    try {
      const conv = ensureConversation();

      const result = await processVoiceInput(audioBase64, {
        deviceId,
        sessionId,
        agentName,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      if (!result.success) {
        setError(result.error || 'Failed to process voice input');
        return { success: false, error: result.error };
      }

      // Add user message
      if (result.userText) {
        const userMessage: ConversationMessage = {
          id: uuidv4(),
          role: 'user',
          content: result.userText,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
      }

      // Add assistant message
      if (result.assistantText) {
        const assistantMessage: ConversationMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: result.assistantText,
          audioUrl: result.audioUrl,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

      // Update conversation
      setConversation(prev => prev ? {
        ...prev,
        messages: [...messages, ...(result.userText ? [{
          id: uuidv4(),
          role: 'user' as const,
          content: result.userText,
          timestamp: new Date(),
        }] : []), ...(result.assistantText ? [{
          id: uuidv4(),
          role: 'assistant' as const,
          content: result.assistantText,
          audioUrl: result.audioUrl,
          timestamp: new Date(),
        }] : [])],
        updatedAt: new Date(),
      } : prev);

      return {
        success: true,
        audioUrl: result.audioUrl,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, [deviceId, sessionId, agentName, messages, ensureConversation]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setConversation(null);
    setMessages([]);
    setError(null);
  }, []);

  // Mark first interaction complete
  const setFirstInteractionComplete = useCallback(() => {
    setIsFirstInteractionComplete(true);
  }, []);

  return {
    conversation,
    messages,
    isProcessing,
    error,
    sendAudioMessage,
    getWelcomeAudio,
    clearConversation,
    setFirstInteractionComplete,
    isFirstInteractionComplete,
  };
}

export default useHomeConversation;
