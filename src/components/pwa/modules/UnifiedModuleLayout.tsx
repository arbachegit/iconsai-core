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
  History,
  Volume2,
  Mic,
  Loader2
} from "lucide-react";
import { SpectrumAnalyzer } from "../voice/SpectrumAnalyzer";
import { PlayButton } from "../voice/PlayButton";
import { SlidingMicrophone } from "../voice/SlidingMicrophone";
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
  const { stopAllAndCleanup } = useAudioManager();
  const { config: pwaConfig } = useConfigPWA();
  const { userName, deviceFingerprint } = usePWAVoiceStore();
  
  const hasSpokenWelcome = useRef(false);
  
  // Estado do microfone
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // AUTOPLAY ao entrar no módulo
  useEffect(() => {
    if (hasSpokenWelcome.current) return;
    hasSpokenWelcome.current = true;

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
  }, [speak, moduleType, pwaConfig, config, userName]);

  // Cleanup ao desmontar (voltar)
  useEffect(() => {
    return () => {
      stopAllAndCleanup();
    };
  }, [stopAllAndCleanup]);

  // Handler para captura de áudio (fluxo completo)
  const handleAudioCapture = async (audioBlob: Blob) => {
    setIsRecording(false);
    setIsProcessing(true);
    setIsMicOpen(false);
    
    try {
      // 1. Converter para base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte), ""
        )
      );
      
      console.log("[Voice] Enviando para transcrição...");
      
      // 2. Transcrever com Whisper (edge function existente)
      const { data: sttData, error: sttError } = await supabase.functions.invoke(
        "voice-to-text",
        { body: { audio: base64 } }
      );
      
      if (sttError) throw sttError;
      const userText = sttData?.text;
      
      if (!userText) {
        throw new Error("Não foi possível transcrever o áudio");
      }
      
      console.log("[Voice] Transcrição:", userText);
      
      // 3. Enviar para ChatGPT via chat-router
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
      
      if (chatError) throw chatError;
      const aiResponse = chatData?.response || chatData?.message || chatData?.text;
      
      if (!aiResponse) {
        throw new Error("Não foi possível obter resposta");
      }
      
      console.log("[Voice] Resposta IA:", aiResponse);
      
      // 4. Falar resposta com TTS
      await speak(aiResponse, moduleType);
      
    } catch (error) {
      console.error("Erro no fluxo de voz:", error);
      await speak("Desculpe, ocorreu um erro. Tente novamente.", moduleType);
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
  
  // Handler abrir microfone
  const handleMicClick = () => {
    stop(); // Parar áudio atual
    setIsMicOpen(true);
    setIsRecording(true);
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
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {/* Spectrum Analyzer */}
        <SpectrumAnalyzer
          state={visualizerState}
          primaryColor={config.color}
          secondaryColor={config.color}
          height={120}
          width={280}
        />

        {/* Botão Play */}
        <PlayButton
          state={buttonState}
          onClick={handlePlayClick}
          progress={progress}
          size="lg"
          primaryColor={config.color}
        />
        
        {/* Botão de Microfone */}
        <motion.button
          onClick={handleMicClick}
          disabled={isProcessing || isPlaying || isLoading}
          className="flex items-center gap-2 px-6 py-3 rounded-full transition-colors disabled:opacity-50"
          style={{ 
            backgroundColor: `${config.color}20`,
            color: config.color
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
          <span className="font-medium">
            {isProcessing ? "Processando..." : "Falar"}
          </span>
        </motion.button>
      </div>

      {/* Sliding Microphone */}
      <SlidingMicrophone
        isVisible={isMicOpen}
        onAudioCapture={handleAudioCapture}
        onClose={() => {
          setIsMicOpen(false);
          setIsRecording(false);
        }}
        maxDuration={60}
        primaryColor={config.color}
        autoTranscribe={false}
      />
    </div>
  );
};

export default UnifiedModuleLayout;
