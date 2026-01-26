/**
 * Home Agent Service - API Communication
 * @version 1.0.0
 * @date 2026-01-25
 *
 * Handles communication with Supabase edge functions for:
 * - Voice-to-text (transcription)
 * - AI response generation
 * - Text-to-speech
 */

import { supabase } from '@/integrations/supabase/client';

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
}

export interface AIResponse {
  success: boolean;
  text?: string;
  audioUrl?: string;
  error?: string;
}

export interface ConversationContext {
  deviceId: string;
  sessionId: string;
  agentName: string;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Transcribe audio to text
 */
export async function transcribeAudio(
  audioBase64: string,
  context: ConversationContext
): Promise<TranscriptionResult> {
  try {
    const { data, error } = await supabase.functions.invoke('voice-to-text', {
      body: {
        audio: audioBase64,
        deviceId: context.deviceId,
        sessionId: context.sessionId,
      },
    });

    if (error) {
      console.error('[HomeAgentService] Transcription error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      text: data?.text || data?.transcript || '',
    };
  } catch (err) {
    console.error('[HomeAgentService] Transcription failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Transcription failed',
    };
  }
}

/**
 * Get AI response for user message
 */
export async function getAIResponse(
  userMessage: string,
  context: ConversationContext
): Promise<AIResponse> {
  try {
    // Format history for edge function
    const history = (context.messages || []).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const { data, error } = await supabase.functions.invoke('pwa-home-agent', {
      body: {
        prompt: userMessage,
        deviceId: context.deviceId,
        sessionId: context.sessionId,
        history,
      },
    });

    if (error) {
      console.error('[HomeAgentService] AI response error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      text: data?.response || data?.text || '',
      audioUrl: data?.audioUrl,
    };
  } catch (err) {
    console.error('[HomeAgentService] AI response failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'AI response failed',
    };
  }
}

/**
 * Convert text to speech
 */
export async function textToSpeech(
  text: string,
  options?: {
    voice?: string;
    rate?: number;
  }
): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('text-to-speech', {
      body: {
        text,
        voice: options?.voice || 'nova',
        speed: options?.rate || 1.0,
      },
    });

    if (error) {
      console.error('[HomeAgentService] TTS error:', error);
      return { success: false, error: error.message };
    }

    // Handle different response formats
    if (data?.audioUrl) {
      return { success: true, audioUrl: data.audioUrl };
    }

    if (data?.audio) {
      // If we get base64 audio, convert to URL
      const audioBlob = base64ToBlob(data.audio, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);
      return { success: true, audioUrl };
    }

    return { success: false, error: 'No audio in response' };
  } catch (err) {
    console.error('[HomeAgentService] TTS failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'TTS failed',
    };
  }
}

/**
 * Process voice input end-to-end:
 * 1. Transcribe audio
 * 2. Get AI response
 * 3. Convert to speech
 */
export async function processVoiceInput(
  audioBase64: string,
  context: ConversationContext
): Promise<{
  success: boolean;
  userText?: string;
  assistantText?: string;
  audioUrl?: string;
  error?: string;
}> {
  // Step 1: Transcribe
  const transcription = await transcribeAudio(audioBase64, context);
  if (!transcription.success || !transcription.text) {
    return {
      success: false,
      error: transcription.error || 'Failed to transcribe audio',
    };
  }

  // Step 2: Get AI response
  const contextWithHistory: ConversationContext = {
    ...context,
    messages: [
      ...(context.messages || []),
      { role: 'user', content: transcription.text },
    ],
  };

  const aiResponse = await getAIResponse(transcription.text, contextWithHistory);
  if (!aiResponse.success || !aiResponse.text) {
    return {
      success: false,
      userText: transcription.text,
      error: aiResponse.error || 'Failed to get AI response',
    };
  }

  // Step 3: Convert to speech (if no audio URL provided)
  let audioUrl = aiResponse.audioUrl;
  if (!audioUrl && aiResponse.text) {
    const ttsResult = await textToSpeech(aiResponse.text);
    if (ttsResult.success) {
      audioUrl = ttsResult.audioUrl;
    }
  }

  return {
    success: true,
    userText: transcription.text,
    assistantText: aiResponse.text,
    audioUrl,
  };
}

// Helper function
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export default {
  transcribeAudio,
  getAIResponse,
  textToSpeech,
  processVoiceInput,
};
