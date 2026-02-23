/**
 * ============================================================
 * utils/safari-detect.ts
 * ============================================================
 * Versão: 1.0.0 - 2026-01-10
 * Utilitários de detecção de Safari e iOS
 * ============================================================
 */

export interface BrowserInfo {
  isSafari: boolean;
  isIOS: boolean;
  isIPad: boolean;
  isIPhone: boolean;
  isMacOS: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  isAndroid: boolean; // v1.1.0: Detecção explícita de Android
  isMobile: boolean;
  isStandalone: boolean;
  supportsMediaRecorder: boolean;
  supportsWebAudio: boolean;
  supportsServiceWorker: boolean;
  supportsPushNotifications: boolean;
  isPrivateMode: boolean;
  safariVersion: number | null;
  iosVersion: number | null;
  androidVersion: number | null; // v1.1.0: Versão Android
}

let cachedInfo: BrowserInfo | null = null;

export function getBrowserInfo(): BrowserInfo {
  if (cachedInfo) return cachedInfo;
  
  const ua = navigator.userAgent;
  const vendor = navigator.vendor || '';
  
  // Detectar iOS (incluindo iPad com iPadOS 13+)
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Detectar Safari (não Chrome, não Firefox)
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua) ||
    (vendor.includes('Apple') && !ua.includes('CriOS') && !ua.includes('FxiOS'));
  
  // Versão do Safari
  let safariVersion: number | null = null;
  const safariMatch = ua.match(/Version\/(\d+)/);
  if (safariMatch && isSafari) {
    safariVersion = parseInt(safariMatch[1], 10);
  }
  
  // Versão do iOS
  let iosVersion: number | null = null;
  const iosMatch = ua.match(/OS (\d+)/);
  if (iosMatch && isIOS) {
    iosVersion = parseInt(iosMatch[1], 10);
  }

  // v1.1.0: Detectar Android
  const isAndroid = /Android/.test(ua);
  let androidVersion: number | null = null;
  const androidMatch = ua.match(/Android (\d+)/);
  if (androidMatch && isAndroid) {
    androidVersion = parseInt(androidMatch[1], 10);
  }

  // Detectar modo privado
  let isPrivateMode = false;
  try {
    localStorage.setItem('__safari_test__', '1');
    localStorage.removeItem('__safari_test__');
  } catch {
    isPrivateMode = true;
  }
  
  // Detectar PWA instalado
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  
  cachedInfo = {
    isSafari,
    isIOS,
    isIPad: /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    isIPhone: /iPhone/.test(ua),
    isMacOS: /Mac OS X/.test(ua) && !isIOS,
    isChrome: /Chrome/.test(ua) && !/Edg/.test(ua),
    isFirefox: /Firefox/.test(ua),
    isEdge: /Edg/.test(ua),
    isAndroid, // v1.1.0: Android explícito
    isMobile: /Mobile|Android/.test(ua) || isIOS,
    isStandalone,
    supportsMediaRecorder: typeof MediaRecorder !== 'undefined',
    supportsWebAudio: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsPushNotifications: 'PushManager' in window,
    isPrivateMode,
    safariVersion,
    iosVersion,
    androidVersion, // v1.1.0: Versão Android
  };
  
  return cachedInfo;
}

// Shortcuts
export const isSafari = () => getBrowserInfo().isSafari;
export const isIOS = () => getBrowserInfo().isIOS;
export const isIPad = () => getBrowserInfo().isIPad;
export const isAndroid = () => getBrowserInfo().isAndroid; // v1.1.0
export const isPrivateMode = () => getBrowserInfo().isPrivateMode;
export const isStandalone = () => getBrowserInfo().isStandalone;

// Reset cache (útil para testes)
export const resetBrowserInfoCache = () => {
  cachedInfo = null;
};
