/**
 * useVoiceService - React Hook for Voice Interaction
 * @version 1.0.0
 * @date 2026-01-27
 *
 * React hook that provides voice interaction capabilities.
 * Uses VoiceService internally for state management.
 *
 * Key feature: Explicit user control via 'ready' state.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceService } from './VoiceService';
import type { VoiceServiceState, VoiceServiceConfig, VoiceApiContext } from './types';

export interface UseVoiceServiceOptions extends VoiceServiceConfig {
  /** Device ID for API calls */
  deviceId: string;
  /** Session ID for API calls */
  sessionId: string;
}

export interface UseVoiceServiceReturn {
  /** Current state */
  state: VoiceServiceState;
  /** Frequency data for visualization */
  frequencyData: number[];
  /** Playback progress (0-1) */
  progress: number;
  /** Recording duration in seconds */
  recordingDuration: number;
  /** Error message if any */
  error: string | null;
  /** Last transcription from user */
  lastTranscription: string;
  /** Last response from assistant */
  lastResponse: string;

  // Actions
  /** Play welcome message (idle -> playing -> ready) */
  playWelcome: () => Promise<void>;
  /** Start recording (ready -> recording) */
  startRecording: () => Promise<void>;
  /** Stop recording and process (recording -> processing -> playing -> ready) */
  stopRecording: () => Promise<void>;
  /** Stop everything and reset to idle */
  stop: () => void;
  /** Warmup audio - call in user gesture */
  warmup: () => void;

  // Convenience booleans
  isIdle: boolean;
  isPlaying: boolean;
  isReady: boolean;
  isRecording: boolean;
  isProcessing: boolean;
}

export function useVoiceService(options: UseVoiceServiceOptions): UseVoiceServiceReturn {
  const [state, setState] = useState<VoiceServiceState>('idle');
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscription, setLastTranscription] = useState('');
  const [lastResponse, setLastResponse] = useState('');

  const serviceRef = useRef<VoiceService | null>(null);

  // Store options in ref for stable access in callbacks
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Initialize service (only once)
  useEffect(() => {
    const opts = optionsRef.current;

    const config: VoiceServiceConfig = {
      agentName: opts.agentName,
      agentSlug: opts.agentSlug,
      welcomeMessage: opts.welcomeMessage,
      maxRecordingDuration: opts.maxRecordingDuration,
      primaryColor: opts.primaryColor,
      voice: opts.voice,
      speed: opts.speed,
    };

    const service = new VoiceService(config);

    // Set context
    const context: VoiceApiContext = {
      deviceId: opts.deviceId,
      sessionId: opts.sessionId,
      agentName: opts.agentName,
    };
    service.setContext(context);

    // Set callbacks
    service.setCallbacks({
      onStateChange: (newState) => {
        setState(newState);
        setError(null);
        // Reset progress/duration on state change
        if (newState === 'idle' || newState === 'ready') {
          setProgress(0);
          setRecordingDuration(0);
        }
      },
      onFrequencyData: (data) => {
        setFrequencyData(data);
      },
      onPlaybackProgress: (prog) => {
        setProgress(prog);
      },
      onRecordingDuration: (seconds) => {
        setRecordingDuration(seconds);
      },
      onError: (err) => {
        setError(err.message);
        console.error('[useVoiceService] Error:', err);
      },
      onTranscription: (text) => {
        setLastTranscription(text);
      },
      onResponse: (text) => {
        setLastResponse(text);
      },
    });

    serviceRef.current = service;

    return () => {
      service.destroy();
      serviceRef.current = null;
    };
  }, []);

  // Update context when deviceId/sessionId changes
  useEffect(() => {
    if (serviceRef.current) {
      serviceRef.current.setContext({
        deviceId: options.deviceId,
        sessionId: options.sessionId,
        agentName: options.agentName,
      });
    }
  }, [options.deviceId, options.sessionId, options.agentName]);

  // Actions
  const warmup = useCallback(() => {
    serviceRef.current?.warmup();
  }, []);

  const playWelcome = useCallback(async () => {
    setError(null);
    try {
      await serviceRef.current?.playWelcome();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Play welcome failed');
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      await serviceRef.current?.startRecording();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recording failed');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    setError(null);
    try {
      await serviceRef.current?.stopRecording();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    }
  }, []);

  const stop = useCallback(() => {
    serviceRef.current?.stop();
  }, []);

  return {
    // State
    state,
    frequencyData,
    progress,
    recordingDuration,
    error,
    lastTranscription,
    lastResponse,

    // Actions
    playWelcome,
    startRecording,
    stopRecording,
    stop,
    warmup,

    // Convenience booleans
    isIdle: state === 'idle',
    isPlaying: state === 'playing',
    isReady: state === 'ready',
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
  };
}

export default useVoiceService;
