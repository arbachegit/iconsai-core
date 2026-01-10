/**
 * ============================================================
 * components/pwa/SafariAudioUnlock.tsx
 * ============================================================
 * Versão: 1.0.0 - 2026-01-10
 * Componente invisível que desbloqueia áudio no Safari
 * ============================================================
 */

import { useEffect, useCallback } from 'react';
import { getBrowserInfo } from '@/utils/safari-detect';
import { unlockAudio, isAudioUnlocked } from '@/utils/safari-audio';

export const SafariAudioUnlock: React.FC = () => {
  const handleUserInteraction = useCallback(async () => {
    if (isAudioUnlocked()) return;
    
    const { isSafari, isIOS } = getBrowserInfo();
    if (!isSafari && !isIOS) return;
    
    const success = await unlockAudio();
    
    if (success) {
      // Remover listeners após sucesso
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('touchend', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    }
  }, []);

  useEffect(() => {
    const { isSafari, isIOS } = getBrowserInfo();
    
    if (!isSafari && !isIOS) return;
    if (isAudioUnlocked()) return;
    
    // Adicionar listeners para user gesture
    document.addEventListener('touchstart', handleUserInteraction, { passive: true });
    document.addEventListener('touchend', handleUserInteraction, { passive: true });
    document.addEventListener('click', handleUserInteraction, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('touchend', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [handleUserInteraction]);

  // Não renderiza nada
  return null;
};

export default SafariAudioUnlock;
