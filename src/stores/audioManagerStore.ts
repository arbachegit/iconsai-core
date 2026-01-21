/**
 * ============================================================
 * audioManagerStore.ts - Gerenciador Global de Áudio
 * ============================================================
 * Versão: 5.0.0 - 2026-01-21
 * Safari/iOS: Usa getAudioContext() para webkit prefix
 * FIX: Chama unlockAudio() antes de play para mobile
 * FIX: Armazena pendingPlay para retry após interação
 * FIX: AudioContext.close() com await (evita race condition)
 * FIX: MediaElementSourceNode com disconnect (evita erro em reproduções consecutivas)
 *
 * Descrição: Store Zustand que gerencia o áudio globalmente,
 * garantindo que apenas UM áudio toque por vez.
 * ============================================================
 */

import { create } from "zustand";
import { getAudioContext, unlockAudio, isAudioUnlocked, createOptimizedAudioElement } from '@/utils/safari-audio';
import { getBrowserInfo } from '@/utils/safari-detect';

interface AudioInstance {
  id: string;
  audio: HTMLAudioElement;
  source: string; // "home" | "help" | "world" | "health" | "ideas"
}

// Pendente de play após interação do usuário
interface PendingPlay {
  id: string;
  audioUrl: string;
  source: string;
}

interface AudioManagerState {
  // Áudio atualmente tocando
  currentAudio: AudioInstance | null;

  // Web Audio API para análise de frequência
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
  sourceNode: MediaElementAudioSourceNode | null; // FIX: Guardar referência para disconnect

  // Estado
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;

  // Pendente para retry após interação (mobile)
  pendingPlay: PendingPlay | null;

  // Ações
  playAudio: (id: string, audioUrl: string, source: string) => Promise<void>;
  retryPendingPlay: () => Promise<void>;
  stopAudio: () => void;
  pauseAudio: () => void;
  resumeAudio: () => void;
  setProgress: (progress: number) => void;

  // Obter dados de frequência para visualização
  getFrequencyData: () => number[];

  // Cleanup ao mudar de módulo (async para evitar race condition)
  stopAllAndCleanup: () => Promise<void>;
}

export const useAudioManager = create<AudioManagerState>((set, get) => ({
  currentAudio: null,
  audioContext: null,
  analyserNode: null,
  sourceNode: null, // FIX: Estado inicial
  isPlaying: false,
  isLoading: false,
  progress: 0,
  pendingPlay: null,

  playAudio: async (id: string, audioUrl: string, source: string) => {
    const state = get();
    const { isSafari, isIOS } = getBrowserInfo();

    console.log("[AudioManager v4.0] 🎵 playAudio:", { id, source });

    // IMPORTANTE: Parar qualquer áudio existente primeiro
    if (state.currentAudio?.audio) {
      state.currentAudio.audio.pause();
      state.currentAudio.audio.currentTime = 0;
      state.currentAudio.audio.src = "";
    }

    // FIX: Desconectar sourceNode anterior (evita erro InvalidStateError)
    if (state.sourceNode) {
      try {
        state.sourceNode.disconnect();
      } catch (e) {
        console.warn("[AudioManager v4.0] Erro ao desconectar sourceNode:", e);
      }
    }

    // FIX: Fechar AudioContext anterior COM AWAIT (evita race condition)
    if (state.audioContext && state.audioContext.state !== "closed") {
      try {
        await state.audioContext.close();
        // Pequeno delay para garantir que fechou
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.warn("[AudioManager v4.0] Erro ao fechar AudioContext:", e);
      }
    }

    set({ isLoading: true, progress: 0, audioContext: null, analyserNode: null, sourceNode: null, pendingPlay: null });

    // v3.0.0: Tentar desbloquear áudio no Safari/iOS antes de tocar
    if (isSafari || isIOS) {
      console.log("[AudioManager] 📱 Dispositivo Safari/iOS detectado, tentando unlockAudio...");
      await unlockAudio();
    }

    try {
      // v3.0.0: Usar createOptimizedAudioElement para Safari
      const audio = (isSafari || isIOS) ? createOptimizedAudioElement() : new Audio();
      audio.src = audioUrl;
      audio.crossOrigin = "anonymous"; // Necessário para Web Audio API

      // Configurar eventos
      audio.onloadeddata = () => {
        set({ isLoading: false });
      };

      audio.onplay = () => {
        set({ isPlaying: true, pendingPlay: null });
      };

      audio.onpause = () => {
        set({ isPlaying: false });
      };

      audio.onended = () => {
        set({ isPlaying: false, progress: 0 });
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          const progress = (audio.currentTime / audio.duration) * 100;
          set({ progress });
        }
      };

      audio.onerror = () => {
        console.error("[AudioManager] Erro ao carregar áudio");
        set({ isLoading: false, isPlaying: false });
      };

      // Salvar referência
      set({
        currentAudio: { id, audio, source },
      });

      // Configurar Web Audio API para análise de frequência
      // Usa getAudioContext() que trata webkit prefix para Safari
      try {
        const audioContext = getAudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64; // 32 barras de frequência
        analyser.smoothingTimeConstant = 0.8;

        const newSourceNode = audioContext.createMediaElementSource(audio);
        newSourceNode.connect(analyser);
        analyser.connect(audioContext.destination);

        // FIX: Salvar referência do sourceNode para disconnect futuro
        set({ audioContext, analyserNode: analyser, sourceNode: newSourceNode });
      } catch (audioApiError) {
        console.warn("[AudioManager v4.0] Web Audio API não disponível:", audioApiError);
      }

      // v3.0.0: Carregar antes de tocar (importante para Safari)
      if (isSafari || isIOS) {
        audio.load();
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      await audio.play();
      set({ isPlaying: true, isLoading: false });

    } catch (error) {
      // v3.0.0: Detectar NotAllowedError e salvar para retry
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        console.warn("[AudioManager] ⚠️ Autoplay bloqueado - salvando para retry após interação do usuário");
        set({
          isLoading: false,
          isPlaying: false,
          pendingPlay: { id, audioUrl, source }
        });
        return; // Não mostrar erro, vai tocar após interação
      }

      console.error("[AudioManager] Erro:", error);
      set({ isLoading: false, isPlaying: false });
    }
  },

  // v3.0.0: Retry do áudio pendente após interação do usuário
  retryPendingPlay: async () => {
    const state = get();
    if (!state.pendingPlay) return;

    console.log("[AudioManager] 🔄 Retry do áudio pendente após interação...");
    const { id, audioUrl, source } = state.pendingPlay;

    // Limpar pending antes de tentar novamente
    set({ pendingPlay: null });

    // Tentar tocar novamente
    await get().playAudio(id, audioUrl, source);
  },

  stopAudio: () => {
    const state = get();
    if (state.currentAudio?.audio) {
      state.currentAudio.audio.pause();
      state.currentAudio.audio.currentTime = 0;
    }
    set({ isPlaying: false, progress: 0 });
  },

  pauseAudio: () => {
    const state = get();
    if (state.currentAudio?.audio) {
      state.currentAudio.audio.pause();
    }
    set({ isPlaying: false });
  },

  resumeAudio: () => {
    const state = get();
    if (state.currentAudio?.audio) {
      state.currentAudio.audio.play();
    }
    set({ isPlaying: true });
  },

  setProgress: (progress: number) => {
    set({ progress });
  },

  // Obter dados de frequência do áudio atual
  getFrequencyData: () => {
    const state = get();
    if (!state.analyserNode) return [];
    
    const dataArray = new Uint8Array(state.analyserNode.frequencyBinCount);
    state.analyserNode.getByteFrequencyData(dataArray);
    
    return Array.from(dataArray);
  },

  // CRÍTICO: Chamado ao trocar de módulo (v5.0: agora async)
  stopAllAndCleanup: async () => {
    const state = get();
    console.log("[AudioManager v5.0] 🧹 stopAllAndCleanup");

    if (state.currentAudio?.audio) {
      state.currentAudio.audio.pause();
      state.currentAudio.audio.currentTime = 0;
      state.currentAudio.audio.src = "";
    }

    // FIX: Desconectar sourceNode antes de fechar AudioContext
    if (state.sourceNode) {
      try {
        state.sourceNode.disconnect();
      } catch (e) {
        console.warn("[AudioManager v5.0] Erro ao desconectar sourceNode:", e);
      }
    }

    // FIX v5.0: Fechar AudioContext COM AWAIT (evita race condition)
    if (state.audioContext && state.audioContext.state !== "closed") {
      try {
        await state.audioContext.close();
        // Pequeno delay para garantir que fechou
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.warn("[AudioManager v5.0] Erro ao fechar AudioContext:", e);
      }
    }

    set({
      currentAudio: null,
      audioContext: null,
      analyserNode: null,
      sourceNode: null,
      isPlaying: false,
      isLoading: false,
      progress: 0,
      pendingPlay: null,
    });
  },
}));

export default useAudioManager;
