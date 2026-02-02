/**
 * ============================================================
 * Voice Assistant Types - v1.0.0
 * ============================================================
 * Tipos e interfaces para o assistente de voz
 * Máquina de estados criteriosa para evitar bugs
 * ============================================================
 */

// Estados do botão principal - MÁQUINA DE ESTADOS EXPLÍCITA
export type VoiceButtonState =
  | 'idle'        // Estado inicial - mostra Play
  | 'greeting'    // Robô falando boas-vindas - mostra animação
  | 'ready'       // Pronto para gravar - mostra Microfone
  | 'recording'   // Gravando voz do usuário - mostra Stop
  | 'processing'  // Processando (STT + LLM) - mostra Loader
  | 'speaking';   // Robô respondendo - mostra animação

// Transições válidas da máquina de estados
export const VALID_TRANSITIONS: Record<VoiceButtonState, VoiceButtonState[]> = {
  idle: ['greeting'],           // Play pressionado → inicia boas-vindas
  greeting: ['ready'],          // Boas-vindas terminou → pronto para gravar
  ready: ['recording', 'idle'], // Mic pressionado → grava | Reset → idle
  recording: ['processing'],    // Stop pressionado → processa
  processing: ['speaking'],     // Resposta pronta → fala
  speaking: ['ready'],          // Terminou de falar → pronto para nova gravação
};

// Mensagem do chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

// Configuração do assistente
export interface VoiceAssistantConfig {
  welcomeMessage: string;
  voice: 'nova' | 'marin' | 'coral' | 'sage' | 'shimmer';
  speed: number;
  maxRecordingDuration: number; // em ms
}

// Props do VoiceAnalyzer
export interface VoiceAnalyzerProps {
  frequencyData: number[];
  isActive: boolean;
  source: 'robot' | 'user' | 'none';
  className?: string;
}

// Props do ChatContainer
export interface ChatContainerProps {
  messages: ChatMessage[];
  isRobotSpeaking: boolean;
  className?: string;
}

// Props do VoiceButton
export interface VoiceButtonProps {
  state: VoiceButtonState;
  onClick: () => void;
  progress?: number;
  disabled?: boolean;
  className?: string;
}

// Resultado do processamento de voz
export interface VoiceProcessingResult {
  success: boolean;
  userText?: string;
  assistantText?: string;
  audioUrl?: string;
  error?: string;
}

// Estado do hook useVoiceAssistant
export interface VoiceAssistantState {
  buttonState: VoiceButtonState;
  messages: ChatMessage[];
  frequencyData: number[];
  frequencySource: 'robot' | 'user' | 'none';
  error: string | null;
  isInitialized: boolean;
}

// Default config
export const DEFAULT_CONFIG: VoiceAssistantConfig = {
  welcomeMessage: 'Olá! Sou o assistente de voz do IconsAI. Como posso ajudar você hoje?',
  voice: 'nova',
  speed: 1.0,
  maxRecordingDuration: 60000, // 1 minuto
};
