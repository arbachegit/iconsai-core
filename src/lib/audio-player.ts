export class AudioStreamPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private isPaused = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private onProgressCallback?: (progress: number, duration: number) => void;
  private progressInterval?: number;
  private playbackRate: number = 1.0;

  constructor() {
    // Initialize on user interaction
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setProgressCallback(callback: (progress: number, duration: number) => void) {
    this.onProgressCallback = callback;
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    if (this.currentSource) {
      this.currentSource.playbackRate.value = rate;
    }
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }

  async playAudioFromUrl(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Falha ao carregar áudio");

      const arrayBuffer = await response.arrayBuffer();
      await this.playAudioBuffer(arrayBuffer);
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      throw error;
    }
  }

  private async playAudioBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error("AudioContext não inicializado");
    }

    this.audioQueue.push(arrayBuffer);
    
    if (!this.isPlaying) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
      }
      return;
    }

    this.isPlaying = true;
    const arrayBuffer = this.audioQueue.shift()!;

    try {
      if (!this.audioContext) return;

      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.playbackRate.value = this.playbackRate;
      this.currentSource.connect(this.audioContext.destination);
      
      const startTime = this.audioContext.currentTime;
      const duration = audioBuffer.duration;
      
      // Update progress during playback
      if (this.onProgressCallback) {
        this.progressInterval = window.setInterval(() => {
          if (this.currentSource && this.audioContext) {
            const elapsed = this.audioContext.currentTime - startTime;
            const progress = Math.min((elapsed / duration) * 100, 100);
            this.onProgressCallback?.(progress, duration);
          }
        }, 100);
      }
      
      this.currentSource.onended = () => {
        if (this.progressInterval) {
          clearInterval(this.progressInterval);
        }
        this.onProgressCallback?.(100, duration);
        this.currentSource = null;
        this.processQueue();
      };
      
      this.currentSource.start(0);
    } catch (error) {
      console.error("Erro ao decodificar áudio:", error);
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
      }
      this.processQueue(); // Continue com próximo na fila
    }
  }

  async pause(): Promise<void> {
    if (this.audioContext && this.isPlaying && !this.isPaused) {
      await this.audioContext.suspend();
      this.isPaused = true;
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext && this.isPaused) {
      await this.audioContext.resume();
      this.isPaused = false;
    }
  }

  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    this.audioQueue = [];
    this.isPlaying = false;
    this.isPaused = false;
    this.onProgressCallback?.(0, 0);
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  isPausedState(): boolean {
    return this.isPaused;
  }
}

export async function generateAudioUrl(text: string): Promise<string> {
  const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`;
  
  const response = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error("Falha ao gerar áudio");
  }

  // Convert stream to blob and create URL
  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
}
