export class AudioStreamPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private resolvePlayback: (() => void) | null = null;

  constructor() {
    // Initialize on user interaction
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async playAudioFromUrl(url: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.resolvePlayback = resolve;
      
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Falha ao carregar áudio");

        const arrayBuffer = await response.arrayBuffer();
        await this.playAudioBuffer(arrayBuffer);
      } catch (error) {
        console.error("Erro ao reproduzir áudio:", error);
        this.resolvePlayback = null;
        reject(error);
      }
    });
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
      if (this.resolvePlayback) {
        this.resolvePlayback();
        this.resolvePlayback = null;
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
      this.currentSource.connect(this.audioContext.destination);
      
      this.currentSource.onended = () => {
        this.currentSource = null;
        this.processQueue();
      };
      
      this.currentSource.start(0);
    } catch (error) {
      console.error("Erro ao decodificar áudio:", error);
      this.processQueue(); // Continue com próximo na fila
    }
  }

  stop(): void {
    try {
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource.disconnect();
        this.currentSource = null;
      }
    } catch (e) {
      // Ignorar erros se o áudio já estava parado
      console.debug('Audio already stopped:', e);
    }
    this.audioQueue = [];
    this.isPlaying = false;
    
    if (this.resolvePlayback) {
      this.resolvePlayback();
      this.resolvePlayback = null;
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
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
