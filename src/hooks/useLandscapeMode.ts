import { useEffect, useState } from 'react';

interface OrientationLockResult {
  isLandscape: boolean;
  lockSupported: boolean;
  showRotateMessage: boolean;
}

export function useLandscapeMode(enabled: boolean): OrientationLockResult {
  const [isLandscape, setIsLandscape] = useState(false);
  const [lockSupported, setLockSupported] = useState(true);
  const [showRotateMessage, setShowRotateMessage] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setShowRotateMessage(false);
      return;
    }

    const checkOrientation = () => {
      const landscape = window.matchMedia('(orientation: landscape)').matches;
      setIsLandscape(landscape);
      setShowRotateMessage(!landscape && !lockSupported);
    };

    const lockLandscape = async () => {
      try {
        // Check if orientation lock is supported
        if (screen.orientation && 'lock' in screen.orientation) {
          await (screen.orientation as any).lock('landscape');
          setLockSupported(true);
          setIsLandscape(true);
          setShowRotateMessage(false);
        } else {
          setLockSupported(false);
          checkOrientation();
        }
      } catch (err) {
        console.log('Landscape lock not supported:', err);
        setLockSupported(false);
        checkOrientation();
      }
    };

    lockLandscape();

    // Listen for orientation changes
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsLandscape(e.matches);
      if (e.matches) {
        setShowRotateMessage(false);
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    // Cleanup: unlock orientation when leaving
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      if (screen.orientation && 'unlock' in screen.orientation) {
        try {
          (screen.orientation as any).unlock();
        } catch {
          // Ignore unlock errors
        }
      }
    };
  }, [enabled, lockSupported]);

  return { isLandscape, lockSupported, showRotateMessage };
}
