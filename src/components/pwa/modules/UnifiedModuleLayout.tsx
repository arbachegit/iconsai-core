/**
 * ============================================================
 * UnifiedModuleLayout.tsx - Layout Padrão de Módulos
 * ============================================================
 * Versão: 2.0.0
 * Data: 2026-01-04
 * 
 * Descrição: Layout padronizado para TODOS os módulos.
 * Igual à Home: Play + Spectrum + Nome do módulo + Microfone.
 * ============================================================
 */

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { 
  HelpCircle, 
  Globe, 
  Heart, 
  Lightbulb,
  ArrowLeft,
  History
} from "lucide-react";
import { SpectrumAnalyzer } from "../voice/SpectrumAnalyzer";
import { PlayButton } from "../voice/PlayButton";
import { ToggleMicrophoneButton } from "../voice/ToggleMicrophoneButton";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";
import { supabase } from "@/integrations/supabase/client";

// Tipos de módulo
export type ModuleType = "help" | "world" | "health" | "ideas";

// Configuração visual de cada módulo
const MODULE_CONFIG: Record<ModuleType, {
  name: string;
  icon: typeof HelpCircle;
  color: string;
  bgColor: string;
  welcomeKey: string;
  defaultWelcome: string;
}> = {
  help: {
    name: "Ajuda",
    icon: HelpCircle,
    color: "#3B82F6",
    bgColor: "bg-blue-500/20",
    welcomeKey: "helpWelcomeText",
    defaultWelcome: "Bem-vindo ao módulo de Ajuda! Aqui você aprende a usar todas as funcionalidades do KnowYOU.",
  },
  world: {
    name: "Mundo",
    icon: Globe,
    color: "#10B981",
    bgColor: "bg-emerald-500/20",
    welcomeKey: "worldWelcomeText",
    defaultWelcome: "Olá! Eu sou seu assistente de conhecimento geral. Pergunte sobre qualquer assunto!",
  },
  health: {
    name: "Saúde",
    icon: Heart,
    color: "#F43F5E",
    bgColor: "bg-rose-500/20",
    welcomeKey: "healthWelcomeText",
    defaultWelcome: "Olá! Sou sua assistente de saúde. Vou te ajudar usando o protocolo OLDCARTS.",
  },
  ideas: {
    name: "Ideias",
    icon: Lightbulb,
    color: "#F59E0B",
    bgColor: "bg-amber-500/20",
    welcomeKey: "ideasWelcomeText",
    defaultWelcome: "Olá! Sou seu consultor de ideias. Vou usar a técnica do Advogado do Diabo.",
  },
};

interface UnifiedModuleLayoutProps {
  moduleType: ModuleType;
  onBack: () => void;
  onHistoryClick: () => void;
}

export const UnifiedModuleLayout: React.FC<UnifiedModuleLayoutProps> = ({
  moduleType,
  onBack,
  onHistoryClick,
}) => {
  const config = MODULE_CONFIG[moduleType];
  const IconComponent = config.icon;
  
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();
  const { stopAllAndCleanup, getFrequencyData } = audioManager;
  const { config: pwaConfig } = useConfigPWA();
  const { userName, deviceFingerprint, skipWelcome, setSkipWelcome } = usePWAVoiceStore();
  
  const hasSpokenWelcome = useRef(false);
  const animationRef = useRef<number | null>(null);
  
  // Estado do microfone e frequência
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  // AUTOPLAY ao entrar no módulo (pula se já ouviu na HOME)
  useEffect(() => {
    if (hasSpokenWelcome.current) return;
    hasSpokenWelcome.current = true;

    // Se foi marcado para pular (já ouviu explicação na HOME)
    if (skipWelcome) {
      setSkipWelcome(false); // Resetar para próxima vez
      return; // Não tocar welcome
    }

    const configRecord = pwaConfig as unknown as Record<string, string>;
    const welcomeText = configRecord[config.welcomeKey] || config.defaultWelcome;
    const greeting = welcomeText.replace("[name]", userName || "");

    const timer = setTimeout(() => {
      speak(greeting, moduleType).catch((err) => {
        console.warn("Autoplay bloqueado:", err);
      });
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [speak, moduleType, pwaConfig, config, userName, skipWelcome, setSkipWelcome]);

  // Cleanup ao desmontar (voltar)
  useEffect(() => {
    return () => {
      stopAllAndCleanup();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stopAllAndCleanup]);

  // Capturar frequências do TTS quando estiver tocando
  useEffect(() => {
    if (!isPlaying) {
      setFrequencyData([]);
      return;
    }

    const updateFrequency = () => {
      const data = getFrequencyData();
      if (data.length > 0) {
        setFrequencyData(data);
      }
      animationRef.current = requestAnimationFrame(updateFrequency);
    };

    updateFrequency();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, getFrequencyData]);

  // Handler para captura de áudio (fluxo completo com logging detalhado)
  const handleAudioCapture = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // 1. Validar blob
      if (!audioBlob || audioBlob.size < 1000) {
        throw new Error("AUDIO_TOO_SHORT: Gravação muito curta");
      }
      
      console.log("[Voice] Blob recebido:", {
        size: audioBlob.size,
        type: audioBlob.type,
        sizeKB: (audioBlob.size / 1024).toFixed(2) + "KB"
      });
      
      // 2. Converter para base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte), ""
        )
      );
      
      // 3. Detectar mimeType com fallback robusto
      let mimeType = audioBlob.type;
      if (!mimeType || mimeType === "") {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        mimeType = (isIOS || isSafari) ? "audio/mp4" : "audio/webm";
        console.log("[Voice] mimeType detectado por fallback:", mimeType);
      }
      
      console.log("[Voice] Enviando para STT...", { 
        base64Length: base64.length, 
        mimeType 
      });
      
      // 4. Transcrever com Whisper
      const { data: sttData, error: sttError } = await supabase.functions.invoke(
        "voice-to-text",
        { body: { audio: base64, mimeType } }
      );
      
      if (sttError) {
        console.error("[Voice] Erro STT:", sttError);
        throw new Error(`STT_ERROR: ${sttError.message || "Falha na transcrição"}`);
      }
      
      const userText = sttData?.text;
      
      if (!userText || userText.trim() === "") {
        throw new Error("STT_EMPTY: Não foi possível entender o áudio");
      }
      
      console.log("[Voice] Transcrição OK:", userText);
      
      // 5. Enviar para chat-router
      console.log("[Voice] Enviando para chat-router...");
      const { data: chatData, error: chatError } = await supabase.functions.invoke(
        "chat-router",
        { 
          body: { 
            message: userText, 
            pwaMode: true, 
            chatType: moduleType,
            agentSlug: moduleType,
            deviceId: deviceFingerprint || undefined
          } 
        }
      );
      
      if (chatError) {
        console.error("[Voice] Erro Chat:", chatError);
        throw new Error(`CHAT_ERROR: ${chatError.message || "Falha ao processar"}`);
      }
      
      const aiResponse = chatData?.response || chatData?.message || chatData?.text;
      
      if (!aiResponse) {
        throw new Error("CHAT_EMPTY: Resposta vazia da IA");
      }
      
      console.log("[Voice] Resposta IA OK:", aiResponse.substring(0, 100) + "...");
      
      // 6. Falar resposta com TTS
      console.log("[Voice] Enviando para TTS...");
      await speak(aiResponse, moduleType);
      console.log("[Voice] Fluxo completo com sucesso!");
      
    } catch (error: any) {
      console.error("[Voice] ERRO COMPLETO:", error);
      
      // Mensagens específicas por tipo de erro
      let errorMessage = "Desculpe, ocorreu um erro. Tente novamente.";
      
      if (error.message?.includes("AUDIO_TOO_SHORT")) {
        errorMessage = "A gravação foi muito curta. Fale um pouco mais.";
      } else if (error.message?.includes("STT_ERROR")) {
        errorMessage = "Não consegui processar o áudio. Verifique se o microfone está funcionando.";
      } else if (error.message?.includes("STT_EMPTY")) {
        errorMessage = "Não entendi o que você disse. Pode repetir?";
      } else if (error.message?.includes("CHAT_ERROR")) {
        errorMessage = "O serviço está temporariamente indisponível. Tente novamente.";
      } else if (error.message?.includes("CHAT_EMPTY")) {
        errorMessage = "Não consegui gerar uma resposta. Tente reformular sua pergunta.";
      } else if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
        errorMessage = "Erro de autenticação. Recarregue a página e tente novamente.";
      }
      
      await speak(errorMessage, moduleType);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler do botão play
  const handlePlayClick = () => {
    if (isPlaying) {
      stop();
    } else {
      const configRecord = pwaConfig as unknown as Record<string, string>;
      const welcomeText = configRecord[config.welcomeKey] || config.defaultWelcome;
      const greeting = welcomeText.replace("[name]", userName || "");
      speak(greeting, moduleType);
    }
  };

  // Handler voltar
  const handleBack = () => {
    stopAllAndCleanup();
    onBack();
  };

  // Determinar estado do visualizador
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
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 pt-12">
        {/* Botão Voltar */}
        <motion.button
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </motion.button>

        {/* Ícone + Nome */}
        <div className="flex items-center gap-3">
          <motion.div
            className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}
            animate={{
              boxShadow: isPlaying
                ? [
                    `0 0 0 0 ${config.color}00`,
                    `0 0 20px 5px ${config.color}66`,
                    `0 0 0 0 ${config.color}00`,
                  ]
                : "none",
            }}
            transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0 }}
          >
            <IconComponent className="w-5 h-5" style={{ color: config.color }} />
          </motion.div>
          <span className="text-lg font-semibold text-white">
            {config.name}
          </span>
        </div>

        {/* Botão Histórico */}
        <motion.button
          onClick={onHistoryClick}
          className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/10"
          whileTap={{ scale: 0.95 }}
        >
          <History className="w-5 h-5 text-white" />
          {/* Bolinha VERMELHA pulsando */}
          <motion.span
            className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.button>
      </div>

      {/* CONTEÚDO PRINCIPAL - IGUAL À HOME */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {/* Spectrum Analyzer com dados reais */}
        <SpectrumAnalyzer
          state={visualizerState}
          frequencyData={frequencyData}
          primaryColor={config.color}
          secondaryColor={config.color}
          height={120}
          width={280}
        />

        {/* Botão Play para ouvir welcome */}
        <PlayButton
          state={buttonState}
          onClick={handlePlayClick}
          progress={progress}
          size="lg"
          primaryColor={config.color}
        />
        
        {/* Toggle Microphone Button */}
        <ToggleMicrophoneButton
          onAudioCapture={handleAudioCapture}
          disabled={isLoading}
          isPlaying={isPlaying}
          isProcessing={isProcessing}
          primaryColor={config.color}
          onFrequencyData={setFrequencyData}
          onRecordingChange={setIsRecording}
          maxDurationSeconds={60}
        />
      </div>
    </div>
  );
};

export default UnifiedModuleLayout;
