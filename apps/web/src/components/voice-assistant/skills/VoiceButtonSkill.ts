/**
 * ============================================================
 * VoiceButtonSkill.ts - Documentacao do VoiceButton
 * ============================================================
 * Este arquivo documenta a configuracao do botao principal
 * do assistente de voz para garantir que nao se perca.
 * ============================================================
 */

export const VoiceButtonSkill = {
  name: 'VoiceButton',
  version: '1.0.0',
  description: 'Botao principal do assistente de voz com maquina de estados',

  states: {
    idle: {
      color: '#00D4FF',
      hoverColor: '#00B8E0',
      icon: 'Play',
      label: 'Iniciar',
      animate: false,
      pulseColor: 'rgba(0, 212, 255, 0.3)',
      interactive: true,
    },
    greeting: {
      color: '#00D4FF',
      hoverColor: '#00D4FF',
      icon: 'SpeakingWaves',
      label: 'Ola...',
      animate: true,
      pulseColor: 'rgba(0, 212, 255, 0.4)',
      interactive: false,
    },
    ready: {
      color: '#10B981',
      hoverColor: '#059669',
      icon: 'Mic',
      label: 'Falar',
      animate: false,
      pulseColor: 'rgba(16, 185, 129, 0.3)',
      interactive: true,
    },
    recording: {
      color: '#EF4444',
      hoverColor: '#DC2626',
      icon: 'Square',
      label: 'Parar',
      animate: true,
      pulseColor: 'rgba(239, 68, 68, 0.4)',
      interactive: true,
    },
    processing: {
      color: '#F59E0B',
      hoverColor: '#F59E0B',
      icon: 'Loader2',
      label: 'Processando...',
      animate: false,
      pulseColor: 'rgba(245, 158, 11, 0.3)',
      interactive: false,
    },
    speaking: {
      color: '#00D4FF',
      hoverColor: '#00D4FF',
      icon: 'SpeakingWaves',
      label: 'Respondendo...',
      animate: true,
      pulseColor: 'rgba(0, 212, 255, 0.4)',
      interactive: false,
    },
  },

  dimensions: {
    buttonSize: 96, // w-24 h-24 = 96px
    iconSize: 40,   // w-10 h-10 = 40px
    borderRadius: '100%',
  },

  animations: {
    pulseRings: {
      scale: [1, 1.6],
      opacity: [0.6, 0],
      duration: 1.5,
      delay: 0.5,
    },
    hover: {
      scale: 1.05,
    },
    tap: {
      scale: 0.95,
    },
    speakingWaves: {
      bars: 5,
      barWidth: 6, // w-1.5 = 6px
      heightAnimation: ['16px', '32px', '24px', '40px', '16px'],
      duration: 0.8,
      delayBetweenBars: 0.1,
    },
  },

  accessibility: {
    ariaLabel: 'dynamic', // Uses config.label
    focusRing: true,
    focusRingOpacity: 0.5,
  },
};

export default VoiceButtonSkill;
