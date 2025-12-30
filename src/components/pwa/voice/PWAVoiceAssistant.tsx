import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { usePWAStore } from "@/stores/pwaStore";
import { SplashScreen } from "./SplashScreen";
import { VoicePlayerBox } from "./VoicePlayerBox";
import { ModuleSelector } from "./ModuleSelector";
import { ModuleHeader } from "./ModuleHeader";
import { HelpModule } from "../modules/HelpModule";
import { WorldModule } from "../modules/WorldModule";
import { HealthModule } from "../modules/HealthModule";
import { IdeasModule } from "../modules/IdeasModule";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

type ModuleId = "help" | "world" | "health" | "ideas";

export const PWAVoiceAssistant: React.FC = () => {
  const { 
    appState, 
    setAppState, 
    activeModule, 
    setActiveModule, 
    playerState,
    setPlayerState,
    clearHistory
  } = usePWAStore();
  
  const { speak, isPlaying, isLoading } = useTextToSpeech();
  const [isMobile, setIsMobile] = useState(true);
  const [showDesktopWarning, setShowDesktopWarning] = useState(false);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
      setShowDesktopWarning(!mobile);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update player state based on TTS
  useEffect(() => {
    if (isLoading) {
      setPlayerState("loading");
    } else if (isPlaying) {
      setPlayerState("playing");
    }
  }, [isLoading, isPlaying, setPlayerState]);

  // Welcome message when entering home
  useEffect(() => {
    if (appState === "home") {
      const welcome = "Bem-vindo ao KnowYOU! Escolha um módulo para começar nossa conversa.";
      speak(welcome);
    }
  }, [appState]);

  const handleSplashComplete = () => {
    setAppState("home");
  };

  const handleModuleSelect = (moduleId: ModuleId) => {
    setActiveModule(moduleId);
    setAppState("module");
    clearHistory();
  };

  const handleBackToHome = () => {
    setActiveModule(null);
    setAppState("home");
    setPlayerState("idle");
    clearHistory();
  };

  const renderModule = () => {
    switch (activeModule) {
      case "help": return <HelpModule />;
      case "world": return <WorldModule />;
      case "health": return <HealthModule />;
      case "ideas": return <IdeasModule />;
      default: return null;
    }
  };

  // Desktop warning screen
  if (showDesktopWarning) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center"
          >
            <Smartphone className="w-12 h-12 text-primary" />
          </motion.div>
          
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Acesse pelo celular
          </h1>
          
          <p className="text-muted-foreground mb-6">
            O KnowYOU Voice Assistant foi projetado para dispositivos móveis. 
            Acesse <span className="text-primary font-medium">hmv.knowyou.app</span> pelo seu celular para a melhor experiência.
          </p>
          
          <div className="p-4 bg-card rounded-xl border border-border">
            <p className="text-sm text-muted-foreground">
              Escaneie o QR Code ou digite o endereço no navegador do seu celular
            </p>
            {/* TODO: Add QR Code */}
          </div>
          
          {/* Debug button to bypass warning */}
          <button
            onClick={() => setShowDesktopWarning(false)}
            className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Continuar mesmo assim (debug)
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pwa-no-select">
      <AnimatePresence mode="wait">
        {/* Splash Screen */}
        {appState === "splash" && (
          <SplashScreen key="splash" onComplete={handleSplashComplete} />
        )}

        {/* Home - Module Selection */}
        {appState === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col safe-area-inset"
          >
            {/* Header */}
            <div className="text-center py-8 px-4">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
              >
                KnowYOU
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground mt-1"
              >
                Seu assistente de voz inteligente
              </motion.p>
            </div>

            {/* Voice Player Box */}
            <div className="px-4 mb-8">
              <VoicePlayerBox
                state={playerState}
                onMicClick={() => {}}
                onPlayPause={() => {}}
                showMic={false}
                title="Olá!"
                subtitle="Escolha um módulo abaixo"
              />
            </div>

            {/* Module Selection */}
            <div className="flex-1">
              <p className="text-center text-sm text-muted-foreground mb-2">
                Escolha um módulo
              </p>
              <ModuleSelector onSelect={handleModuleSelect} />
            </div>

            {/* Footer */}
            <div className="py-4 text-center">
              <p className="text-xs text-muted-foreground">
                KnowYOU © 2025 • hmv.knowyou.app
              </p>
            </div>
          </motion.div>
        )}

        {/* Active Module */}
        {appState === "module" && activeModule && (
          <motion.div
            key="module"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            {/* Module Header */}
            <ModuleHeader moduleId={activeModule} onBack={handleBackToHome} />

            {/* Module content */}
            <div className="flex-1 overflow-hidden pwa-scrollbar">
              {renderModule()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PWAVoiceAssistant;
