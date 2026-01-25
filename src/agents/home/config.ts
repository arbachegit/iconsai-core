/**
 * Home Agent Configuration
 * @version 1.0.0
 * @date 2026-01-25
 */

import type { AgentConfig } from '@/core/types';

export const HOME_AGENT_CONFIG: AgentConfig = {
  name: 'home',
  slug: 'home',
  displayName: 'IconsAI',
  icon: 'Home',
  color: '#00D4FF',
  edgeFunctionName: 'pwa-home-agent',
  isActive: true,
  sortOrder: 0,
};

export const HOME_AUDIO_CONFIG = {
  /** Minimum recording duration in seconds */
  minDuration: 0.5,
  /** Maximum recording duration in seconds */
  maxDuration: 60,
  /** Recording timeout in milliseconds */
  recordingTimeoutMs: 60000,
  /** Time slice for MediaRecorder in milliseconds */
  timeSliceMs: 500,
  /** Audio bits per second */
  audioBitsPerSecond: 128000,
};

export const HOME_TTS_CONFIG = {
  /** Default voice for TTS */
  defaultVoice: 'nova',
  /** Default speech rate */
  defaultRate: 1.0,
  /** Chat type for TTS context */
  chatType: 'home',
};

export const HOME_WELCOME_MESSAGE = {
  text: 'Olá! Sou o IconsAI, seu assistente de voz. Toque no botão para começar a conversar.',
  fallbackText: 'Hello! I am IconsAI, your voice assistant. Tap the button to start.',
};

export default HOME_AGENT_CONFIG;
