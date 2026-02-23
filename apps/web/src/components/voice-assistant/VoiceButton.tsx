/**
 * ============================================================
 * VoiceButton.tsx - v1.0.0
 * ============================================================
 * Botão principal do assistente de voz com máquina de estados.
 * Estados:
 * - idle: Play
 * - greeting: Animação de fala (robô)
 * - ready: Microfone
 * - recording: Stop
 * - processing: Loader
 * - speaking: Animação de fala (robô)
 * ============================================================
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoiceButtonProps, VoiceButtonState } from './types';

// Configuração de cores por estado
const STATE_CONFIG: Record<
  VoiceButtonState,
  {
    color: string;
    hoverColor: string;
    icon: React.ReactNode;
    label: string;
    animate: boolean;
    pulseColor: string;
  }
> = {
  idle: {
    color: '#00D4FF',
    hoverColor: '#00B8E0',
    icon: <Play className="w-10 h-10 text-black ml-1" fill="black" />,
    label: 'Iniciar',
    animate: false,
    pulseColor: 'rgba(0, 212, 255, 0.3)',
  },
  greeting: {
    color: '#00D4FF',
    hoverColor: '#00D4FF',
    icon: null, // Animação especial
    label: 'Olá...',
    animate: true,
    pulseColor: 'rgba(0, 212, 255, 0.4)',
  },
  ready: {
    color: '#10B981',
    hoverColor: '#059669',
    icon: <Mic className="w-10 h-10 text-white" />,
    label: 'Falar',
    animate: false,
    pulseColor: 'rgba(16, 185, 129, 0.3)',
  },
  recording: {
    color: '#EF4444',
    hoverColor: '#DC2626',
    icon: <Square className="w-8 h-8 text-white" fill="white" />,
    label: 'Parar',
    animate: true,
    pulseColor: 'rgba(239, 68, 68, 0.4)',
  },
  processing: {
    color: '#F59E0B',
    hoverColor: '#F59E0B',
    icon: <Loader2 className="w-10 h-10 text-white animate-spin" />,
    label: 'Processando...',
    animate: false,
    pulseColor: 'rgba(245, 158, 11, 0.3)',
  },
  speaking: {
    color: '#00D4FF',
    hoverColor: '#00D4FF',
    icon: null, // Animação especial
    label: 'Respondendo...',
    animate: true,
    pulseColor: 'rgba(0, 212, 255, 0.4)',
  },
};

// Componente de ondas de voz (para greeting e speaking)
const SpeakingWaves: React.FC<{ color: string }> = ({ color }) => (
  <div className="flex items-center gap-1">
    {[0, 1, 2, 3, 4].map((i) => (
      <motion.div
        key={i}
        className="w-1.5 rounded-full"
        style={{ backgroundColor: 'white' }}
        animate={{
          height: ['16px', '32px', '24px', '40px', '16px'],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          delay: i * 0.1,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  state,
  onClick,
  disabled = false,
  className,
}) => {
  const config = STATE_CONFIG[state];
  const isInteractive =
    state === 'idle' || state === 'ready' || state === 'recording';
  const isDisabled = disabled || !isInteractive;

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Container do botão */}
      <div className="relative">
        {/* Círculos de pulso para estados animados */}
        {config.animate && (
          <>
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ border: `3px solid ${config.color}` }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ border: `3px solid ${config.color}` }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
                delay: 0.5,
              }}
            />
          </>
        )}

        {/* Botão principal */}
        <motion.button
          onClick={onClick}
          disabled={isDisabled}
          className={cn(
            'relative w-24 h-24 rounded-full flex items-center justify-center',
            'shadow-lg transition-all duration-200',
            'focus:outline-none focus:ring-4 focus:ring-opacity-50',
            isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
          )}
          style={{
            background: `linear-gradient(135deg, ${config.color}, ${config.hoverColor})`,
            boxShadow: `0 0 30px ${config.pulseColor}`,
          }}
          whileHover={isInteractive ? { scale: 1.05 } : {}}
          whileTap={isInteractive ? { scale: 0.95 } : {}}
          aria-label={config.label}
        >
          {/* Brilho interno */}
          <div
            className="absolute inset-0 rounded-full opacity-40"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), transparent 60%)',
            }}
          />

          {/* Ícone ou animação */}
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10"
            >
              {config.icon ? config.icon : <SpeakingWaves color={config.color} />}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Label do estado */}
      <AnimatePresence mode="wait">
        <motion.span
          key={state}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="text-sm font-medium text-muted-foreground"
        >
          {config.label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

export default VoiceButton;
