/**
 * ============================================================
 * audioManagerStore.ts - Gerenciador Global de Áudio
 * ============================================================
 * Versão: 8.0.0 - 2026-01-22
 *
 * v8.0.0: Abordagem simplificada para iOS
 * - Usa HTMLAudioElement direto (sem Web Audio API para playback)
 * - Cria novo Audio element para cada reprodução
 * - Funciona porque o user gesture já desbloqueou o áudio
 * ============================================================
 */

import { create } from "zustand";
import { getBrowserInfo } from '@/utils/safari-detect';
import {
  warmupAudioSync,
  playWarmedAudio,
  stopWarmedAudio,
  isAudioWarmed,
  setupWarmedAudioCallbacks,
  getWarmedAudioProgress
} from '@/utils/audio-warmup';

// Helper para criar AudioContext (com webkit prefix para Safari)
function getAudioContext(): AudioContext {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  return new AudioContextClass();
}

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
    const isMobile = isSafari || isIOS;

    console.log("[AudioManager v8.0] 🎵 playAudio:", { id, source, isMobile });

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
        console.warn("[AudioManager v7.0] Erro ao desconectar sourceNode:", e);
      }
    }

    // FIX: Fechar AudioContext anterior COM AWAIT (evita race condition)
    if (state.audioContext && state.audioContext.state !== "closed") {
      try {
        await state.audioContext.close();
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.warn("[AudioManager v7.0] Erro ao fechar AudioContext:", e);
      }
    }

    set({ isLoading: true, progress: 0, audioContext: null, analyserNode: null, sourceNode: null, pendingPlay: null });

    try {
      // ============================================================
      // v8.0.0: Para iOS/Safari, usar o áudio "aquecido"
      // O warmup foi feito no clique do usuário (handlePlayClick)
      // Isso garante que o áudio está desbloqueado
      // ============================================================
      if (isMobile && isAudioWarmed()) {
        console.log("[AudioManager v8.0] 📱 Usando áudio aquecido para iOS...");

        // Configurar callbacks no áudio aquecido
        setupWarmedAudioCallbacks({
          onPlay: () => {
            console.log("[AudioManager v8.0] ▶️ Warmed onPlay");
            set({ isPlaying: true, isLoading: false, pendingPlay: null });
          },
          onEnded: () => {
            console.log("[AudioManager v8.0] ⏹️ Warmed onEnded");
            set({ isPlaying: false, progress: 0 });
          },
          onError: () => {
            console.error("[AudioManager v8.0] ❌ Warmed onError");
            set({ isPlaying: false, isLoading: false });
          },
          onTimeUpdate: (currentTime, duration) => {
            if (duration > 0) {
              const progress = (currentTime / duration) * 100;
              set({ progress });
            }
          }
        });

        // Usar o áudio aquecido
        const warmedAudio = await playWarmedAudio(audioUrl);

        set({
          currentAudio: { id, audio: warmedAudio, source },
          isPlaying: true,
          isLoading: false
        });

        console.log("[AudioManager v8.0] ✅ Áudio aquecido reproduzindo!");
        return;
      }

      // ============================================================
      // Para browsers desktop ou se não foi aquecido, usar normal
      // ============================================================
      console.log("[AudioManager v8.0] 🖥️ Usando HTMLAudioElement normal...");

      const audio = new Audio();
      audio.src = audioUrl;
      audio.currentTime = 0;

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
        console.error("[AudioManager v8.0] Erro ao carregar áudio");
        set({ isLoading: false, isPlaying: false });
      };

      set({
        currentAudio: { id, audio, source },
      });

      // Configurar Web Audio API para análise de frequência (apenas desktop)
      if (!isMobile) {
        try {
          const audioContext = getAudioContext();
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.8;

          const newSourceNode = audioContext.createMediaElementSource(audio);
          newSourceNode.connect(analyser);
          analyser.connect(audioContext.destination);

          set({ audioContext, analyserNode: analyser, sourceNode: newSourceNode });
        } catch (audioApiError) {
          console.warn("[AudioManager v8.0] Web Audio API não disponível:", audioApiError);
        }
      }

      console.log("[AudioManager v8.0] ▶️ Tentando reproduzir...");
      await audio.play();
      console.log("[AudioManager v8.0] ✅ Reprodução iniciada!");
      set({ isPlaying: true, isLoading: false });

    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        console.warn("[AudioManager v7.0] ⚠️ Autoplay bloqueado - salvando para retry");
        set({
          isLoading: false,
          isPlaying: false,
          pendingPlay: { id, audioUrl, source }
        });
        return;
      }

      console.error("[AudioManager v7.0] Erro:", error);
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

  // CRÍTICO: Chamado ao trocar de módulo
  stopAllAndCleanup: async () => {
    const state = get();
    console.log("[AudioManager v8.0] 🧹 stopAllAndCleanup");

    if (state.currentAudio?.audio) {
      state.currentAudio.audio.pause();
      state.currentAudio.audio.currentTime = 0;
      state.currentAudio.audio.src = "";
    }

    // Desconectar sourceNode antes de fechar AudioContext
    if (state.sourceNode) {
      try {
        state.sourceNode.disconnect();
      } catch (e) {
        console.warn("[AudioManager v7.0] Erro ao desconectar sourceNode:", e);
      }
    }

    // FIX v5.0: Fechar AudioContext COM AWAIT (evita race condition)
    if (state.audioContext && state.audioContext.state !== "closed") {
      try {
        await state.audioContext.close();
        // Pequeno delay para garantir que fechou
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.warn("[AudioManager v7.0] Erro ao fechar AudioContext:", e);
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
