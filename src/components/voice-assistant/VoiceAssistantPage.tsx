/**
 * ============================================================
 * VoiceAssistantPage.tsx - v1.0.0
 * ============================================================
 * Página principal do assistente de voz interativo.
 * Layout:
 * - Esquerda: Botão principal + Voice Analyzer
 * - Direita: Chat Container com transcrições
 * ============================================================
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { VoiceButton } from './VoiceButton';
import { VoiceAnalyzer } from './VoiceAnalyzer';
import { ChatContainer } from './ChatContainer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import iconsaiLogo from '@/assets/knowyou-admin-logo.png';

interface VoiceAssistantPageProps {
  welcomeMessage?: string;
  voice?: 'nova' | 'marin' | 'coral' | 'sage' | 'shimmer';
}

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

  // Inicializar ao montar
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Determinar se o robô está falando
  const isRobotSpeaking =
    buttonState === 'greeting' || buttonState === 'speaking';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <img src={iconsaiLogo} alt="IconsAI" className="h-8" />
          <div className="h-6 w-px bg-border" />
          <h1 className="text-lg font-semibold text-foreground">
            Assistente de Voz
          </h1>
        </div>

        {/* Indicador de estado */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
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
                'w-2 h-2 rounded-full',
                buttonState === 'idle'
                  ? 'bg-muted-foreground'
                  : buttonState === 'recording'
                  ? 'bg-red-400'
                  : buttonState === 'processing'
                  ? 'bg-amber-400'
                  : 'bg-cyan-400'
              )}
              animate={
                buttonState !== 'idle'
                  ? {
                      scale: [1, 1.3, 1],
                      opacity: [1, 0.5, 1],
                    }
                  : {}
              }
              transition={{
                duration: 0.8,
                repeat: Infinity,
              }}
            />
            {buttonState === 'idle' && 'Aguardando'}
            {buttonState === 'greeting' && 'Saudação'}
            {buttonState === 'ready' && 'Pronto'}
            {buttonState === 'recording' && 'Gravando'}
            {buttonState === 'processing' && 'Processando'}
            {buttonState === 'speaking' && 'Respondendo'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Side - Button and Analyzer */}
        <div className="w-1/2 flex flex-col items-center justify-center p-8 gap-8">
          {/* Título */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {buttonState === 'idle'
                ? 'Bem-vindo!'
                : buttonState === 'ready'
                ? 'Fale sua pergunta'
                : buttonState === 'recording'
                ? 'Estou ouvindo...'
                : buttonState === 'processing'
                ? 'Analisando...'
                : 'Respondendo...'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {buttonState === 'idle'
                ? 'Pressione Play para começar'
                : buttonState === 'ready'
                ? 'Clique no microfone e fale'
                : buttonState === 'recording'
                ? 'Clique em Stop quando terminar'
                : buttonState === 'processing'
                ? 'Processando sua pergunta'
                : 'Ouvindo a resposta'}
            </p>
          </motion.div>

          {/* Botão principal */}
          <VoiceButton
            state={buttonState}
            onClick={handleButtonClick}
            disabled={!isInitialized}
          />

          {/* Voice Analyzer */}
          <div className="w-full max-w-md">
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
              className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 max-w-md"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={forceReset}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Instruções */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex gap-4 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500/50" />
              <span>Assistente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
              <span>Você</span>
            </div>
          </motion.div>
        </div>

        {/* Right Side - Chat Container */}
        <div className="w-1/2 p-6 pl-0">
          <ChatContainer
            messages={messages}
            isRobotSpeaking={isRobotSpeaking}
            className="h-full"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-border bg-card/50 flex items-center justify-center text-xs text-muted-foreground">
        <span>
          STT: OpenAI Whisper | TTS: OpenAI Nova | LLM: Perplexity / Gemini /
          ChatGPT
        </span>
      </footer>
    </div>
  );
};

export default VoiceAssistantPage;
