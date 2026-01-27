/**
 * useDeviceFingerprint - Hook para gerar fingerprint do dispositivo
 *
 * v2.0.0 - Simplificado
 */

import { useState, useEffect } from "react";

function generateFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.maxTouchPoints || 0,
  ];

  // Simple hash function
  const str = components.join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
}

export function useDeviceFingerprint(userId?: string) {
  const [fingerprint, setFingerprint] = useState<string>("");

  useEffect(() => {
    const fp = generateFingerprint();
    const finalFp = userId ? `${fp}-${userId.substring(0, 8)}` : fp;
    setFingerprint(finalFp);
  }, [userId]);

  return { fingerprint };
}

export default useDeviceFingerprint;
