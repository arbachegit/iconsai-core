/**
 * ============================================================
 * Core Types - Tipos compartilhados entre todos os módulos
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * REGRAS:
 * - NUNCA depende de módulos específicos
 * - Apenas tipos genéricos reutilizáveis
 * - Zero lógica de negócio
 * ============================================================
 */

import { LucideIcon } from "lucide-react";

/**
 * Role do remetente de uma mensagem
 */
export type MessageRole = "user" | "assistant" | "error" | "loading" | "system";

/**
 * Mensagem genérica do chat
 */
export interface Message {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: Date;
  metadata?: MessageMetadata;
}

/**
 * Metadados opcionais da mensagem
 */
export interface MessageMetadata {
  apiProvider?: string;
  model?: string;
  audioUrl?: string;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Configuração de tema para componentes
 */
export interface ThemeConfig {
  primaryColor: string;
  secondaryColor?: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

/**
 * Configuração de módulo (cores, textos, endpoints)
 */
export interface ModuleConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  theme: ThemeConfig;
  welcomeText?: string;
  placeholder?: string;
  endpoint?: string;
}

/**
 * Props base para componentes de Header
 */
export interface HeaderProps {
  title: string;
  subtitle?: string | null;
  icon?: LucideIcon;
  theme?: ThemeConfig;
  onBack?: () => void;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  actionLabel?: string;
  className?: string;
}

/**
 * Props base para componentes de Input
 */
export interface InputAreaProps {
  onSubmit: (value: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  theme?: ThemeConfig;
  maxLength?: number;
  className?: string;
}

/**
 * Props base para lista de mensagens
 */
export interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  loadingText?: string;
  emptyState?: React.ReactNode;
  theme?: ThemeConfig;
  className?: string;
  onMessageAction?: (message: Message, action: string) => void;
}

/**
 * Props base para container de chat
 */
export interface ChatContainerProps {
  header?: React.ReactNode;
  body: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  theme?: ThemeConfig;
}

/**
 * Estado do microfone/gravação
 */
export type VoiceState = "idle" | "listening" | "processing" | "playing" | "error";

/**
 * Resultado de captura de voz
 */
export interface VoiceCaptureResult {
  audioBlob: Blob;
  audioBase64: string;
  duration: number;
  mimeType: string;
}

/**
 * Props para componentes de voz
 */
export interface VoiceButtonProps {
  state: VoiceState;
  onStartCapture: () => void;
  onStopCapture: () => void;
  disabled?: boolean;
  theme?: ThemeConfig;
  className?: string;
}

/**
 * Configuração de visualizador de espectro
 */
export interface SpectrumConfig {
  barCount?: number;
  barGap?: number;
  minHeight?: number;
  maxHeight?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

// ============================================
// UNIFIED BUTTON STATES (Agent Platform)
// ============================================

export type UnifiedButtonState = 'idle' | 'playing' | 'recording' | 'processing';

// ============================================
// AGENT CONFIGURATION
// ============================================

export interface AgentConfig {
  /** Internal name (used in code) */
  name: string;
  /** URL slug for routing */
  slug: string;
  /** Display name shown to user */
  displayName: string;
  /** Lucide icon name */
  icon: string;
  /** Primary color (hex) */
  color: string;
  /** Optional welcome audio URL */
  welcomeAudioUrl?: string;
  /** Supabase edge function name */
  edgeFunctionName: string;
  /** Whether agent is active */
  isActive?: boolean;
  /** Sort order for navigation */
  sortOrder?: number;
}

// ============================================
// EVENT BUS TYPES
// ============================================

export interface AudioPlayEvent {
  url: string;
  agentName: string;
}

export interface AudioStopEvent {
  agentName: string;
}

export interface AudioEndedEvent {
  agentName: string;
}

export interface RecordingStartEvent {
  agentName: string;
}

export interface RecordingStopEvent {
  audioBlob: Blob;
  duration: number;
}

export interface ButtonStateChangeEvent {
  state: UnifiedButtonState;
}

export interface NavigationChangeEvent {
  agentName: string;
}

export interface EventMap {
  'audio:play': AudioPlayEvent;
  'audio:stop': AudioStopEvent;
  'audio:ended': AudioEndedEvent;
  'recording:start': RecordingStartEvent;
  'recording:stop': RecordingStopEvent;
  'button:stateChange': ButtonStateChangeEvent;
  'footer:show': void;
  'navigation:change': NavigationChangeEvent;
}

// ============================================
// AGENT PROPS
// ============================================

export interface AgentProps {
  /** Device fingerprint */
  deviceId: string;
  /** Session ID */
  sessionId: string;
  /** Agent configuration */
  config: AgentConfig;
}

// ============================================
// CONVERSATION TYPES (Agent Platform)
// ============================================

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: Date;
}

export interface AgentConversation {
  id: string;
  agentName: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// AUDIO ENGINE TYPES
// ============================================

export type AudioEngineState = 'idle' | 'loading' | 'playing' | 'paused';

export interface AudioEngineCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  onFrequencyData?: (data: number[]) => void;
}

// ============================================
// SPECTRUM ANALYZER MODES
// ============================================

export type SpectrumMode = 'idle' | 'playing' | 'recording';

// ============================================
// VOICE SERVICE STATE (with explicit 'ready' state)
// ============================================

/**
 * VoiceServiceState - States for VoiceService
 * Key difference from UnifiedButtonState: includes 'ready' state
 * for explicit user control (no automatic transition to recording).
 *
 * - idle: Initial state, waiting for user to start
 * - playing: Audio is playing (welcome or response)
 * - ready: Audio finished, waiting for user to click mic
 * - recording: User is speaking
 * - processing: Processing user input and generating response
 */
export type VoiceServiceState =
  | 'idle'
  | 'playing'
  | 'ready'
  | 'recording'
  | 'processing';
