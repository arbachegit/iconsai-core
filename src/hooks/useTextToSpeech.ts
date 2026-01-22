/**
 * ============================================================
 * useTextToSpeech.ts - Hook de Text-to-Speech
 * ============================================================
 * Versão: 5.3.0
 * Data: 2026-01-22
 *
 * Changelog:
 * - v5.3.0: Voz padrão mudada para "nova" (OpenAI TTS)
 * - v5.2.0: FIX loop infinito - resetar isLoading ANTES de tentar fallback
 * - v5.0.0: Fallback para Web Speech API quando áudio falha (iOS silent mode)
 * - v4.0.0: FIX memory leak - revoga URL.createObjectURL no cleanup
 * - v3.0.0: Suporte a phoneticMapOverride e userRegion
 *           para integração com classify-and-enrich
 * - v2.0.0: Integração com AudioManager global para evitar
 *           sobreposição de áudio entre módulos
 * ============================================================
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useAudioManager } from "@/stores/audioManagerStore";
import { getBrowserInfo } from "@/utils/safari-detect";
import {
  isWebSpeechAvailable,
  speakWithWebSpeech,
  stopWebSpeech,
  setWebSpeechCallbacks
} from "@/utils/web-speech-fallback";

interface UseTextToSpeechOptions {
  voice?: string;
  userRegion?: string;
}

interface SpeakOverrideOptions {
  phoneticMapOverride?: Record<string, string>;
}

interface UseTextToSpeechReturn {
  speak: (text: string, source?: string, overrideOptions?: SpeakOverrideOptions) => Promise<void>;
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
  const audioUrlRef = useRef<string | null>(null); // v4.0: Track blob URL for cleanup
  const voice = options?.voice || "nova"; // v5.3.0: OpenAI "nova" como padrão

  // Usar o AudioManager global
  const audioManager = useAudioManager();

  // v4.0: Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  // v5.2.0: Aceita overrideOptions com phoneticMapOverride + fallback Web Speech
  // FIX: Garante que isLoading seja SEMPRE resetado (evita loop infinito)
  const speak = useCallback(async (
    text: string,
    source: string = "default",
    overrideOptions?: SpeakOverrideOptions
  ) => {
    if (!text.trim()) return;

    // Gerar ID único para este áudio
    idRef.current = `tts-${Date.now()}`;

    setLocalLoading(true);
    setError(null);
    setIsPaused(false);

    const { isIOS, isSafari } = getBrowserInfo();
    const isMobile = isIOS || isSafari;

    // Guardar texto original para fallback
    const originalText = text;

    try {
      // v3.0.0: Incluir phoneticMapOverride se fornecido
      const bodyPayload: Record<string, unknown> = { text, voice };

      if (options?.userRegion) {
        bodyPayload.userRegion = options.userRegion;
      }

      if (overrideOptions?.phoneticMapOverride) {
        bodyPayload.phoneticMapOverride = overrideOptions.phoneticMapOverride;
      }

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
          body: JSON.stringify(bodyPayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      // Get audio blob directly from streaming response
      const audioBlob = await response.blob();

      // v4.0: Revoke previous URL before creating new one
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      setLocalLoading(false);

      // v5.1.0: Usar getState() para evitar loop infinito
      try {
        await useAudioManager.getState().playAudio(idRef.current, audioUrl, source);
      } catch (playError) {
        // v5.0.0: Se falhar no iOS (ex: modo silencioso), tentar Web Speech API
        if (isMobile && isWebSpeechAvailable()) {
          console.warn("[TTS v5.0] ⚠️ Áudio falhou, tentando Web Speech API...");

          // Configurar callbacks para Web Speech
          setWebSpeechCallbacks({
            onStart: () => {
              console.log("[TTS v5.0] 🗣️ Web Speech iniciado");
            },
            onEnd: () => {
              console.log("[TTS v5.0] ✅ Web Speech concluído");
            }
          });

          await speakWithWebSpeech(originalText, 'pt-BR');
        } else {
          throw playError;
        }
      }

    } catch (err) {
      console.error("TTS Error:", err);

      // v5.2.0: SEMPRE resetar loading ANTES de tentar fallback
      setLocalLoading(false);

      // v5.0.0: Última tentativa com Web Speech se disponível
      if (isMobile && isWebSpeechAvailable()) {
        console.warn("[TTS v5.0] ⚠️ Fallback final para Web Speech API...");
        try {
          await speakWithWebSpeech(originalText, 'pt-BR');
          console.log("[TTS v5.2] ✅ Web Speech fallback concluído");
          return; // Sucesso com fallback
        } catch (webSpeechErr) {
          console.error("[TTS v5.0] Web Speech também falhou:", webSpeechErr);
        }
      }

      setError(err instanceof Error ? err.message : "Falha ao gerar fala");
    }
  }, [voice, options?.userRegion]);

  // v5.1.0: Todas as funções usam getState() - deps: []
  const stop = useCallback(() => {
    useAudioManager.getState().stopAudio();
    stopWebSpeech(); // v5.0.0: Também parar Web Speech se estiver ativo
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
