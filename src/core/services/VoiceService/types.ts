/**
 * VoiceService Types
 * @version 1.0.0
 * @date 2026-01-27
 *
 * Types for the modular VoiceService.
 * Key difference from UnifiedButtonState: includes 'ready' state
 * for explicit user control (no automatic transition to recording).
 */

/**
 * States for the voice service
 * - idle: Initial state, waiting for user to start
 * - playing: Audio is playing (welcome or response)
 * - ready: Audio finished, waiting for user to click mic (NEW!)
 * - recording: User is speaking
 * - processing: Processing user input and generating response
 */
export type VoiceServiceState =
  | 'idle'
  | 'playing'
  | 'ready'
  | 'recording'
  | 'processing';

/**
 * Callbacks for VoiceService events
 */
export interface VoiceServiceCallbacks {
  /** Called when state changes */
  onStateChange?: (state: VoiceServiceState) => void;
  /** Called with frequency data for visualization */
  onFrequencyData?: (data: number[]) => void;
  /** Called with playback progress (0-1) */
  onPlaybackProgress?: (progress: number) => void;
  /** Called with recording duration in seconds */
  onRecordingDuration?: (seconds: number) => void;
  /** Called on any error */
  onError?: (error: Error) => void;
  /** Called when transcription is received */
  onTranscription?: (text: string) => void;
  /** Called when AI response is received */
  onResponse?: (text: string, audioUrl?: string) => void;
}

/**
 * Configuration for VoiceService
 */
export interface VoiceServiceConfig {
  /** Agent name for API calls */
  agentName: string;
  /** Agent slug for routing */
  agentSlug: string;
  /** Welcome message text for TTS */
  welcomeMessage?: string;
  /** Maximum recording duration in ms (default: 60000) */
  maxRecordingDuration?: number;
  /** Primary color for visualization */
  primaryColor?: string;
  /** TTS voice (default: 'nova') */
  voice?: string;
  /** TTS speed (default: 1.0) */
  speed?: number;
}

/**
 * Context for API calls
 */
export interface VoiceApiContext {
  deviceId: string;
  sessionId: string;
  agentName: string;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Result from voice processing
 */
export interface VoiceProcessingResult {
  success: boolean;
  userText?: string;
  assistantText?: string;
  audioUrl?: string;
  error?: string;
}

/**
 * Player state for internal use
 */
export interface PlayerState {
  isPlaying: boolean;
  progress: number;
  duration: number;
  currentTime: number;
}

/**
 * Recorder state for internal use
 */
export interface RecorderState {
  isRecording: boolean;
  duration: number;
  hasPermission: boolean;
}
