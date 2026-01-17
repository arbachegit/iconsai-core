/**
 * ============================================================
 * PWAHealthContainer.tsx - Container STANDALONE para PWA Health
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-17
 *
 * Descrição: Container principal do PWA Health (microserviço).
 * Focado exclusivamente em triagem médica por voz.
 * Baseado no HealthModuleContainer mas como aplicação standalone.
 * ============================================================
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Heart, Menu, LogOut } from "lucide-react";
import { SpectrumAnalyzer } from "../pwa/voice/SpectrumAnalyzer";
import { PlayButton } from "../pwa/voice/PlayButton";
import { ToggleMicrophoneButton } from "../pwa/voice/ToggleMicrophoneButton";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { supabase } from "@/integrations/supabase/client";
import { classifyAndEnrich } from "@/hooks/useClassifyAndEnrich";

const MODULE_CONFIG = {
  name: "Knowyou AI Saúde",
  icon: Heart,
  color: "#F43F5E",
  bgColor: "bg-rose-500/20",
  moduleType: "health" as const,
};

interface PWAHealthContainerProps {
  userName?: string | null;
  userPhone?: string | null;
  sessionId?: string | null;
  onLogout?: () => void;
}

export const PWAHealthContainer: React.FC<PWAHealthContainerProps> = ({
  userName,
  userPhone,
  sessionId,
  onLogout,
}) => {
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();

  const [hasPlayedAutoplay, setHasPlayedAutoplay] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [welcomeText, setWelcomeText] = useState<string>("");

  const animationRef = useRef<number | null>(null);

  // ============================================================
  // ETAPA 1: TEXTO DE BOAS-VINDAS DO CONFIG
  // ============================================================
  useEffect(() => {
    const loadWelcomeText = async () => {
      try {
        const { data, error } = await supabase
          .from("pwahealth_config")
          .select("config_value")
          .eq("config_key", "welcome_text")
          .single();

        if (!error && data?.config_value) {
          let text = data.config_value;
          if (userName) {
            text = text.replace("[name]", userName);
          } else {
            text = text.replace("[name]", "").replace(/\s+/g, " ").trim();
          }
          setWelcomeText(text);
        } else {
          setWelcomeText(
            "Bem-vindo ao Knowyou AI Saúde! Vou fazer algumas perguntas para entender melhor sua situação de saúde."
          );
        }
      } catch (err) {
        console.error("[PWA Health] Erro ao carregar texto de boas-vindas:", err);
        setWelcomeText(
          "Bem-vindo ao Knowyou AI Saúde! Vou fazer algumas perguntas para entender melhor sua situação de saúde."
        );
      }
    };

    loadWelcomeText();
  }, [userName]);

  // ============================================================
  // ETAPA 2: Autoplay
  // ============================================================
  useEffect(() => {
    if (!welcomeText || hasPlayedAutoplay) return;

    console.log("[PWA Health] 🚀 Executando autoplay...");
    setHasPlayedAutoplay(true);

    const executeAutoplay = async () => {
      try {
        const enrichment = await classifyAndEnrich(welcomeText, MODULE_CONFIG.moduleType);
        await speak(enrichment.enrichedText || welcomeText, MODULE_CONFIG.moduleType, {
          phoneticMapOverride: enrichment.phoneticMap,
        });
      } catch (err) {
        console.warn("[PWA Health] ⚠️ Autoplay bloqueado:", err);
      }
    };

    executeAutoplay();
  }, [welcomeText, hasPlayedAutoplay, speak]);

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

      const { data: chatData, error: chatError } = await supabase.functions.invoke("chat-router", {
        body: {
          message: userText,
          pwaMode: true,
          chatType: MODULE_CONFIG.moduleType,
          agentSlug: MODULE_CONFIG.moduleType,
          deviceId: sessionId || "unknown",
        },
      });

      if (chatError) throw new Error(`CHAT_ERROR: ${chatError.message}`);

      const aiResponse = chatData?.response || "Desculpe, não consegui processar sua solicitação.";
      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);

      // Salvar no banco
      try {
        await supabase.from("pwahealth_conversations").insert({
          phone: userPhone || "unknown",
          session_id: sessionId || null,
          prompt: userText,
          response: aiResponse,
          api_provider: "openai",
          status: "completed",
        });
      } catch (dbError) {
        console.warn("[PWA Health] Erro ao salvar no banco:", dbError);
      }

      const enrichment = await classifyAndEnrich(aiResponse, MODULE_CONFIG.moduleType);
      await speak(enrichment.enrichedText || aiResponse, MODULE_CONFIG.moduleType, {
        phoneticMapOverride: enrichment.phoneticMap,
      });
    } catch (err: any) {
      console.error("[PWA Health] Erro:", err);

      let errorMsg = "Desculpe, ocorreu um erro.";
      if (err.message === "AUDIO_TOO_SHORT") {
        errorMsg = "Áudio muito curto. Tente novamente.";
      } else if (err.message?.includes("STT_")) {
        errorMsg = "Não consegui entender. Fale mais claramente.";
      } else if (err.message?.includes("CHAT_")) {
        errorMsg = "Erro ao processar sua mensagem. Tente novamente.";
      }

      await speak(errorMsg, MODULE_CONFIG.moduleType);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      stop();
    } else {
      if (welcomeText) {
        speak(welcomeText, MODULE_CONFIG.moduleType);
      }
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-rose-500/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center border border-rose-500/30">
            <Heart className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg">Knowyou AI Saúde</h1>
            {userName && <p className="text-slate-400 text-xs">Olá, {userName}</p>}
          </div>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-rose-500/10 transition-colors"
            aria-label="Sair"
          >
            <LogOut className="w-5 h-5 text-slate-400 hover:text-rose-400" />
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
        <div className="w-full max-w-md">
          {/* Spectrum Analyzer */}
          <div className="mb-8">
            <SpectrumAnalyzer
              isPlaying={audioManager.isPlaying}
              frequencyData={frequencyData}
              color={MODULE_CONFIG.color}
            />
          </div>

          {/* Play Button */}
          <div className="flex justify-center mb-6">
            <PlayButton
              isPlaying={isPlaying}
              isLoading={isLoading}
              onClick={handlePlayPause}
              progress={progress}
              color={MODULE_CONFIG.color}
            />
          </div>

          {/* Status Text */}
          <div className="text-center mb-8">
            <p className="text-slate-400 text-sm">
              {isProcessing
                ? "Processando..."
                : isRecording
                  ? "Ouvindo..."
                  : isPlaying
                    ? "Reproduzindo..."
                    : "Toque no microfone para falar"}
            </p>
          </div>
        </div>
      </div>

      {/* Microphone Button - Fixed at bottom */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center z-20">
        <ToggleMicrophoneButton
          onAudioCapture={handleAudioCapture}
          disabled={isProcessing || isPlaying}
          onRecordingChange={setIsRecording}
          color={MODULE_CONFIG.color}
        />
      </div>
    </div>
  );
};

export default PWAHealthContainer;
