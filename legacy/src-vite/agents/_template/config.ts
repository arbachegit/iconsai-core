/**
 * Template Agent Configuration
 * @version 1.0.0
 *
 * INSTRUCTIONS:
 * 1. Copy this file to your new agent folder
 * 2. Rename 'template' to your agent name
 * 3. Update all configuration values
 */

import type { AgentConfig } from '@/core/types';

/**
 * Agent Configuration
 * This is used internally by the agent component
 */
export const TEMPLATE_AGENT_CONFIG: AgentConfig = {
  /** Internal name (used in code, lowercase, no spaces) */
  name: 'template',

  /** URL slug for routing (e.g., /pwa/agents/template) */
  slug: 'template',

  /** Display name shown to user */
  displayName: 'Template Agent',

  /** Lucide icon name (see https://lucide.dev/icons) */
  icon: 'Bot',

  /** Primary color (hex) - used for buttons, accents */
  color: '#8B5CF6',

  /** Supabase edge function name */
  edgeFunctionName: 'pwa-template-agent',

  /** Whether agent is active (shown in navigation) */
  isActive: true,

  /** Sort order for navigation footer */
  sortOrder: 99,

  /** Optional: Pre-recorded welcome audio URL */
  // welcomeAudioUrl: 'https://example.com/welcome.mp3',
};

/**
 * Agent-specific settings (not part of AgentConfig)
 */
export const TEMPLATE_SETTINGS = {
  /** Maximum recording duration in milliseconds */
  maxRecordingDuration: 60000,

  /** Auto-start recording after welcome audio */
  autoStartRecording: true,

  /** Show conversation history button */
  showHistoryButton: true,

  /** Welcome message (used if no welcomeAudioUrl) */
  welcomeMessage: 'Olá! Sou o Template Agent. Como posso ajudar?',

  /** Error message shown on failures */
  errorMessage: 'Desculpe, ocorreu um erro. Tente novamente.',

  /** Processing stages labels */
  stageLabels: {
    classifying: 'Analisando',
    routing: 'Roteando',
    fetching: 'Buscando dados',
    generating: 'Gerando resposta',
    speaking: 'Preparando áudio',
  },
};

export default TEMPLATE_AGENT_CONFIG;
