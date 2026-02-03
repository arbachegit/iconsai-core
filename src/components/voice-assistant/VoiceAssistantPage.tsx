/**
 * ============================================================
 * VoiceAssistantPage.tsx - v4.0.0
 * ============================================================
 * Layout em 3 colunas (1/3 cada):
 * - ESQUERDA: Container com falas do USUÁRIO
 * - CENTRO: Botão + Voice Analyzer (centralizado)
 * - DIREITA: Container com falas do ROBÔ
 *
 * Características:
 * - Containers ocupam altura total da tela
 * - Scroll interno nos containers
 * - Texto sincronizado com a fala (typewriter effect)
 * ============================================================
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, User, Bot } from 'lucide-react';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { VoiceButton } from './VoiceButton';
import { VoiceAnalyzer } from './VoiceAnalyzer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceAssistantPageProps {
  welcomeMessage?: string;
  voice?: 'nova' | 'marin' | 'coral' | 'sage' | 'shimmer';
}

// ============================================================
// COMPONENTE: TypewriterText
// Exibe texto com efeito de digitação sincronizado
// ============================================================
const TypewriterText: React.FC<{
  text: string;
  isTyping: boolean;
  speed?: number;
  onComplete?: () => void;
}> = ({ text, isTyping, speed = 50, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isTyping) {
      // Se não está digitando, mostra texto completo
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    // Reset quando novo texto chega
    setDisplayedText('');
    setIsComplete(false);

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, isTyping, speed, onComplete]);

  return (
    <span>
      {displayedText}
      {isTyping && !isComplete && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle"
        />
      )}
    </span>
  );
};

// ============================================================
// COMPONENTE: TranscriptionContainer
// Container de transcrição com altura total e scroll interno
// ============================================================
const TranscriptionContainer: React.FC<{
  title: string;
  icon: React.ReactNode;
  messages: Array<{ content: string; isNew?: boolean }>;
  borderColor: string;
  iconBgColor: string;
  isActive?: boolean;
  emptyText: string;
  isTyping?: boolean;
}> = ({ title, icon, messages, borderColor, iconBgColor, isActive, emptyText, isTyping }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para baixo quando novas mensagens chegam
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-xl overflow-hidden',
        'border-2 bg-background/50 backdrop-blur-sm',
        borderColor
      )}
    >
      {/* Header */}
      <div className={cn('flex items-center gap-3 p-4 border-b flex-shrink-0', borderColor.replace('border-', 'border-b-'))}>
        <motion.div
          className={cn('w-10 h-10 rounded-full flex items-center justify-center', iconBgColor)}
          animate={
            isActive
              ? {
                  boxShadow: [
                    '0 0 0 0 rgba(0, 212, 255, 0)',
                    '0 0 0 8px rgba(0, 212, 255, 0.3)',
                    '0 0 0 0 rgba(0, 212, 255, 0)',
                  ],
                }
              : {}
          }
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {icon}
        </motion.div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {isActive ? 'Falando...' : messages.length > 0 ? `${messages.length} mensagens` : 'Aguardando'}
          </p>
        </div>
      </div>

      {/* Área de mensagens com scroll */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(100, 100, 100, 0.3) transparent',
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <motion.div
              className={cn('w-16 h-16 rounded-full flex items-center justify-center mb-4 opacity-30', iconBgColor)}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {icon}
            </motion.div>
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg, index) => {
              const isLastMessage = index === messages.length - 1;
              const shouldType = isLastMessage && isTyping && msg.isNew;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'p-3 rounded-lg',
                    borderColor.includes('cyan')
                      ? 'bg-cyan-500/10 border border-cyan-500/30'
                      : 'bg-emerald-500/10 border border-emerald-500/30'
                  )}
                >
                  <p className="text-sm text-foreground leading-relaxed">
                    {shouldType ? (
                      <TypewriterText text={msg.content} isTyping={true} speed={30} />
                    ) : (
                      msg.content
                    )}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export const VoiceAssistantPage: React.FC<VoiceAssistantPageProps> = ({
  welcomeMessage = 'Olá! Sou o assistente de voz do IconsAI. Como posso ajudar você hoje?',
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

  // Track de mensagens anteriores para detectar novas
  const prevMessagesCountRef = useRef(0);

  // Inicializar ao montar
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Preparar mensagens do usuário com flag de nova
  const userMessages = useMemo(() => {
    const filtered = messages.filter((m) => m.role === 'user');
    return filtered.map((m, index) => ({
      content: m.content,
      isNew: index === filtered.length - 1 && filtered.length > prevMessagesCountRef.current,
    }));
  }, [messages]);

  // Preparar mensagens do assistente com flag de nova
  const assistantMessages = useMemo(() => {
    const filtered = messages.filter((m) => m.role === 'assistant');
    return filtered.map((m, index) => ({
      content: m.content,
      isNew: index === filtered.length - 1,
    }));
  }, [messages]);

  // Atualizar contador de mensagens
  useEffect(() => {
    const userCount = messages.filter((m) => m.role === 'user').length;
    prevMessagesCountRef.current = userCount;
  }, [messages]);

  // Estados de atividade
  const isRobotSpeaking = buttonState === 'greeting' || buttonState === 'speaking';
  const isUserSpeaking = buttonState === 'recording';
  const isProcessing = buttonState === 'processing';

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Layout principal em 3 colunas */}
      <main className="flex-1 flex overflow-hidden">
        {/* COLUNA ESQUERDA (1/3) - Transcrição do Usuário */}
        <div className="w-1/3 p-4 flex flex-col">
          <TranscriptionContainer
            title="Você"
            icon={<User className="w-5 h-5 text-emerald-400" />}
            messages={userMessages}
            borderColor="border-emerald-500/50"
            iconBgColor="bg-emerald-500/20"
            isActive={isUserSpeaking}
            emptyText="Suas perguntas aparecerão aqui"
            isTyping={isProcessing}
          />
        </div>

        {/* COLUNA CENTRAL (1/3) - Controles */}
        <div className="w-1/3 flex flex-col items-center justify-center p-4">
          {/* Título dinâmico */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {buttonState === 'idle' && 'Bem-vindo!'}
              {buttonState === 'greeting' && 'Olá!'}
              {buttonState === 'ready' && 'Fale sua pergunta'}
              {buttonState === 'recording' && 'Estou ouvindo...'}
              {buttonState === 'processing' && 'Analisando...'}
              {buttonState === 'speaking' && 'Respondendo...'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {buttonState === 'idle' && 'Pressione Play para começar'}
              {buttonState === 'greeting' && 'Aguarde a saudação'}
              {buttonState === 'ready' && 'Clique no microfone e fale'}
              {buttonState === 'recording' && 'Clique em Stop quando terminar'}
              {buttonState === 'processing' && 'Processando sua pergunta'}
              {buttonState === 'speaking' && 'Ouvindo a resposta'}
            </p>
          </motion.div>

          {/* Botão principal */}
          <VoiceButton
            state={buttonState}
            onClick={handleButtonClick}
            disabled={!isInitialized}
          />

          {/* Voice Analyzer */}
          <div className="w-full max-w-md mt-8">
            <VoiceAnalyzer
              frequencyData={frequencyData}
              isActive={frequencySource !== 'none'}
              source={frequencySource}
            />
          </div>

          {/* Erro */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 max-w-md mt-6"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400 flex-1">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={forceReset}
                className="text-red-400 hover:text-red-300"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Legenda */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex gap-6 text-xs text-muted-foreground mt-8"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
              <span>Você (esquerda)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500/50" />
              <span>Assistente (direita)</span>
            </div>
          </motion.div>
        </div>

        {/* COLUNA DIREITA (1/3) - Transcrição do Robô */}
        <div className="w-1/3 p-4 flex flex-col">
          <TranscriptionContainer
            title="Assistente IconsAI"
            icon={<Bot className="w-5 h-5 text-cyan-400" />}
            messages={assistantMessages}
            borderColor="border-cyan-500/50"
            iconBgColor="bg-cyan-500/20"
            isActive={isRobotSpeaking}
            emptyText="Respostas do assistente aparecerão aqui"
            isTyping={isRobotSpeaking}
          />
        </div>
      </main>
    </div>
  );
};

export default VoiceAssistantPage;
