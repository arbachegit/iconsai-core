import React, { useEffect, useState } from "react";
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
import { ConversationModal } from "./ConversationModal";
import { HelpModule } from "../modules/HelpModule";
import { WorldModule } from "../modules/WorldModule";
import { HealthModule } from "../modules/HealthModule";
import { IdeasModule } from "../modules/IdeasModule";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { PWAAuthGate } from "@/components/gates/PWAAuthGate";

export const PWAVoiceAssistant: React.FC = () => {
  const { 
    appState, 
    setAppState, 
    activeModule, 
    setActiveModule, 
    playerState,
    setPlayerState,
    setAuthenticated,
    resetSession,
    conversations,
    userName,
    isFirstVisit,
    setFirstVisit,
  } = usePWAVoiceStore();
  
  const { config } = useConfigPWA();
  const { speak, isPlaying, isLoading, progress, stop } = useTextToSpeech({ voice: config.ttsVoice });
  
  const [isMobile, setIsMobile] = useState(true);
  const [showDesktopWarning, setShowDesktopWarning] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const [playingConversationId, setPlayingConversationId] = useState<string | null>(null);

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
    } else {
      setPlayerState("waiting");
    }
  }, [isLoading, isPlaying, setPlayerState]);

  // Welcome message when entering home (only on first visit)
  useEffect(() => {
    if (appState === "idle" && isFirstVisit && config.welcomeText) {
      const greeting = config.welcomeText.replace("[name]", userName || "");
      speak(greeting);
      setFirstVisit(false);
    }
  }, [appState, isFirstVisit, userName, speak, setFirstVisit, config.welcomeText]);

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
      const summaryText = conversations.length > 0
        ? `Você teve ${conversations.length} conversas. ${conversations.map(c => c.summary || "").filter(Boolean).join(". ")}`
        : "Resumo da sua sessão. Você pode enviar para o WhatsApp quando quiser.";
      await speak(summaryText);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleOpenConversations = () => {
    setIsConversationsOpen(true);
  };

  const handlePlayConversation = (id: string) => {
    if (playingConversationId === id) {
      setPlayingConversationId(null);
      // TODO: Stop audio playback
    } else {
      setPlayingConversationId(id);
      // TODO: Play audio for this conversation
    }
  };

  const handleTranscribe = (id: string) => {
    // The modal handles transcript display via expandedId state
    console.log("Transcribe conversation:", id);
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

  // Main PWA content wrapped with Auth Gate
  const renderContent = ({ fingerprint, pwaAccess }: { fingerprint: string; pwaAccess: string[] }) => {
    // Sync auth state with store when authenticated
    useEffect(() => {
      if (fingerprint) {
        setAuthenticated(true, fingerprint);
      }
    }, [fingerprint]);

    return (
      <div className="min-h-screen bg-background flex flex-col pwa-no-select">
        <AnimatePresence mode="wait">
          {/* Splash Screen */}
          {appState === "splash" && (
            <SplashScreen key="splash" onComplete={handleSplashComplete} />
          )}

          {/* Home - Module Selection */}
          {(appState === "idle" || appState === "welcome") && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col safe-area-inset"
            >
              {/* Header with actions */}
              <div className="flex items-center justify-between py-4 px-4">
                <div className="flex-1" />
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    KnowYOU
                  </h1>
                </motion.div>
                <div className="flex-1 flex justify-end">
                  <HeaderActions
                    onSummarize={handleSummarize}
                    onOpenChat={handleOpenConversations}
                    hasConversations={messages.length > 0 || conversations.length > 0}
                    isSummarizing={isSummarizing}
                  />
                </div>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-center -mt-2 mb-4"
              >
                Seu assistente de voz inteligente
              </motion.p>

              {/* Voice Player Box */}
              <div className="px-4 mb-8">
                <VoicePlayerBox
                  state={playerState}
                  onPlay={() => {}}
                  onPause={stop}
                  audioProgress={progress}
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
              {/* Module Header with actions */}
              <div className="flex items-center justify-between px-4">
                <div className="flex-1">
                  <ModuleHeader moduleId={activeModule} onBack={handleBackToHome} />
                </div>
                <HeaderActions
                  onSummarize={handleSummarize}
                  onOpenChat={handleOpenConversations}
                  hasConversations={messages.length > 0 || conversations.length > 0}
                  isSummarizing={isSummarizing}
                />
              </div>

              {/* Transcript Area */}
              <TranscriptArea
                messages={messages}
                interimTranscript={interimTranscript}
                isListening={isListening}
              />

              {/* Module content */}
              <div className="flex-1 overflow-hidden pwa-scrollbar">
                {renderModule()}
              </div>

              {/* Footer Modules for quick navigation */}
              <FooterModules
                activeModule={activeModule}
                onSelectModule={handleModuleSelect}
                showIndicators={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversations Modal */}
        <ConversationModal
          isOpen={isConversationsOpen}
          onClose={() => setIsConversationsOpen(false)}
          conversations={conversations}
          onPlayAudio={handlePlayConversation}
          onTranscribe={handleTranscribe}
          playingId={playingConversationId}
        />
      </div>
    );
  };

  // Wrap everything in PWAAuthGate
  return (
    <PWAAuthGate>
      {(data) => renderContent(data)}
    </PWAAuthGate>
  );
};

export default PWAVoiceAssistant;
