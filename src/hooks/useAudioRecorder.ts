/**
 * ============================================================
 * hooks/useAudioRecorder.ts
 * ============================================================
 * Versao: 1.0.0 - 2026-01-08
 * PRD: Microfone_objeto.zip
 * Hook para gravacao de audio com MediaRecorder
 * ============================================================
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { blobToBase64, validateAudioBlob } from "@/utils/audio";

export type RecordingState = "idle" | "recording" | "processing" | "error";

interface UseAudioRecorderOptions {
  minDuration?: number; // segundos
  maxDuration?: number; // segundos
  minSizeKB?: number;
  onRecordingStart?: () => void;
  onRecordingStop?: (blob: Blob, duration: number) => void;
  onError?: (error: string) => void;
}

interface UseAudioRecorderReturn {
  state: RecordingState;
  duration: number;
  audioBlob: Blob | null;
  audioBase64: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  reset: () => void;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const { minDuration = 0.5, maxDuration = 120, minSizeKB = 1, onRecordingStart, onRecordingStop, onError } = options;

  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Limpar recursos
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // Iniciar gravacao
  const startRecording = useCallback(async () => {
    try {
      cleanup();
      setState("recording");
      setDuration(0);
      setAudioBlob(null);
      setAudioBase64(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Coletar dados a cada 100ms
      startTimeRef.current = Date.now();

      // Timer para duracao
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        // Auto-stop se atingir duracao maxima
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);

      onRecordingStart?.();
    } catch (error) {
      console.error("[useAudioRecorder] Erro ao iniciar:", error);
      setState("error");
      onError?.("Nao foi possivel acessar o microfone");
    }
  }, [cleanup, maxDuration, onRecordingStart, onError]);

  // Parar gravacao
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || state !== "recording") return;

    setState("processing");

    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        const finalDuration = (Date.now() - startTimeRef.current) / 1000;

        // Criar blob
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        // Validar
        const validation = validateAudioBlob(blob, minSizeKB, minDuration, finalDuration);

        if (!validation.valid) {
          console.warn("[useAudioRecorder] Audio invalido:", validation.reason);
          onError?.(validation.reason || "Audio muito curto");
          cleanup();
          setState("idle");
          resolve();
          return;
        }

        // Converter para base64
        try {
          const base64 = await blobToBase64(blob);
          setAudioBlob(blob);
          setAudioBase64(base64);
          onRecordingStop?.(blob, finalDuration);
        } catch (error) {
          console.error("[useAudioRecorder] Erro ao converter:", error);
          onError?.("Erro ao processar audio");
        }

        cleanup();
        setState("idle");
        resolve();
      };

      mediaRecorder.stop();
    });
  }, [state, cleanup, minSizeKB, minDuration, onRecordingStop, onError]);

  // Cancelar gravacao
  const cancelRecording = useCallback(() => {
    cleanup();
    setState("idle");
    setDuration(0);
    setAudioBlob(null);
    setAudioBase64(null);
  }, [cleanup]);

  // Reset
  const reset = useCallback(() => {
    cancelRecording();
  }, [cancelRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    duration,
    audioBlob,
    audioBase64,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  };
}

export default useAudioRecorder;
