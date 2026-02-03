/**
 * ============================================================
 * VoiceAssistantPage.tsx - v3.0.0
 * ============================================================
 * Pagina principal do assistente de voz interativo.
 * Layout otimizado para UX:
 * - Scroll habilitado na pagina
 * - Controles (botao + analyzer) no topo
 * - Containers de transcricao com altura limitada
 * - Componentes encapsulados (ver skills/)
 * ============================================================
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, User, Bot } from 'lucide-react';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { VoiceButton } from './VoiceButton';
import { VoiceAnalyzer } from './VoiceAnalyzer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import iconsaiLogo from '@/assets/knowyou-admin-logo.png';

interface VoiceAssistantPageProps {
  welcomeMessage?: string;
  voice?: 'nova' | 'marin' | 'coral' | 'sage' | 'shimmer';
}

// ============================================================
// SKILL: TranscriptionContainer
// Container encapsulado para exibicao de transcricoes
// ============================================================
const TranscriptionContainer: React.FC<{
  title: string;
  icon: React.ReactNode;
  messages: string[];
  borderColor: string;
  iconBgColor: string;
  isActive?: boolean;
  emptyText: string;
}> = ({ title, icon, messages, borderColor, iconBgColor, isActive, emptyText }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl overflow-hidden',
        'border-2 bg-background/50 backdrop-blur-sm',
        'h-[320px] min-h-[280px]',
        borderColor
      )}
    >
      {/* Header */}
      <div className={cn('flex items-center gap-3 p-3 border-b flex-shrink-0', borderColor.replace('border-', 'border-b-'))}>
        <motion.div
          className={cn('w-8 h-8 rounded-full flex items-center justify-center', iconBgColor)}
          animate={
            isActive
              ? {
                  boxShadow: [
                    '0 0 0 0 rgba(0, 212, 255, 0)',
                    '0 0 0 6px rgba(0, 212, 255, 0.3)',
                    '0 0 0 0 rgba(0, 212, 255, 0)',
                  ],
                }
              : {}
          }
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {icon}
        </motion.div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {isActive ? 'Falando...' : messages.length > 0 ? `${messages.length} mensagens` : 'Aguardando'}
          </p>
        </div>
      </div>

      {/* Area de mensagens */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(100, 100, 100, 0.3) transparent',
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <motion.div
              className={cn('w-12 h-12 rounded-full flex items-center justify-center mb-3 opacity-30', iconBgColor)}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {icon}
            </motion.div>
            <p className="text-xs text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((content, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'p-2.5 rounded-lg text-sm',
                  borderColor.includes('cyan')
                    ? 'bg-cyan-500/10 border border-cyan-500/30'
                    : 'bg-emerald-500/10 border border-emerald-500/30'
                )}
              >
                <p className="text-foreground leading-relaxed">{content}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// ============================================================
// SKILL: ControlPanel
// Painel de controle encapsulado (botao + analyzer)
// Ver: skills/VoiceButtonSkill.ts, skills/VoiceAnalyzerSkill.ts
// ============================================================
const ControlPanel: React.FC<{
  buttonState: string;
  frequencyData: Uint8Array | null;
  frequencySource: 'robot' | 'user' | 'none';
  isInitialized: boolean;
  error: string | null;
  onButtonClick: () => void;
  onForceReset: () => void;
}> = ({ buttonState, frequencyData, frequencySource, isInitialized, error, onButtonClick, onForceReset }) => {
  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-card/30 border border-border/50">
      {/* Status badge */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium',
          buttonState === 'idle'
            ? 'bg-muted text-muted-foreground'
            : buttonState === 'recording'
            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
            : buttonState === 'processing'
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
        )}
      >
        <motion.div
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            buttonState === 'idle'
              ? 'bg-muted-foreground'
              : buttonState === 'recording'
              ? 'bg-red-400'
              : buttonState === 'processing'
              ? 'bg-amber-400'
              : 'bg-cyan-400'
          )}
          animate={buttonState !== 'idle' ? { scale: [1, 1.3, 1], opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        {buttonState === 'idle' && 'Aguardando'}
        {buttonState === 'greeting' && 'Saudacao'}
        {buttonState === 'ready' && 'Pronto'}
        {buttonState === 'recording' && 'Gravando'}
        {buttonState === 'processing' && 'Processando'}
        {buttonState === 'speaking' && 'Respondendo'}
      </div>

      {/* Botao principal - Skill: VoiceButtonSkill */}
      <VoiceButton state={buttonState as any} onClick={onButtonClick} disabled={!isInitialized} />

      {/* Voice Analyzer - Skill: VoiceAnalyzerSkill */}
      <div className="w-full max-w-xs">
        <VoiceAnalyzer frequencyData={frequencyData} isActive={frequencySource !== 'none'} source={frequencySource} />
      </div>

      {/* Erro */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs max-w-xs"
        >
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-400 flex-1 truncate">{error}</p>
          <Button variant="ghost" size="sm" onClick={onForceReset} className="h-6 px-2 text-red-400 hover:text-red-300">
            <RefreshCw className="w-3 h-3" />
          </Button>
        </motion.div>
      )}

      {/* Legenda */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
          <span>Voce</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-cyan-500/50" />
          <span>Assistente</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export const VoiceAssistantPage: React.FC<VoiceAssistantPageProps> = ({
  welcomeMessage = 'Ola! Sou o assistente de voz do IconsAI. Como posso ajudar voce hoje?',
  voice = 'nova',
}) => {
  const {
    buttonState,
    messages,
    frequencyData,
    frequencySource,
    error,
    isInitialized,
    initialize,
    handleButtonClick,
    forceReset,
  } = useVoiceAssistant({ welcomeMessage, voice });

  useEffect(() => {
    initialize();
  }, [initialize]);

  const userMessages = useMemo(
    () => messages.filter((m) => m.role === 'user').map((m) => m.content),
    [messages]
  );

  const assistantMessages = useMemo(
    () => messages.filter((m) => m.role === 'assistant').map((m) => m.content),
    [messages]
  );

  const isRobotSpeaking = buttonState === 'greeting' || buttonState === 'speaking';
  const isUserSpeaking = buttonState === 'recording';

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-y-auto">
      {/* Header compacto */}
      <header className="h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src={iconsaiLogo} alt="IconsAI" className="h-6" />
          <div className="h-4 w-px bg-border" />
          <h1 className="text-sm font-semibold text-foreground">Assistente de Voz</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Painel de controle no topo */}
          <div className="flex justify-center">
            <ControlPanel
              buttonState={buttonState}
              frequencyData={frequencyData}
              frequencySource={frequencySource}
              isInitialized={isInitialized}
              error={error}
              onButtonClick={handleButtonClick}
              onForceReset={forceReset}
            />
          </div>

          {/* Containers de transcricao lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TranscriptionContainer
              title="Voce"
              icon={<User className="w-4 h-4 text-emerald-400" />}
              messages={userMessages}
              borderColor="border-emerald-500/50"
              iconBgColor="bg-emerald-500/20"
              isActive={isUserSpeaking}
              emptyText="Suas perguntas aparecerao aqui"
            />
            <TranscriptionContainer
              title="Assistente IconsAI"
              icon={<Bot className="w-4 h-4 text-cyan-400" />}
              messages={assistantMessages}
              borderColor="border-cyan-500/50"
              iconBgColor="bg-cyan-500/20"
              isActive={isRobotSpeaking}
              emptyText="Respostas aparecerao aqui"
            />
          </div>
        </div>
      </main>

      {/* Footer compacto */}
      <footer className="h-8 border-t border-border bg-card/50 flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
        <span>IconsAI Voice Assistant</span>
      </footer>
    </div>
  );
};

export default VoiceAssistantPage;
