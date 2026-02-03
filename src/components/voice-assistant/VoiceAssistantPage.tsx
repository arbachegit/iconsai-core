/**
 * ============================================================
 * VoiceAssistantPage.tsx - v4.1.0
 * ============================================================
 * Layout em 3 colunas (1/3 cada):
 * - ESQUERDA: Container com falas do USUÁRIO
 * - CENTRO: Botão + Voice Analyzer BIDIRECIONAL (centralizado)
 * - DIREITA: Container com falas do ROBÔ
 *
 * Características:
 * - Containers ocupam altura total da tela
 * - Scroll interno nos containers
 * - Texto SINCRONIZADO com a fala (velocidade calculada)
 * - Voice Analyzer bidirecional
 * ============================================================
 */

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
// UTILITÁRIO: Calcular velocidade de digitação sincronizada
// Baseado em ~12 caracteres por segundo para fala em PT-BR
// ============================================================
const calculateTypingSpeed = (text: string): number => {
  // Média de caracteres por segundo na fala brasileira: ~12-15
  const CHARS_PER_SECOND = 13;

  // Estimar duração do áudio em segundos
  const estimatedDuration = text.length / CHARS_PER_SECOND;

  // Calcular intervalo entre caracteres (em ms)
  // Garantir mínimo de 20ms e máximo de 80ms
  const intervalMs = Math.max(20, Math.min(80, (estimatedDuration * 1000) / text.length));

  return intervalMs;
};

// ============================================================
// COMPONENTE: SyncedTypewriterText
// Exibe texto com efeito de digitação SINCRONIZADO com fala
// ============================================================
const SyncedTypewriterText: React.FC<{
  text: string;
  isTyping: boolean;
  onComplete?: () => void;
}> = ({ text, isTyping, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Limpar intervalo anterior
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isTyping) {
      // Se não está digitando, mostra texto completo imediatamente
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    // Reset quando novo texto chega
    setDisplayedText('');
    setIsComplete(false);

    // Calcular velocidade baseada no tamanho do texto
    const speed = calculateTypingSpeed(text);
    let currentIndex = 0;

    intervalRef.current = setInterval(() => {
      if (currentIndex < text.length) {
        // Avançar por chunks para textos longos (mais suave)
        const chunkSize = text.length > 200 ? 2 : 1;
        const nextIndex = Math.min(currentIndex + chunkSize, text.length);
        setDisplayedText(text.substring(0, nextIndex));
        currentIndex = nextIndex;
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, isTyping, onComplete]);

  // Quando para de digitar (speaking terminou), mostrar texto completo
  useEffect(() => {
    if (!isTyping && displayedText !== text) {
      setDisplayedText(text);
      setIsComplete(true);
    }
  }, [isTyping, text, displayedText]);

  return (
    <span>
      {displayedText}
      {isTyping && !isComplete && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
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

  // Auto-scroll para baixo quando novas mensagens chegam ou texto é atualizado
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Scroll contínuo durante digitação
  useEffect(() => {
    if (!isTyping || !scrollRef.current) return;

    const scrollInterval = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);

    return () => clearInterval(scrollInterval);
  }, [isTyping]);

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
                      <SyncedTypewriterText text={msg.content} isTyping={true} />
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
  const prevMessagesCountRef = useRef({ user: 0, assistant: 0 });

  // Inicializar ao montar
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Preparar mensagens do usuário com flag de nova
  const userMessages = useMemo(() => {
    const filtered = messages.filter((m) => m.role === 'user');
    const prevCount = prevMessagesCountRef.current.user;
    return filtered.map((m, index) => ({
      content: m.content,
      isNew: index === filtered.length - 1 && filtered.length > prevCount,
    }));
  }, [messages]);

  // Preparar mensagens do assistente com flag de nova
  const assistantMessages = useMemo(() => {
    const filtered = messages.filter((m) => m.role === 'assistant');
    const prevCount = prevMessagesCountRef.current.assistant;
    return filtered.map((m, index) => ({
      content: m.content,
      isNew: index === filtered.length - 1 && filtered.length > prevCount,
    }));
  }, [messages]);

  // Atualizar contador de mensagens quando muda
  useEffect(() => {
    const userCount = messages.filter((m) => m.role === 'user').length;
    const assistantCount = messages.filter((m) => m.role === 'assistant').length;

    // Pequeno delay para permitir que a flag isNew seja processada
    const timeout = setTimeout(() => {
      prevMessagesCountRef.current = { user: userCount, assistant: assistantCount };
    }, 100);

    return () => clearTimeout(timeout);
  }, [messages]);

  // Estados de atividade
  const isRobotSpeaking = buttonState === 'greeting' || buttonState === 'speaking';
  const isUserSpeaking = buttonState === 'recording';

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
            isTyping={false}
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

          {/* Voice Analyzer BIDIRECIONAL */}
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
