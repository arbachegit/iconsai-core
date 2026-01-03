import React, { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { usePWAVoiceStore, ModuleId } from "@/stores/pwaVoiceStore";
import { SplashScreen } from "./SplashScreen";
import { VoicePlayerBox } from "./VoicePlayerBox";
import { ModuleSelector } from "./ModuleSelector";
import { ModuleHeader } from "./ModuleHeader";
import { HeaderActions } from "./HeaderActions";
import { FooterModules } from "./FooterModules";
import { TranscriptArea } from "./TranscriptArea";
import { ConversationDrawer } from "./ConversationDrawer";
import { HelpModule } from "../modules/HelpModule";
import { WorldModule } from "../modules/WorldModule";
import { HealthModule } from "../modules/HealthModule";
import { IdeasModule } from "../modules/IdeasModule";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { PWAAuthGate } from "@/components/gates/PWAAuthGate";

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
  } = usePWAVoiceStore();

  const { config, isLoading: isConfigLoading } = useConfigPWA();
  const { speak, isPlaying, isLoading, progress, stop } = useTextToSpeech({ voice: config.ttsVoice });

  const [isMobile, setIsMobile] = useState(true);
  const [showDesktopWarning, setShowDesktopWarning] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState<string | null>(null);

  // Controle de autoplay - executa UMA vez por sessão
  const hasPlayedWelcome = useRef(false);
  const welcomeAttempted = useRef(false);

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

  // ============================================================
  // AUTOPLAY: Executa welcomeText da configuração ao entrar na HOME
  // ============================================================
  useEffect(() => {
    // Condições para executar autoplay:
    // 1. Estamos na HOME (idle)
    // 2. Config já carregou
    // 3. Ainda não tentamos o autoplay nesta sessão
    // 4. Temos texto de boas-vindas
    if (appState === "idle" && !isConfigLoading && !welcomeAttempted.current && config.welcomeText) {
      welcomeAttempted.current = true;

      // Substituir [name] pelo nome do usuário se disponível
      const greeting = config.welcomeText.replace("[name]", userName || "");
      setLastSpokenText(greeting);

      // Pequeno delay para garantir que a UI está pronta
      const timer = setTimeout(() => {
        speak(greeting)
          .then(() => {
            hasPlayedWelcome.current = true;
          })
          .catch((err) => {
            console.warn("Autoplay bloqueado pelo navegador:", err);
            // Se autoplay falhar, o usuário pode clicar no botão play
          });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [appState, isConfigLoading, config.welcomeText, userName, speak]);

  // Replay do último texto falado
  const handleReplay = useCallback(() => {
    if (lastSpokenText) {
      speak(lastSpokenText);
    }
  }, [lastSpokenText, speak]);

  const handleSplashComplete = () => {
    setAppState("idle");
  };

  const handleModuleSelect = (moduleId: Exclude<ModuleId, null>) => {
    setActiveModule(moduleId);
  };

  const handleBackToHome = () => {
    setActiveModule(null);
    setAppState("idle");
    setPlayerState("idle");
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
        return <HelpModule />;
      case "world":
        return <WorldModule />;
      case "health":
        return <HealthModule />;
      case "ideas":
        return <IdeasModule />;
      default:
        return null;
    }
  };

  // Filtrar conversas por módulo ativo
  const filteredConversations = activeModule ? conversations.filter((c) => c.module === activeModule) : conversations;

  // Desktop warning
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

  // Main content
  const renderContent = ({ fingerprint, pwaAccess }: { fingerprint: string; pwaAccess: string[] }) => {
    useEffect(() => {
      if (fingerprint) {
        setAuthenticated(true, fingerprint);
      }
    }, [fingerprint]);

    const wrapperClass = embedded
      ? "absolute inset-0 bg-background flex flex-col pwa-no-select overflow-hidden"
      : "fixed inset-0 bg-background flex flex-col pwa-no-select pwa-fullscreen overflow-hidden touch-none";

    return (
      <div className={wrapperClass}>
        <AnimatePresence mode="wait">
          {/* Splash Screen */}
          {appState === "splash" && (
            <SplashScreen
              key="splash"
              onComplete={handleSplashComplete}
              embedded={embedded}
              duration={config.splashDurationMs || 3000}
            />
          )}

          {/* ============================================================
              HOME - MINIMALISTA
              - Logo + subtítulo
              - VoicePlayerBox (autoplay + replay)
              - Grid de 4 módulos (compacto)
              - SEM textos extras
              - SEM HeaderActions (botão histórico)
              ============================================================ */}
          {(appState === "idle" || appState === "welcome") && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Header - Apenas logo centralizado */}
              <div className="pt-4 pb-2 px-4">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    KnowYOU
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">Seu assistente de voz inteligente</p>
                </motion.div>
              </div>

              {/* VoicePlayerBox - Compacto */}
              <div className="px-6 py-2">
                <VoicePlayerBox state={playerState} onPlay={handleReplay} onPause={stop} audioProgress={progress} />
              </div>

              {/* Grid de Módulos - Ocupa o espaço restante */}
              <div className="flex-1 px-4 pb-2 overflow-hidden">
                <ModuleSelector onSelect={handleModuleSelect} />
              </div>

              {/* Footer mínimo */}
              <div className="py-2 text-center">
                <p className="text-[10px] text-muted-foreground/60">KnowYOU © 2025</p>
              </div>
            </motion.div>
          )}

          {/* ============================================================
              MÓDULO ATIVO
              - Header com botão voltar + HeaderActions (histórico)
              - Conteúdo do módulo (com microfone interno)
              - Footer de navegação
              ============================================================ */}
          {appState === "module" && activeModule && (
            <motion.div
              key="module"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Header do módulo COM HeaderActions */}
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex-1">
                  <ModuleHeader moduleId={activeModule} onBack={handleBackToHome} />
                </div>
                <HeaderActions
                  onSummarize={handleSummarize}
                  onOpenChat={handleOpenConversations}
                  hasConversations={filteredConversations.length > 0 || messages.length > 0}
                  isSummarizing={isSummarizing}
                />
              </div>

              {/* Conteúdo do módulo */}
              <div className="flex-1 overflow-hidden">{renderModule()}</div>

              {/* Footer de navegação entre módulos */}
              <FooterModules activeModule={activeModule} onSelectModule={handleModuleSelect} showIndicators={true} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drawer de conversas */}
        <ConversationDrawer
          isOpen={isConversationsOpen}
          onClose={() => setIsConversationsOpen(false)}
          conversations={filteredConversations}
          embedded={embedded}
        />
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
