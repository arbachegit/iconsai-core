/**
 * ============================================================
 * HealthModuleContainer.tsx - Container INDEPENDENTE para Saúde
 * ============================================================
 * Versão: 7.0.0 - 2026-01-15
 * FIX: Usa SEMPRE texto do useConfigPWA (não chama edge functions)
 * ============================================================
 * CHANGELOG v7.0.0:
 * - Removida chamada a pwa-contextual-memory
 * - Texto de boas-vindas vem DIRETO do useConfigPWA
 * - Autoplay mais rápido e confiável
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
import { useHistoryStore } from "@/stores/historyStore";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";
import { supabase } from "@/integrations/supabase/client";
import { classifyAndEnrich } from "@/hooks/useClassifyAndEnrich";
import { useSaveMessage } from "@/hooks/useSaveMessage";

const MODULE_CONFIG = {
  name: "Saúde",
  icon: Heart,
  color: "#F43F5E",
  bgColor: "bg-rose-500/20",
  moduleType: "health" as const,
};

interface HealthModuleContainerProps {
  onBack: () => void;
  onHistoryClick: () => void;
  deviceId: string;
}

export const HealthModuleContainer: React.FC<HealthModuleContainerProps> = ({ onBack, onHistoryClick, deviceId }) => {
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();
  const { addMessage } = useHistoryStore();
  const { config: pwaConfig, isLoading: isConfigLoading } = useConfigPWA();
  const { userName } = usePWAVoiceStore();
  const { saveConversationTurn } = useSaveMessage();

  const [hasPlayedAutoplay, setHasPlayedAutoplay] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  const animationRef = useRef<number | null>(null);

  // ============================================================
  // ETAPA 1: TEXTO DE BOAS-VINDAS DIRETO DO CONFIG
  // v7.0.0: Sem chamada externa, usa SEMPRE useConfigPWA
  // ============================================================
  const getWelcomeText = useCallback((): string => {
    let text = pwaConfig.healthWelcomeText ||
      "Olá! Sou sua assistente de saúde do KnowYOU. Vou te ajudar a entender melhor seus sintomas. Toque no microfone para começar.";

    if (userName) {
      text = text.replace("[name]", userName);
    } else {
      text = text.replace("[name]", "").replace(/\s+/g, " ").trim();
    }

    return text;
  }, [pwaConfig.healthWelcomeText, userName]);

  const isGreetingReady = !isConfigLoading;

  // ============================================================
  // ETAPA 2: Autoplay (v7.0.0 - simplificado)
  // ============================================================
  useEffect(() => {
    if (!isGreetingReady || hasPlayedAutoplay) return;

    const welcomeText = getWelcomeText();
    if (!welcomeText) return;

    console.log("[HealthContainer v7] 🚀 Executando autoplay com texto do config...");
    setHasPlayedAutoplay(true);

    const executeAutoplay = async () => {
      try {
        const enrichment = await classifyAndEnrich(welcomeText, MODULE_CONFIG.moduleType);
        await speak(enrichment.enrichedText || welcomeText, MODULE_CONFIG.moduleType, {
          phoneticMapOverride: enrichment.phoneticMap,
        });
      } catch (err) {
        console.warn("[HealthContainer v7] ⚠️ Autoplay bloqueado:", err);
      }
    };

    executeAutoplay();
  }, [isGreetingReady, hasPlayedAutoplay, getWelcomeText, speak]);

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

      setMessages((prev) => [...prev, { role: "user", content: userText }]);

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

      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);

      addMessage(MODULE_CONFIG.moduleType, {
        role: "assistant",
        title: aiResponse,
        audioUrl: "",
        duration: 0,
        transcription: aiResponse,
      });

      // Classificar e enriquecer para TTS contextual
      const enrichment = await classifyAndEnrich(aiResponse, MODULE_CONFIG.moduleType);

      await speak(enrichment.enrichedText || aiResponse, MODULE_CONFIG.moduleType, {
        phoneticMapOverride: enrichment.phoneticMap
      });

      // ✅ SALVAR NO BANCO DE DADOS
      saveConversationTurn(deviceId, MODULE_CONFIG.moduleType, userText, aiResponse).then((result) => {
        console.log("[HealthContainer] 💾 Mensagens salvas:", result);
      });
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

  const handlePlayClick = useCallback(async () => {
    if (isPlaying) {
      stop();
    } else {
      const welcomeText = getWelcomeText();
      if (welcomeText) {
        try {
          const enrichment = await classifyAndEnrich(welcomeText, MODULE_CONFIG.moduleType);
          await speak(enrichment.enrichedText || welcomeText, MODULE_CONFIG.moduleType, {
            phoneticMapOverride: enrichment.phoneticMap,
          });
        } catch (err) {
          console.warn("[HealthContainer v7] ⚠️ Erro ao reproduzir:", err);
        }
      }
    }
  }, [isPlaying, getWelcomeText, speak, stop]);

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
