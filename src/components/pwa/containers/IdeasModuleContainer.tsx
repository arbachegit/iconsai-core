/**
 * ============================================================
 * IdeasModuleContainer.tsx - v5.4.0
 * ============================================================
 * Container INDEPENDENTE do módulo Ideias
 * CORREÇÃO: Adiciona salvamento no historyStore (addMessage)
 * ============================================================
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Lightbulb, ArrowLeft, History } from "lucide-react";
import { SpectrumAnalyzer } from "../voice/SpectrumAnalyzer";
import { PlayButton } from "../voice/PlayButton";
import { ToggleMicrophoneButton } from "../voice/ToggleMicrophoneButton";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";
import { supabase } from "@/integrations/supabase/client";

const MODULE_CONFIG = {
  name: "Ideias",
  icon: Lightbulb,
  color: "#F59E0B",
  bgColor: "bg-amber-500/20",
  moduleType: "ideas" as const,
  defaultWelcome: "Olá! Sou seu assistente de ideias. Vamos desenvolver e validar suas ideias de negócio juntos!",
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
        console.log("[IdeasContainer] Buscando saudação contextual...");

        const { data, error } = await supabase.functions.invoke("pwa-contextual-memory", {
          body: {
            deviceId,
            moduleType: MODULE_CONFIG.moduleType,
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
          const configWelcome = (pwaConfig as any)?.ideasWelcomeText;
          setGreeting(configWelcome?.replace("[name]", userName || "") || MODULE_CONFIG.defaultWelcome);
        }
      } catch (err) {
        console.warn("[IdeasContainer] Exceção:", err);
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

    console.log("[IdeasContainer] Executando autoplay");
    setHasPlayedAutoplay(true);

    speak(greeting, MODULE_CONFIG.moduleType).catch((err) => {
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
      const data = useAudioManager.getState().getFrequencyData();
      if (data.length > 0) setFrequencyData(data);
      animationRef.current = requestAnimationFrame(updateFrequency);
    };

    animationRef.current = requestAnimationFrame(updateFrequency);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioManager.isPlaying]);

  const handleBack = useCallback(() => {
    stop();
    onBack();
  }, [stop, onBack]);

  const handleAudioCapture = async (audioBlob: Blob) => {
    if (isProcessing || isLoading) return;
    setIsProcessing(true);

    try {
      console.log("[IdeasContainer] Processando áudio capturado...");

      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");

      const { data: sttData, error: sttError } = await supabase.functions.invoke("speech-to-text", {
        body: formData,
      });

      if (sttError) throw new Error(`STT_ERROR: ${sttError.message}`);

      const userText = sttData?.text;
      if (!userText?.trim()) throw new Error("STT_EMPTY");

      // Salvar mensagem do usuário no estado local
      setMessages((prev) => [...prev, { role: "user", content: userText }]);

      // Salvar no historyStore para aparecer no histórico
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

      // Salvar resposta do assistente no estado local
      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);

      // Salvar no historyStore para aparecer no histórico
      addMessage(MODULE_CONFIG.moduleType, {
        role: "assistant",
        title: aiResponse,
        audioUrl: "",
        duration: 0,
        transcription: aiResponse,
      });

      await speak(aiResponse, MODULE_CONFIG.moduleType);
    } catch (error: any) {
      console.error("[IdeasContainer] ERRO:", error);

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
