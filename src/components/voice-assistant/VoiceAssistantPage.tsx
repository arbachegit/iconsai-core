/**
 * ============================================================
 * VoiceAssistantPage.tsx - v5.2.0
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
 *
 * v5.0.0: Karaoke Text - palavras destacadas em sincronia com áudio TTS
 * v5.1.0: Fix condition para mostrar KaraokeText quando há words
 * v5.2.0: Simplificação - remove estado userKaraokeEnabled, hook detecta novas words
 * ============================================================
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, User, Bot, LayoutDashboard, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useKaraokeSync } from '@/hooks/useKaraokeSync';
import { VoiceButton } from './VoiceButton';
import { VoiceAnalyzer } from './VoiceAnalyzer';
import { KaraokeText } from './KaraokeText';
import { WordTiming } from './types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import iconsaiLogo from '@/assets/iconsai-logo.png';

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
// v5.0.0: Suporte a Karaoke Text
// ============================================================
const TranscriptionContainer: React.FC<{
  title: string;
  icon: React.ReactNode;
  messages: Array<{ content: string; isNew?: boolean; words?: WordTiming[] }>;
  borderColor: string;
  iconBgColor: string;
  isActive?: boolean;
  emptyText: string;
  isTyping?: boolean;
  variant?: 'user' | 'assistant';
  // v5.0.0: Props para Karaoke
  karaokeState?: {
    currentWordIndex: number;
    currentTime: number;
    isPlaying: boolean;
  };
}> = ({ title, icon, messages, borderColor, iconBgColor, isActive, emptyText, isTyping, variant = 'assistant', karaokeState }) => {
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

              // v5.1.0: Usar Karaoke quando há words (mesmo após terminar de tocar)
              const hasWords = msg.words && msg.words.length > 0;
              const useKaraoke = isLastMessage && hasWords && karaokeState;

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
                  {useKaraoke && msg.words ? (
                    // v5.0.0: Karaoke Text sincronizado com áudio
                    <KaraokeText
                      words={msg.words}
                      currentWordIndex={karaokeState!.currentWordIndex}
                      currentTime={karaokeState!.currentTime}
                      isPlaying={karaokeState!.isPlaying}
                      variant={variant}
                    />
                  ) : shouldType ? (
                    <p className="text-sm text-foreground leading-relaxed">
                      <SyncedTypewriterText text={msg.content} isTyping={true} />
                    </p>
                  ) : (
                    <p className="text-sm text-foreground leading-relaxed">
                      {msg.content}
                    </p>
                  )}
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
// COMPONENTE: HistoryModal
// Modal para exibir histórico completo da conversa
// ============================================================
const HistoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  messages: Array<{ role: string; content: string }>;
}> = ({ isOpen, onClose, messages }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-foreground">Histórico da Conversa</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            Fechar
          </Button>
        </div>

        {/* Conteúdo */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma mensagem ainda</p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  'p-3 rounded-lg',
                  msg.role === 'user'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 ml-8'
                    : 'bg-cyan-500/10 border border-cyan-500/30 mr-8'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Bot className="w-4 h-4 text-cyan-400" />
                  )}
                  <span className={cn('text-xs font-medium', msg.role === 'user' ? 'text-emerald-400' : 'text-cyan-400')}>
                    {msg.role === 'user' ? 'Você' : 'Assistente'}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export const VoiceAssistantPage: React.FC<VoiceAssistantPageProps> = ({
  welcomeMessage = 'Olá! Sou o assistente de voz do IconsAI. Como posso ajudar você hoje?',
  voice: voiceProp = 'nova',
}) => {
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);

  // Ler voz configurada do localStorage (definida no dashboard)
  const voice = localStorage.getItem('elevenlabs_voice_id') || voiceProp;

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
    getAudioElement,
  } = useVoiceAssistant({ welcomeMessage, voice });

  // Estados de atividade (movido para cima para uso no karaokeSync)
  const isRobotSpeaking = buttonState === 'greeting' || buttonState === 'speaking';
  const isUserSpeaking = buttonState === 'recording';

  // v5.0.0: Última mensagem do robô (para karaoke com áudio)
  const lastAssistantMessage = useMemo(() => {
    const assistantMsgs = messages.filter((m) => m.role === 'assistant');
    return assistantMsgs[assistantMsgs.length - 1];
  }, [messages]);

  // v5.0.0: Última mensagem do usuário (para karaoke simulado)
  const lastUserMessage = useMemo(() => {
    const userMsgs = messages.filter((m) => m.role === 'user');
    return userMsgs[userMsgs.length - 1];
  }, [messages]);

  // Karaoke sync para ROBÔ (usa áudio real)
  // Habilitado sempre que há words - o hook gerencia start/stop baseado no áudio
  const karaokeSyncRobot = useKaraokeSync({
    words: lastAssistantMessage?.words || [],
    getAudioElement,
    enabled: !!lastAssistantMessage?.words && lastAssistantMessage.words.length > 0,
    simulatePlayback: false,
  });

  // v5.2.0: Karaoke sync para USUÁRIO - simplificado
  // Habilita automaticamente quando há words - o hook detecta novas words e inicia
  const karaokeSyncUser = useKaraokeSync({
    words: lastUserMessage?.words || [],
    enabled: !!lastUserMessage?.words && lastUserMessage.words.length > 0,
    simulatePlayback: true,
  });

  // Track de mensagens anteriores para detectar novas
  const prevMessagesCountRef = useRef({ user: 0, assistant: 0 });

  // Inicializar ao montar
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Preparar mensagens do usuário com flag de nova e words
  const userMessages = useMemo(() => {
    const filtered = messages.filter((m) => m.role === 'user');
    const prevCount = prevMessagesCountRef.current.user;
    return filtered.map((m, index) => ({
      content: m.content,
      isNew: index === filtered.length - 1 && filtered.length > prevCount,
      words: m.words,
    }));
  }, [messages]);

  // Preparar mensagens do assistente com flag de nova e words
  const assistantMessages = useMemo(() => {
    const filtered = messages.filter((m) => m.role === 'assistant');
    const prevCount = prevMessagesCountRef.current.assistant;
    return filtered.map((m, index) => ({
      content: m.content,
      isNew: index === filtered.length - 1 && filtered.length > prevCount,
      words: m.words,
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
            variant="user"
            karaokeState={{
              currentWordIndex: karaokeSyncUser.currentWordIndex,
              currentTime: karaokeSyncUser.currentTime,
              isPlaying: karaokeSyncUser.isPlaying,
            }}
          />
        </div>

        {/* COLUNA CENTRAL (1/3) - Controles */}
        <div className="w-1/3 flex flex-col items-center justify-center p-4">
          {/* Logo IconsAI */}
          <motion.img
            src={iconsaiLogo}
            alt="IconsAI"
            className="h-12 mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Título dinâmico */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {buttonState === 'idle' && 'Bem-vindo!'}
              {buttonState === 'greeting' && 'Olá!'}
              {buttonState === 'ready' && 'Converse com o IconsAI'}
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

          {/* Badges com glow */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex gap-4 mt-6"
          >
            {/* Badge Dashboard */}
            <motion.button
              onClick={() => navigate('/dashboard')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
                'bg-gradient-to-r from-purple-500/20 to-indigo-500/20',
                'border border-purple-500/40 text-purple-300',
                'hover:from-purple-500/30 hover:to-indigo-500/30',
                'transition-all duration-300'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)',
              }}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </motion.button>

            {/* Badge Histórico */}
            <motion.button
              onClick={() => setShowHistory(true)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
                'bg-gradient-to-r from-cyan-500/20 to-blue-500/20',
                'border border-cyan-500/40 text-cyan-300',
                'hover:from-cyan-500/30 hover:to-blue-500/30',
                'transition-all duration-300'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)',
              }}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Histórico</span>
            </motion.button>
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
            variant="assistant"
            karaokeState={{
              currentWordIndex: karaokeSyncRobot.currentWordIndex,
              currentTime: karaokeSyncRobot.currentTime,
              isPlaying: karaokeSyncRobot.isPlaying,
            }}
          />
        </div>
      </main>

      {/* Modal de Histórico */}
      <AnimatePresence>
        <HistoryModal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          messages={messages}
        />
      </AnimatePresence>
    </div>
  );
};

export default VoiceAssistantPage;
