/**
 * ============================================================
 * useKaraokeSync Hook - v1.0.0
 * ============================================================
 * Sincroniza a reprodução de áudio com o índice de palavras
 * para efeito karaokê em tempo real.
 *
 * Features:
 * - Usa requestAnimationFrame para updates suaves (60fps)
 * - Calcula currentWordIndex baseado no currentTime do áudio
 * - Compatível com Safari/iOS
 * ============================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { WordTiming } from '@/components/voice-assistant/types';

export interface KaraokeSyncState {
  currentWordIndex: number;
  currentTime: number;
  isPlaying: boolean;
  progress: number;
}

export interface UseKaraokeSyncOptions {
  words: WordTiming[];
  audioElement: HTMLAudioElement | null;
  enabled?: boolean;
}

export function useKaraokeSync({
  words,
  audioElement,
  enabled = true,
}: UseKaraokeSyncOptions): KaraokeSyncState {
  const [state, setState] = useState<KaraokeSyncState>({
    currentWordIndex: -1,
    currentTime: 0,
    isPlaying: false,
    progress: 0,
  });

  const animationFrameRef = useRef<number | null>(null);
  const lastWordIndexRef = useRef<number>(-1);

  // Função para encontrar o índice da palavra atual baseado no tempo
  const findCurrentWordIndex = useCallback(
    (time: number): number => {
      if (!words || words.length === 0) return -1;

      // Busca binária otimizada para encontrar a palavra atual
      let low = 0;
      let high = words.length - 1;
      let result = -1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const word = words[mid];

        if (time >= word.start && time <= word.end) {
          return mid; // Encontrou palavra exata
        } else if (time > word.end) {
          result = mid; // Palavra já passou, pode ser a última válida
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      // Se o tempo está entre palavras, retorna a anterior
      if (result >= 0 && time < words[result + 1]?.start) {
        return result;
      }

      // Se ainda não chegou na primeira palavra
      if (words.length > 0 && time < words[0].start) {
        return -1;
      }

      return result;
    },
    [words]
  );

  // Loop de animação para sincronização suave
  const updateSync = useCallback(() => {
    if (!audioElement || !enabled) return;

    const currentTime = audioElement.currentTime;
    const duration = audioElement.duration || 0;
    const isPlaying = !audioElement.paused && !audioElement.ended;
    const progress = duration > 0 ? currentTime / duration : 0;

    const wordIndex = findCurrentWordIndex(currentTime);

    // Só atualiza state se houve mudança significativa
    if (
      wordIndex !== lastWordIndexRef.current ||
      Math.abs(currentTime - state.currentTime) > 0.05 // 50ms threshold
    ) {
      lastWordIndexRef.current = wordIndex;
      setState({
        currentWordIndex: wordIndex,
        currentTime,
        isPlaying,
        progress,
      });
    }

    // Continuar loop se estiver tocando
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateSync);
    }
  }, [audioElement, enabled, findCurrentWordIndex, state.currentTime]);

  // Setup e cleanup do loop de animação
  useEffect(() => {
    if (!audioElement || !enabled || !words || words.length === 0) {
      setState({
        currentWordIndex: -1,
        currentTime: 0,
        isPlaying: false,
        progress: 0,
      });
      return;
    }

    const handlePlay = () => {
      animationFrameRef.current = requestAnimationFrame(updateSync);
    };

    const handlePause = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Atualizar estado final
      setState((prev) => ({
        ...prev,
        isPlaying: false,
      }));
    };

    const handleEnded = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setState({
        currentWordIndex: words.length - 1, // Última palavra
        currentTime: audioElement.duration || 0,
        isPlaying: false,
        progress: 1,
      });
    };

    const handleSeeked = () => {
      updateSync();
    };

    // Adicionar listeners
    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('seeked', handleSeeked);

    // Se já estiver tocando, iniciar loop
    if (!audioElement.paused && !audioElement.ended) {
      handlePlay();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('seeked', handleSeeked);
    };
  }, [audioElement, enabled, words, updateSync]);

  // Reset quando words mudam
  useEffect(() => {
    lastWordIndexRef.current = -1;
    setState({
      currentWordIndex: -1,
      currentTime: 0,
      isPlaying: false,
      progress: 0,
    });
  }, [words]);

  return state;
}

export default useKaraokeSync;
