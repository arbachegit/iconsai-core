/**
 * AudioEngine - Unified Audio Management
 * @version 1.0.0
 * @date 2026-01-25
 *
 * Wrapper over audioManagerStore that provides:
 * - Unified API for audio playback
 * - Event emission via EventBus
 * - Safari/iOS compatibility via warmup system
 */

import { useAudioManager } from '@/stores/audioManagerStore';
import { warmupAudioSync, isAudioWarmed, playWarmedAudio, stopWarmedAudio } from '@/utils/audio-warmup';
import { EventBus } from './EventBus';
import type { AudioEngineState, AudioEngineCallbacks } from './types';

class AudioEngineClass {
  private currentAgentName: string | null = null;
  private callbacks: AudioEngineCallbacks = {};
  private animationFrameId: number | null = null;
  private isDestroyed = false;

  /**
   * Initialize audio engine (call on user gesture for Safari)
   */
  warmup(): void {
    warmupAudioSync();
  }

  /**
   * Check if audio is ready for playback
   */
  isReady(): boolean {
    return isAudioWarmed();
  }

  /**
   * Play audio from URL
   * @param url - Audio URL to play
   * @param agentName - Name of the agent initiating playback
   */
  async play(url: string, agentName: string): Promise<void> {
    this.currentAgentName = agentName;

    // Emit play event
    EventBus.emit('audio:play', { url, agentName });

    try {
      const audioManager = useAudioManager.getState();

      // Use warmed audio for mobile
      if (isAudioWarmed()) {
        await playWarmedAudio(url);
        this.setupWarmedAudioListeners();
      } else {
        // Desktop path - use audio manager
        await audioManager.playAudio(`${agentName}-audio`, url, agentName);
        this.setupAudioManagerListeners();
      }

      this.callbacks.onPlay?.();
      this.startFrequencyDataLoop();
    } catch (error) {
      console.error('[AudioEngine] Play error:', error);
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Stop current audio playback
   */
  stop(): void {
    if (this.currentAgentName) {
      EventBus.emit('audio:stop', { agentName: this.currentAgentName });
    }

    this.stopFrequencyDataLoop();

    if (isAudioWarmed()) {
      stopWarmedAudio();
    } else {
      const audioManager = useAudioManager.getState();
      audioManager.stopAudio();
    }

    this.callbacks.onStop?.();
    this.currentAgentName = null;
  }

  /**
   * Pause current audio playback
   */
  pause(): void {
    const audioManager = useAudioManager.getState();
    audioManager.pauseAudio();
    this.callbacks.onPause?.();
  }

  /**
   * Resume paused audio
   */
  resume(): void {
    const audioManager = useAudioManager.getState();
    audioManager.resumeAudio();
    this.callbacks.onPlay?.();
  }

  /**
   * Get current playback state
   */
  getState(): AudioEngineState {
    const audioManager = useAudioManager.getState();

    if (audioManager.isLoading) return 'loading';
    if (audioManager.isPlaying) return 'playing';
    if (audioManager.currentAudio?.audio?.paused) return 'paused';
    return 'idle';
  }

  /**
   * Get current playback progress (0-1)
   */
  getProgress(): number {
    const audioManager = useAudioManager.getState();
    return audioManager.progress;
  }

  /**
   * Get current frequency data for visualization
   * @returns Array of frequency values (0-255)
   */
  getFrequencyData(): number[] {
    const audioManager = useAudioManager.getState();
    return audioManager.getFrequencyData();
  }

  /**
   * Set callbacks for audio events
   */
  setCallbacks(callbacks: AudioEngineCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.isDestroyed = true;
    this.stopFrequencyDataLoop();
    this.stop();
    this.callbacks = {};
    this.currentAgentName = null;
  }

  private setupWarmedAudioListeners(): void {
    // The warmup system handles its own callbacks
    // We'll poll for ended state in the frequency loop
  }

  private setupAudioManagerListeners(): void {
    // Audio manager handles its own event emission
    // We subscribe in the frequency loop
  }

  private startFrequencyDataLoop(): void {
    if (this.animationFrameId) return;

    const loop = () => {
      if (this.isDestroyed) return;

      const frequencyData = this.getFrequencyData();
      if (frequencyData.length > 0) {
        this.callbacks.onFrequencyData?.(frequencyData);
      }

      // Check for audio ended
      const state = this.getState();
      if (state === 'idle' && this.currentAgentName) {
        this.handleAudioEnded();
        return;
      }

      // Update progress
      const progress = this.getProgress();
      this.callbacks.onProgress?.(progress);

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private stopFrequencyDataLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private handleAudioEnded(): void {
    if (this.currentAgentName) {
      EventBus.emit('audio:ended', { agentName: this.currentAgentName });
      this.callbacks.onEnded?.();
    }
    this.stopFrequencyDataLoop();
    this.currentAgentName = null;
  }
}

// Singleton instance
export const AudioEngine = new AudioEngineClass();

// React hook for using AudioEngine
import { useCallback, useEffect, useState } from 'react';

interface UseAudioEngineReturn {
  play: (url: string, agentName: string) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  warmup: () => void;
  state: AudioEngineState;
  progress: number;
  frequencyData: number[];
  isReady: boolean;
}

export function useAudioEngine(callbacks?: AudioEngineCallbacks): UseAudioEngineReturn {
  const [state, setState] = useState<AudioEngineState>('idle');
  const [progress, setProgress] = useState(0);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AudioEngine.setCallbacks({
      ...callbacks,
      onPlay: () => {
        setState('playing');
        callbacks?.onPlay?.();
      },
      onPause: () => {
        setState('paused');
        callbacks?.onPause?.();
      },
      onStop: () => {
        setState('idle');
        setProgress(0);
        callbacks?.onStop?.();
      },
      onEnded: () => {
        setState('idle');
        setProgress(0);
        callbacks?.onEnded?.();
      },
      onProgress: (p) => {
        setProgress(p);
        callbacks?.onProgress?.(p);
      },
      onFrequencyData: (data) => {
        setFrequencyData(data);
        callbacks?.onFrequencyData?.(data);
      },
      onError: callbacks?.onError,
    });

    // Check ready state periodically
    const checkReady = setInterval(() => {
      setIsReady(AudioEngine.isReady());
    }, 500);

    return () => {
      clearInterval(checkReady);
    };
  }, [callbacks]);

  const play = useCallback(async (url: string, agentName: string) => {
    setState('loading');
    await AudioEngine.play(url, agentName);
  }, []);

  const stop = useCallback(() => {
    AudioEngine.stop();
  }, []);

  const pause = useCallback(() => {
    AudioEngine.pause();
  }, []);

  const resume = useCallback(() => {
    AudioEngine.resume();
  }, []);

  const warmup = useCallback(() => {
    AudioEngine.warmup();
    setIsReady(true);
  }, []);

  return {
    play,
    stop,
    pause,
    resume,
    warmup,
    state,
    progress,
    frequencyData,
    isReady,
  };
}

export default AudioEngine;
