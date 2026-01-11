/**
 * ============================================================
 * IdeasModuleContainer.tsx - Container INDEPENDENTE para Ideias
 * ============================================================
 * Versão: 5.5.0 - 2026-01-09
 * FIX: Verificação de deviceId vazio antes de chamar API
 * ============================================================
 * CHANGELOG v5.5.0:
 * - Adicionado if (!deviceId) return; para evitar erro 400
 * ============================================================
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Lightbulb, ArrowLeft, History } from "lucide-react";
import { SpectrumAnalyzer } from "../voice/SpectrumAnalyzer";
import { PlayButton } from "../voice/PlayButton";
import { ToggleMicrophoneButton } from "../voice/ToggleMicrophoneButton";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { useHistoryStore } from "@/stores/historyStore";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";
import { supabase } from "@/integrations/supabase/client";

const MODULE_CONFIG = {
  type: "ideas" as const,
  name: "Ideias",
  color: "#F59E0B",
  bgColor: "bg-amber-500/20",
  defaultWelcome:
    "Olá! Sou seu consultor de ideias usando a técnica do Advogado do Diabo. Vou te ajudar a fortalecer suas ideias através de questionamentos duros. O que você está planejando?",
};

interface IdeasModuleContainerProps {
  onBack: () => void;
  onHistoryClick: () => void;
  deviceId: string;
}

export const IdeasModuleContainer: React.FC<IdeasModuleContainerProps> = ({ onBack, onHistoryClick, deviceId }) => {
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();
  const { addMessage } = useHistoryStore();
  const { userName } = usePWAVoiceStore();

  const [greeting, setGreeting] = useState<string | null>(null);
  const [isGreetingReady, setIsGreetingReady] = useState(false);
  const [hasPlayedAutoplay, setHasPlayedAutoplay] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  const animationRef = useRef<number | null>(null);

  // ============================================================
  // ETAPA 1: Buscar greeting com FALLBACK GARANTIDO
  // ============================================================
  useEffect(() => {
    if (isGreetingReady) return;
    if (!deviceId) return; // FIX v5.5.0: Evitar chamada com deviceId vazio

    const fetchGreeting = async () => {
      try {
        console.log("[IdeasContainer] Buscando saudação contextual...");

        const { data, error } = await supabase.functions.invoke("pwa-contextual-memory", {
          body: {
            deviceId,
            moduleType: MODULE_CONFIG.type,
            action: "getGreeting",
          },
        });

        if (error) {
          console.warn("[IdeasContainer] Erro:", error);
          setGreeting(MODULE_CONFIG.defaultWelcome);
        } else if (data?.greeting) {
          console.log("[IdeasContainer] Saudação contextual recebida");
          setGreeting(data.greeting);
        } else {
          setGreeting(MODULE_CONFIG.defaultWelcome.replace("[name]", userName || ""));
        }
      } catch (err) {
        console.warn("[IdeasContainer] Exceção:", err);
        setGreeting(MODULE_CONFIG.defaultWelcome);
      } finally {
        setIsGreetingReady(true);
      }
    };

    fetchGreeting();
  }, [deviceId, userName, isGreetingReady]);

  // ============================================================
  // ETAPA 2: Autoplay SÓ quando greeting está pronto
  // ============================================================
  useEffect(() => {
    if (!isGreetingReady || hasPlayedAutoplay || !greeting) return;

    console.log("[IdeasContainer] Executando autoplay");
    setHasPlayedAutoplay(true);

    speak(greeting, MODULE_CONFIG.type).catch((err) => {
      console.warn("[IdeasContainer] Autoplay bloqueado:", err);
    });
  }, [isGreetingReady, hasPlayedAutoplay, greeting, speak]);

  // Captura de frequência
  useEffect(() => {
    if (!audioManager.isPlaying) {
      setFrequencyData([]);
      return;
    }

    const updateFrequency = () => {
      const data = audioManager.getFrequencyData();
      if (data.length > 0) setFrequencyData(data);
      animationRef.current = requestAnimationFrame(updateFrequency);
    };

    updateFrequency();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [audioManager.isPlaying]);

  // Cleanup
  useEffect(() => {
    return () => {
      useAudioManager.getState().stopAllAndCleanup();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // ============================================================
  // SALVAR RESUMO AO SAIR
  // ============================================================
  const handleBack = useCallback(async () => {
    useAudioManager.getState().stopAllAndCleanup();

    if (messages.length >= 2) {
      try {
        console.log("[IdeasContainer] Salvando resumo...");
        await supabase.functions.invoke("generate-conversation-summary", {
          body: {
            deviceId,
            moduleType: MODULE_CONFIG.type,
            messages: messages.slice(-6),
          },
        });
      } catch (err) {
        console.warn("[IdeasContainer] Erro ao salvar resumo:", err);
      }
    }

    onBack();
  }, [messages, deviceId, onBack]);

  // Handler de áudio
  const handleAudioCapture = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      if (!audioBlob || audioBlob.size < 1000) {
        throw new Error("AUDIO_TOO_SHORT");
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));

      let mimeType = audioBlob.type || "audio/webm";
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        mimeType = "audio/mp4";
      }

      const { data: sttData, error: sttError } = await supabase.functions.invoke("voice-to-text", {
        body: { audio: base64, mimeType },
      });

      if (sttError) throw new Error(`STT_ERROR: ${sttError.message}`);

      const userText = sttData?.text;
      if (!userText?.trim()) throw new Error("STT_EMPTY");

      setMessages((prev) => [...prev, { role: "user", content: userText }]);

      addMessage(MODULE_CONFIG.type, {
        role: "user",
        title: userText,
        audioUrl: "",
        duration: 0,
        transcription: userText,
      });

      const { data: chatData, error: chatError } = await supabase.functions.invoke("chat-router", {
        body: {
          message: userText,
          pwaMode: true,
          chatType: MODULE_CONFIG.type,
          agentSlug: MODULE_CONFIG.type,
          deviceId,
        },
      });

      if (chatError) throw new Error(`CHAT_ERROR: ${chatError.message}`);

      const aiResponse = chatData?.response || chatData?.message || chatData?.text;
      if (!aiResponse) throw new Error("CHAT_EMPTY");

      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);

      addMessage(MODULE_CONFIG.type, {
        role: "assistant",
        title: aiResponse,
        audioUrl: "",
        duration: 0,
        transcription: aiResponse,
      });

      await speak(aiResponse, MODULE_CONFIG.type);
    } catch (error: any) {
      console.error("[IdeasContainer] ERRO:", error);

      let errorMessage = "Desculpe, ocorreu um erro. Tente novamente.";
      if (error.message?.includes("AUDIO_TOO_SHORT")) {
        errorMessage = "A gravação foi muito curta. Fale um pouco mais.";
      } else if (error.message?.includes("STT_EMPTY")) {
        errorMessage = "Não entendi o que você disse. Pode repetir?";
      }

      await speak(errorMessage, MODULE_CONFIG.type);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayClick = () => {
    if (isPlaying) {
      stop();
    } else if (greeting) {
      speak(greeting, MODULE_CONFIG.type);
    }
  };

  const visualizerState = isRecording
    ? "recording"
    : isProcessing
      ? "loading"
      : isLoading
        ? "loading"
        : isPlaying
          ? "playing"
          : "idle";
  const buttonState = isProcessing ? "loading" : isLoading ? "loading" : isPlaying ? "playing" : "idle";

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 pt-12">
        <motion.button
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </motion.button>

        <div className="flex items-center gap-3">
          <motion.div
            className={`w-10 h-10 rounded-full ${MODULE_CONFIG.bgColor} flex items-center justify-center`}
            animate={{
              boxShadow: isPlaying
                ? [
                    `0 0 0 0 ${MODULE_CONFIG.color}00`,
                    `0 0 20px 5px ${MODULE_CONFIG.color}66`,
                    `0 0 0 0 ${MODULE_CONFIG.color}00`,
                  ]
                : "none",
            }}
            transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0 }}
          >
            <Lightbulb className="w-5 h-5" style={{ color: MODULE_CONFIG.color }} />
          </motion.div>
          <span className="text-lg font-semibold text-white">{MODULE_CONFIG.name}</span>
        </div>

        <motion.button
          onClick={onHistoryClick}
          className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/10"
          whileTap={{ scale: 0.95 }}
        >
          <History className="w-5 h-5 text-white" />
        </motion.button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <SpectrumAnalyzer
          state={visualizerState}
          frequencyData={frequencyData}
          primaryColor={MODULE_CONFIG.color}
          secondaryColor={MODULE_CONFIG.color}
          height={120}
          width={280}
        />

        <PlayButton
          state={buttonState}
          onClick={handlePlayClick}
          progress={progress}
          size="lg"
          primaryColor={MODULE_CONFIG.color}
        />

        <ToggleMicrophoneButton
          onAudioCapture={handleAudioCapture}
          disabled={isLoading}
          isPlaying={isPlaying}
          isProcessing={isProcessing}
          primaryColor={MODULE_CONFIG.color}
          onFrequencyData={setFrequencyData}
          onRecordingChange={setIsRecording}
          maxDurationSeconds={60}
        />
      </div>
    </div>
  );
};

export default IdeasModuleContainer;
