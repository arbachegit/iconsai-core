/**
 * ============================================================
 * useAssistantKaraoke Hook - v1.0.0
 * ============================================================
 * Hook ISOLADO para karaoke do assistente.
 *
 * Este hook é completamente independente e não deve ser modificado
 * por outras funcionalidades (real-time STT, etc).
 *
 * Funcionalidade:
 * - Sincroniza palavras com áudio TTS do assistente
 * - Usa requestAnimationFrame para updates suaves (60fps)
 * - Detecta automaticamente quando o áudio está tocando
 * - Retorna índice da palavra atual baseado no currentTime
 * ============================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { WordTiming } from '@/components/voice-assistant/types';

export interface AssistantKaraokeState {
  /** Índice da palavra sendo falada (-1 se nenhuma) */
  currentWordIndex: number;
  /** Tempo atual do áudio em segundos */
  currentTime: number;
  /** Se o áudio está tocando */
  isPlaying: boolean;
  /** Progresso de 0 a 1 */
  progress: number;
}

export interface UseAssistantKaraokeOptions {
  /** Array de palavras com timestamps */
  words: WordTiming[];
  /** Função que retorna o elemento de áudio */
  getAudioElement: () => HTMLAudioElement | null;
  /** Se o karaoke está habilitado (default: true quando há words) */
  enabled?: boolean;
}

/**
 * Hook isolado para karaoke do assistente
 */
export function useAssistantKaraoke({
  words,
  getAudioElement,
  enabled = true,
}: UseAssistantKaraokeOptions): AssistantKaraokeState {
  // Estado do karaoke
  const [state, setState] = useState<AssistantKaraokeState>({
    currentWordIndex: -1,
    currentTime: 0,
    isPlaying: false,
    progress: 0,
  });

  // Refs para evitar re-renders desnecessários
  const animationFrameRef = useRef<number | null>(null);
  const wordsRef = useRef<WordTiming[]>(words);
  const lastWordsIdRef = useRef<string | null>(null);

  // Atualizar ref quando words mudam
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  /**
   * Encontra o índice da palavra baseado no tempo atual
   */
  const findWordIndex = useCallback((time: number): number => {
    const currentWords = wordsRef.current;
    if (!currentWords || currentWords.length === 0) return -1;

    for (let i = 0; i < currentWords.length; i++) {
      const word = currentWords[i];
      // Palavra atual está sendo falada
      if (time >= word.start && time <= word.end) {
        return i;
      }
      // Tempo está antes desta palavra
      if (time < word.start) {
        return i > 0 ? i - 1 : -1;
      }
    }

    // Passou de todas as palavras
    return currentWords.length - 1;
  }, []);

  /**
   * Loop de animação para sincronizar com áudio
   */
  const syncLoop = useCallback(() => {
    const audioElement = getAudioElement();

    if (!audioElement || !enabled) {
      animationFrameRef.current = null;
      return;
    }

    const currentTime = audioElement.currentTime;
    const duration = audioElement.duration || 0;
    const isPlaying = !audioElement.paused && !audioElement.ended;
    const progress = duration > 0 ? currentTime / duration : 0;
    const wordIndex = findWordIndex(currentTime);

    // Atualiza state apenas se houve mudança significativa
    setState((prev) => {
      const timeChanged = Math.abs(currentTime - prev.currentTime) > 0.03;
      const indexChanged = wordIndex !== prev.currentWordIndex;
      const playingChanged = isPlaying !== prev.isPlaying;

      if (timeChanged || indexChanged || playingChanged) {
        return {
          currentWordIndex: wordIndex,
          currentTime,
          isPlaying,
          progress,
        };
      }
      return prev;
    });

    // Continua o loop se está tocando
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(syncLoop);
    } else {
      animationFrameRef.current = null;
    }
  }, [getAudioElement, enabled, findWordIndex]);

  /**
   * Efeito principal - gerencia o ciclo de vida do karaoke
   */
  useEffect(() => {
    // Não faz nada se desabilitado ou sem words
    if (!enabled || !words || words.length === 0) {
      // Limpar estado quando desabilitado
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Gerar ID único para este conjunto de words
    const wordsId = `${words.length}-${words[0]?.word}-${words[words.length - 1]?.end}`;
    const isNewWords = wordsId !== lastWordsIdRef.current;

    // Se são novas words, resetar estado
    if (isNewWords) {
      console.log('[AssistantKaraoke] Nova mensagem detectada:', words.length, 'palavras');
      lastWordsIdRef.current = wordsId;

      setState({
        currentWordIndex: -1,
        currentTime: 0,
        isPlaying: false,
        progress: 0,
      });
    }

    // Polling para detectar quando o áudio começa a tocar
    const pollInterval = setInterval(() => {
      const audioElement = getAudioElement();

      if (audioElement && !audioElement.paused && !audioElement.ended) {
        // Áudio está tocando - iniciar sync loop
        if (!animationFrameRef.current) {
          console.log('[AssistantKaraoke] Áudio iniciado, sincronizando...');
          animationFrameRef.current = requestAnimationFrame(syncLoop);
        }
      } else if (audioElement && audioElement.ended) {
        // Áudio terminou - marcar última palavra como atual
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        setState((prev) => ({
          ...prev,
          currentWordIndex: wordsRef.current.length - 1,
          isPlaying: false,
        }));
      }
    }, 50);

    // Cleanup
    return () => {
      clearInterval(pollInterval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, words, getAudioElement, syncLoop]);

  return state;
}

export default useAssistantKaraoke;
