/**
 * ============================================================
 * HomeContainer.tsx - Container INDEPENDENTE para HOME
 * ============================================================
 * Versão: 5.2.0-debug - 2026-01-08
 * DEBUG: Logs extensivos para identificar falha no autoplay
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
  const [hasPlayedAutoplay, setHasPlayedAutoplay] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const frequencyAnimationRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ============================================================
  // FUNÇÃO SPEAK INLINE (sem depender do hook)
  // ============================================================
  const speakDirect = useCallback(async (text: string) => {
    if (!text.trim()) {
      console.error("[HOME-DEBUG] ❌ Texto vazio!");
      return;
    }

    console.log("[HOME-DEBUG] 🎤 Iniciando TTS para:", text.substring(0, 50));
    setIsLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      console.log("[HOME-DEBUG] 🔑 URL definida:", !!supabaseUrl);
      console.log("[HOME-DEBUG] 🔑 Key definida:", !!supabaseKey);

      if (!supabaseUrl || !supabaseKey) {
        console.error("[HOME-DEBUG] ❌ Variáveis de ambiente não definidas!");
        // Fallback: usar URL hardcoded para teste
        const fallbackUrl = "https://gmflpmcepempcygdrayv.supabase.co";
        const fallbackKey =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZmxwbWNlcGVtcGN5Z2RyYXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NzYyMDAsImV4cCI6MjA0ODE1MjIwMH0.K3sJfvYBVqCg8-FgWxZyEfRkjNfwvuLdP_sGqwe6Ryc";

        console.log("[HOME-DEBUG] 🔄 Usando fallback...");

        const response = await fetch(`${fallbackUrl}/functions/v1/text-to-speech`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: fallbackKey,
            Authorization: `Bearer ${fallbackKey}`,
          },
          body: JSON.stringify({ text, voice: "fernando" }),
        });

        console.log("[HOME-DEBUG] 📡 Response status:", response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const audioBlob = await response.blob();
        console.log("[HOME-DEBUG] 📦 Blob size:", audioBlob.size);

        const audioUrl = URL.createObjectURL(audioBlob);
        console.log("[HOME-DEBUG] 🔗 Audio URL criada");

        // Criar e tocar áudio diretamente
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          console.log("[HOME-DEBUG] ▶️ Áudio começou a tocar!");
          setIsPlaying(true);
          setIsLoading(false);
        };

        audio.onended = () => {
          console.log("[HOME-DEBUG] ⏹️ Áudio terminou");
          setIsPlaying(false);
          setProgress(0);
        };

        audio.onerror = (e) => {
          console.error("[HOME-DEBUG] ❌ Erro no áudio:", e);
          setIsPlaying(false);
          setIsLoading(false);
        };

        audio.ontimeupdate = () => {
          if (audio.duration) {
            setProgress((audio.currentTime / audio.duration) * 100);
          }
        };

        console.log("[HOME-DEBUG] 🎵 Chamando audio.play()...");
        await audio.play();
        console.log("[HOME-DEBUG] ✅ audio.play() executado com sucesso!");

        return;
      }

      // Caminho normal com variáveis de ambiente
      console.log("[HOME-DEBUG] 📡 Fazendo fetch para TTS...");

      const response = await fetch(`${supabaseUrl}/functions/v1/text-to-speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ text, voice: "fernando" }),
      });

      console.log("[HOME-DEBUG] 📡 Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const audioBlob = await response.blob();
      console.log("[HOME-DEBUG] 📦 Blob size:", audioBlob.size);

      const audioUrl = URL.createObjectURL(audioBlob);
      console.log("[HOME-DEBUG] 🔗 Audio URL criada");

      // Criar e tocar áudio diretamente
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        console.log("[HOME-DEBUG] ▶️ Áudio começou a tocar!");
        setIsPlaying(true);
        setIsLoading(false);
      };

      audio.onended = () => {
        console.log("[HOME-DEBUG] ⏹️ Áudio terminou");
        setIsPlaying(false);
        setProgress(0);
      };

      audio.onerror = (e) => {
        console.error("[HOME-DEBUG] ❌ Erro no áudio:", e);
        setIsPlaying(false);
        setIsLoading(false);
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      console.log("[HOME-DEBUG] 🎵 Chamando audio.play()...");
      await audio.play();
      console.log("[HOME-DEBUG] ✅ audio.play() executado com sucesso!");
    } catch (err) {
      console.error("[HOME-DEBUG] ❌ Erro no TTS:", err);
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

    if (isConfigLoading) {
      console.log("[HOME-DEBUG] ⏳ Aguardando config...");
      return;
    }
    if (!deviceId || deviceId === "") {
      console.log("[HOME-DEBUG] ⏳ Aguardando deviceId...");
      return;
    }

    const fetchHomeGreeting = async () => {
      console.log("[HOME-DEBUG] 🔍 Buscando saudação...");

      try {
        const { data, error } = await supabase.functions.invoke("generate-contextual-greeting", {
          body: {
            deviceId: deviceId,
            userName: userName || undefined,
          },
        });

        if (!mountedRef.current) return;

        if (error) {
          console.warn("[HOME-DEBUG] ⚠️ Erro ao buscar saudação:", error);
          const fallbackGreeting =
            config.welcomeText?.replace("[name]", userName || "") ||
            "Olá! Eu sou o KnowYOU, seu assistente de voz. Escolha um módulo abaixo para começar.";
          setGreeting(fallbackGreeting);
        } else if (data?.greeting) {
          console.log("[HOME-DEBUG] ✅ Saudação recebida:", data.greeting.substring(0, 50));
          setGreeting(data.greeting);
        } else {
          const fallbackGreeting =
            config.welcomeText?.replace("[name]", userName || "") ||
            "Olá! Eu sou o KnowYOU, seu assistente de voz. Escolha um módulo abaixo para começar.";
          setGreeting(fallbackGreeting);
        }
      } catch (err) {
        console.error("[HOME-DEBUG] ❌ Exceção:", err);
        if (mountedRef.current) {
          setGreeting("Olá! Eu sou o KnowYOU, seu assistente de voz.");
        }
      } finally {
        if (mountedRef.current) {
          setIsGreetingReady(true);
          console.log("[HOME-DEBUG] ✅ Greeting pronto!");
        }
      }
    };

    fetchHomeGreeting();

    return () => {
      mountedRef.current = false;
    };
  }, [isConfigLoading, deviceId, userName, config.welcomeText]);

  // ============================================================
  // ETAPA 2: AUTOPLAY
  // ============================================================
  useEffect(() => {
    if (!isGreetingReady) {
      console.log("[HOME-DEBUG] ⏳ Greeting não está pronto");
      return;
    }
    if (hasPlayedAutoplay) {
      console.log("[HOME-DEBUG] ⏳ Já executou autoplay");
      return;
    }
    if (!greeting) {
      console.log("[HOME-DEBUG] ⏳ Greeting vazio");
      return;
    }

    console.log("[HOME-DEBUG] 🚀 Executando autoplay em 500ms...");
    setHasPlayedAutoplay(true);

    const timer = setTimeout(() => {
      if (mountedRef.current) {
        console.log("[HOME-DEBUG] 🎯 Chamando speakDirect()...");
        speakDirect(greeting);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isGreetingReady, hasPlayedAutoplay, greeting, speakDirect]);

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
      console.log("[HOME-DEBUG] 🔄 Replay solicitado");
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
