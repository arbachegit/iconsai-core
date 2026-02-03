/**
 * ============================================================
 * useKaraokeSync Hook - v2.0.0
 * ============================================================
 * Sincroniza a reprodução de áudio com o índice de palavras
 * para efeito karaokê em tempo real.
 *
 * Features:
 * - Usa requestAnimationFrame para updates suaves (60fps)
 * - Calcula currentWordIndex baseado no currentTime do áudio
 * - Compatível com Safari/iOS
 * - v2.0.0: Aceita getter function para audioElement (reativo)
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
  getAudioElement: () => HTMLAudioElement | null;
  enabled?: boolean;
}

export function useKaraokeSync({
  words,
  getAudioElement,
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
  const wordsRef = useRef<WordTiming[]>(words);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

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

  // Loop de animação para sincronização suave
  const updateLoop = useCallback(() => {
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
      // Só atualiza se houve mudança significativa
      if (
        wordIndex !== prev.currentWordIndex ||
        Math.abs(currentTime - prev.currentTime) > 0.03 || // 30ms threshold
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

    // Continuar loop se estiver tocando
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateLoop);
    } else {
      animationFrameRef.current = null;
    }
  }, [getAudioElement, enabled, findCurrentWordIndex]);

  // Iniciar/parar loop baseado no estado do áudio
  useEffect(() => {
    if (!enabled || !words || words.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setState({
        currentWordIndex: -1,
        currentTime: 0,
        isPlaying: false,
        progress: 0,
      });
      return;
    }

    // Polling para detectar quando o audioElement está disponível e tocando
    const checkInterval = setInterval(() => {
      const audioElement = getAudioElement();

      // Se o elemento mudou, atualizar ref e listeners
      if (audioElement !== audioElementRef.current) {
        console.log('[KaraokeSync] Audio element changed:', !!audioElement);
        audioElementRef.current = audioElement;
      }

      if (audioElement && !audioElement.paused && !audioElement.ended) {
        // Está tocando, iniciar loop se não estiver rodando
        if (!animationFrameRef.current) {
          console.log('[KaraokeSync] Starting sync loop, words:', wordsRef.current?.length);
          animationFrameRef.current = requestAnimationFrame(updateLoop);
        }
      }
    }, 100);

    return () => {
      clearInterval(checkInterval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, words, getAudioElement, updateLoop]);

  // Reset quando words mudam significativamente
  useEffect(() => {
    lastWordIndexRef.current = -1;
    if (words && words.length > 0) {
      console.log('[KaraokeSync] Words ready for sync:', words.length, 'words');
    }
  }, [words]);

  return state;
}

export default useKaraokeSync;
