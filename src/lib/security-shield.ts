/**
 * SECURITY SHIELD - KnowYOU v2
 * Sistema de Tolerância Zero para tentativas de inspeção de código
 * 
 * ⚠️ IMPORTANTE: Este módulo é DESATIVADO em ambiente de desenvolvimento
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================
// WHITELIST DE DOMÍNIOS (Desenvolvimento/Preview)
// ============================================
const WHITELISTED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'lovable.app',
  'lovableproject.com',
  'gptengineer.run',
  'webcontainer.io',
];

/**
 * Verifica se o domínio atual está na whitelist
 */
function isWhitelistedDomain(): boolean {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname;
  return WHITELISTED_DOMAINS.some(domain => hostname.includes(domain));
}

// Configuration
const IS_DEVELOPMENT = isWhitelistedDomain();
const IS_PRODUCTION = !IS_DEVELOPMENT;

const MONITORING_INTERVAL = 500; // ms
const CONSOLE_CLEAR_INTERVAL = 1000; // ms

type ViolationType = 
  | 'devtools_open'
  | 'keyboard_shortcut'
  | 'right_click'
  | 'debugger'
  | 'react_devtools'
  | 'iframe_attempt'
  | 'text_selection'
  | 'console_access';

interface BanStatus {
  isBanned: boolean;
  reason?: string;
  bannedAt?: string;
  violationType?: string;
  deviceId?: string;
}

let isBanned = false;
let deviceFingerprint: string | null = null;
let monitoringInterval: ReturnType<typeof setInterval> | null = null;
let consoleInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Generate a unique device fingerprint
 */
function generateFingerprint(): string {
  if (deviceFingerprint) return deviceFingerprint;

  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    // @ts-ignore
    navigator.deviceMemory || 'unknown',
  ];

  const fingerprint = components.join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  deviceFingerprint = Math.abs(hash).toString(36) + Date.now().toString(36);
  
  // Cache fingerprint
  try {
    localStorage.setItem('_dfp', deviceFingerprint);
  } catch {
    // Ignore storage errors
  }
  
  return deviceFingerprint;
}

/**
 * Get cached fingerprint or generate new one
 */
function getFingerprint(): string {
  if (deviceFingerprint) return deviceFingerprint;
  
  try {
    const cached = localStorage.getItem('_dfp');
    if (cached) {
      deviceFingerprint = cached;
      return cached;
    }
  } catch {
    // Ignore storage errors
  }
  
  return generateFingerprint();
}

/**
 * Report a security violation to the backend
 */
async function reportViolation(
  type: ViolationType, 
  details: Record<string, unknown> = {}
): Promise<void> {
  if (isBanned) return; // Already banned, don't send again
  
  isBanned = true;
  
  const fingerprint = getFingerprint();
  
  // Get current user info if available
  let userEmail: string | undefined;
  let userId: string | undefined;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userEmail = user.email;
      userId = user.id;
    }
  } catch {
    // Ignore auth errors
  }
  
  console.warn(`🛡️ Security Shield: Violation detected - ${type}`);
  
  try {
    await supabase.functions.invoke('report-security-violation', {
      body: {
        violationType: type,
        deviceFingerprint: fingerprint,
        userAgent: navigator.userAgent,
        userEmail,
        userId,
        severity: 'critical',
        violationDetails: details,
      },
    });
  } catch (error) {
    console.error('Failed to report violation:', error);
  }
  
  // Show ban screen
  showBanScreen(type, fingerprint);
}

/**
 * Display the ban screen
 */
function showBanScreen(reason: string, deviceId: string): void {
  // Dispatch event for React to handle
  window.dispatchEvent(new CustomEvent('security-banned', {
    detail: { reason, deviceId }
  }));
  
  // Also create a blocking overlay as fallback
  const overlay = document.createElement('div');
  overlay.id = 'security-ban-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #1a0000 0%, #3d0000 50%, #1a0000 100%);
    z-index: 999999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: system-ui, -apple-system, sans-serif;
    color: white;
    text-align: center;
    padding: 20px;
  `;
  
  overlay.innerHTML = `
    <div style="font-size: 80px; margin-bottom: 20px;">🚫</div>
    <h1 style="font-size: 32px; margin-bottom: 16px; color: #ff4444;">ACESSO BLOQUEADO</h1>
    <p style="font-size: 18px; color: #ff8888; margin-bottom: 24px;">
      Tentativa de inspeção de código detectada.
    </p>
    <div style="background: rgba(255,255,255,0.1); padding: 16px 24px; border-radius: 8px; margin-bottom: 24px;">
      <p style="font-size: 14px; color: #888; margin-bottom: 8px;">Motivo: ${reason}</p>
      <p style="font-size: 12px; color: #666;">ID do Dispositivo: ${deviceId.substring(0, 16)}</p>
    </div>
    <p style="font-size: 14px; color: #666; max-width: 400px;">
      Este dispositivo foi permanentemente banido.<br>
      Apenas um Super Administrador pode reverter esta ação.
    </p>
  `;
  
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
}

/**
 * Check if DevTools are open using multiple methods
 */
function detectDevTools(): boolean {
  // Method 1: Window size detection
  const widthThreshold = 160;
  const heightThreshold = 160;
  const devtoolsOpen = 
    window.outerWidth - window.innerWidth > widthThreshold ||
    window.outerHeight - window.innerHeight > heightThreshold;
    
  if (devtoolsOpen) return true;
  
  // Method 2: Performance timing (debugger statement detection)
  // Note: This is done separately via debugger trap
  
  return false;
}

/**
 * Keyboard shortcut handler
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (!IS_PRODUCTION) return;
  
  const key = event.key.toLowerCase();
  const ctrl = event.ctrlKey || event.metaKey;
  const shift = event.shiftKey;
  
  // Block F12
  if (event.key === 'F12') {
    event.preventDefault();
    event.stopPropagation();
    reportViolation('keyboard_shortcut', { key: 'F12' });
    return;
  }
  
  // Block Ctrl+Shift+I (DevTools)
  if (ctrl && shift && key === 'i') {
    event.preventDefault();
    event.stopPropagation();
    reportViolation('keyboard_shortcut', { key: 'Ctrl+Shift+I' });
    return;
  }
  
  // Block Ctrl+Shift+J (Console)
  if (ctrl && shift && key === 'j') {
    event.preventDefault();
    event.stopPropagation();
    reportViolation('keyboard_shortcut', { key: 'Ctrl+Shift+J' });
    return;
  }
  
  // Block Ctrl+Shift+C (Inspect)
  if (ctrl && shift && key === 'c') {
    event.preventDefault();
    event.stopPropagation();
    reportViolation('keyboard_shortcut', { key: 'Ctrl+Shift+C' });
    return;
  }
  
  // Block Ctrl+U (View Source)
  if (ctrl && key === 'u') {
    event.preventDefault();
    event.stopPropagation();
    reportViolation('keyboard_shortcut', { key: 'Ctrl+U' });
    return;
  }
}

/**
 * Context menu handler (right-click)
 */
function handleContextMenu(event: MouseEvent): void {
  if (!IS_PRODUCTION) return;
  
  event.preventDefault();
  event.stopPropagation();
  reportViolation('right_click', { x: event.clientX, y: event.clientY });
}

/**
 * Check for React DevTools
 */
function detectReactDevTools(): boolean {
  // @ts-ignore
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    // @ts-ignore
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook.isDisabled !== true && hook.supportsFiber) {
      return true;
    }
  }
  return false;
}

/**
 * Check if running inside an iframe
 * IMPORTANTE: Desativado em ambiente de desenvolvimento/preview
 */
function detectIframe(): boolean {
  // Whitelist: não bloquear em ambiente de desenvolvimento
  if (!IS_PRODUCTION) return false;
  
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Continuous monitoring function
 */
function startMonitoring(): void {
  if (!IS_PRODUCTION) {
    console.log('🛡️ Security Shield: DISABLED (development mode)');
    return;
  }
  
  console.log('🛡️ Security Shield: ACTIVE (production mode)');
  
  // Monitor for DevTools
  monitoringInterval = setInterval(() => {
    if (isBanned) {
      if (monitoringInterval) clearInterval(monitoringInterval);
      return;
    }
    
    if (detectDevTools()) {
      reportViolation('devtools_open', { method: 'size_detection' });
    }
    
    if (detectReactDevTools()) {
      reportViolation('react_devtools', { method: 'hook_detection' });
    }
  }, MONITORING_INTERVAL);
  
  // Clear console periodically
  consoleInterval = setInterval(() => {
    if (IS_PRODUCTION && !isBanned) {
      console.clear();
      console.log('%c⛔ ACESSO RESTRITO', 'color: red; font-size: 24px; font-weight: bold;');
      console.log('%cQualquer tentativa de inspeção resultará em banimento permanente.', 'color: orange;');
    }
  }, CONSOLE_CLEAR_INTERVAL);
}

/**
 * Check ban status on load
 */
export async function checkBanStatus(): Promise<BanStatus> {
  const fingerprint = getFingerprint();
  
  try {
    const { data, error } = await supabase.functions.invoke('check-ban-status', {
      body: { deviceFingerprint: fingerprint },
    });
    
    if (error) {
      console.error('Error checking ban status:', error);
      return { isBanned: false };
    }
    
    if (data?.isBanned) {
      isBanned = true;
      return data as BanStatus;
    }
    
    return { isBanned: false };
  } catch (error) {
    console.error('Failed to check ban status:', error);
    return { isBanned: false };
  }
}

/**
 * Initialize the security shield
 */
export function initSecurityShield(): () => void {
  // Check for iframe
  if (detectIframe()) {
    if (IS_PRODUCTION) {
      reportViolation('iframe_attempt', { detected: 'on_load' });
    }
    return () => {};
  }
  
  // Add event listeners
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('contextmenu', handleContextMenu, true);
  
  // Disable text selection in production
  if (IS_PRODUCTION) {
    document.addEventListener('selectstart', (e) => e.preventDefault(), true);
    document.addEventListener('dragstart', (e) => e.preventDefault(), true);
  }
  
  // Start monitoring
  startMonitoring();
  
  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('contextmenu', handleContextMenu, true);
    if (monitoringInterval) clearInterval(monitoringInterval);
    if (consoleInterval) clearInterval(consoleInterval);
  };
}

/**
 * Get the current device fingerprint
 */
export function getDeviceFingerprint(): string {
  return getFingerprint();
}

/**
 * Check if currently banned
 */
export function isCurrentlyBanned(): boolean {
  return isBanned;
}
