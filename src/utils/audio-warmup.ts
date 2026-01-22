/**
 * ============================================================
 * audio-warmup.ts - Sistema de áudio pré-aquecido para mobile
 * ============================================================
 * Versão: 1.0.0 - 2026-01-22
 *
 * O problema: Mobile browsers bloqueiam audio.play() se não for
 * chamado DIRETAMENTE em resposta a um user gesture (touch/click).
 * Chamadas async (API calls) quebram esse contexto.
 *
 * A solução: Manter um Audio element "quente" que já teve play()
 * chamado no contexto de um user gesture. Reutilizar esse elemento
 * para todas as reproduções.
 * ============================================================
 */

// Áudio silencioso em base64 (1 segundo de silêncio MP3)
const SILENT_AUDIO = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAgAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAbD/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//M4xAANCAJQIUAAABBDf/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8=';

// Estado global
let warmedAudio: HTMLAudioElement | null = null;
let isWarmed = false;
let warmupPromise: Promise<boolean> | null = null;

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
 * Aquece o áudio - DEVE ser chamado em resposta a user gesture
 * Retorna true se conseguiu aquecer, false caso contrário
 */
export async function warmupAudio(): Promise<boolean> {
  // Se já está aquecido, retornar true
  if (isWarmed && warmedAudio) {
    console.log('[AudioWarmup] Já aquecido');
    return true;
  }

  // Se já tem um warmup em andamento, esperar
  if (warmupPromise) {
    return warmupPromise;
  }

  warmupPromise = (async () => {
    try {
      console.log('[AudioWarmup] Iniciando warmup...');

      // Criar elemento se não existir
      if (!warmedAudio) {
        warmedAudio = createWarmedAudio();
      }

      // Configurar áudio silencioso
      warmedAudio.src = SILENT_AUDIO;

      // Tentar reproduzir
      await warmedAudio.play();

      // Parar imediatamente (não queremos ouvir nada)
      warmedAudio.pause();
      warmedAudio.currentTime = 0;

      isWarmed = true;
      console.log('[AudioWarmup] ✅ Áudio aquecido com sucesso!');
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
 * Aquece o áudio de forma SÍNCRONA - chama play() imediatamente
 * O play() retorna Promise mas é chamado sincronamente no contexto do gesture
 * Esta é a versão que DEVE ser usada no início do click handler
 */
export function warmupAudioSync(): void {
  console.log('[AudioWarmup] 🔥 Warmup síncrono iniciado');

  // Criar elemento se não existir
  if (!warmedAudio) {
    warmedAudio = createWarmedAudio();
  }

  // Configurar áudio silencioso
  warmedAudio.src = SILENT_AUDIO;

  // CRÍTICO: Chamar play() SINCRONAMENTE - o retorno é Promise mas
  // o navegador registra a chamada como parte do user gesture
  warmedAudio.play()
    .then(() => {
      warmedAudio?.pause();
      if (warmedAudio) warmedAudio.currentTime = 0;
      isWarmed = true;
      console.log('[AudioWarmup] ✅ Warmup síncrono completou');
    })
    .catch((err) => {
      console.warn('[AudioWarmup] ⚠️ Warmup síncrono falhou:', err);
    });
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
