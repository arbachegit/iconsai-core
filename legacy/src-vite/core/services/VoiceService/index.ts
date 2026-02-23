/**
 * VoiceService - Modular Voice Interaction Service
 * @version 1.0.0
 * @date 2026-01-27
 *
 * Exports for the VoiceService module.
 */

// Main service and hook
export { VoiceService } from './VoiceService';
export { useVoiceService } from './useVoiceService';
export type { UseVoiceServiceOptions, UseVoiceServiceReturn } from './useVoiceService';

// Sub-components
export { VoicePlayer } from './VoicePlayer';
export type { VoicePlayerCallbacks } from './VoicePlayer';
export { VoiceRecorder } from './VoiceRecorder';
export type { VoiceRecorderCallbacks, RecordingResult } from './VoiceRecorder';

// Types
export type {
  VoiceServiceState,
  VoiceServiceCallbacks,
  VoiceServiceConfig,
  VoiceApiContext,
  VoiceProcessingResult,
  PlayerState,
  RecorderState,
} from './types';
