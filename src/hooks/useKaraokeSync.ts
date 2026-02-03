/**
 * ============================================================
 * useKaraokeSync Hook - v3.1.0
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
 * - v3.1.0: Fix race conditions - efeito único para simulação, detecção robusta de novas words
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

  // v3.1.0: Ref para rastrear última words do áudio
  const lastAudioWordsIdRef = useRef<string | null>(null);

  // Efeito para modo ÁUDIO REAL
  useEffect(() => {
    if (simulatePlayback || !enabled || !words || words.length === 0 || !getAudioElement) {
      return;
    }

    // Gerar ID único para este conjunto de words
    const wordsId = `${words.length}-${words[0]?.word}-${words[words.length - 1]?.end}`;
    const isNewWords = wordsId !== lastAudioWordsIdRef.current;

    if (isNewWords) {
      console.log('[KaraokeSync] New audio words detected:', wordsId);
      lastAudioWordsIdRef.current = wordsId;
      lastWordIndexRef.current = -1;

      // Reset state para novo áudio
      setState({
        currentWordIndex: -1,
        currentTime: 0,
        isPlaying: false,
        progress: 0,
      });
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
      } else if (audioElement && audioElement.ended) {
        // Áudio terminou - mostrar todas as palavras como completed
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        setState((prev) => ({
          ...prev,
          currentWordIndex: wordsRef.current?.length ? wordsRef.current.length - 1 : -1,
          isPlaying: false,
        }));
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

  // v3.1.0: Ref para rastrear última words reference (para detectar mudança real)
  const lastWordsIdRef = useRef<string | null>(null);

  // Efeito ÚNICO para modo SIMULADO - evita race conditions
  useEffect(() => {
    // Gerar ID único para este conjunto de words
    const wordsId = words && words.length > 0
      ? `${words.length}-${words[0]?.word}-${words[words.length - 1]?.end}`
      : null;

    const isNewWords = wordsId !== lastWordsIdRef.current && wordsId !== null;

    if (!simulatePlayback || !enabled || !words || words.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      simulationStartRef.current = null;
      // Não resetar lastWordsIdRef aqui para permitir re-enable
      return;
    }

    // Se é um novo conjunto de words OU se está habilitando pela primeira vez
    if (isNewWords || !simulationStartRef.current) {
      console.log('[KaraokeSync] Starting/Restarting SIMULATION mode:', {
        wordsCount: words.length,
        isNewWords,
        wordsId,
      });

      lastWordsIdRef.current = wordsId;
      lastWordIndexRef.current = -1;

      // Reset state antes de iniciar
      setState({
        currentWordIndex: -1,
        currentTime: 0,
        isPlaying: true, // Marca como playing imediatamente
        progress: 0,
      });

      // Cancelar animação anterior se existir
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Iniciar nova simulação
      simulationStartRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(updateLoopSimulation);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      simulationStartRef.current = null;
    };
  }, [simulatePlayback, enabled, words, updateLoopSimulation]);

  return state;
}

export default useKaraokeSync;
