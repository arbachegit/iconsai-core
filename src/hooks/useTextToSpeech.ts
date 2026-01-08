/**
 * ============================================================
 * useTextToSpeech.ts - Hook de Text-to-Speech
 * ============================================================
 * Versão: 2.0.0
 * Data: 2026-01-04
 * 
 * Changelog:
 * - v2.0.0: Integração com AudioManager global para evitar
 *           sobreposição de áudio entre módulos
 * ============================================================
 */

import { useState, useCallback, useRef } from "react";
import { useAudioManager } from "@/stores/audioManagerStore";

interface UseTextToSpeechOptions {
  voice?: string;
}

interface UseTextToSpeechReturn {
  speak: (text: string, source?: string) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  progress: number;
  error: string | null;
}

export const useTextToSpeech = (options?: UseTextToSpeechOptions): UseTextToSpeechReturn => {
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  
  const idRef = useRef<string>("");
  const voice = options?.voice || "fernando";
  
  // Usar o AudioManager global
  const audioManager = useAudioManager();

  // v5.1.0: Remover audioManager das deps - usar getState() dentro
  const speak = useCallback(async (text: string, source: string = "default") => {
    if (!text.trim()) return;
    
    // Gerar ID único para este áudio
    idRef.current = `tts-${Date.now()}`;
    
    setLocalLoading(true);
    setError(null);
    setIsPaused(false);

    try {
      // Use fetch directly because the edge function returns streaming audio
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voice }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      // Get audio blob directly from streaming response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      setLocalLoading(false);
      
      // v5.1.0: Usar getState() para evitar loop infinito
      await useAudioManager.getState().playAudio(idRef.current, audioUrl, source);

    } catch (err) {
      console.error("TTS Error:", err);
      setError(err instanceof Error ? err.message : "Falha ao gerar fala");
      setLocalLoading(false);
    }
  }, [voice]);

  // v5.1.0: Todas as funções usam getState() - deps: []
  const stop = useCallback(() => {
    useAudioManager.getState().stopAudio();
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    useAudioManager.getState().pauseAudio();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    useAudioManager.getState().resumeAudio();
    setIsPaused(false);
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    isPlaying: audioManager.isPlaying,
    isPaused,
    isLoading: localLoading || audioManager.isLoading,
    progress: audioManager.progress,
    error,
  };
};

export default useTextToSpeech;
