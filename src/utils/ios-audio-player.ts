/**
 * ============================================================
 * ios-audio-player.ts - Player de áudio para iOS usando Web Audio API
 * ============================================================
 * Versão: 1.0.0 - 2026-01-22
 *
 * O problema: iOS Safari bloqueia HTMLAudioElement.play() se não for
 * chamado diretamente em resposta a user gesture.
 *
 * A solução: Usar Web Audio API com AudioContext + AudioBufferSourceNode.
 * Uma vez que o AudioContext é "resumed" em resposta a user gesture,
 * ele permanece desbloqueado para toda a sessão.
 * ============================================================
 */

// Estado global
let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let isPlaying = false;
let onEndedCallback: (() => void) | null = null;
let onPlayCallback: (() => void) | null = null;
let onErrorCallback: ((error: Error) => void) | null = null;

/**
 * Obtém ou cria o AudioContext
 */
function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContextClass();
    console.log('[iOSAudioPlayer] AudioContext criado, state:', audioContext.state);
  }
  return audioContext;
}

/**
 * Desbloqueia o AudioContext - DEVE ser chamado em resposta a user gesture
 * Retorna true se conseguiu desbloquear
 */
export async function unlockAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();

  if (ctx.state === 'running') {
    console.log('[iOSAudioPlayer] AudioContext já está running');
    return true;
  }

  try {
    console.log('[iOSAudioPlayer] Tentando resume AudioContext...');
    await ctx.resume();

    // Tocar som silencioso para garantir desbloqueio
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.001;
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.001);

    console.log('[iOSAudioPlayer] ✅ AudioContext desbloqueado, state:', ctx.state);
    return true;
  } catch (err) {
    console.error('[iOSAudioPlayer] ❌ Falha ao desbloquear AudioContext:', err);
    return false;
  }
}

/**
 * Reproduz áudio a partir de uma URL usando Web Audio API
 */
export async function playAudioFromUrl(audioUrl: string): Promise<void> {
  console.log('[iOSAudioPlayer] 🎵 Iniciando reprodução:', audioUrl.substring(0, 50) + '...');

  // Parar áudio atual se houver
  stopAudio();

  const ctx = getAudioContext();

  // Verificar se o contexto está running
  if (ctx.state !== 'running') {
    console.log('[iOSAudioPlayer] AudioContext não está running, tentando resume...');
    await ctx.resume();
  }

  try {
    // Buscar o áudio como ArrayBuffer
    console.log('[iOSAudioPlayer] Buscando áudio...');
    const response = await fetch(audioUrl);

    if (!response.ok) {
      throw new Error(`Falha ao buscar áudio: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log('[iOSAudioPlayer] Áudio baixado, tamanho:', arrayBuffer.byteLength, 'bytes');

    // Decodificar o áudio
    console.log('[iOSAudioPlayer] Decodificando áudio...');
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    console.log('[iOSAudioPlayer] Áudio decodificado, duração:', audioBuffer.duration, 's');

    // Criar source node
    currentSource = ctx.createBufferSource();
    currentSource.buffer = audioBuffer;
    currentSource.connect(ctx.destination);

    // Configurar callback de término
    currentSource.onended = () => {
      console.log('[iOSAudioPlayer] ✅ Reprodução finalizada');
      isPlaying = false;
      currentSource = null;
      if (onEndedCallback) onEndedCallback();
    };

    // Iniciar reprodução
    currentSource.start(0);
    isPlaying = true;
    console.log('[iOSAudioPlayer] ▶️ Reprodução iniciada!');

    if (onPlayCallback) onPlayCallback();

  } catch (err) {
    console.error('[iOSAudioPlayer] ❌ Erro ao reproduzir:', err);
    isPlaying = false;
    if (onErrorCallback) onErrorCallback(err as Error);
    throw err;
  }
}

/**
 * Para a reprodução atual
 */
export function stopAudio(): void {
  if (currentSource) {
    try {
      currentSource.stop();
      currentSource.disconnect();
    } catch (e) {
      // Ignorar erros se já parou
    }
    currentSource = null;
  }
  isPlaying = false;
}

/**
 * Verifica se está reproduzindo
 */
export function isAudioPlaying(): boolean {
  return isPlaying;
}

/**
 * Configura callbacks
 */
export function setCallbacks(callbacks: {
  onPlay?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}): void {
  if (callbacks.onPlay) onPlayCallback = callbacks.onPlay;
  if (callbacks.onEnded) onEndedCallback = callbacks.onEnded;
  if (callbacks.onError) onErrorCallback = callbacks.onError;
}

/**
 * Verifica se o AudioContext está desbloqueado
 */
export function isAudioContextUnlocked(): boolean {
  return audioContext !== null && audioContext.state === 'running';
}

/**
 * Limpa recursos
 */
export function cleanup(): void {
  stopAudio();
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
}
