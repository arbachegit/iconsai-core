/**
 * ============================================================
 * VoiceAnalyzer.tsx - v1.0.0
 * ============================================================
 * Visualizador de ondas de áudio que reage tanto à voz
 * do robô quanto à voz do usuário em tempo real.
 * ============================================================
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { VoiceAnalyzerProps } from './types';

// Cores por fonte
const SOURCE_COLORS = {
  robot: {
    primary: '#00D4FF',     // Cyan
    secondary: '#0891B2',   // Cyan escuro
    glow: 'rgba(0, 212, 255, 0.3)',
  },
  user: {
    primary: '#10B981',     // Verde
    secondary: '#059669',   // Verde escuro
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  none: {
    primary: '#6B7280',     // Cinza
    secondary: '#4B5563',
    glow: 'transparent',
  },
};

export const VoiceAnalyzer: React.FC<VoiceAnalyzerProps> = ({
  frequencyData,
  isActive,
  source,
  className,
}) => {
  const colors = SOURCE_COLORS[source];

  // Normalizar dados de frequência para 32 barras
  const normalizedData = useMemo(() => {
    if (!frequencyData || frequencyData.length === 0 || !isActive) {
      return Array(32).fill(0);
    }

    // Pegar amostras distribuídas ao longo do espectro
    const bars = 32;
    const result: number[] = [];
    const step = Math.floor(frequencyData.length / bars);

    for (let i = 0; i < bars; i++) {
      const index = Math.min(i * step, frequencyData.length - 1);
      // Normalizar para 0-100
      const value = Math.min(100, (frequencyData[index] / 255) * 100);
      result.push(value);
    }

    return result;
  }, [frequencyData, isActive]);

  return (
    <div
      className={cn(
        'relative flex items-end justify-center gap-[2px] h-24 w-full',
        className
      )}
    >
      {/* Glow de fundo */}
      {isActive && source !== 'none' && (
        <motion.div
          className="absolute inset-0 rounded-lg blur-xl -z-10"
          style={{ backgroundColor: colors.glow }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Barras de frequência */}
      {normalizedData.map((value, index) => {
        // Calcular altura mínima baseada na posição (forma de onda)
        const centerDistance = Math.abs(index - normalizedData.length / 2);
        const baseHeight = Math.max(5, 15 - centerDistance / 2);
        const height = Math.max(baseHeight, value * 0.9);

        return (
          <motion.div
            key={index}
            className="w-[4px] rounded-full origin-bottom"
            style={{
              background: isActive
                ? `linear-gradient(to top, ${colors.secondary}, ${colors.primary})`
                : colors.secondary,
            }}
            initial={{ height: baseHeight }}
            animate={{
              height: isActive ? `${height}%` : `${baseHeight}%`,
              opacity: isActive ? 0.9 : 0.3,
            }}
            transition={{
              height: {
                type: 'spring',
                stiffness: 300,
                damping: 15,
                mass: 0.5,
              },
              opacity: { duration: 0.2 },
            }}
          />
        );
      })}

      {/* Label de fonte */}
      {isActive && source !== 'none' && (
        <motion.div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium"
          style={{ color: colors.primary }}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
        >
          {source === 'robot' ? 'Assistente' : 'Você'}
        </motion.div>
      )}
    </div>
  );
};

export default VoiceAnalyzer;
