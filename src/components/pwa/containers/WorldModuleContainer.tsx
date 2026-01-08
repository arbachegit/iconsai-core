/**
 * ============================================================
 * WorldModuleContainer.tsx - v5.0.0
 * ============================================================
 * Container INDEPENDENTE do módulo Mundo
 * - Autoplay GARANTIDO em 2 etapas
 * - Salva resumo ao sair
 * ============================================================
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Globe, ArrowLeft, History } from "lucide-react";
import { SpectrumAnalyzer } from "../voice/SpectrumAnalyzer";
import { PlayButton } from "../voice/PlayButton";
import { ToggleMicrophoneButton } from "../voice/ToggleMicrophoneButton";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";
import { supabase } from "@/integrations/supabase/client";

const MODULE_CONFIG = {
  name: "Mundo",
  icon: Globe,
  color: "#10B981",
  bgColor: "bg-emerald-500/20",
  moduleType: "world" as const,
  defaultWelcome: "Olá! Sou seu analista de economia. O que gostaria de saber sobre o cenário econômico?",
};

interface WorldModuleContainerProps {
  onBack: () => void;
  onHistoryClick: () => void;
  deviceId: string;
}

export const WorldModuleContainer: React.FC<WorldModuleContainerProps> = ({ 
  onBack, 
  onHistoryClick,
  deviceId 
}) => {
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();
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

  // ETAPA 1: Buscar greeting
  useEffect(() => {
    if (isGreetingReady) return;

    const fetchGreeting = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("pwa-contextual-memory", {
          body: { deviceId, moduleType: MODULE_CONFIG.moduleType, action: "getGreeting" },
        });

        if (error || !data?.greeting) {
          const configWelcome = (pwaConfig as any)?.worldWelcomeText;
          setGreeting(configWelcome?.replace("[name]", userName || "") || MODULE_CONFIG.defaultWelcome);
        } else {
          setGreeting(data.greeting);
        }
      } catch {
        setGreeting(MODULE_CONFIG.defaultWelcome);
      } finally {
        setIsGreetingReady(true);
      }
    };

    fetchGreeting();
  }, [deviceId, pwaConfig, userName, isGreetingReady]);

  // ETAPA 2: Autoplay
  useEffect(() => {
    if (!isGreetingReady || hasPlayedAutoplay || !greeting) return;
    setHasPlayedAutoplay(true);
    speak(greeting, MODULE_CONFIG.moduleType).catch(() => {});
  }, [isGreetingReady, hasPlayedAutoplay, greeting, speak]);

  // Frequência
  useEffect(() => {
    if (!isPlaying) { setFrequencyData([]); return; }
    const update = () => {
      const data = audioManager.getFrequencyData();
      if (data.length > 0) setFrequencyData(data);
      animationRef.current = requestAnimationFrame(update);
    };
    update();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, audioManager]);

  useEffect(() => {
    return () => {
      audioManager.stopAllAndCleanup();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [audioManager]);

  // Salvar resumo ao sair
  const handleBack = useCallback(async () => {
    audioManager.stopAllAndCleanup();
    if (messages.length >= 2) {
      try {
        await supabase.functions.invoke("generate-conversation-summary", {
          body: { deviceId, moduleType: MODULE_CONFIG.moduleType, messages: messages.slice(-6) }
        });
      } catch {}
    }
    onBack();
  }, [messages, deviceId, onBack, audioManager]);

  const handleAudioCapture = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      if (!audioBlob || audioBlob.size < 1000) throw new Error("AUDIO_TOO_SHORT");

      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
      const mimeType = /iPad|iPhone|iPod/.test(navigator.userAgent) ? "audio/mp4" : audioBlob.type || "audio/webm";

      const { data: sttData, error: sttError } = await supabase.functions.invoke("voice-to-text", {
        body: { audio: base64, mimeType },
      });
      if (sttError) throw new Error("STT_ERROR");

      const userText = sttData?.text;
      if (!userText?.trim()) throw new Error("STT_EMPTY");

      setMessages(prev => [...prev, { role: "user", content: userText }]);

      const { data: chatData, error: chatError } = await supabase.functions.invoke("chat-router", {
        body: { message: userText, pwaMode: true, chatType: MODULE_CONFIG.moduleType, agentSlug: MODULE_CONFIG.moduleType, deviceId },
      });
      if (chatError) throw new Error("CHAT_ERROR");

      const aiResponse = chatData?.response || chatData?.message || chatData?.text;
      if (!aiResponse) throw new Error("CHAT_EMPTY");

      setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
      await speak(aiResponse, MODULE_CONFIG.moduleType);
    } catch (error: any) {
      let msg = "Desculpe, ocorreu um erro. Tente novamente.";
      if (error.message?.includes("AUDIO_TOO_SHORT")) msg = "A gravação foi muito curta.";
      else if (error.message?.includes("STT_EMPTY")) msg = "Não entendi. Pode repetir?";
      await speak(msg, MODULE_CONFIG.moduleType);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayClick = () => {
    if (isPlaying) stop();
    else if (greeting) speak(greeting, MODULE_CONFIG.moduleType);
  };

  const visualizerState = isRecording ? "recording" : isProcessing ? "loading" : isLoading ? "loading" : isPlaying ? "playing" : "idle";
  const buttonState = isProcessing ? "loading" : isLoading ? "loading" : isPlaying ? "playing" : "idle";

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 pt-12">
        <motion.button onClick={handleBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10" whileTap={{ scale: 0.95 }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </motion.button>
        <div className="flex items-center gap-3">
          <motion.div className={`w-10 h-10 rounded-full ${MODULE_CONFIG.bgColor} flex items-center justify-center`}
            animate={{ boxShadow: isPlaying ? [`0 0 0 0 ${MODULE_CONFIG.color}00`, `0 0 20px 5px ${MODULE_CONFIG.color}66`, `0 0 0 0 ${MODULE_CONFIG.color}00`] : "none" }}
            transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0 }}>
            <Globe className="w-5 h-5" style={{ color: MODULE_CONFIG.color }} />
          </motion.div>
          <span className="text-lg font-semibold text-white">{MODULE_CONFIG.name}</span>
        </div>
        <motion.button onClick={onHistoryClick} className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/10" whileTap={{ scale: 0.95 }}>
          <History className="w-5 h-5 text-white" />
        </motion.button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <SpectrumAnalyzer state={visualizerState} frequencyData={frequencyData} primaryColor={MODULE_CONFIG.color} secondaryColor={MODULE_CONFIG.color} height={120} width={280} />
        <PlayButton state={buttonState} onClick={handlePlayClick} progress={progress} size="lg" primaryColor={MODULE_CONFIG.color} />
        <ToggleMicrophoneButton onAudioCapture={handleAudioCapture} disabled={isLoading} isPlaying={isPlaying} isProcessing={isProcessing} primaryColor={MODULE_CONFIG.color} onFrequencyData={setFrequencyData} onRecordingChange={setIsRecording} maxDurationSeconds={60} />
      </div>
    </div>
  );
};

export default WorldModuleContainer;
