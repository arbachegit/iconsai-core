/**
 * ============================================================
 * audioManagerStore.ts - Gerenciador Global de Áudio
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-04
 * 
 * Descrição: Store Zustand que gerencia o áudio globalmente,
 * garantindo que apenas UM áudio toque por vez.
 * ============================================================
 */

import { create } from "zustand";

interface AudioInstance {
  id: string;
  audio: HTMLAudioElement;
  source: string; // "home" | "help" | "world" | "health" | "ideas"
}

interface AudioManagerState {
  // Áudio atualmente tocando
  currentAudio: AudioInstance | null;
  
  // Estado
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  
  // Ações
  playAudio: (id: string, audioUrl: string, source: string) => Promise<void>;
  stopAudio: () => void;
  pauseAudio: () => void;
  resumeAudio: () => void;
  setProgress: (progress: number) => void;
  
  // Cleanup ao mudar de módulo
  stopAllAndCleanup: () => void;
}

export const useAudioManager = create<AudioManagerState>((set, get) => ({
  currentAudio: null,
  isPlaying: false,
  isLoading: false,
  progress: 0,

  playAudio: async (id: string, audioUrl: string, source: string) => {
    const state = get();
    
    // IMPORTANTE: Parar qualquer áudio existente primeiro
    if (state.currentAudio?.audio) {
      state.currentAudio.audio.pause();
      state.currentAudio.audio.currentTime = 0;
      state.currentAudio.audio.src = "";
    }

    set({ isLoading: true, progress: 0 });

    try {
      const audio = new Audio(audioUrl);
      
      // Configurar eventos
      audio.onloadeddata = () => {
        set({ isLoading: false });
      };

      audio.onplay = () => {
        set({ isPlaying: true });
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

      // Salvar referência e tocar
      set({
        currentAudio: { id, audio, source },
      });

      await audio.play();
      set({ isPlaying: true, isLoading: false });

    } catch (error) {
      console.error("[AudioManager] Erro:", error);
      set({ isLoading: false, isPlaying: false });
    }
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

  // CRÍTICO: Chamado ao trocar de módulo
  stopAllAndCleanup: () => {
    const state = get();
    if (state.currentAudio?.audio) {
      state.currentAudio.audio.pause();
      state.currentAudio.audio.currentTime = 0;
      state.currentAudio.audio.src = "";
    }
    set({
      currentAudio: null,
      isPlaying: false,
      isLoading: false,
      progress: 0,
    });
  },
}));

export default useAudioManager;
