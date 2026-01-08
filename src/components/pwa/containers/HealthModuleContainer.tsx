/**
 * ============================================================
 * HealthModuleContainer.tsx - v5.4.0
 * ============================================================
 * Container INDEPENDENTE do módulo Saúde
 * CORREÇÃO: Adiciona salvamento no historyStore (addMessage)
 * ============================================================
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Heart, ArrowLeft, History } from "lucide-react";
import { SpectrumAnalyzer } from "../voice/SpectrumAnalyzer";
import { PlayButton } from "../voice/PlayButton";
import { ToggleMicrophoneButton } from "../voice/ToggleMicrophoneButton";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { useHistoryStore } from "@/stores/historyStore"; // ✅ ADICIONADO
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";
import { supabase } from "@/integrations/supabase/client";

const MODULE_CONFIG = {
  name: "Saúde",
  icon: Heart,
  color: "#F43F5E",
  bgColor: "bg-rose-500/20",
  moduleType: "health" as const,
  defaultWelcome: "Olá! Sou sua assistente de saúde. Como posso ajudar você hoje?",
};

interface HealthModuleContainerProps {
  onBack: () => void;
  onHistoryClick: () => void;
  deviceId: string;
}

export const HealthModuleContainer: React.FC<HealthModuleContainerProps> = ({ onBack, onHistoryClick, deviceId }) => {
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();
  const { addMessage } = useHistoryStore(); // ✅ ADICIONADO
  const { config: pwaConfig } = useConfigPWA();
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

    const fetchGreeting = async () => {
      try {
        console.log("[HealthContainer] Buscando saudação contextual...");

        const { data, error } = await supabase.functions.invoke("pwa-contextual-memory", {
          body: {
            deviceId,
            moduleType: MODULE_CONFIG.moduleType,
            action: "getGreeting",
          },
        });

        if (error) {
          console.warn("[HealthContainer] Erro:", error);
          setGreeting(MODULE_CONFIG.defaultWelcome);
        } else if (data?.greeting) {
          console.log("[HealthContainer] Saudação contextual recebida");
          setGreeting(data.greeting);
        } else {
          const configWelcome = (pwaConfig as any)?.healthWelcomeText;
          setGreeting(configWelcome?.replace("[name]", userName || "") || MODULE_CONFIG.defaultWelcome);
        }
      } catch (err) {
        console.warn("[HealthContainer] Exceção:", err);
        setGreeting(MODULE_CONFIG.defaultWelcome);
      } finally {
        setIsGreetingReady(true);
      }
    };

    fetchGreeting();
  }, [deviceId, pwaConfig, userName, isGreetingReady]);

  // ============================================================
  // ETAPA 2: Autoplay SÓ quando greeting está pronto
  // ============================================================
  useEffect(() => {
    if (!isGreetingReady || hasPlayedAutoplay || !greeting) return;

    console.log("[HealthContainer] Executando autoplay");
    setHasPlayedAutoplay(true);

    speak(greeting, MODULE_CONFIG.moduleType).catch((err) => {
      console.warn("[HealthContainer] Autoplay bloqueado:", err);
    });
  }, [isGreetingReady, hasPlayedAutoplay, greeting, speak]);

  // Captura de frequência
  useEffect(() => {
    if (!audioManager.isPlaying) {
      setFrequencyData([]);
      return;
    }

    const updateFrequency = () => {
      const data = useAudioManager.getState().getFrequencyData();
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
        console.log("[HealthContainer] Salvando resumo...");
        await supabase.functions.invoke("generate-conversation-summary", {
          body: {
            deviceId,
            moduleType: MODULE_CONFIG.moduleType,
            messages: messages.slice(-6),
          },
        });
      } catch (err) {
        console.warn("[HealthContainer] Erro ao salvar resumo:", err);
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

      // ✅ Salvar mensagem do usuário no estado local
      setMessages((prev) => [...prev, { role: "user", content: userText }]);

      // ✅ NOVO: Salvar no historyStore para aparecer no histórico
      addMessage(MODULE_CONFIG.moduleType, {
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
          chatType: MODULE_CONFIG.moduleType,
          agentSlug: MODULE_CONFIG.moduleType,
          deviceId,
        },
      });

      if (chatError) throw new Error(`CHAT_ERROR: ${chatError.message}`);

      const aiResponse = chatData?.response || chatData?.message || chatData?.text;
      if (!aiResponse) throw new Error("CHAT_EMPTY");

      // ✅ Salvar resposta do assistente no estado local
      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);

      // ✅ NOVO: Salvar no historyStore para aparecer no histórico
      addMessage(MODULE_CONFIG.moduleType, {
        role: "assistant",
        title: aiResponse,
        audioUrl: "",
        duration: 0,
        transcription: aiResponse,
      });

      await speak(aiResponse, MODULE_CONFIG.moduleType);
    } catch (error: any) {
      console.error("[HealthContainer] ERRO:", error);

      let errorMessage = "Desculpe, ocorreu um erro. Tente novamente.";
      if (error.message?.includes("AUDIO_TOO_SHORT")) {
        errorMessage = "A gravação foi muito curta. Fale um pouco mais.";
      } else if (error.message?.includes("STT_EMPTY")) {
        errorMessage = "Não entendi o que você disse. Pode repetir?";
      }

      await speak(errorMessage, MODULE_CONFIG.moduleType);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayClick = () => {
    if (isPlaying) {
      stop();
    } else if (greeting) {
      speak(greeting, MODULE_CONFIG.moduleType);
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
            <Heart className="w-5 h-5" style={{ color: MODULE_CONFIG.color }} />
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

export default HealthModuleContainer;
