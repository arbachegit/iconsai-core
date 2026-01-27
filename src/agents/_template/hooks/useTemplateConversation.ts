/**
 * Template Agent Conversation Hook
 * @version 1.0.0
 *
 * Manages conversation state and interactions for the Template Agent.
 *
 * INSTRUCTIONS:
 * 1. Rename to use[YourAgent]Conversation.ts
 * 2. Update function name and references
 * 3. Customize for your agent's needs
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ConversationMessage } from '@/core/types';
import { TEMPLATE_SETTINGS } from '../config';

interface UseTemplateConversationOptions {
  deviceId: string;
  sessionId: string;
  agentName: string;
}

interface SendMessageResult {
  success: boolean;
  audioUrl?: string;
  text?: string;
  error?: string;
}

export function useTemplateConversation({
  deviceId,
  sessionId,
  agentName,
}: UseTemplateConversationOptions) {
  // State
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstInteractionComplete, setIsFirstInteractionComplete] = useState(false);

  // Refs
  const conversationIdRef = useRef<string | null>(null);

  /**
   * Get or create conversation ID
   */
  const getConversationId = useCallback(async (): Promise<string> => {
    if (conversationIdRef.current) {
      return conversationIdRef.current;
    }

    // Create new conversation in database
    const { data, error } = await supabase
      .from('pwa_conversations')
      .insert({
        device_id: deviceId,
        session_id: sessionId,
        agent_name: agentName,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[useTemplateConversation] Error creating conversation:', error);
      throw error;
    }

    conversationIdRef.current = data.id;
    return data.id;
  }, [deviceId, sessionId, agentName]);

  /**
   * Get welcome audio URL
   */
  const getWelcomeAudio = useCallback(async (): Promise<string | null> => {
    try {
      // Option 1: Use pre-recorded welcome audio
      // return 'https://your-storage.com/welcome.mp3';

      // Option 2: Generate TTS for welcome message
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: TEMPLATE_SETTINGS.welcomeMessage,
          voice_id: 'default', // or your preferred voice
        },
      });

      if (error) {
        console.error('[useTemplateConversation] TTS error:', error);
        return null;
      }

      return data?.audio_url || null;
    } catch (err) {
      console.error('[useTemplateConversation] Welcome audio error:', err);
      return null;
    }
  }, []);

  /**
   * Send audio message and get response
   */
  const sendAudioMessage = useCallback(async (
    audioBase64: string
  ): Promise<SendMessageResult> => {
    setIsProcessing(true);
    setError(null);

    try {
      const conversationId = await getConversationId();

      // Call the agent's edge function
      const { data, error: fnError } = await supabase.functions.invoke(
        `pwa-${agentName}-agent`,
        {
          body: {
            audio_base64: audioBase64,
            device_id: deviceId,
            session_id: sessionId,
            conversation_id: conversationId,
          },
        }
      );

      if (fnError) {
        throw fnError;
      }

      // Add messages to state
      if (data.user_text) {
        setMessages(prev => [...prev, {
          id: `user-${Date.now()}`,
          role: 'user',
          content: data.user_text,
          timestamp: new Date(),
        }]);
      }

      if (data.assistant_text) {
        setMessages(prev => [...prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.assistant_text,
          audioUrl: data.audio_url,
          timestamp: new Date(),
        }]);
      }

      return {
        success: true,
        audioUrl: data.audio_url,
        text: data.assistant_text,
      };
    } catch (err) {
      console.error('[useTemplateConversation] Error:', err);
      const errorMessage = err instanceof Error ? err.message : TEMPLATE_SETTINGS.errorMessage;
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [deviceId, sessionId, agentName, getConversationId]);

  /**
   * Send text message (optional, for text input support)
   */
  const sendTextMessage = useCallback(async (
    text: string
  ): Promise<SendMessageResult> => {
    setIsProcessing(true);
    setError(null);

    try {
      const conversationId = await getConversationId();

      // Add user message immediately
      setMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date(),
      }]);

      // Call the agent's edge function
      const { data, error: fnError } = await supabase.functions.invoke(
        `pwa-${agentName}-agent`,
        {
          body: {
            text,
            device_id: deviceId,
            session_id: sessionId,
            conversation_id: conversationId,
          },
        }
      );

      if (fnError) {
        throw fnError;
      }

      // Add assistant response
      if (data.assistant_text) {
        setMessages(prev => [...prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.assistant_text,
          audioUrl: data.audio_url,
          timestamp: new Date(),
        }]);
      }

      return {
        success: true,
        audioUrl: data.audio_url,
        text: data.assistant_text,
      };
    } catch (err) {
      console.error('[useTemplateConversation] Error:', err);
      const errorMessage = err instanceof Error ? err.message : TEMPLATE_SETTINGS.errorMessage;
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [deviceId, sessionId, agentName, getConversationId]);

  /**
   * Clear conversation
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    conversationIdRef.current = null;
  }, []);

  /**
   * Mark first interaction as complete (shows footer)
   */
  const setFirstInteractionComplete = useCallback(() => {
    setIsFirstInteractionComplete(true);
  }, []);

  return {
    // State
    messages,
    isProcessing,
    error,
    isFirstInteractionComplete,

    // Actions
    sendAudioMessage,
    sendTextMessage,
    getWelcomeAudio,
    clearConversation,
    setFirstInteractionComplete,
  };
}

export default useTemplateConversation;
