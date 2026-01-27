/**
 * VoicePlayer - Audio Playback Manager
 * @version 1.0.0
 * @date 2026-01-27
 *
 * Handles audio playback with:
 * - Safari/iOS warmup compatibility
 * - TTS response format conversion
 * - Real-time frequency analysis for visualization
 * - Progress tracking
 */

import { supabase } from '@/integrations/supabase/client';

export interface VoicePlayerCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onProgress?: (progress: number, currentTime: number, duration: number) => void;
  onFrequencyData?: (data: number[]) => void;
  onError?: (error: Error) => void;
}

export class VoicePlayer {
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private animationFrame: number | null = null;
  private isWarmed = false;
  private callbacks: VoicePlayerCallbacks = {};
  private currentUrl: string | null = null;

  constructor() {
    this.setupAudioElement();
  }

  /**
   * Set callbacks for player events
   */
  setCallbacks(callbacks: VoicePlayerCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Warmup audio for Safari/iOS - must be called in user gesture context
   */
  warmup(): void {
    if (this.isWarmed) return;

    try {
      // Create/resume AudioContext
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioContextClass();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Play silent oscillator to unlock audio
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.001;
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.01);

      this.isWarmed = true;
      console.log('[VoicePlayer] Audio warmed up');
    } catch (err) {
      console.warn('[VoicePlayer] Warmup failed:', err);
    }
  }

  /**
   * Play audio from URL
   */
  async play(audioUrl: string): Promise<void> {
    if (!this.audioElement) {
      this.setupAudioElement();
    }

    // Clean up previous URL if it was a blob
    if (this.currentUrl && this.currentUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.currentUrl);
    }

    this.currentUrl = audioUrl;
    this.audioElement!.src = audioUrl;
    this.audioElement!.currentTime = 0;

    // Setup frequency analysis if not already
    this.setupAnalyser();

    try {
      await this.audioElement!.play();
      this.startFrequencyAnalysis();
      console.log('[VoicePlayer] Playing audio');
    } catch (err) {
      console.error('[VoicePlayer] Play failed:', err);
      this.callbacks.onError?.(err instanceof Error ? err : new Error('Play failed'));
      throw err;
    }
  }

  /**
   * Play audio from TTS edge function
   */
  async playFromTTS(text: string, chatType: string = 'home', voice: string = 'nova'): Promise<void> {
    console.log('[VoicePlayer] TTS request:', { textLength: text.length, voice });

    // Use fetch directly to get proper binary response
    // supabase.functions.invoke sometimes doesn't handle binary correctly
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ text, chatType, voice, speed: 1.0 }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VoicePlayer] TTS error:', response.status, errorText);
      throw new Error(`TTS failed: ${response.status}`);
    }

    // Get response as blob directly
    const blob = await response.blob();
    console.log('[VoicePlayer] TTS received blob:', blob.size, 'bytes, type:', blob.type);

    if (blob.size === 0) {
      throw new Error('TTS returned empty audio');
    }

    const audioUrl = URL.createObjectURL(blob);
    await this.play(audioUrl);
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.stopFrequencyAnalysis();
    console.log('[VoicePlayer] Stopped');
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (this.audioElement) {
      this.audioElement.play().catch(console.warn);
    }
  }

  /**
   * Get current progress (0-1)
   */
  getProgress(): number {
    if (!this.audioElement || !this.audioElement.duration) {
      return 0;
    }
    return this.audioElement.currentTime / this.audioElement.duration;
  }

  /**
   * Get current frequency data for visualization
   */
  getFrequencyData(): number[] {
    if (!this.analyser) {
      return [];
    }
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return Array.from(dataArray);
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this.audioElement ? !this.audioElement.paused : false;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();

    if (this.currentUrl && this.currentUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.currentUrl);
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioElement = null;
    this.callbacks = {};
  }

  // Private methods

  private setupAudioElement(): void {
    this.audioElement = new Audio();
    this.audioElement.setAttribute('playsinline', 'true');
    this.audioElement.setAttribute('webkit-playsinline', 'true');
    this.audioElement.preload = 'auto';
    this.audioElement.volume = 1.0;

    // Setup event handlers
    this.audioElement.onplay = () => {
      this.callbacks.onPlay?.();
    };

    this.audioElement.onpause = () => {
      this.callbacks.onPause?.();
    };

    this.audioElement.onended = () => {
      this.stopFrequencyAnalysis();
      this.callbacks.onEnded?.();
    };

    this.audioElement.ontimeupdate = () => {
      if (this.audioElement) {
        const progress = this.getProgress();
        this.callbacks.onProgress?.(
          progress,
          this.audioElement.currentTime,
          this.audioElement.duration || 0
        );
      }
    };

    this.audioElement.onerror = () => {
      const error = new Error('Audio playback error');
      this.callbacks.onError?.(error);
    };
  }

  private setupAnalyser(): void {
    if (this.analyser || !this.audioElement) return;

    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioContextClass();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Create source only once
      if (!this.source) {
        this.source = this.audioContext.createMediaElementSource(this.audioElement);
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    } catch (err) {
      console.warn('[VoicePlayer] Analyser setup failed:', err);
    }
  }

  private startFrequencyAnalysis(): void {
    if (!this.analyser || !this.callbacks.onFrequencyData) return;

    const analyze = () => {
      if (!this.analyser) return;

      const data = this.getFrequencyData();
      this.callbacks.onFrequencyData?.(data);

      this.animationFrame = requestAnimationFrame(analyze);
    };

    analyze();
  }

  private stopFrequencyAnalysis(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Convert TTS response to audio URL
   * Handles multiple response formats from Supabase edge function
   */
  private convertToAudioUrl(data: unknown): string {
    console.log('[VoicePlayer] Converting TTS response:', {
      type: typeof data,
      constructor: data?.constructor?.name,
      isBlob: data instanceof Blob,
      isArrayBuffer: data instanceof ArrayBuffer,
    });

    // Case 1: Blob (direct)
    if (data instanceof Blob) {
      console.log('[VoicePlayer] TTS received Blob:', data.size, 'bytes');
      return URL.createObjectURL(data);
    }

    // Case 2: ArrayBuffer
    if (data instanceof ArrayBuffer) {
      console.log('[VoicePlayer] TTS received ArrayBuffer:', data.byteLength, 'bytes');
      const blob = new Blob([data], { type: 'audio/mpeg' });
      return URL.createObjectURL(blob);
    }

    // Case 3: Uint8Array directly
    if (data instanceof Uint8Array) {
      console.log('[VoicePlayer] TTS received Uint8Array:', data.length, 'bytes');
      const blob = new Blob([data], { type: 'audio/mpeg' });
      return URL.createObjectURL(blob);
    }

    // Case 4: Object with numeric keys (serialized Uint8Array from JSON)
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const keys = Object.keys(data as object);
      // Check if it's a numeric-keyed object (like {0: 255, 1: 128, ...})
      if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
        console.log('[VoicePlayer] TTS received numeric-keyed object:', keys.length, 'bytes');
        const values = keys.map(k => (data as Record<string, number>)[k]);
        const blob = new Blob([new Uint8Array(values)], { type: 'audio/mpeg' });
        return URL.createObjectURL(blob);
      }
    }

    // Case 5: Array-like (with length property)
    if (data && typeof data === 'object' && 'length' in data && typeof (data as { length: unknown }).length === 'number') {
      const arrayLike = data as ArrayLike<number>;
      console.log('[VoicePlayer] TTS received array-like:', arrayLike.length, 'bytes');
      const blob = new Blob([new Uint8Array(Array.from(arrayLike))], { type: 'audio/mpeg' });
      return URL.createObjectURL(blob);
    }

    // Case 6: JSON with audioUrl
    if (typeof data === 'object' && data !== null && 'audioUrl' in data) {
      console.log('[VoicePlayer] TTS received audioUrl');
      return (data as { audioUrl: string }).audioUrl;
    }

    // Case 7: JSON with base64 audio
    if (typeof data === 'object' && data !== null && 'audio' in data) {
      console.log('[VoicePlayer] TTS received base64 audio');
      const base64 = (data as { audio: string }).audio;
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mpeg' });
      return URL.createObjectURL(blob);
    }

    // Log unexpected format for debugging
    console.error('[VoicePlayer] TTS unexpected response type:', {
      type: typeof data,
      constructor: data?.constructor?.name,
      keys: data && typeof data === 'object' ? Object.keys(data as object).slice(0, 10) : null,
      sample: data && typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : String(data).slice(0, 200),
    });

    throw new Error('Unrecognized audio format');
  }
}

export default VoicePlayer;
