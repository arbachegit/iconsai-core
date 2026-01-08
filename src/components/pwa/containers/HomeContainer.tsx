/**
 * ============================================================
 * HomeContainer.tsx - Container INDEPENDENTE para Home
 * ============================================================
 * Versão: 5.4.0 - 2026-01-08
 * Container da tela principal com seleção de módulos
 * ============================================================
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { SpectrumAnalyzer } from "../voice/SpectrumAnalyzer";
import { PlayButton } from "../voice/PlayButton";
import { ModuleSelector } from "../voice/ModuleSelector";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAudioManager } from "@/stores/audioManagerStore";
import { usePWAVoiceStore, ModuleId } from "@/stores/pwaVoiceStore";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { supabase } from "@/integrations/supabase/client";

interface HomeContainerProps {
  onModuleSelect: (moduleId: Exclude<ModuleId, null>) => void;
  deviceId: string;
}

const HomeContainer: React.FC<HomeContainerProps> = ({ onModuleSelect, deviceId }) => {
  const { speak, stop, isPlaying, isLoading, progress } = useTextToSpeech();
  const audioManager = useAudioManager();
  const { userName } = usePWAVoiceStore();
  const { config, isLoading: isConfigLoading } = useConfigPWA();

  const [greeting, setGreeting] = useState<string | null>(null);
  const [isGreetingReady, setIsGreetingReady] = useState(false);
  const [hasPlayedAutoplay, setHasPlayedAutoplay] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  const mountedRef = useRef(true);
  const animationRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // ============================================================
  // ETAPA 1: Buscar greeting com FALLBACK GARANTIDO
  // ============================================================
  useEffect(() => {
    if (isConfigLoading) return;
    if (!deviceId || deviceId === "") return;
    if (isGreetingReady) return;

    const fetchHomeGreeting = async () => {
      try {
        console.log("[HomeContainer] Buscando saudação contextual...");

        const { data, error } = await supabase.functions.invoke("pwa-contextual-memory", {
          body: {
            deviceId,
            moduleType: "home",
            action: "getGreeting",
          },
        });

        if (!mountedRef.current) return;

        if (error) {
          console.warn("[HomeContainer] Erro edge function:", error);
          setGreeting(config.welcomeText);
        } else if (data?.greeting) {
          console.log("[HomeContainer] Saudação contextual recebida");
          setGreeting(data.greeting);
        } else {
          setGreeting(config.welcomeText);
        }
      } catch (err) {
        console.warn("[HomeContainer] Exceção:", err);
        if (mountedRef.current) {
          setGreeting(config.welcomeText);
        }
      } finally {
        if (mountedRef.current) {
          setIsGreetingReady(true);
        }
      }
    };

    fetchHomeGreeting();
  }, [isConfigLoading, deviceId, config.welcomeText, isGreetingReady]);

  // ============================================================
  // ETAPA 2: Autoplay SÓ quando greeting está pronto
  // ============================================================
  useEffect(() => {
    if (!isGreetingReady || hasPlayedAutoplay || !greeting) return;

    console.log("[HomeContainer] Executando autoplay da saudação");
    setHasPlayedAutoplay(true);

    speak(greeting, "home").catch((err) => {
      console.warn("[HomeContainer] Autoplay bloqueado:", err);
    });
  }, [isGreetingReady, hasPlayedAutoplay, greeting, speak]);

  // Captura de frequência para visualizer
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

    animationRef.current = requestAnimationFrame(updateFrequency);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioManager.isPlaying]);

  const handlePlayClick = useCallback(() => {
    if (isPlaying) {
      stop();
    } else if (greeting) {
      speak(greeting, "home");
    }
  }, [isPlaying, greeting, speak, stop]);

  const handleModuleSelect = useCallback((moduleId: Exclude<ModuleId, null>) => {
    // Parar áudio antes de navegar
    stop();
    onModuleSelect(moduleId);
  }, [stop, onModuleSelect]);

  const visualizerState = isLoading ? "loading" : isPlaying ? "playing" : "idle";
  const buttonState = isLoading ? "loading" : isPlaying ? "playing" : "idle";

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header com logo/título */}
      <div className="flex items-center justify-center px-4 py-3 pt-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-white">KnowYOU</h1>
          <p className="text-sm text-white/60">Assistente de Voz</p>
        </motion.div>
      </div>

      {/* Área central com visualizer e botão play */}
      <div className="flex flex-col items-center justify-center px-6 py-4 gap-4">
        <SpectrumAnalyzer
          state={visualizerState}
          frequencyData={frequencyData}
          primaryColor="#8B5CF6"
          secondaryColor="#A78BFA"
          height={80}
          width={240}
        />

        <PlayButton
          state={buttonState}
          onClick={handlePlayClick}
          progress={progress}
          size="md"
          primaryColor="#8B5CF6"
        />
      </div>

      {/* Grid de módulos */}
      <div className="flex-1 px-4 pb-4">
        <ModuleSelector
          onSelect={handleModuleSelect}
          isPlaying={isPlaying}
        />
      </div>
    </div>
  );
};

export default HomeContainer;
