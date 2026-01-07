/**
 * ============================================================
 * PushToTalkButton.tsx - Botão Push-to-Talk
 * ============================================================
 * Versão: 1.0.0
 * 
 * Descrição: Botão de microfone com UX simplificada.
 * Pressionar e segurar para gravar, soltar para enviar.
 * Integra Web Audio API para frequências em tempo real.
 * ============================================================
 */

import React, { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Loader2, Volume2 } from "lucide-react";

interface PushToTalkButtonProps {
  onAudioCapture: (blob: Blob) => void;
  disabled?: boolean;
  isPlaying?: boolean;
  isProcessing?: boolean;
  primaryColor?: string;
  onFrequencyData?: (data: number[]) => void;
  onRecordingChange?: (isRecording: boolean) => void;
}

export const PushToTalkButton: React.FC<PushToTalkButtonProps> = ({
  onAudioCapture,
  disabled = false,
  isPlaying = false,
  isProcessing = false,
  primaryColor = "#10B981",
  onFrequencyData,
  onRecordingChange,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);

  const stopFrequencyAnalysis = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || isActiveRef.current) return;
    isActiveRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Web Audio API for frequency analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateFrequency = () => {
        if (analyserRef.current && isActiveRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          onFrequencyData?.(Array.from(dataArray));
          animationRef.current = requestAnimationFrame(updateFrequency);
        }
      };
      updateFrequency();

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 1000) {
          onAudioCapture(blob);
        }
        // Cleanup stream
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      onRecordingChange?.(true);
    } catch (error) {
      console.error("[PushToTalk] Error starting recording:", error);
      isActiveRef.current = false;
    }
  }, [disabled, onAudioCapture, onFrequencyData, onRecordingChange]);

  const stopRecording = useCallback(() => {
    if (!isActiveRef.current) return;
    isActiveRef.current = false;

    stopFrequencyAnalysis();
    onFrequencyData?.([]); // Clear frequency data

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    onRecordingChange?.(false);
  }, [stopFrequencyAnalysis, onFrequencyData, onRecordingChange]);

  // Determine visual state
  const getState = () => {
    if (isRecording) return "recording";
    if (isProcessing) return "processing";
    if (isPlaying) return "playing";
    return "idle";
  };

  const state = getState();

  // Status text
  const getStatusText = () => {
    switch (state) {
      case "recording":
        return "Solte para enviar";
      case "processing":
        return "Processando...";
      case "playing":
        return "Ouvindo resposta...";
      default:
        return "Segure para falar";
    }
  };

  // Button styling based on state
  const getButtonStyle = () => {
    switch (state) {
      case "recording":
        return {
          backgroundColor: "#EF4444",
          boxShadow: "0 0 30px rgba(239, 68, 68, 0.5)",
        };
      case "processing":
        return {
          backgroundColor: primaryColor,
          opacity: 0.7,
        };
      case "playing":
        return {
          backgroundColor: primaryColor,
          boxShadow: `0 0 20px ${primaryColor}66`,
        };
      default:
        return {
          backgroundColor: primaryColor,
        };
    }
  };

  const Icon = state === "processing" ? Loader2 : state === "playing" ? Volume2 : Mic;

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onMouseLeave={stopRecording}
        onTouchStart={(e) => {
          e.preventDefault();
          startRecording();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          stopRecording();
        }}
        onTouchCancel={stopRecording}
        disabled={disabled || isProcessing || isPlaying}
        className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none touch-none"
        style={getButtonStyle()}
        animate={{
          scale: isRecording ? 1.15 : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
      >
        {/* Pulse animation when recording */}
        {isRecording && (
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Playing pulse */}
        {isPlaying && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: primaryColor }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        <Icon
          className={`w-8 h-8 text-white relative z-10 ${
            state === "processing" ? "animate-spin" : ""
          } ${isRecording ? "animate-pulse" : ""}`}
        />
      </motion.button>

      <span className="text-sm text-white/60 font-medium">
        {getStatusText()}
      </span>
    </div>
  );
};

export default PushToTalkButton;
