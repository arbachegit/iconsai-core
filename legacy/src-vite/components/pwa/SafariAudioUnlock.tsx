/**
 * ============================================================
 * components/pwa/SafariAudioUnlock.tsx
 * ============================================================
 * Versão: 3.0.0 - 2026-01-21
 * Componente invisível que desbloqueia áudio no Safari/iOS
 * FIX: Chama retryPendingPlay após desbloquear para autoplay
 * FIX: Event listeners com referência estável (evita memory leak)
 * FIX: Usa useRef para handler para evitar re-renders
 * ============================================================
 */

import { useEffect, useRef } from 'react';
import { getBrowserInfo } from '@/utils/safari-detect';
import { unlockAudio, isAudioUnlocked } from '@/utils/safari-audio';
import { useAudioManager } from '@/stores/audioManagerStore';

export const SafariAudioUnlock: React.FC = () => {
  const hasRetried = useRef(false);
  const isUnlocked = useRef(false);
  const handlerRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    // Criar handler UMA VEZ e salvar em ref
    const handleUserInteraction = async () => {
      // Se já desbloqueou, não fazer nada
      if (isUnlocked.current) return;

      const { isSafari, isIOS } = getBrowserInfo();

      // Desbloquear áudio
      if (!isAudioUnlocked() && (isSafari || isIOS)) {
        const success = await unlockAudio();
        console.log("[SafariAudioUnlock v3.0] Unlock result:", success);
      }

      // Sempre tentar retry do pendingPlay na primeira interação
      const pendingPlay = useAudioManager.getState().pendingPlay;
      if (pendingPlay && !hasRetried.current) {
        hasRetried.current = true;
        console.log("[SafariAudioUnlock v3.0] 🔄 Retrying pending audio...");
        await useAudioManager.getState().retryPendingPlay();
      }

      // Marcar como desbloqueado e remover listeners
      if (isAudioUnlocked()) {
        isUnlocked.current = true;
        // Remover listeners de forma segura
        if (handlerRef.current) {
          document.removeEventListener('touchstart', handlerRef.current as EventListener);
          document.removeEventListener('touchend', handlerRef.current as EventListener);
          document.removeEventListener('click', handlerRef.current as EventListener);
        }
      }
    };

    // Salvar referência do handler
    handlerRef.current = handleUserInteraction;

    // Adicionar listeners UMA VEZ (dependência vazia)
    document.addEventListener('touchstart', handleUserInteraction as EventListener, { passive: true });
    document.addEventListener('touchend', handleUserInteraction as EventListener, { passive: true });
    document.addEventListener('click', handleUserInteraction as EventListener, { passive: true });

    return () => {
      // Cleanup ao desmontar
      if (handlerRef.current) {
        document.removeEventListener('touchstart', handlerRef.current as EventListener);
        document.removeEventListener('touchend', handlerRef.current as EventListener);
        document.removeEventListener('click', handlerRef.current as EventListener);
      }
    };
  }, []); // DEPENDÊNCIA VAZIA - executar UMA ÚNICA VEZ

  // Monitorar mudanças no pendingPlay para resetar o hasRetried
  useEffect(() => {
    const unsubscribe = useAudioManager.subscribe(
      (state) => state.pendingPlay,
      (pendingPlay) => {
        if (pendingPlay) {
          // Novo pending, resetar flag para permitir retry
          hasRetried.current = false;
        }
      }
    );

    return unsubscribe;
  }, []);

  // Não renderiza nada
  return null;
};

export default SafariAudioUnlock;
