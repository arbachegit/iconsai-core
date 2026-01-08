/**
 * ============================================================
 * HomeContainer.tsx - v5.0.0
 * ============================================================
 * Container INDEPENDENTE da HOME
 * - Gerencia seu próprio estado de greeting
 * - Autoplay GARANTIDO com fallback
 * - Não compartilha estado com módulos
 * ============================================================
 */

import React, { useEffect, useState, useCallback } from "react";
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
  fingerprint: string;
}

export const HomeContainer: React.FC<HomeContainerProps> = ({ 
  onModuleSelect, 
  fingerprint 
}) => {
  const { config, isLoading: isConfigLoading } = useConfigPWA();
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech({ voice: config.ttsVoice });
  const audioManager = useAudioManager();
  const { userName, setPlayerState } = usePWAVoiceStore();

  // Estado LOCAL do container - INDEPENDENTE
  const [greeting, setGreeting] = useState<string | null>(null);
  const [isGreetingReady, setIsGreetingReady] = useState(false);
  const [hasPlayedAutoplay, setHasPlayedAutoplay] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  // Update player state
  useEffect(() => {
    if (isLoading) {
      setPlayerState("loading");
    } else if (isPlaying) {
      setPlayerState("playing");
    } else {
      setPlayerState("waiting");
    }
  }, [isLoading, isPlaying, setPlayerState]);

  // Captura de frequência
  useEffect(() => {
    if (!audioManager.isPlaying) {
      setFrequencyData([]);
      return;
    }

    let animationId: number;
    const updateFrequency = () => {
      const data = audioManager.getFrequencyData();
      if (data.length > 0) {
        setFrequencyData(data);
      }
      animationId = requestAnimationFrame(updateFrequency);
    };

    updateFrequency();
    return () => cancelAnimationFrame(animationId);
  }, [audioManager.isPlaying, audioManager]);

  // ============================================================
  // ETAPA 1: Buscar greeting com FALLBACK GARANTIDO
  // ============================================================
  useEffect(() => {
    if (isConfigLoading || isGreetingReady) return;

    const fetchHomeGreeting = async () => {
      const defaultWelcome = config.welcomeText?.replace("[name]", userName || "") || 
        "Olá! Bem-vindo ao KnowYOU. Escolha um módulo para começar.";

      try {
        console.log("[HomeContainer] Buscando saudação contextual...");
        
        const { data, error } = await supabase.functions.invoke("generate-contextual-greeting", {
          body: {
            deviceId: fingerprint,
            userName: userName || undefined,
            // SEM moduleId - é HOME
          },
        });

        if (error) {
          console.warn("[HomeContainer] Erro ao buscar saudação:", error);
          setGreeting(defaultWelcome);
        } else if (data?.greeting) {
          console.log("[HomeContainer] Saudação contextual recebida");
          setGreeting(data.greeting);
        } else {
          setGreeting(defaultWelcome);
        }
      } catch (err) {
        console.warn("[HomeContainer] Exceção, usando fallback:", err);
        setGreeting(defaultWelcome);
      } finally {
        // SEMPRE sinaliza pronto
        setIsGreetingReady(true);
      }
    };

    fetchHomeGreeting();
  }, [isConfigLoading, config.welcomeText, userName, fingerprint, isGreetingReady]);

  // ============================================================
  // ETAPA 2: Autoplay SÓ quando greeting está pronto
  // ============================================================
  useEffect(() => {
    if (!isGreetingReady || hasPlayedAutoplay || !greeting) return;

    console.log("[HomeContainer] Executando autoplay:", greeting.substring(0, 50) + "...");
    setHasPlayedAutoplay(true);
    
    speak(greeting).catch((err) => {
      console.warn("[HomeContainer] Autoplay bloqueado:", err);
    });
  }, [isGreetingReady, hasPlayedAutoplay, greeting, speak]);

  // Handler para selecionar módulo
  const handleModuleSelect = useCallback((moduleId: Exclude<ModuleId, null>) => {
    console.log("[HomeContainer] Navegando para módulo:", moduleId);
    
    // Parar áudio IMEDIATAMENTE
    stop();
    audioManager.stopAllAndCleanup();
    
    // Navegar para o módulo
    onModuleSelect(moduleId);
  }, [stop, audioManager, onModuleSelect]);

  // Handler para replay
  const handleReplay = useCallback(() => {
    if (greeting) {
      speak(greeting);
    }
  }, [greeting, speak]);

  const playerState = isLoading ? "loading" : isPlaying ? "playing" : "waiting";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex-1 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <motion.div
        className="pt-12 pb-2 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="text-center overflow-hidden">
          <h1 className="text-2xl font-bold whitespace-nowrap">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              KnowYOU
            </span>
          </h1>
        </div>
      </motion.div>

      {/* Player */}
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

      {/* Module Selector */}
      <motion.div
        className="flex-1 px-4 pb-2 overflow-hidden"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <ModuleSelector 
          onSelect={handleModuleSelect} 
          isPlaying={isPlaying} 
          disabled={isPlaying || isLoading} 
        />
      </motion.div>

      {/* Footer */}
      <motion.div
        className="py-2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <p className="text-[10px] text-muted-foreground/60">KnowYOU © 2025</p>
      </motion.div>
    </motion.div>
  );
};

export default HomeContainer;
