/**
 * ============================================================
 * VoiceAnalyzerSkill.ts - Documentacao do VoiceAnalyzer
 * ============================================================
 * Este arquivo documenta a configuracao do visualizador
 * de ondas de audio para garantir que nao se perca.
 * ============================================================
 */

export const VoiceAnalyzerSkill = {
  name: 'VoiceAnalyzer',
  version: '1.0.0',
  description: 'Visualizador de ondas de audio que reage a voz do robo e do usuario',

  sources: {
    robot: {
      primary: '#00D4FF',     // Cyan
      secondary: '#0891B2',   // Cyan escuro
      glow: 'rgba(0, 212, 255, 0.3)',
      label: 'Assistente',
    },
    user: {
      primary: '#10B981',     // Verde
      secondary: '#059669',   // Verde escuro
      glow: 'rgba(16, 185, 129, 0.3)',
      label: 'Voce',
    },
    none: {
      primary: '#6B7280',     // Cinza
      secondary: '#4B5563',
      glow: 'transparent',
      label: null,
    },
  },

  dimensions: {
    height: 96,          // h-24 = 96px
    barCount: 32,
    barWidth: 4,         // w-[4px]
    barGap: 2,           // gap-[2px]
    borderRadius: 'full',
  },

  dataProcessing: {
    frequencyBins: 32,
    maxValue: 255,
    normalizedMax: 100,
    samplingMethod: 'distributed', // Amostras distribuidas ao longo do espectro
  },

  animations: {
    barHeight: {
      type: 'spring',
      stiffness: 300,
      damping: 15,
      mass: 0.5,
    },
    opacity: {
      active: 0.9,
      inactive: 0.3,
      duration: 0.2,
    },
    glow: {
      opacityRange: [0.3, 0.6, 0.3],
      duration: 1.5,
      ease: 'easeInOut',
    },
  },

  waveShape: {
    // Forma de onda com centro mais alto
    baseHeightCalculation: 'centerDistance',
    minHeight: 5,
    maxBaseHeight: 15,
  },

  label: {
    position: 'bottom',
    offset: -24, // -bottom-6
    fontSize: 'xs',
    fontWeight: 'medium',
  },
};

export default VoiceAnalyzerSkill;
