/**
 * ============================================================
 * audio-warmup.ts - Sistema de áudio pré-aquecido para mobile
 * ============================================================
 * Versão: 2.0.0 - 2026-01-22
 *
 * O problema: Mobile browsers bloqueiam audio.play() se não for
 * chamado DIRETAMENTE em resposta a um user gesture (touch/click).
 * Chamadas async (API calls) quebram esse contexto.
 *
 * A solução: Manter um Audio element "quente" que já teve play()
 * chamado no contexto de um user gesture. Reutilizar esse elemento
 * para todas as reproduções.
 *
 * v2.0.0: Adiciona listeners globais para touchstart/touchend
 * conforme recomendação para iOS
 * ============================================================
 */

// Estado global
let warmedAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let isWarmed = false;
let warmupPromise: Promise<boolean> | null = null;

/**
 * Obtém ou cria AudioContext (com webkit prefix para Safari)
 */
function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

/**
 * Cria o elemento de áudio aquecido
 */
function createWarmedAudio(): HTMLAudioElement {
  const audio = new Audio();
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.preload = 'auto';
  audio.volume = 1.0;
  return audio;
}

/**
 * Aquece o áudio usando AudioContext - DEVE ser chamado em resposta a user gesture
 * Usa oscilador silencioso que funciona em todos os browsers
 * Retorna true se conseguiu aquecer, false caso contrário
 */
export async function warmupAudio(): Promise<boolean> {
  // Se já está aquecido, retornar true
  if (isWarmed) {
    console.log('[AudioWarmup] Já aquecido');
    return true;
  }

  // Se já tem um warmup em andamento, esperar
  if (warmupPromise) {
    return warmupPromise;
  }

  warmupPromise = (async () => {
    try {
      console.log('[AudioWarmup] Iniciando warmup com AudioContext...');

      const ctx = getAudioContext();

      // Resumir se suspenso
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Tocar oscilador silencioso para "desbloquear"
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.001; // Praticamente silencioso
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.01); // Muito curto

      // Também criar elemento de áudio para uso posterior
      if (!warmedAudio) {
        warmedAudio = createWarmedAudio();
      }

      isWarmed = true;
      console.log('[AudioWarmup] ✅ Áudio aquecido com sucesso! State:', ctx.state);
      return true;
    } catch (err) {
      console.warn('[AudioWarmup] ⚠️ Falha no warmup:', err);
      return false;
    } finally {
      warmupPromise = null;
    }
  })();

  return warmupPromise;
}

/**
 * Aquece o áudio de forma SÍNCRONA usando AudioContext
 * Usa oscilador silencioso que funciona em iOS Safari
 * Esta é a versão que DEVE ser usada no início do click handler
 */
export function warmupAudioSync(): void {
  console.log('[AudioWarmup] 🔥 Warmup síncrono iniciado');

  try {
    const ctx = getAudioContext();

    // Resumir se suspenso (retorna Promise mas chamamos sync)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Tocar oscilador silencioso SINCRONAMENTE
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.001; // Praticamente silencioso
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.01);

    // Também criar elemento de áudio para uso posterior
    if (!warmedAudio) {
      warmedAudio = createWarmedAudio();
    }

    isWarmed = true;
    console.log('[AudioWarmup] ✅ Warmup síncrono completou! State:', ctx.state);
  } catch (err) {
    console.warn('[AudioWarmup] ⚠️ Warmup síncrono falhou:', err);
  }
}

/**
 * Reproduz áudio usando o elemento aquecido
 * Retorna o elemento de áudio para controle externo
 */
export async function playWarmedAudio(audioUrl: string): Promise<HTMLAudioElement> {
  // Garantir que temos um elemento
  if (!warmedAudio) {
    warmedAudio = createWarmedAudio();
  }

  // Configurar nova fonte
  warmedAudio.src = audioUrl;
  warmedAudio.currentTime = 0;

  // Tentar reproduzir
  try {
    await warmedAudio.play();
    console.log('[AudioWarmup] ▶️ Reproduzindo áudio');
  } catch (err) {
    console.error('[AudioWarmup] ❌ Erro ao reproduzir:', err);
    throw err;
  }

  return warmedAudio;
}

/**
 * Configura callbacks no elemento de áudio aquecido
 */
export function setupWarmedAudioCallbacks(callbacks: {
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onLoadedData?: () => void;
  onError?: (error: Event) => void;
}): void {
  if (!warmedAudio) {
    warmedAudio = createWarmedAudio();
  }

  if (callbacks.onPlay) warmedAudio.onplay = callbacks.onPlay;
  if (callbacks.onPause) warmedAudio.onpause = callbacks.onPause;
  if (callbacks.onEnded) warmedAudio.onended = callbacks.onEnded;
  if (callbacks.onLoadedData) warmedAudio.onloadeddata = callbacks.onLoadedData;
  if (callbacks.onError) warmedAudio.onerror = callbacks.onError;
  if (callbacks.onTimeUpdate) {
    warmedAudio.ontimeupdate = () => {
      if (warmedAudio) {
        callbacks.onTimeUpdate!(warmedAudio.currentTime, warmedAudio.duration || 0);
      }
    };
  }
}

/**
 * Obtém o tempo atual e duração do áudio
 */
export function getWarmedAudioProgress(): { currentTime: number; duration: number; progress: number } {
  if (!warmedAudio) {
    return { currentTime: 0, duration: 0, progress: 0 };
  }
  const duration = warmedAudio.duration || 0;
  const currentTime = warmedAudio.currentTime || 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  return { currentTime, duration, progress };
}

/**
 * Obtém o elemento de áudio aquecido (para configurar handlers)
 */
export function getWarmedAudio(): HTMLAudioElement | null {
  return warmedAudio;
}

/**
 * Verifica se o áudio está aquecido
 */
export function isAudioWarmed(): boolean {
  return isWarmed;
}

/**
 * Obtém o AudioContext aquecido para uso externo
 */
export function getWarmedAudioContext(): AudioContext | null {
  return audioContext;
}

/**
 * Para o áudio atual
 */
export function stopWarmedAudio(): void {
  if (warmedAudio) {
    warmedAudio.pause();
    warmedAudio.currentTime = 0;
  }
}

/**
 * Pausa o áudio atual
 */
export function pauseWarmedAudio(): void {
  if (warmedAudio) {
    warmedAudio.pause();
  }
}

/**
 * Continua o áudio pausado
 */
export function resumeWarmedAudio(): void {
  if (warmedAudio) {
    warmedAudio.play().catch(console.warn);
  }
}

/**
 * v2.0.0: Inicializa listeners globais para touchstart/touchend
 * Isso garante que o áudio seja aquecido na primeira interação do usuário
 * Deve ser chamado uma vez quando a app inicia
 */
let globalListenersAdded = false;

export function initGlobalAudioUnlock(): void {
  if (globalListenersAdded) return;

  const unlockHandler = () => {
    if (!isWarmed) {
      console.log('[AudioWarmup] 🔓 Global unlock triggered');
      warmupAudioSync();
    }
  };

  // Adicionar listeners para diferentes tipos de interação
  document.addEventListener('touchstart', unlockHandler, { once: true, passive: true });
  document.addEventListener('touchend', unlockHandler, { once: true, passive: true });
  document.addEventListener('click', unlockHandler, { once: true });

  globalListenersAdded = true;
  console.log('[AudioWarmup] 🎧 Global listeners adicionados');
}
