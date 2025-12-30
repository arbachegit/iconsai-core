import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { usePWAStore } from "@/stores/pwaStore";
import { SplashScreen } from "./SplashScreen";
import { VoicePlayerBox } from "./VoicePlayerBox";
import { ModuleSelector } from "./ModuleSelector";
import { HelpModule } from "../modules/HelpModule";
import { WorldModule } from "../modules/WorldModule";
import { HealthModule } from "../modules/HealthModule";
import { IdeasModule } from "../modules/IdeasModule";

const moduleNames: Record<string, string> = {
  help: "Ajuda",
  world: "Mundo",
  health: "Saúde",
  ideas: "Ideias",
};

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

  const handleSplashComplete = () => {
    setAppState("home");
  };

  const handleModuleSelect = (moduleId: typeof activeModule) => {
    setActiveModule(moduleId);
    setAppState("module");
    clearHistory();
  };

  const handleBack = () => {
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
            className="flex-1 flex flex-col"
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
                onMicClick={() => setPlayerState(playerState === "listening" ? "idle" : "listening")}
                onPlayPause={() => setPlayerState(playerState === "playing" ? "idle" : "playing")}
              />
            </div>

            {/* Module Selection */}
            <div className="flex-1">
              <p className="text-center text-sm text-muted-foreground mb-2">
                Escolha um módulo
              </p>
              <ModuleSelector onSelect={handleModuleSelect} />
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
            {/* Header with back button */}
            <div className="flex items-center gap-3 p-4 border-b border-border/50">
              <button
                onClick={handleBack}
                className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <h2 className="text-lg font-semibold text-foreground">
                {moduleNames[activeModule] || activeModule}
              </h2>
            </div>

            {/* Module content */}
            <div className="flex-1 overflow-hidden">
              {renderModule()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PWAVoiceAssistant;
