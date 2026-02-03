/**
 * VoiceRecorder - Microphone Recording Manager
 * @version 1.0.0
 * @date 2026-01-27
 *
 * Handles audio recording with:
 * - Safari/iOS compatibility
 * - Real-time frequency analysis for visualization
 * - Base64 output for API submission
 */

import { getBrowserInfo } from '@/utils/safari-detect';
import {
  getSupportedRecordingMimeType,
  getOptimizedAudioConstraints,
  getAudioContext,
  unlockAudio,
} from '@/utils/safari-audio';
import { blobToBase64, validateAudioBlob } from '@/utils/audio';

export interface VoiceRecorderCallbacks {
  onStart?: () => void;
  onStop?: (base64: string, duration: number) => void;
  onFrequencyData?: (data: number[]) => void;
  onDuration?: (seconds: number) => void;
  onError?: (error: Error) => void;
  /** v1.1.0: Callback para streaming de chunks em tempo real */
  onChunk?: (chunk: Blob) => void;
}

export interface RecordingResult {
  base64: string;
  duration: number;
  mimeType: string;
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private analyser: AnalyserNode | null = null;
  private animationFrame: number | null = null;
  private durationTimer: NodeJS.Timeout | null = null;
  private startTime = 0;
  private mimeType = '';
  private callbacks: VoiceRecorderCallbacks = {};
  private isRecording = false;

  private readonly browserInfo = getBrowserInfo();
  private readonly minDuration = 0.5;
  private readonly minSizeKB = 1;

  constructor() {}

  /**
   * Set callbacks for recorder events
   */
  setCallbacks(callbacks: VoiceRecorderCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Request microphone permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getOptimizedAudioConstraints(),
      });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      console.error('[VoiceRecorder] Permission denied:', err);
      return false;
    }
  }

  /**
   * Check if microphone permission is granted
   */
  async hasPermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state === 'granted';
    } catch {
      // Fallback for browsers that don't support permissions API
      return false;
    }
  }

  /**
   * Start recording
   */
  async start(): Promise<void> {
    if (this.isRecording) {
      console.warn('[VoiceRecorder] Already recording');
      return;
    }

    try {
      this.cleanup();

      // Safari: unlock audio first
      if (this.browserInfo.isSafari || this.browserInfo.isIOS) {
        await unlockAudio();
      }

      // Get audio stream
      const audioConstraints = getOptimizedAudioConstraints();
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      // Setup frequency analyser
      this.setupAnalyser();

      // Get supported mime type
      this.mimeType = getSupportedRecordingMimeType() || 'audio/webm';

      // Create MediaRecorder with optimized options
      const recorderOptions: MediaRecorderOptions = {};
      if (this.mimeType) {
        recorderOptions.mimeType = this.mimeType;
      }

      // Safari: audioBitsPerSecond helps with quality
      if (this.browserInfo.isSafari || this.browserInfo.isIOS) {
        recorderOptions.audioBitsPerSecond = 128000;
      }

      this.mediaRecorder = new MediaRecorder(this.stream, recorderOptions);
      this.chunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
          // v1.1.0: Emit chunk for real-time streaming
          this.callbacks.onChunk?.(event.data);
        }
      };

      // Safari: larger timeslice to avoid issues
      const timeslice = this.browserInfo.isSafari || this.browserInfo.isIOS ? 1000 : 100;
      this.mediaRecorder.start(timeslice);
      this.startTime = Date.now();
      this.isRecording = true;

      // Start frequency analysis
      this.startFrequencyAnalysis();

      // Start duration timer
      this.startDurationTimer();

      this.callbacks.onStart?.();
      console.log('[VoiceRecorder] Recording started');
    } catch (err) {
      console.error('[VoiceRecorder] Start failed:', err);
      this.cleanup();

      // Handle specific errors
      if (err instanceof DOMException) {
        const errorMessage = this.getErrorMessage(err);
        this.callbacks.onError?.(new Error(errorMessage));
      } else {
        this.callbacks.onError?.(err instanceof Error ? err : new Error('Recording failed'));
      }
      throw err;
    }
  }

  /**
   * Stop recording and return base64 audio
   */
  async stop(): Promise<RecordingResult | null> {
    if (!this.mediaRecorder || !this.isRecording) {
      console.warn('[VoiceRecorder] Not recording');
      return null;
    }

    return new Promise((resolve) => {
      const mediaRecorder = this.mediaRecorder!;

      mediaRecorder.onstop = async () => {
        const finalDuration = (Date.now() - this.startTime) / 1000;
        const finalMimeType = this.mimeType || mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(this.chunks, { type: finalMimeType });

        console.log('[VoiceRecorder] Recording stopped:', {
          size: blob.size,
          type: blob.type,
          chunks: this.chunks.length,
          duration: finalDuration,
        });

        // Validate audio
        const validation = validateAudioBlob(blob, this.minSizeKB, this.minDuration, finalDuration);
        if (!validation.valid) {
          console.warn('[VoiceRecorder] Invalid audio:', validation.reason);
          this.callbacks.onError?.(new Error(validation.reason || 'Audio too short'));
          this.cleanup();
          resolve(null);
          return;
        }

        try {
          const base64 = await blobToBase64(blob);
          const result: RecordingResult = {
            base64,
            duration: finalDuration,
            mimeType: finalMimeType,
          };

          this.callbacks.onStop?.(base64, finalDuration);
          this.cleanup();
          resolve(result);
        } catch (err) {
          console.error('[VoiceRecorder] Conversion failed:', err);
          this.callbacks.onError?.(new Error('Failed to convert audio'));
          this.cleanup();
          resolve(null);
        }
      };

      mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  /**
   * Cancel recording without saving
   */
  cancel(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
    this.cleanup();
    console.log('[VoiceRecorder] Recording cancelled');
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
   * Check if currently recording
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get current recording duration in seconds
   */
  getDuration(): number {
    if (!this.isRecording) return 0;
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.cancel();
    this.callbacks = {};
  }

  // Private methods

  private cleanup(): void {
    this.stopFrequencyAnalysis();
    this.stopDurationTimer();

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.analyser = null;
    this.chunks = [];
  }

  private setupAnalyser(): void {
    if (!this.stream) return;

    try {
      const audioContext = getAudioContext();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(this.stream);
      this.analyser = audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
    } catch (err) {
      console.warn('[VoiceRecorder] Analyser setup failed:', err);
    }
  }

  private startFrequencyAnalysis(): void {
    if (!this.analyser || !this.callbacks.onFrequencyData) return;

    const analyze = () => {
      if (!this.analyser || !this.isRecording) return;

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

  private startDurationTimer(): void {
    this.durationTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      this.callbacks.onDuration?.(elapsed);
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  private getErrorMessage(err: DOMException): string {
    switch (err.name) {
      case 'NotAllowedError':
        return this.browserInfo.isIOS
          ? 'Permission denied. Go to Settings > Safari > Microphone'
          : 'Microphone permission denied';
      case 'NotFoundError':
        return 'Microphone not found';
      case 'NotReadableError':
        return 'Microphone in use by another app';
      default:
        return 'Failed to access microphone';
    }
  }
}

export default VoiceRecorder;
