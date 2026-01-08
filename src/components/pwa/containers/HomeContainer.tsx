/**
 * ============================================================
 * HomeContainer.tsx - Container INDEPENDENTE para HOME
 * ============================================================
 * Versão: 5.1.0 - 2026-01-08
 *
 * CORREÇÃO v5.1.0:
 * - Removido audioManager das dependências do useEffect (causava loop infinito)
 * - useEffect de cleanup agora usa array vazio []
 *
 * PRINCÍPIOS:
 * - Container 100% INDEPENDENTE
 * - Autoplay GARANTIDO
 * - NÃO interfere nos módulos
 * ============================================================
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { VoicePlayerBox } from "../voice/VoicePlayerBox";
import { ModuleSelector } from "../voice/ModuleSelector";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { usePWAVoiceStore, ModuleId } from "@/stores/pwaVoiceStore";
import { supabase } from "@/integrations/supabase/client";

interface HomeContainerProps {
  onModuleSelect: (moduleId: Exclude<ModuleId, null>) => void;
}

export const HomeContainer: React.FC<HomeContainerProps> = ({ onModuleSelect }) => {
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();
  const { config, isLoading: isConfigLoading } = useConfigPWA();
  const { userName, deviceFingerprint, playerState, setPlayerState } = usePWAVoiceStore();

  // ============================================================
  // ESTADOS LOCAIS (100% independentes)
  // ============================================================
  const [greeting, setGreeting] = useState<string>("");
  const [isGreetingReady, setIsGreetingReady] = useState(false);
  const [hasPlayedAutoplay, setHasPlayedAutoplay] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  const frequencyAnimationRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // ============================================================
  // ETAPA 1: BUSCAR SAUDAÇÃO DA HOME
  // ============================================================
  useEffect(() => {
    mountedRef.current = true;

    // Aguardar config carregar
    if (isConfigLoading) return;

    const fetchHomeGreeting = async () => {
      console.log("[HOME] Buscando saudação...");

      try {
        // Tentar buscar saudação contextual
        const { data, error } = await supabase.functions.invoke("generate-contextual-greeting", {
          body: {
            deviceId: deviceFingerprint || `anonymous-${Date.now()}`,
            userName: userName || undefined,
            // NÃO passar moduleId - é HOME
          },
        });

        if (!mountedRef.current) return;

        if (error) {
          console.warn("[HOME] Erro ao buscar saudação:", error);
          // FALLBACK GARANTIDO
          const fallbackGreeting =
            config.welcomeText?.replace("[name]", userName || "") ||
            "Olá! Eu sou o KnowYOU, seu assistente de voz. Escolha um módulo abaixo para começar.";
          setGreeting(fallbackGreeting);
        } else if (data?.greeting) {
          console.log("[HOME] Saudação recebida:", {
            isFirst: data.isFirstInteraction,
          });
          setGreeting(data.greeting);
        } else {
          // FALLBACK GARANTIDO se resposta vazia
          const fallbackGreeting =
            config.welcomeText?.replace("[name]", userName || "") ||
            "Olá! Eu sou o KnowYOU, seu assistente de voz. Escolha um módulo abaixo para começar.";
          setGreeting(fallbackGreeting);
        }
      } catch (err) {
        console.error("[HOME] Exceção ao buscar saudação:", err);
        if (mountedRef.current) {
          const fallbackGreeting =
            config.welcomeText?.replace("[name]", userName || "") ||
            "Olá! Eu sou o KnowYOU, seu assistente de voz. Escolha um módulo abaixo para começar.";
          setGreeting(fallbackGreeting);
        }
      } finally {
        if (mountedRef.current) {
          setIsGreetingReady(true);
          console.log("[HOME] Greeting pronto para autoplay");
        }
      }
    };

    fetchHomeGreeting();

    return () => {
      mountedRef.current = false;
    };
  }, [isConfigLoading, deviceFingerprint, userName, config.welcomeText]);

  // ============================================================
  // ETAPA 2: AUTOPLAY GARANTIDO
  // ============================================================
  useEffect(() => {
    if (!isGreetingReady || hasPlayedAutoplay || !greeting) {
      return;
    }

    console.log("[HOME] Executando autoplay com greeting:", greeting.substring(0, 50) + "...");
    setHasPlayedAutoplay(true);

    const timer = setTimeout(() => {
      if (mountedRef.current) {
        speak(greeting).catch((err) => {
          console.warn("[HOME] Autoplay bloqueado pelo browser:", err);
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isGreetingReady, hasPlayedAutoplay, greeting, speak]);

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
  // CAPTURAR FREQUÊNCIAS DO TTS
  // ============================================================
  useEffect(() => {
    const isAudioPlaying = audioManager.isPlaying;

    if (!isAudioPlaying) {
      setFrequencyData([]);
      if (frequencyAnimationRef.current) {
        cancelAnimationFrame(frequencyAnimationRef.current);
        frequencyAnimationRef.current = null;
      }
      return;
    }

    const updateFrequency = () => {
      const data = audioManager.getFrequencyData();
      if (data.length > 0) {
        setFrequencyData(data);
      }
      frequencyAnimationRef.current = requestAnimationFrame(updateFrequency);
    };

    updateFrequency();

    return () => {
      if (frequencyAnimationRef.current) {
        cancelAnimationFrame(frequencyAnimationRef.current);
        frequencyAnimationRef.current = null;
      }
    };
  }, [audioManager.isPlaying]); // ✅ CORREÇÃO: Usar apenas audioManager.isPlaying

  // ============================================================
  // CLEANUP AO DESMONTAR
  // ============================================================
  useEffect(() => {
    return () => {
      // ✅ CORREÇÃO: Chamar diretamente sem depender do audioManager na lista
      useAudioManager.getState().stopAllAndCleanup();
      if (frequencyAnimationRef.current) {
        cancelAnimationFrame(frequencyAnimationRef.current);
      }
    };
  }, []); // ✅ CORREÇÃO: Array vazio - executa apenas ao desmontar

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleReplay = useCallback(() => {
    if (greeting) {
      speak(greeting);
    }
  }, [greeting, speak]);

  const handleModuleClick = useCallback(
    (moduleId: Exclude<ModuleId, null>) => {
      // Parar áudio da HOME imediatamente
      stop();
      useAudioManager.getState().stopAllAndCleanup(); // ✅ CORREÇÃO: Usar getState()

      // Navegar para módulo
      onModuleSelect(moduleId);
    },
    [stop, onModuleSelect], // ✅ CORREÇÃO: Removido audioManager das dependências
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
          onPause={stop}
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
