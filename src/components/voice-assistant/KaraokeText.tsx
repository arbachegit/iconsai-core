/**
 * ============================================================
 * KaraokeText Component - v1.0.0
 * ============================================================
 * Renderiza texto com efeito karaokê sincronizado com áudio
 *
 * Estados visuais:
 * - pending: Palavra ainda não foi falada (opacidade baixa)
 * - active: Palavra sendo falada (highlight + scale)
 * - completed: Palavra já foi falada (opacidade normal)
 *
 * Usa Framer Motion para animações suaves
 * ============================================================
 */

import React from 'react';
import { motion } from 'framer-motion';
import { WordTiming } from './types';
import { cn } from '@/lib/utils';

export interface KaraokeTextProps {
  words: WordTiming[];
  currentWordIndex: number;
  currentTime: number;
  isPlaying: boolean;
  className?: string;
  variant?: 'user' | 'assistant';
}

type WordState = 'pending' | 'active' | 'completed';

const getWordState = (
  wordIndex: number,
  currentWordIndex: number,
  word: WordTiming,
  currentTime: number
): WordState => {
  if (wordIndex < currentWordIndex) {
    return 'completed';
  }
  if (wordIndex === currentWordIndex) {
    return 'active';
  }
  // Se estamos entre a palavra atual e a próxima, mostrar a próxima como pending
  if (wordIndex === currentWordIndex + 1 && currentTime >= word.start - 0.1) {
    return 'pending';
  }
  return 'pending';
};

export const KaraokeText: React.FC<KaraokeTextProps> = ({
  words,
  currentWordIndex,
  currentTime,
  isPlaying,
  className,
  variant = 'assistant',
}) => {
  if (!words || words.length === 0) {
    return null;
  }

  const isUser = variant === 'user';
  const baseColor = isUser ? 'text-emerald-400' : 'text-cyan-400';
  const activeGlow = isUser
    ? '0 0 8px rgba(52, 211, 153, 0.6)'
    : '0 0 8px rgba(0, 212, 255, 0.6)';

  return (
    <p className={cn('text-sm leading-relaxed', className)}>
      {words.map((word, index) => {
        const state = getWordState(index, currentWordIndex, word, currentTime);

        return (
          <React.Fragment key={`${index}-${word.word}`}>
            <motion.span
              className={cn(
                'inline-block transition-all duration-150',
                state === 'pending' && 'text-muted-foreground/50',
                state === 'active' && cn(baseColor, 'font-medium'),
                state === 'completed' && 'text-foreground'
              )}
              initial={false}
              animate={{
                opacity: state === 'pending' ? 0.4 : 1,
                scale: state === 'active' ? 1.05 : 1,
                y: state === 'active' ? -1 : 0,
              }}
              style={{
                textShadow: state === 'active' && isPlaying ? activeGlow : 'none',
              }}
              transition={{
                duration: 0.15,
                ease: 'easeOut',
              }}
            >
              {word.word}
            </motion.span>
            {/* Espaço entre palavras */}
            {index < words.length - 1 && ' '}
          </React.Fragment>
        );
      })}
      {/* Cursor piscando enquanto está tocando */}
      {isPlaying && currentWordIndex < words.length - 1 && (
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className={cn('inline-block w-0.5 h-4 ml-0.5 align-middle', isUser ? 'bg-emerald-400' : 'bg-cyan-400')}
        />
      )}
    </p>
  );
};

// Versão simplificada para quando não há áudio tocando (mostra tudo)
export const KaraokeTextStatic: React.FC<{
  words: WordTiming[];
  className?: string;
}> = ({ words, className }) => {
  if (!words || words.length === 0) {
    return null;
  }

  return (
    <p className={cn('text-sm text-foreground leading-relaxed', className)}>
      {words.map((word, index) => (
        <React.Fragment key={`${index}-${word.word}`}>
          <span>{word.word}</span>
          {index < words.length - 1 && ' '}
        </React.Fragment>
      ))}
    </p>
  );
};

export default KaraokeText;
