/**
 * ============================================================
 * HealthModuleContainer.tsx - Container INDEPENDENTE para Saúde
 * ============================================================
 * Versão: 5.0.0 - 2026-01-08
 *
 * PRINCÍPIOS:
 * - Container 100% INDEPENDENTE
 * - Autoplay GARANTIDO
 * - Resumo de conversa ao sair
 * - Sem dependência de outros módulos
 * ============================================================
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Heart, ArrowLeft, History } from "lucide-react";
import { SpectrumAnalyzer } from "../voice/SpectrumAnalyzer";
import { PlayButton } from "../voice/PlayButton";
import { ToggleMicrophoneButton } from "../voice/ToggleMicrophoneButton";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// CONFIGURAÇÃO DO MÓDULO
// ============================================================
const MODULE_CONFIG = {
  type: "health" as const,
  name: "Saúde",
  color: "#F43F5E",
  bgColor: "bg-rose-500/20",
  defaultWelcome:
    "Olá! Sou sua assistente de saúde. Posso te ajudar a entender sintomas e orientar sobre quando procurar um médico. Como posso ajudar?",
  contextualPrompts: {
    returning: {
      recent:
        "que bom te ver de novo. Na última vez você mencionou {topic}. Como está se sentindo agora? Houve alguma melhora?",
      days: "olá novamente. Faz uns dias que conversamos sobre {topic}. Como você está? Os sintomas melhoraram?",
      week: "que bom te ver! Da última vez falamos sobre {topic}. Espero que esteja melhor. Como posso ajudar hoje?",
    },
  },
};

interface HealthModuleContainerProps {
  onBack: () => void;
  onHistoryClick: () => void;
}

export const HealthModuleContainer: React.FC<HealthModuleContainerProps> = ({ onBack, onHistoryClick }) => {
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();
  const { userName, deviceFingerprint } = usePWAVoiceStore();

  // ============================================================
  // ESTADOS LOCAIS (100% independentes)
  // ============================================================
  const [greeting, setGreeting] = useState<string>("");
  const [isGreetingReady, setIsGreetingReady] = useState(false);
  const [hasPlayedAutoplay, setHasPlayedAutoplay] = useState(false);
  const [isFirstInteraction, setIsFirstInteraction] = useState(true);
  const [lastTopic, setLastTopic] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  // Histórico de mensagens DESTE módulo apenas
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const animationRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // ============================================================
  // ETAPA 1: BUSCAR CONTEXTO DO MÓDULO (apenas health)
  // ============================================================
  useEffect(() => {
    mountedRef.current = true;

    const fetchModuleContext = async () => {
      console.log(`[Health] Iniciando busca de contexto para device: ${deviceFingerprint?.substring(0, 10)}...`);

      try {
        const { data, error } = await supabase.functions.invoke("pwa-contextual-memory", {
          body: {
            deviceId: deviceFingerprint || `anonymous-${Date.now()}`,
            moduleType: MODULE_CONFIG.type,
            action: "getGreeting",
          },
        });

        if (!mountedRef.current) return;

        if (error) {
          console.warn("[Health] Erro ao buscar contexto:", error);
          // FALLBACK GARANTIDO
          const fallbackGreeting = MODULE_CONFIG.defaultWelcome.replace("[name]", userName || "");
          setGreeting(fallbackGreeting);
          setIsFirstInteraction(true);
        } else if (data?.greeting) {
          console.log("[Health] Contexto recebido:", {
            hasContext: data.hasContext,
            isFirst: data.isFirstInteraction,
          });
          setGreeting(data.greeting);
          setIsFirstInteraction(data.isFirstInteraction);
          setLastTopic(data.lastTopic || null);
        } else {
          // FALLBACK GARANTIDO se resposta vazia
          const fallbackGreeting = MODULE_CONFIG.defaultWelcome.replace("[name]", userName || "");
          setGreeting(fallbackGreeting);
          setIsFirstInteraction(true);
        }
      } catch (err) {
        console.error("[Health] Exceção ao buscar contexto:", err);
        // FALLBACK GARANTIDO em caso de exceção
        if (mountedRef.current) {
          const fallbackGreeting = MODULE_CONFIG.defaultWelcome.replace("[name]", userName || "");
          setGreeting(fallbackGreeting);
          setIsFirstInteraction(true);
        }
      } finally {
        if (mountedRef.current) {
          setIsGreetingReady(true);
          console.log("[Health] Greeting pronto para autoplay");
        }
      }
    };

    fetchModuleContext();

    return () => {
      mountedRef.current = false;
    };
  }, [deviceFingerprint, userName]);

  // ============================================================
  // ETAPA 2: AUTOPLAY GARANTIDO (só executa quando greeting está pronto)
  // ============================================================
  useEffect(() => {
    // Só executar quando o greeting estiver pronto E ainda não tocou
    if (!isGreetingReady || hasPlayedAutoplay || !greeting) {
      return;
    }

    console.log("[Health] Executando autoplay com greeting:", greeting.substring(0, 50) + "...");

    // Marcar como tocado ANTES de tocar (evita duplicação)
    setHasPlayedAutoplay(true);

    // Pequeno delay para garantir que o componente está montado
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        speak(greeting, MODULE_CONFIG.type).catch((err) => {
          console.warn("[Health] Autoplay bloqueado pelo browser:", err);
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isGreetingReady, hasPlayedAutoplay, greeting, speak]);

  // ============================================================
  // CLEANUP AO DESMONTAR
  // ============================================================
  useEffect(() => {
    return () => {
      audioManager.stopAllAndCleanup();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioManager]);

  // ============================================================
  // CAPTURAR FREQUÊNCIAS DO TTS
  // ============================================================
  useEffect(() => {
    if (!isPlaying) {
      setFrequencyData([]);
      return;
    }

    const updateFrequency = () => {
      const data = audioManager.getFrequencyData();
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
  }, [isPlaying, audioManager]);

  // ============================================================
  // HANDLER PARA CAPTURA DE ÁUDIO
  // ============================================================
  const handleAudioCapture = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);

      try {
        if (!audioBlob || audioBlob.size < 1000) {
          throw new Error("AUDIO_TOO_SHORT");
        }

        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));

        let mimeType = audioBlob.type;
        if (!mimeType || mimeType === "") {
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          mimeType = isIOS || isSafari ? "audio/mp4" : "audio/webm";
        }

        // STT
        const { data: sttData, error: sttError } = await supabase.functions.invoke("voice-to-text", {
          body: { audio: base64, mimeType },
        });

        if (sttError) throw new Error(`STT_ERROR: ${sttError.message}`);

        const userText = sttData?.text;
        if (!userText?.trim()) throw new Error("STT_EMPTY");

        // Adicionar mensagem do usuário ao histórico local
        setMessages((prev) => [...prev, { role: "user", content: userText }]);

        // Chat Router
        const { data: chatData, error: chatError } = await supabase.functions.invoke("chat-router", {
          body: {
            message: userText,
            pwaMode: true,
            chatType: MODULE_CONFIG.type,
            agentSlug: MODULE_CONFIG.type,
            deviceId: deviceFingerprint || undefined,
          },
        });

        if (chatError) throw new Error(`CHAT_ERROR: ${chatError.message}`);

        const aiResponse = chatData?.response || chatData?.message || chatData?.text;
        if (!aiResponse) throw new Error("CHAT_EMPTY");

        // Adicionar resposta ao histórico local
        setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);

        // Tocar resposta
        await speak(aiResponse, MODULE_CONFIG.type);
      } catch (error: any) {
        console.error("[Health] Erro:", error);

        let errorMessage = "Desculpe, ocorreu um erro. Tente novamente.";

        if (error.message?.includes("AUDIO_TOO_SHORT")) {
          errorMessage = "A gravação foi muito curta. Fale um pouco mais.";
        } else if (error.message?.includes("STT_ERROR")) {
          errorMessage = "Não consegui processar o áudio.";
        } else if (error.message?.includes("STT_EMPTY")) {
          errorMessage = "Não entendi o que você disse. Pode repetir?";
        } else if (error.message?.includes("CHAT_ERROR")) {
          errorMessage = "O serviço está temporariamente indisponível.";
        }

        await speak(errorMessage, MODULE_CONFIG.type);
      } finally {
        setIsProcessing(false);
      }
    },
    [deviceFingerprint, speak],
  );

  // ============================================================
  // HANDLER PARA BOTÃO PLAY
  // ============================================================
  const handlePlayClick = useCallback(() => {
    if (isPlaying) {
      stop();
    } else if (greeting) {
      speak(greeting, MODULE_CONFIG.type);
    }
  }, [isPlaying, stop, speak, greeting]);

  // ============================================================
  // HANDLER PARA VOLTAR (com salvamento de resumo)
  // ============================================================
  const handleBack = useCallback(async () => {
    // Parar áudio
    audioManager.stopAllAndCleanup();

    // Salvar resumo se teve conversa
    if (messages.length >= 2 && deviceFingerprint) {
      try {
        // Pegar últimas 3 trocas (6 mensagens)
        const recentMessages = messages.slice(-6);

        await supabase.functions.invoke("generate-conversation-summary", {
          body: {
            deviceId: deviceFingerprint,
            moduleType: MODULE_CONFIG.type,
            messages: recentMessages,
          },
        });
        console.log("[Health] Resumo da conversa salvo");
      } catch (err) {
        console.warn("[Health] Erro ao salvar resumo:", err);
      }
    }

    onBack();
  }, [audioManager, messages, deviceFingerprint, onBack]);

  // ============================================================
  // ESTADOS DE VISUALIZAÇÃO
  // ============================================================
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

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* HEADER */}
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

      {/* CONTEÚDO PRINCIPAL */}
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

      {/* INDICADOR DE CARREGAMENTO */}
      {!isGreetingReady && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <motion.div
            className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
    </div>
  );
};

export default HealthModuleContainer;
