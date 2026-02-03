/**
 * ============================================================
 * useKaraokeSync Hook - v3.0.0
 * ============================================================
 * Sincroniza a reprodução de áudio com o índice de palavras
 * para efeito karaokê em tempo real.
 *
 * Features:
 * - Usa requestAnimationFrame para updates suaves (60fps)
 * - Calcula currentWordIndex baseado no currentTime do áudio
 * - Compatível com Safari/iOS
 * - v2.0.0: Aceita getter function para audioElement (reativo)
 * - v3.0.0: Modo simulado para quando não há áudio (ex: transcrição do usuário)
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
  getAudioElement?: () => HTMLAudioElement | null;
  enabled?: boolean;
  // v3.0.0: Modo simulado - simula playback baseado nos timestamps das palavras
  simulatePlayback?: boolean;
}

export function useKaraokeSync({
  words,
  getAudioElement,
  enabled = true,
  simulatePlayback = false,
}: UseKaraokeSyncOptions): KaraokeSyncState {
  const [state, setState] = useState<KaraokeSyncState>({
    currentWordIndex: -1,
    currentTime: 0,
    isPlaying: false,
    progress: 0,
  });

  const animationFrameRef = useRef<number | null>(null);
  const lastWordIndexRef = useRef<number>(-1);
  const wordsRef = useRef<WordTiming[]>(words);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const simulationStartRef = useRef<number | null>(null);

  // Manter wordsRef atualizado
  useEffect(() => {
    wordsRef.current = words;
    console.log('[KaraokeSync] Words updated:', words?.length || 0);
  }, [words]);

  // Função para encontrar o índice da palavra atual baseado no tempo
  const findCurrentWordIndex = useCallback((time: number): number => {
    const currentWords = wordsRef.current;
    if (!currentWords || currentWords.length === 0) return -1;

    // Busca linear simples (mais confiável para listas pequenas)
    for (let i = 0; i < currentWords.length; i++) {
      const word = currentWords[i];
      if (time >= word.start && time <= word.end) {
        return i;
      }
      // Se o tempo está antes desta palavra, retorna a anterior
      if (time < word.start) {
        return i > 0 ? i - 1 : -1;
      }
    }

    // Se passou de todas as palavras, retorna a última
    return currentWords.length - 1;
  }, []);

  // Calcular duração total das palavras
  const getTotalDuration = useCallback((): number => {
    const currentWords = wordsRef.current;
    if (!currentWords || currentWords.length === 0) return 0;
    return currentWords[currentWords.length - 1].end;
  }, []);

  // Loop de animação para áudio real
  const updateLoopAudio = useCallback(() => {
    if (!getAudioElement) {
      animationFrameRef.current = null;
      return;
    }

    const audioElement = getAudioElement();
    if (!audioElement || !enabled) {
      animationFrameRef.current = null;
      return;
    }

    const currentTime = audioElement.currentTime;
    const duration = audioElement.duration || 0;
    const isPlaying = !audioElement.paused && !audioElement.ended;
    const progress = duration > 0 ? currentTime / duration : 0;

    const wordIndex = findCurrentWordIndex(currentTime);

    // Atualiza state
    setState((prev) => {
      if (
        wordIndex !== prev.currentWordIndex ||
        Math.abs(currentTime - prev.currentTime) > 0.03 ||
        isPlaying !== prev.isPlaying
      ) {
        return {
          currentWordIndex: wordIndex,
          currentTime,
          isPlaying,
          progress,
        };
      }
      return prev;
    });

    lastWordIndexRef.current = wordIndex;

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateLoopAudio);
    } else {
      animationFrameRef.current = null;
    }
  }, [getAudioElement, enabled, findCurrentWordIndex]);

  // Loop de animação para simulação (sem áudio)
  const updateLoopSimulation = useCallback(() => {
    if (!simulationStartRef.current || !enabled) {
      animationFrameRef.current = null;
      return;
    }

    const elapsed = (performance.now() - simulationStartRef.current) / 1000;
    const totalDuration = getTotalDuration();
    const progress = totalDuration > 0 ? Math.min(elapsed / totalDuration, 1) : 0;
    const isPlaying = elapsed < totalDuration;

    const wordIndex = findCurrentWordIndex(elapsed);

    setState((prev) => {
      if (
        wordIndex !== prev.currentWordIndex ||
        Math.abs(elapsed - prev.currentTime) > 0.03 ||
        isPlaying !== prev.isPlaying
      ) {
        return {
          currentWordIndex: wordIndex,
          currentTime: elapsed,
          isPlaying,
          progress,
        };
      }
      return prev;
    });

    lastWordIndexRef.current = wordIndex;

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateLoopSimulation);
    } else {
      animationFrameRef.current = null;
      simulationStartRef.current = null;
    }
  }, [enabled, findCurrentWordIndex, getTotalDuration]);

  // Efeito para modo ÁUDIO REAL
  useEffect(() => {
    if (simulatePlayback || !enabled || !words || words.length === 0 || !getAudioElement) {
      return;
    }

    // Polling para detectar quando o audioElement está disponível e tocando
    const checkInterval = setInterval(() => {
      const audioElement = getAudioElement();

      if (audioElement !== audioElementRef.current) {
        console.log('[KaraokeSync] Audio element changed:', !!audioElement);
        audioElementRef.current = audioElement;
      }

      if (audioElement && !audioElement.paused && !audioElement.ended) {
        if (!animationFrameRef.current) {
          console.log('[KaraokeSync] Starting audio sync loop, words:', wordsRef.current?.length);
          animationFrameRef.current = requestAnimationFrame(updateLoopAudio);
        }
      }
    }, 50);

    return () => {
      clearInterval(checkInterval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [simulatePlayback, enabled, words, getAudioElement, updateLoopAudio]);

  // Efeito para modo SIMULADO
  useEffect(() => {
    if (!simulatePlayback || !enabled || !words || words.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      simulationStartRef.current = null;
      return;
    }

    // Iniciar simulação imediatamente
    console.log('[KaraokeSync] Starting SIMULATION mode, words:', words.length);
    simulationStartRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(updateLoopSimulation);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      simulationStartRef.current = null;
    };
  }, [simulatePlayback, enabled, words, updateLoopSimulation]);

  // Reset quando words mudam
  useEffect(() => {
    lastWordIndexRef.current = -1;
    setState({
      currentWordIndex: -1,
      currentTime: 0,
      isPlaying: false,
      progress: 0,
    });

    // Se em modo simulado e palavras mudaram, reiniciar simulação
    if (simulatePlayback && words && words.length > 0 && enabled) {
      console.log('[KaraokeSync] Words changed, restarting simulation');
      simulationStartRef.current = performance.now();
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateLoopSimulation);
      }
    }
  }, [words, simulatePlayback, enabled, updateLoopSimulation]);

  return state;
}

export default useKaraokeSync;
