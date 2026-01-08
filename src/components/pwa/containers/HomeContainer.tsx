/**
 * ============================================================
 * HomeContainer.tsx - Container INDEPENDENTE para HOME
 * ============================================================
 * Versão: 5.3.0 - 2026-01-08
 * CORREÇÃO: Autoplay usa useRef para evitar re-render cancelar o setTimeout
 * ============================================================
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { VoicePlayerBox } from "../voice/VoicePlayerBox";
import { ModuleSelector } from "../voice/ModuleSelector";
import { useAudioManager } from "@/stores/audioManagerStore";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { usePWAVoiceStore, ModuleId } from "@/stores/pwaVoiceStore";
import { supabase } from "@/integrations/supabase/client";

interface HomeContainerProps {
  onModuleSelect: (moduleId: Exclude<ModuleId, null>) => void;
  deviceId: string;
}

export const HomeContainer: React.FC<HomeContainerProps> = ({ onModuleSelect, deviceId }) => {
  const audioManager = useAudioManager();
  const { config, isLoading: isConfigLoading } = useConfigPWA();
  const { userName, playerState, setPlayerState } = usePWAVoiceStore();

  // Estados locais
  const [greeting, setGreeting] = useState<string>("");
  const [isGreetingReady, setIsGreetingReady] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const frequencyAnimationRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedAutoplayRef = useRef(false); // ✅ useRef ao invés de useState

  // ============================================================
  // FUNÇÃO SPEAK DIRETA (sem hook externo)
  // ============================================================
  const speakDirect = useCallback(async (text: string) => {
    if (!text.trim()) {
      console.error("[HOME] ❌ Texto vazio!");
      return;
    }

    console.log("[HOME] 🎤 Iniciando TTS...");
    setIsLoading(true);

    try {
      // URLs do Supabase
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://gmflpmcepempcygdrayv.supabase.co";
      const supabaseKey =
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZmxwbWNlcGVtcGN5Z2RyYXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NzYyMDAsImV4cCI6MjA0ODE1MjIwMH0.K3sJfvYBVqCg8-FgWxZyEfRkjNfwvuLdP_sGqwe6Ryc";

      console.log("[HOME] 📡 Fazendo fetch para TTS...");

      const response = await fetch(`${supabaseUrl}/functions/v1/text-to-speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ text, voice: "fernando" }),
      });

      console.log("[HOME] 📡 Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const audioBlob = await response.blob();
      console.log("[HOME] 📦 Blob size:", audioBlob.size);

      const audioUrl = URL.createObjectURL(audioBlob);

      // Limpar áudio anterior
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        console.log("[HOME] ▶️ Áudio tocando!");
        setIsPlaying(true);
        setIsLoading(false);
      };

      audio.onended = () => {
        console.log("[HOME] ⏹️ Áudio terminou");
        setIsPlaying(false);
        setProgress(0);
      };

      audio.onerror = (e) => {
        console.error("[HOME] ❌ Erro no áudio:", e);
        setIsPlaying(false);
        setIsLoading(false);
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      console.log("[HOME] 🎵 Chamando audio.play()...");
      await audio.play();
      console.log("[HOME] ✅ Áudio iniciado com sucesso!");
    } catch (err) {
      console.error("[HOME] ❌ Erro no TTS:", err);
      setIsLoading(false);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setProgress(0);
  }, []);

  // ============================================================
  // ETAPA 1: BUSCAR SAUDAÇÃO DA HOME
  // ============================================================
  useEffect(() => {
    mountedRef.current = true;

    if (isConfigLoading) return;
    if (!deviceId || deviceId === "") return;

    const fetchHomeGreeting = async () => {
      console.log("[HOME] 🔍 Buscando saudação...");

      try {
        const { data, error } = await supabase.functions.invoke("generate-contextual-greeting", {
          body: {
            deviceId: deviceId,
            userName: userName || undefined,
          },
        });

        if (!mountedRef.current) return;

        if (error) {
          console.warn("[HOME] ⚠️ Erro:", error);
          const fallback =
            config.welcomeText?.replace("[name]", userName || "") ||
            "Olá! Eu sou o KnowYOU, seu assistente de voz. Escolha um módulo abaixo para começar.";
          setGreeting(fallback);
        } else if (data?.greeting) {
          console.log("[HOME] ✅ Saudação recebida");
          setGreeting(data.greeting);
        } else {
          const fallback =
            config.welcomeText?.replace("[name]", userName || "") ||
            "Olá! Eu sou o KnowYOU, seu assistente de voz. Escolha um módulo abaixo para começar.";
          setGreeting(fallback);
        }
      } catch (err) {
        console.error("[HOME] ❌ Exceção:", err);
        if (mountedRef.current) {
          setGreeting("Olá! Eu sou o KnowYOU, seu assistente de voz.");
        }
      } finally {
        if (mountedRef.current) {
          setIsGreetingReady(true);
          console.log("[HOME] ✅ Greeting pronto!");
        }
      }
    };

    fetchHomeGreeting();

    return () => {
      mountedRef.current = false;
    };
  }, [isConfigLoading, deviceId, userName, config.welcomeText]);

  // ============================================================
  // ETAPA 2: AUTOPLAY (usando useRef para não re-renderizar)
  // ============================================================
  useEffect(() => {
    // Verificar condições
    if (!isGreetingReady || !greeting || hasPlayedAutoplayRef.current) {
      return;
    }

    // Marcar como executado IMEDIATAMENTE (usando ref, não causa re-render)
    hasPlayedAutoplayRef.current = true;
    console.log("[HOME] 🚀 Iniciando autoplay...");

    // Executar após pequeno delay
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        console.log("[HOME] 🎯 Executando speakDirect()...");
        speakDirect(greeting);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isGreetingReady, greeting, speakDirect]);

  // ============================================================
  // ATUALIZAR PLAYER STATE
  // ============================================================
  useEffect(() => {
    if (isLoading) {
      setPlayerState("loading");
    } else if (isPlaying) {
      setPlayerState("playing");
    } else {
      setPlayerState("waiting");
    }
  }, [isLoading, isPlaying, setPlayerState]);

  // ============================================================
  // CLEANUP
  // ============================================================
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleReplay = useCallback(() => {
    if (greeting) {
      speakDirect(greeting);
    }
  }, [greeting, speakDirect]);

  const handleModuleClick = useCallback(
    (moduleId: Exclude<ModuleId, null>) => {
      stopAudio();
      useAudioManager.getState().stopAllAndCleanup();
      onModuleSelect(moduleId);
    },
    [stopAudio, onModuleSelect],
  );

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col overflow-hidden"
    >
      {/* HEADER */}
      <motion.div
        className="pt-12 pb-2 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="text-center overflow-hidden">
          <h1 className="text-2xl font-bold whitespace-nowrap">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">KnowYOU</span>
          </h1>
        </div>
      </motion.div>

      {/* PLAYER BOX */}
      <motion.div
        className="px-6 py-4"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <VoicePlayerBox
          state={playerState}
          onPlay={handleReplay}
          onPause={stopAudio}
          audioProgress={progress}
          frequencyData={frequencyData}
        />
      </motion.div>

      {/* MODULE SELECTOR */}
      <motion.div
        className="flex-1 px-4 pb-2 overflow-hidden"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <ModuleSelector onSelect={handleModuleClick} isPlaying={isPlaying} disabled={isPlaying || isLoading} />
      </motion.div>

      {/* FOOTER */}
      <motion.div
        className="py-2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <p className="text-[10px] text-muted-foreground/60">KnowYOU © 2025</p>
      </motion.div>

      {/* INDICADOR DE CARREGAMENTO */}
      {!isGreetingReady && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <motion.div
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
    </motion.div>
  );
};

export default HomeContainer;
