/**
 * ============================================================
 * PWAVoiceAssistant.tsx - v5.1.0
 * ============================================================
 * ARQUITETURA DE CONTAINERS INDEPENDENTES
 * - Cada container gerencia seu próprio autoplay
 * - Sem race conditions
 * - Sem refs compartilhadas
 * - SAFARI COMPATIBLE
 * ============================================================
 */

import React, { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { usePWAVoiceStore, ModuleId } from "@/stores/pwaVoiceStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useAudioManager } from "@/stores/audioManagerStore";
import { SplashScreen } from "./SplashScreen";
import { FooterModules } from "./FooterModules";
import { HistoryScreen } from "./HistoryScreen";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { PWAAuthGate } from "@/components/gates/PWAAuthGate";
import SafariAudioUnlock from "@/components/pwa/SafariAudioUnlock";
import SafariPWAInstallPrompt from "@/components/pwa/SafariPWAInstallPrompt";

// Containers independentes
import { 
  HomeContainer, 
  HealthModuleContainer, 
  IdeasModuleContainer, 
  WorldModuleContainer, 
  HelpModuleContainer 
} from "../containers";

interface PWAVoiceAssistantProps {
  embedded?: boolean;
}

export const PWAVoiceAssistant: React.FC<PWAVoiceAssistantProps> = ({ embedded = false }) => {
  const {
    appState,
    setAppState,
    activeModule,
    setActiveModule,
    setPlayerState,
    setAuthenticated,
    conversations,
  } = usePWAVoiceStore();

  const { initialize: initializeHistory } = useHistoryStore();
  const audioManager = useAudioManager();
  const { config } = useConfigPWA();

  const [isMobile, setIsMobile] = useState(true);
  const [showDesktopWarning, setShowDesktopWarning] = useState(false);
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const [currentFingerprint, setCurrentFingerprint] = useState<string>("");

  // Lock scroll
  useEffect(() => {
    if (embedded) return;
    document.documentElement.classList.add("pwa-scroll-lock");
    document.body.classList.add("pwa-scroll-lock");
    return () => {
      document.documentElement.classList.remove("pwa-scroll-lock");
      document.body.classList.remove("pwa-scroll-lock");
    };
  }, [embedded]);

  // Check mobile
  useEffect(() => {
    if (embedded) {
      setIsMobile(true);
      setShowDesktopWarning(false);
      return;
    }
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
      setShowDesktopWarning(!mobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [embedded]);

  const handleSplashComplete = () => {
    setAppState("idle");
  };

  // ============================================================
  // SELEÇÃO DE MÓDULO - Navegação IMEDIATA
  // ============================================================
  const handleModuleSelect = useCallback((moduleId: Exclude<ModuleId, null>) => {
    console.log("[PWA] Navegando para módulo:", moduleId);
    
    // Parar áudio IMEDIATAMENTE - usar getState() para evitar loop
    useAudioManager.getState().stopAllAndCleanup();
    
    // Navegar para o módulo
    setActiveModule(moduleId);
  }, [setActiveModule]);

  // ============================================================
  // VOLTAR PARA HOME
  // ============================================================
  const handleBackToHome = useCallback(() => {
    console.log("[PWA] Voltando para HOME");
    
    // Parar áudio - usar getState() para evitar loop
    useAudioManager.getState().stopAllAndCleanup();
    
    // Resetar estados
    setActiveModule(null);
    setAppState("idle");
    setPlayerState("idle");
  }, [setActiveModule, setAppState, setPlayerState]);

  const handleOpenHistoryFromModule = () => {
    setIsConversationsOpen(true);
  };

  // ============================================================
  // RENDERIZAR CONTAINER DO MÓDULO
  // ============================================================
  const renderModuleContainer = () => {
    const commonProps = {
      onBack: handleBackToHome,
      onHistoryClick: handleOpenHistoryFromModule,
      deviceId: currentFingerprint,
    };

    switch (activeModule) {
      case "health":
        return <HealthModuleContainer {...commonProps} />;
      case "ideas":
        return <IdeasModuleContainer {...commonProps} />;
      case "world":
        return <WorldModuleContainer {...commonProps} />;
      case "help":
        return <HelpModuleContainer {...commonProps} />;
      default:
        return null;
    }
  };

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
          <h1 className="text-2xl font-bold text-foreground mb-4">Acesse pelo celular</h1>
          <p className="text-muted-foreground mb-6">
            O KnowYOU Voice Assistant foi projetado para dispositivos móveis. Acesse{" "}
            <span className="text-primary font-medium">hmv.knowyou.app</span> pelo seu celular.
          </p>
        </motion.div>
      </div>
    );
  }

  const renderContent = ({ userPhone, pwaAccess }: { userPhone: string; pwaAccess: string[] }) => {
    useEffect(() => {
      if (userPhone) {
        setCurrentFingerprint(userPhone); // Using phone as device identifier
        setAuthenticated(true, userPhone);
        initializeHistory(userPhone);
      }
    }, [userPhone]);

    const wrapperClass = embedded
      ? "absolute inset-0 bg-background flex flex-col pwa-no-select overflow-hidden"
      : "fixed inset-0 bg-background flex flex-col pwa-no-select pwa-fullscreen overflow-hidden touch-none";

    return (
      <div className={wrapperClass}>
        {/* Safari compatibility components */}
        <SafariAudioUnlock />
        <SafariPWAInstallPrompt />
        <AnimatePresence mode="wait">
          {appState === "splash" && (
            <SplashScreen
              key="splash"
              onComplete={handleSplashComplete}
              embedded={embedded}
              duration={config.splashDurationMs || 3000}
            />
          )}

          {/* HOME - Container INDEPENDENTE */}
          {(appState === "idle" || appState === "welcome") && !activeModule && (
            <HomeContainer
              key="home"
              onModuleSelect={handleModuleSelect}
              deviceId={currentFingerprint}
            />
          )}

          {/* MÓDULO ATIVO - Container INDEPENDENTE */}
          {activeModule && (
            <motion.div
              key={`module-${activeModule}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-hidden">
                {renderModuleContainer()}
              </div>
              <FooterModules 
                activeModule={activeModule} 
                onSelectModule={handleModuleSelect} 
                showIndicators={true} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isConversationsOpen && (
          <HistoryScreen
            onBack={() => setIsConversationsOpen(false)}
            filterModule={activeModule || undefined}
            deviceId={currentFingerprint}
          />
        )}
      </div>
    );
  };

  if (embedded) {
    return renderContent({
      userPhone: "simulator-embedded",
      pwaAccess: ["pwa", "help", "health", "world", "ideas"],
    });
  }

  return <PWAAuthGate>{(data) => renderContent(data)}</PWAAuthGate>;
};

export default PWAVoiceAssistant;
