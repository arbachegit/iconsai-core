/**
 * ============================================================
 * HelpModuleContainer.tsx - Container INDEPENDENTE para Ajuda
 * ============================================================
 * Versão: 5.1.0 - 2026-01-08
 * CORREÇÃO: Removido audioManager das dependências de useEffect
 * ============================================================
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { HelpCircle, ArrowLeft, History } from "lucide-react";
import { SpectrumAnalyzer } from "../voice/SpectrumAnalyzer";
import { PlayButton } from "../voice/PlayButton";
import { ToggleMicrophoneButton } from "../voice/ToggleMicrophoneButton";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";
import { supabase } from "@/integrations/supabase/client";

const MODULE_CONFIG = {
  type: "help" as const,
  name: "Ajuda",
  color: "#3B82F6",
  bgColor: "bg-blue-500/20",
  defaultWelcome: "Olá! Posso te explicar como usar cada módulo do KnowYOU. O que você precisa de ajuda?",
};

interface HelpModuleContainerProps {
  onBack: () => void;
  onHistoryClick: () => void;
  deviceId: string;
}

export const HelpModuleContainer: React.FC<HelpModuleContainerProps> = ({ onBack, onHistoryClick, deviceId }) => {
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();
  const { userName } = usePWAVoiceStore();

  const [greeting, setGreeting] = useState<string>("");
  const [isGreetingReady, setIsGreetingReady] = useState(false);
  const [hasPlayedAutoplay, setHasPlayedAutoplay] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const animationRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // BUSCAR CONTEXTO
  useEffect(() => {
    mountedRef.current = true;

    const fetchModuleContext = async () => {
      console.log(`[Help] Iniciando busca de contexto...`);

      try {
        const { data, error } = await supabase.functions.invoke("pwa-contextual-memory", {
          body: {
            deviceId: deviceId || `anonymous-${Date.now()}`,
            moduleType: MODULE_CONFIG.type,
            action: "getGreeting",
          },
        });

        if (!mountedRef.current) return;

        if (error || !data?.greeting) {
          const fallbackGreeting = MODULE_CONFIG.defaultWelcome.replace("[name]", userName || "");
          setGreeting(fallbackGreeting);
        } else {
          setGreeting(data.greeting);
        }
      } catch (err) {
        if (mountedRef.current) {
          const fallbackGreeting = MODULE_CONFIG.defaultWelcome.replace("[name]", userName || "");
          setGreeting(fallbackGreeting);
        }
      } finally {
        if (mountedRef.current) {
          setIsGreetingReady(true);
        }
      }
    };

    fetchModuleContext();
    return () => {
      mountedRef.current = false;
    };
  }, [deviceId, userName]);

  // AUTOPLAY GARANTIDO
  useEffect(() => {
    if (!isGreetingReady || hasPlayedAutoplay || !greeting) return;

    console.log("[Help] Executando autoplay");
    setHasPlayedAutoplay(true);

    const timer = setTimeout(() => {
      if (mountedRef.current) {
        speak(greeting, MODULE_CONFIG.type).catch(console.warn);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isGreetingReady, hasPlayedAutoplay, greeting, speak]);

  // ✅ CLEANUP - Array vazio
  useEffect(() => {
    return () => {
      useAudioManager.getState().stopAllAndCleanup();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // ✅ FREQUÊNCIAS - Só audioManager.isPlaying
  useEffect(() => {
    const isAudioPlaying = audioManager.isPlaying;

    if (!isAudioPlaying) {
      setFrequencyData([]);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
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

  // ÁUDIO CAPTURE
  const handleAudioCapture = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);

      try {
        if (!audioBlob || audioBlob.size < 1000) throw new Error("AUDIO_TOO_SHORT");

        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64 = btoa(new Uint8Array(arrayBuffer).reduce((d, b) => d + String.fromCharCode(b), ""));

        let mimeType = audioBlob.type || (/iPad|iPhone|iPod/.test(navigator.userAgent) ? "audio/mp4" : "audio/webm");

        const { data: sttData, error: sttError } = await supabase.functions.invoke("voice-to-text", {
          body: { audio: base64, mimeType },
        });

        if (sttError) throw new Error(`STT_ERROR: ${sttError.message}`);
        const userText = sttData?.text;
        if (!userText?.trim()) throw new Error("STT_EMPTY");

        setMessages((prev) => [...prev, { role: "user", content: userText }]);

        const { data: chatData, error: chatError } = await supabase.functions.invoke("chat-router", {
          body: {
            message: userText,
            pwaMode: true,
            chatType: MODULE_CONFIG.type,
            agentSlug: MODULE_CONFIG.type,
            deviceId: deviceId || undefined,
          },
        });

        if (chatError) throw new Error(`CHAT_ERROR: ${chatError.message}`);
        const aiResponse = chatData?.response || chatData?.message || chatData?.text;
        if (!aiResponse) throw new Error("CHAT_EMPTY");

        setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);
        await speak(aiResponse, MODULE_CONFIG.type);
      } catch (error: any) {
        let errorMessage = "Desculpe, ocorreu um erro. Tente novamente.";
        if (error.message?.includes("AUDIO_TOO_SHORT")) errorMessage = "A gravação foi muito curta.";
        else if (error.message?.includes("STT")) errorMessage = "Não consegui processar o áudio.";
        await speak(errorMessage, MODULE_CONFIG.type);
      } finally {
        setIsProcessing(false);
      }
    },
    [deviceId, speak],
  );

  const handlePlayClick = useCallback(() => {
    if (isPlaying) stop();
    else if (greeting) speak(greeting, MODULE_CONFIG.type);
  }, [isPlaying, stop, speak, greeting]);

  // ✅ HANDLE BACK - Removido audioManager das dependências
  const handleBack = useCallback(() => {
    useAudioManager.getState().stopAllAndCleanup();
    onBack();
  }, [onBack]);

  const visualizerState = isRecording
    ? "recording"
    : isProcessing || isLoading
      ? "loading"
      : isPlaying
        ? "playing"
        : "idle";
  const buttonState = isProcessing || isLoading ? "loading" : isPlaying ? "playing" : "idle";

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
            <HelpCircle className="w-5 h-5" style={{ color: MODULE_CONFIG.color }} />
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

      {!isGreetingReady && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <motion.div
            className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
    </div>
  );
};

export default HelpModuleContainer;
