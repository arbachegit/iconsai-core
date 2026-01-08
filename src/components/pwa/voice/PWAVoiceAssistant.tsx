/**
 * PWAVoiceAssistant.tsx - v3.1.0 - 2026-01-08
 * 
 * CORREÇÃO CRÍTICA v3.1.0:
 * - HOME NÃO TOCA mensagem do módulo
 * - Navegação IMEDIATA ao clicar no módulo
 * - Módulo é responsável por sua própria saudação
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { usePWAVoiceStore, ModuleId } from "@/stores/pwaVoiceStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useAudioManager } from "@/stores/audioManagerStore";
import { SplashScreen } from "./SplashScreen";
import { VoicePlayerBox } from "./VoicePlayerBox";
import { ModuleSelector } from "./ModuleSelector";
import { FooterModules } from "./FooterModules";
import { HistoryScreen } from "./HistoryScreen";
import { HelpModule } from "../modules/HelpModule";
import { WorldModule } from "../modules/WorldModule";
import { HealthModule } from "../modules/HealthModule";
import { IdeasModule } from "../modules/IdeasModule";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { PWAAuthGate } from "@/components/gates/PWAAuthGate";
import { supabase } from "@/integrations/supabase/client";

interface PWAVoiceAssistantProps {
  embedded?: boolean;
}

export const PWAVoiceAssistant: React.FC<PWAVoiceAssistantProps> = ({ embedded = false }) => {
  const {
    appState,
    setAppState,
    activeModule,
    setActiveModule,
    playerState,
    setPlayerState,
    setAuthenticated,
    conversations,
    userName,
    deviceFingerprint,
  } = usePWAVoiceStore();
  
  const { initialize: initializeHistory } = useHistoryStore();
  const audioManager = useAudioManager();
  const { config, isLoading: isConfigLoading } = useConfigPWA();
  const { speak, isPlaying, isLoading, progress, stop } = useTextToSpeech({ voice: config.ttsVoice });

  const [isMobile, setIsMobile] = useState(true);
  const [showDesktopWarning, setShowDesktopWarning] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState<string | null>(null);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  // Controle de autoplay
  const hasPlayedWelcome = useRef(false);
  const welcomeAttempted = useRef(false);
  const isNavigatingToModule = useRef(false);
  const frequencyAnimationRef = useRef<number | null>(null);

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

  // Captura de frequência do TTS
  useEffect(() => {
    if (!audioManager.isPlaying) {
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
  }, [audioManager.isPlaying, audioManager]);

  // ============================================================
  // AUTOPLAY HOME: Apenas boas-vindas genéricas
  // ============================================================
  useEffect(() => {
    // NÃO executar se estamos navegando para um módulo
    if (isNavigatingToModule.current) {
      console.log("[PWA] Autoplay HOME bloqueado - navegando para módulo");
      return;
    }

    if (
      appState === "idle" && 
      !isConfigLoading && 
      !welcomeAttempted.current && 
      config.welcomeText &&
      !activeModule
    ) {
      welcomeAttempted.current = true;

      const fetchContextualGreeting = async () => {
        // Verificar novamente antes de executar
        if (isNavigatingToModule.current || activeModule) {
          console.log("[PWA] Autoplay cancelado - navegação em andamento");
          return;
        }

        try {
          const { data, error } = await supabase.functions.invoke("generate-contextual-greeting", {
            body: { 
              deviceId: deviceFingerprint || `anonymous-${Date.now()}`,
              userName: userName || undefined
            }
          });

          // Verificar novamente após fetch
          if (isNavigatingToModule.current || activeModule) {
            console.log("[PWA] Autoplay cancelado após fetch");
            return;
          }

          if (error) {
            console.warn("Erro ao buscar saudação contextual:", error);
            throw error;
          }

          const greeting = data?.greeting || config.welcomeText?.replace("[name]", userName || "") || "";
          
          if (greeting) {
            setLastSpokenText(greeting);
            await speak(greeting);
            hasPlayedWelcome.current = true;
          }
        } catch (err) {
          // Verificar novamente antes do fallback
          if (isNavigatingToModule.current || activeModule) {
            return;
          }
          
          console.warn("Fallback para saudação padrão:", err);
          const fallbackGreeting = config.welcomeText?.replace("[name]", userName || "") || "";
          if (fallbackGreeting) {
            setLastSpokenText(fallbackGreeting);
            speak(fallbackGreeting).catch(() => {});
          }
        }
      };

      const timer = setTimeout(fetchContextualGreeting, 300);
      return () => clearTimeout(timer);
    }
  }, [appState, isConfigLoading, deviceFingerprint, userName, speak, config.welcomeText, activeModule]);

  const handleReplay = useCallback(() => {
    if (lastSpokenText) {
      speak(lastSpokenText);
    }
  }, [lastSpokenText, speak]);

  const handleSplashComplete = () => {
    setAppState("idle");
  };

  // ============================================================
  // SELEÇÃO DE MÓDULO: Navegação IMEDIATA (sem tocar áudio na HOME)
  // ============================================================
  const handleModuleSelect = (moduleId: Exclude<ModuleId, null>) => {
    // Evitar cliques duplos
    if (isNavigatingToModule.current) {
      console.log("[PWA] Navegação já em andamento, ignorando");
      return;
    }
    
    console.log("[PWA] Navegando para módulo:", moduleId);
    
    // CRÍTICO: Marcar navegação ANTES de qualquer ação
    isNavigatingToModule.current = true;
    
    // Parar QUALQUER áudio atual IMEDIATAMENTE
    stop();
    audioManager.stopAllAndCleanup();
    
    // CORREÇÃO v3.1.0: Navegar IMEDIATAMENTE para o módulo
    // NÃO tocar nenhum áudio na HOME
    // O módulo será responsável por tocar sua própria saudação
    setActiveModule(moduleId);
    
    // Resetar flag após pequeno delay
    setTimeout(() => {
      isNavigatingToModule.current = false;
    }, 300);
  };

  // ============================================================
  // VOLTAR PARA HOME: Reset completo
  // ============================================================
  const handleBackToHome = () => {
    console.log("[PWA] Voltando para HOME");
    
    // Parar TODO áudio
    stop();
    audioManager.stopAllAndCleanup();
    
    // Resetar flag de navegação
    isNavigatingToModule.current = false;
    
    // Resetar estados
    setActiveModule(null);
    setAppState("idle");
    setPlayerState("idle");
    
    // NÃO resetar welcomeAttempted - evita repetir o welcome da HOME
  };
  
  const handleOpenHistoryFromModule = () => {
    setIsConversationsOpen(true);
  };

  const handleSummarize = async () => {
    if (conversations.length === 0 && messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const summaryText =
        conversations.length > 0
          ? `Você teve ${conversations.length} conversas. ${conversations
              .map((c) => c.summary || "")
              .filter(Boolean)
              .join(". ")}`
          : "Resumo da sua sessão.";
      await speak(summaryText);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleOpenConversations = () => {
    setIsConversationsOpen(true);
  };

  const renderModule = () => {
    switch (activeModule) {
      case "help":
        return <HelpModule onBack={handleBackToHome} onHistoryClick={handleOpenHistoryFromModule} />;
      case "world":
        return <WorldModule onBack={handleBackToHome} onHistoryClick={handleOpenHistoryFromModule} />;
      case "health":
        return <HealthModule onBack={handleBackToHome} onHistoryClick={handleOpenHistoryFromModule} />;
      case "ideas":
        return <IdeasModule onBack={handleBackToHome} onHistoryClick={handleOpenHistoryFromModule} />;
      default:
        return null;
    }
  };

  const filteredConversations = activeModule ? conversations.filter((c) => c.module === activeModule) : conversations;

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

  const renderContent = ({ fingerprint, pwaAccess }: { fingerprint: string; pwaAccess: string[] }) => {
    useEffect(() => {
      if (fingerprint) {
        setAuthenticated(true, fingerprint);
        initializeHistory(fingerprint);
      }
    }, [fingerprint]);

    const wrapperClass = embedded
      ? "absolute inset-0 bg-background flex flex-col pwa-no-select overflow-hidden"
      : "fixed inset-0 bg-background flex flex-col pwa-no-select pwa-fullscreen overflow-hidden touch-none";

    return (
      <div className={wrapperClass}>
        <AnimatePresence mode="wait">
          {appState === "splash" && (
            <SplashScreen
              key="splash"
              onComplete={handleSplashComplete}
              embedded={embedded}
              duration={config.splashDurationMs || 3000}
            />
          )}

          {/* HOME - Apenas quando NÃO tem módulo ativo */}
          {(appState === "idle" || appState === "welcome") && !activeModule && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <motion.div 
                className="pt-12 pb-2 px-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="text-center overflow-hidden">
                  <h1 className="text-2xl font-bold whitespace-nowrap">
                    <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">KnowYOU</span>
                  </h1>
                </div>
              </motion.div>

              <motion.div 
                className="px-6 py-4"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <VoicePlayerBox state={playerState} onPlay={handleReplay} onPause={stop} audioProgress={progress} frequencyData={frequencyData} />
              </motion.div>

              <motion.div 
                className="flex-1 px-4 pb-2 overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <ModuleSelector 
                  onSelect={handleModuleSelect} 
                  isPlaying={isPlaying} 
                  disabled={isPlaying || isLoading}
                />
              </motion.div>
              
              <motion.div 
                className="py-2 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
              >
                <p className="text-[10px] text-muted-foreground/60">KnowYOU © 2025</p>
              </motion.div>
            </motion.div>
          )}

          {/* MÓDULO ATIVO */}
          {activeModule && (
            <motion.div
              key="module"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-hidden">{renderModule()}</div>
              <FooterModules activeModule={activeModule} onSelectModule={handleModuleSelect} showIndicators={true} />
            </motion.div>
          )}
        </AnimatePresence>

        {isConversationsOpen && (
          <HistoryScreen
            onBack={() => setIsConversationsOpen(false)}
            filterModule={activeModule || undefined}
            deviceId={fingerprint}
          />
        )}
      </div>
    );
  };

  if (embedded) {
    return renderContent({
      fingerprint: "simulator-embedded",
      pwaAccess: ["pwa", "help", "health", "world", "ideas"],
    });
  }

  return <PWAAuthGate>{(data) => renderContent(data)}</PWAAuthGate>;
};

export default PWAVoiceAssistant;
