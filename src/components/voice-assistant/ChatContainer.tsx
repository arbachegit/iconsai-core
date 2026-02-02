/**
 * ============================================================
 * ChatContainer.tsx - v1.0.0
 * ============================================================
 * Container de chat com ícone de robô e transcrições.
 * - Contorno cyan
 * - Fundo igual da tela
 * - Ícone de robô no topo
 * - Transcrições em sequência
 * ============================================================
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatContainerProps, ChatMessage } from './types';

// Componente de mensagem individual
const MessageBubble: React.FC<{ message: ChatMessage; isLast: boolean }> = ({
  message,
  isLast,
}) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex gap-3 p-3 rounded-lg',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-emerald-500/20' : 'bg-cyan-500/20'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-emerald-400" />
        ) : (
          <Bot className="w-4 h-4 text-cyan-400" />
        )}
      </div>

      {/* Conteúdo */}
      <div
        className={cn(
          'flex-1 p-3 rounded-lg max-w-[85%]',
          isUser
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-right'
            : 'bg-cyan-500/10 border border-cyan-500/30'
        )}
      >
        <p className="text-sm text-foreground leading-relaxed">
          {message.content}
        </p>
        <span className="text-[10px] text-muted-foreground mt-1 block">
          {message.timestamp.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </motion.div>
  );
};

// Indicador de digitação
const TypingIndicator: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex gap-3 p-3"
  >
    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-cyan-500/20 flex-shrink-0">
      <Bot className="w-4 h-4 text-cyan-400" />
    </div>
    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-cyan-400"
          animate={{
            y: [0, -4, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  </motion.div>
);

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isRobotSpeaking,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para baixo quando novas mensagens chegam
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isRobotSpeaking]);

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-xl overflow-hidden',
        'border-2 border-cyan-500/50 bg-background/50 backdrop-blur-sm',
        className
      )}
    >
      {/* Header com ícone de robô */}
      <div className="flex items-center gap-3 p-4 border-b border-cyan-500/30 bg-cyan-500/5">
        <motion.div
          className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center"
          animate={
            isRobotSpeaking
              ? {
                  boxShadow: [
                    '0 0 0 0 rgba(0, 212, 255, 0)',
                    '0 0 0 8px rgba(0, 212, 255, 0.3)',
                    '0 0 0 0 rgba(0, 212, 255, 0)',
                  ],
                }
              : {}
          }
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        >
          <Bot className="w-6 h-6 text-cyan-400" />
        </motion.div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Assistente IconsAI
          </h3>
          <p className="text-xs text-muted-foreground">
            {isRobotSpeaking ? 'Falando...' : 'Pronto para ajudar'}
          </p>
        </div>

        {/* Indicador de status */}
        <div className="flex items-center gap-2">
          <motion.div
            className={cn(
              'w-2 h-2 rounded-full',
              isRobotSpeaking ? 'bg-cyan-400' : 'bg-emerald-400'
            )}
            animate={{
              scale: isRobotSpeaking ? [1, 1.3, 1] : 1,
              opacity: isRobotSpeaking ? [1, 0.5, 1] : 1,
            }}
            transition={{
              duration: 0.8,
              repeat: isRobotSpeaking ? Infinity : 0,
            }}
          />
          <span className="text-xs text-muted-foreground">
            {isRobotSpeaking ? 'Ativo' : 'Online'}
          </span>
        </div>
      </div>

      {/* Área de mensagens */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0, 212, 255, 0.3) transparent',
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <motion.div
              className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              <Bot className="w-8 h-8 text-cyan-400/50" />
            </motion.div>
            <p className="text-sm text-muted-foreground">
              Pressione o botão Play para começar
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
              />
            ))}
          </AnimatePresence>
        )}

        {/* Indicador de digitação quando processando */}
        <AnimatePresence>
          {isRobotSpeaking && messages.length > 0 && <TypingIndicator />}
        </AnimatePresence>
      </div>

      {/* Footer com informação */}
      <div className="p-3 border-t border-cyan-500/30 bg-cyan-500/5">
        <p className="text-[10px] text-center text-muted-foreground">
          Powered by Perplexity AI, Gemini & OpenAI
        </p>
      </div>
    </div>
  );
};

export default ChatContainer;
