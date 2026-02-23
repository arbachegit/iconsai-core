/**
 * ============================================================
 * web-speech-fallback.ts - Fallback usando Web Speech API
 * ============================================================
 * Versão: 1.0.0 - 2026-01-22
 *
 * Quando HTMLAudioElement e Web Audio API não funcionam no iOS
 * (ex: modo silencioso), usamos a Web Speech API nativa do browser.
 *
 * Limitações:
 * - Voz sintética (não é a voz do TTS)
 * - Qualidade inferior
 * - Mas FUNCIONA no modo silencioso do iOS
 * ============================================================
 */

let isSpeaking = false;
let onEndCallback: (() => void) | null = null;
let onStartCallback: (() => void) | null = null;

/**
 * Verifica se Web Speech API está disponível
 */
export function isWebSpeechAvailable(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * Fala um texto usando Web Speech API (voz nativa do browser)
 * Útil como fallback quando áudio normal não funciona
 */
export function speakWithWebSpeech(text: string, lang: string = 'pt-BR'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isWebSpeechAvailable()) {
      reject(new Error('Web Speech API not available'));
      return;
    }

    // Cancelar qualquer fala anterior
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Tentar encontrar uma voz em português
    const voices = speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt')) || voices[0];
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    utterance.onstart = () => {
      console.log('[WebSpeech] ▶️ Iniciando fala');
      isSpeaking = true;
      if (onStartCallback) onStartCallback();
    };

    utterance.onend = () => {
      console.log('[WebSpeech] ⏹️ Fala concluída');
      isSpeaking = false;
      if (onEndCallback) onEndCallback();
      resolve();
    };

    utterance.onerror = (event) => {
      console.error('[WebSpeech] ❌ Erro:', event.error);
      isSpeaking = false;
      reject(new Error(event.error));
    };

    // iOS às vezes precisa de um "kick" - utterance vazia primeiro
    if (/(iPhone|iPad|iPod)/i.test(navigator.userAgent)) {
      speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    }

    speechSynthesis.speak(utterance);
  });
}

/**
 * Para a fala atual
 */
export function stopWebSpeech(): void {
  speechSynthesis.cancel();
  isSpeaking = false;
}

/**
 * Pausa a fala atual
 */
export function pauseWebSpeech(): void {
  speechSynthesis.pause();
}

/**
 * Continua a fala pausada
 */
export function resumeWebSpeech(): void {
  speechSynthesis.resume();
}

/**
 * Verifica se está falando
 */
export function isWebSpeechSpeaking(): boolean {
  return isSpeaking || speechSynthesis.speaking;
}

/**
 * Configura callbacks
 */
export function setWebSpeechCallbacks(callbacks: {
  onStart?: () => void;
  onEnd?: () => void;
}): void {
  if (callbacks.onStart) onStartCallback = callbacks.onStart;
  if (callbacks.onEnd) onEndCallback = callbacks.onEnd;
}

/**
 * Carrega as vozes disponíveis (necessário em alguns browsers)
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Alguns browsers carregam vozes de forma assíncrona
    speechSynthesis.onvoiceschanged = () => {
      resolve(speechSynthesis.getVoices());
    };

    // Timeout fallback
    setTimeout(() => {
      resolve(speechSynthesis.getVoices());
    }, 1000);
  });
}
