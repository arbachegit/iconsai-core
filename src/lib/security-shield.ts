/**
 * SECURITY SHIELD - KnowYOU v4
 * Sistema de Tolerância Zero para tentativas de inspeção de código
 * 
 * v4 Features:
 * - Configurações carregadas do banco de dados
 * - Sistema de tentativas progressivas com pop-ups de aviso
 * - Todas as detecções obedecem às configurações
 * - Tela de banimento com duração configurável
 * 
 * ⚠️ IMPORTANTE: Este módulo é DESATIVADO em ambiente de desenvolvimento
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================
// TIPOS E INTERFACES
// ============================================
interface SecurityShieldConfig {
  id: string;
  shield_enabled: boolean;
  devtools_detection_enabled: boolean;
  keyboard_shortcuts_block_enabled: boolean;
  right_click_block_enabled: boolean;
  text_selection_block_enabled: boolean;
  console_clear_enabled: boolean;
  console_clear_interval_ms: number;
  monitoring_interval_ms: number;
  max_violation_attempts: number;
  show_violation_popup: boolean;
  auto_ban_on_violation: boolean;
  ban_duration_hours: number;
  react_devtools_detection_enabled: boolean;
  iframe_detection_enabled: boolean;
  whitelisted_domains: string[];
}

type ViolationType = 
  | 'devtools_open'
  | 'keyboard_shortcut'
  | 'right_click'
  | 'debugger'
  | 'react_devtools'
  | 'iframe_attempt'
  | 'text_selection'
  | 'console_access'
  | 'screenshot_attempt';

interface BanStatus {
  isBanned: boolean;
  reason?: string;
  bannedAt?: string;
  violationType?: string;
  deviceId?: string;
}

interface DeviceData {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  screenResolution: string;
  canvasFingerprint: string;
  webglFingerprint: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  timezone: string;
  language: string;
  platform: string;
}

// ============================================
// ESTADO GLOBAL
// ============================================
let isBanned = false;
let deviceFingerprint: string | null = null;
let deviceData: DeviceData | null = null;
let monitoringInterval: ReturnType<typeof setInterval> | null = null;
let consoleInterval: ReturnType<typeof setInterval> | null = null;
let shieldConfig: SecurityShieldConfig | null = null;
let violationCount = 0;
let configLoaded = false;

// ============================================
// WHITELIST DE DOMÍNIOS PADRÃO
// ============================================
const DEFAULT_WHITELISTED_DOMAINS = [
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
  const domains = shieldConfig?.whitelisted_domains || DEFAULT_WHITELISTED_DOMAINS;
  return domains.some(domain => hostname.includes(domain));
}

// Configuration flags
function isProduction(): boolean {
  return !isWhitelistedDomain();
}

// ============================================
// CARREGAR CONFIGURAÇÕES DO BANCO
// ============================================
async function fetchSecurityConfig(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('security_shield_config')
      .select('*')
      .limit(1)
      .single();
    
    if (error) {
      console.warn('🛡️ Security Shield v4: Erro ao carregar config, usando padrões', error);
      return;
    }
    
    if (data) {
      shieldConfig = data as SecurityShieldConfig;
      configLoaded = true;
      console.log('🛡️ Security Shield v4: Configurações carregadas do banco');
    }
  } catch (error) {
    console.warn('🛡️ Security Shield v4: Falha ao carregar config', error);
  }
}

// ============================================
// CANVAS FINGERPRINTING
// ============================================
function generateCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';
    
    canvas.width = 200;
    canvas.height = 50;
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(10, 0, 100, 30);
    
    ctx.fillStyle = '#069';
    ctx.fillText('KnowYOU Security v4', 10, 20);
    
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Canvas FP Test', 15, 35);
    
    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      const char = dataUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  } catch {
    return 'error';
  }
}

// ============================================
// WEBGL FINGERPRINTING
// ============================================
function generateWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) return 'no-webgl';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'no-debug-info';
    
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
    
    const combined = `${vendor}|${renderer}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  } catch {
    return 'error';
  }
}

// ============================================
// BROWSER/OS DETECTION
// ============================================
function detectBrowser(): { name: string; version: string } {
  const ua = navigator.userAgent;
  
  let name = 'Unknown';
  let version = '0';
  
  if (ua.includes('Firefox/')) {
    name = 'Firefox';
    version = ua.split('Firefox/')[1]?.split(' ')[0] || '0';
  } else if (ua.includes('Edg/')) {
    name = 'Edge';
    version = ua.split('Edg/')[1]?.split(' ')[0] || '0';
  } else if (ua.includes('Chrome/')) {
    name = 'Chrome';
    version = ua.split('Chrome/')[1]?.split(' ')[0] || '0';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    name = 'Safari';
    version = ua.split('Version/')[1]?.split(' ')[0] || '0';
  } else if (ua.includes('Opera') || ua.includes('OPR/')) {
    name = 'Opera';
    version = ua.split('OPR/')[1]?.split(' ')[0] || '0';
  }
  
  return { name, version };
}

function detectOS(): { name: string; version: string } {
  const ua = navigator.userAgent;
  
  let name = 'Unknown';
  let version = '0';
  
  if (ua.includes('Windows NT')) {
    name = 'Windows';
    const match = ua.match(/Windows NT (\d+\.?\d*)/);
    if (match) {
      const ntVersion = match[1];
      const versions: Record<string, string> = {
        '10.0': '10/11',
        '6.3': '8.1',
        '6.2': '8',
        '6.1': '7',
      };
      version = versions[ntVersion] || ntVersion;
    }
  } else if (ua.includes('Mac OS X')) {
    name = 'macOS';
    const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    version = match ? match[1].replace(/_/g, '.') : '0';
  } else if (ua.includes('Linux')) {
    name = 'Linux';
    if (ua.includes('Android')) {
      name = 'Android';
      const match = ua.match(/Android (\d+\.?\d*)/);
      version = match ? match[1] : '0';
    }
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    name = 'iOS';
    const match = ua.match(/OS (\d+[._]\d+[._]?\d*)/);
    version = match ? match[1].replace(/_/g, '.') : '0';
  }
  
  return { name, version };
}

// ============================================
// COLLECT DEVICE DATA
// ============================================
function collectDeviceData(): DeviceData {
  if (deviceData) return deviceData;
  
  const browser = detectBrowser();
  const os = detectOS();
  
  deviceData = {
    browserName: browser.name,
    browserVersion: browser.version,
    osName: os.name,
    osVersion: os.version,
    screenResolution: `${screen.width}x${screen.height}`,
    canvasFingerprint: generateCanvasFingerprint(),
    webglFingerprint: generateWebGLFingerprint(),
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    // @ts-ignore
    deviceMemory: navigator.deviceMemory || 0,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
  };
  
  return deviceData;
}

/**
 * Generate a unique device fingerprint (v4)
 */
function generateFingerprint(): string {
  if (deviceFingerprint) return deviceFingerprint;
  
  const data = collectDeviceData();
  
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    data.timezone,
    data.screenResolution,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    data.hardwareConcurrency,
    data.deviceMemory,
    data.canvasFingerprint,
    data.webglFingerprint,
  ];

  const fingerprint = components.join('|');
  
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  deviceFingerprint = Math.abs(hash).toString(36) + Date.now().toString(36);
  
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

// ============================================
// POP-UP DE AVISO (WARNING POPUP)
// ============================================
function showWarningPopup(remainingAttempts: number, banHours: number): void {
  // Remover popup anterior se existir
  const existingPopup = document.getElementById('security-warning-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'security-warning-popup';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    z-index: 999998;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: system-ui, -apple-system, sans-serif;
    color: white;
    text-align: center;
    padding: 20px;
    animation: fadeIn 0.3s ease-out;
  `;
  
  const pluralText = remainingAttempts === 1 ? 'vez' : 'vezes';
  
  overlay.innerHTML = `
    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      #security-warning-popup .warning-icon {
        animation: pulse 1s ease-in-out infinite;
      }
    </style>
    <div class="warning-icon" style="font-size: 80px; margin-bottom: 20px;">⚠️</div>
    <h1 style="font-size: 28px; margin-bottom: 16px; color: #ffcc00;">AVISO DE SEGURANÇA</h1>
    <p style="font-size: 18px; color: #fff; margin-bottom: 24px; max-width: 500px; line-height: 1.6;">
      Tentativa de violação de segurança detectada!
    </p>
    <div style="background: rgba(255, 204, 0, 0.15); border: 2px solid #ffcc00; padding: 20px 32px; border-radius: 12px; margin-bottom: 24px;">
      <p style="font-size: 20px; color: #ffcc00; font-weight: bold; margin: 0;">
        Se você tentar violar as regras de segurança mais ${remainingAttempts} ${pluralText}, será banido por ${banHours} horas.
      </p>
    </div>
    <button 
      id="warning-understand-btn"
      style="
        background: linear-gradient(135deg, #ffcc00 0%, #ff9900 100%);
        color: black;
        border: none;
        padding: 14px 40px;
        font-size: 16px;
        font-weight: bold;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(255, 204, 0, 0.4);
      "
      onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(255, 204, 0, 0.6)';"
      onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 15px rgba(255, 204, 0, 0.4)';"
    >
      Entendi
    </button>
    <p style="font-size: 12px; color: #888; margin-top: 24px;">
      Sistema de Segurança KnowYOU v4
    </p>
  `;
  
  document.body.appendChild(overlay);
  
  // Auto-dismiss ou clique
  const dismissPopup = () => {
    overlay.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => overlay.remove(), 250);
  };
  
  const btn = document.getElementById('warning-understand-btn');
  if (btn) {
    btn.addEventListener('click', dismissPopup);
  }
  
  // Auto-dismiss após 10 segundos
  setTimeout(dismissPopup, 10000);
}

// ============================================
// TELA DE BANIMENTO ATUALIZADA
// ============================================
function showBanScreen(reason: string, deviceId: string, hours?: number): void {
  const banHours = hours || shieldConfig?.ban_duration_hours || 72;
  
  // Dispatch event for React to handle
  window.dispatchEvent(new CustomEvent('security-banned', {
    detail: { reason, deviceId, hours: banHours }
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
    <h1 style="font-size: 36px; margin-bottom: 16px; color: #ff4444;">VOCÊ ESTÁ BANIDO</h1>
    <p style="font-size: 24px; color: #ff8888; margin-bottom: 24px; font-weight: bold;">
      Você está banido por ${banHours} horas.
    </p>
    <div style="background: rgba(255,255,255,0.1); padding: 16px 24px; border-radius: 8px; margin-bottom: 24px;">
      <p style="font-size: 14px; color: #888; margin-bottom: 8px;">Motivo: ${reason}</p>
      <p style="font-size: 12px; color: #666;">ID do Dispositivo: ${deviceId.substring(0, 16)}</p>
      <p style="font-size: 12px; color: #666; margin-top: 8px;">Data: ${new Date().toLocaleString('pt-BR')}</p>
    </div>
    <p style="font-size: 14px; color: #666; max-width: 400px;">
      Este dispositivo foi banido temporariamente.<br>
      Apenas um Super Administrador pode reverter esta ação.
    </p>
    <p style="font-size: 12px; color: #444; margin-top: 24px;">
      Sistema de Segurança KnowYOU v4
    </p>
  `;
  
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
}

// ============================================
// HANDLER DE VIOLAÇÃO COM TENTATIVAS PROGRESSIVAS
// ============================================
function handleViolation(type: ViolationType, details: Record<string, unknown> = {}): void {
  // Verificar se o shield está habilitado
  if (!shieldConfig?.shield_enabled) {
    console.log(`🛡️ Security Shield v4: Shield desabilitado, ignorando violação ${type}`);
    return;
  }
  
  if (isBanned) return; // Já banido
  
  violationCount++;
  
  const maxAttempts = shieldConfig.max_violation_attempts || 3;
  const remainingAttempts = maxAttempts - violationCount;
  const banHours = shieldConfig.ban_duration_hours || 72;
  
  console.warn(`🛡️ Security Shield v4: Violação detectada - ${type} (${violationCount}/${maxAttempts})`);
  
  if (violationCount >= maxAttempts) {
    // Banir definitivamente
    if (shieldConfig.auto_ban_on_violation) {
      reportViolation(type, details);
    }
  } else if (shieldConfig.show_violation_popup) {
    // Mostrar pop-up de aviso
    showWarningPopup(remainingAttempts, banHours);
  }
}

/**
 * Report a security violation to the backend (v4)
 */
async function reportViolation(
  type: ViolationType, 
  details: Record<string, unknown> = {}
): Promise<void> {
  if (isBanned) return; // Already banned, don't send again
  
  isBanned = true;
  
  const fingerprint = getFingerprint();
  const data = collectDeviceData();
  const banHours = shieldConfig?.ban_duration_hours || 72;
  
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
  
  console.warn(`🛡️ Security Shield v4: Banimento aplicado - ${type}`);
  
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
        pageUrl: window.location.href,
        banDurationHours: banHours,
        deviceData: {
          browserName: data.browserName,
          browserVersion: data.browserVersion,
          osName: data.osName,
          osVersion: data.osVersion,
          screenResolution: data.screenResolution,
          canvasFingerprint: data.canvasFingerprint,
          webglFingerprint: data.webglFingerprint,
          hardwareConcurrency: data.hardwareConcurrency,
          deviceMemory: data.deviceMemory,
          timezone: data.timezone,
          language: data.language,
          platform: data.platform,
        },
      },
    });
  } catch (error) {
    console.error('Failed to report violation:', error);
  }
  
  // Show ban screen with correct duration
  showBanScreen(type, fingerprint, banHours);
}

/**
 * Check if DevTools are open using multiple methods
 */
function detectDevTools(): boolean {
  // Verificar se a detecção está habilitada
  if (!shieldConfig?.devtools_detection_enabled) return false;
  
  const widthThreshold = 160;
  const heightThreshold = 160;
  const devtoolsOpen = 
    window.outerWidth - window.innerWidth > widthThreshold ||
    window.outerHeight - window.innerHeight > heightThreshold;
    
  return devtoolsOpen;
}

/**
 * Keyboard shortcut handler - OBEDECE CONFIGURAÇÃO
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (!isProduction()) return;
  
  // Verificar se atalhos de teclado estão bloqueados
  if (!shieldConfig?.keyboard_shortcuts_block_enabled) return;
  
  const key = event.key.toLowerCase();
  const ctrl = event.ctrlKey || event.metaKey;
  const shift = event.shiftKey;
  
  // Block F12
  if (event.key === 'F12') {
    event.preventDefault();
    event.stopPropagation();
    handleViolation('keyboard_shortcut', { key: 'F12' });
    return;
  }
  
  // Block Ctrl+Shift+I (DevTools)
  if (ctrl && shift && key === 'i') {
    event.preventDefault();
    event.stopPropagation();
    handleViolation('keyboard_shortcut', { key: 'Ctrl+Shift+I' });
    return;
  }
  
  // Block Ctrl+Shift+J (Console)
  if (ctrl && shift && key === 'j') {
    event.preventDefault();
    event.stopPropagation();
    handleViolation('keyboard_shortcut', { key: 'Ctrl+Shift+J' });
    return;
  }
  
  // Block Ctrl+Shift+C (Inspect)
  if (ctrl && shift && key === 'c') {
    event.preventDefault();
    event.stopPropagation();
    handleViolation('keyboard_shortcut', { key: 'Ctrl+Shift+C' });
    return;
  }
  
  // Block Ctrl+U (View Source)
  if (ctrl && key === 'u') {
    event.preventDefault();
    event.stopPropagation();
    handleViolation('keyboard_shortcut', { key: 'Ctrl+U' });
    return;
  }
  
  // Block PrintScreen (screenshot)
  if (event.key === 'PrintScreen') {
    event.preventDefault();
    event.stopPropagation();
    showBlackScreen();
    handleViolation('screenshot_attempt', { key: 'PrintScreen' });
    return;
  }
}

/**
 * Context menu handler (right-click) - OBEDECE CONFIGURAÇÃO
 */
function handleContextMenu(event: MouseEvent): void {
  if (!isProduction()) return;
  
  // ✅ VERIFICAR CONFIG ANTES DE AGIR
  if (!shieldConfig?.right_click_block_enabled) {
    return; // Não fazer nada se desabilitado
  }
  
  event.preventDefault();
  event.stopPropagation();
  handleViolation('right_click', { x: event.clientX, y: event.clientY });
}

/**
 * Text selection handler - OBEDECE CONFIGURAÇÃO
 */
function handleSelectStart(event: Event): void {
  if (!isProduction()) return;
  
  if (!shieldConfig?.text_selection_block_enabled) {
    return; // Permitir seleção se desabilitado
  }
  
  event.preventDefault();
}

/**
 * Check for React DevTools - OBEDECE CONFIGURAÇÃO
 */
function detectReactDevTools(): boolean {
  if (!shieldConfig?.react_devtools_detection_enabled) return false;
  
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
 * Check if running inside an iframe - OBEDECE CONFIGURAÇÃO
 */
function detectIframe(): boolean {
  if (!isProduction()) return false;
  if (!shieldConfig?.iframe_detection_enabled) return false;
  
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Mostrar tela preta temporária (proteção de screenshot)
 */
function showBlackScreen(): void {
  const blackScreen = document.createElement('div');
  blackScreen.id = 'security-black-screen';
  blackScreen.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: black;
    z-index: 999997;
  `;
  
  document.body.appendChild(blackScreen);
  
  // Remover após 500ms
  setTimeout(() => {
    blackScreen.remove();
  }, 500);
}

/**
 * Continuous monitoring function - OBEDECE CONFIGURAÇÕES
 */
function startMonitoring(): void {
  if (!isProduction()) {
    console.log('🛡️ Security Shield v4: DISABLED (development mode)');
    return;
  }
  
  if (!shieldConfig?.shield_enabled) {
    console.log('🛡️ Security Shield v4: DISABLED (shield_enabled = false)');
    return;
  }
  
  console.log('🛡️ Security Shield v4: ACTIVE (production mode)');
  
  const monitoringMs = shieldConfig.monitoring_interval_ms || 500;
  const consoleClearMs = shieldConfig.console_clear_interval_ms || 1000;
  
  // Monitor for DevTools
  monitoringInterval = setInterval(() => {
    if (isBanned) {
      if (monitoringInterval) clearInterval(monitoringInterval);
      return;
    }
    
    if (detectDevTools()) {
      handleViolation('devtools_open', { method: 'size_detection' });
    }
    
    if (detectReactDevTools()) {
      handleViolation('react_devtools', { method: 'hook_detection' });
    }
  }, monitoringMs);
  
  // Clear console periodically - OBEDECE CONFIGURAÇÃO
  if (shieldConfig.console_clear_enabled) {
    consoleInterval = setInterval(() => {
      if (isProduction() && !isBanned) {
        console.clear();
        console.log('%c⛔ ACESSO RESTRITO', 'color: red; font-size: 24px; font-weight: bold;');
        console.log('%cSistema de Segurança KnowYOU v4', 'color: orange;');
        console.log('%cQualquer tentativa de inspeção resultará em banimento.', 'color: orange;');
      }
    }, consoleClearMs);
  }
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
 * Initialize the security shield - CARREGA CONFIG PRIMEIRO
 */
export async function initSecurityShield(): Promise<() => void> {
  // ✅ CARREGAR CONFIGURAÇÕES DO BANCO PRIMEIRO
  await fetchSecurityConfig();
  
  // Check for iframe
  if (detectIframe()) {
    if (isProduction() && shieldConfig?.iframe_detection_enabled) {
      handleViolation('iframe_attempt', { detected: 'on_load' });
    }
    return () => {};
  }
  
  // Add event listeners
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('contextmenu', handleContextMenu, true);
  
  // Disable text selection based on config
  if (isProduction() && shieldConfig?.text_selection_block_enabled) {
    document.addEventListener('selectstart', handleSelectStart, true);
    document.addEventListener('dragstart', (e) => e.preventDefault(), true);
  }
  
  // Start monitoring
  startMonitoring();
  
  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('contextmenu', handleContextMenu, true);
    document.removeEventListener('selectstart', handleSelectStart, true);
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

/**
 * Get collected device data (v4)
 */
export function getCollectedDeviceData(): DeviceData | null {
  return deviceData;
}

/**
 * Get current config (for debugging)
 */
export function getCurrentConfig(): SecurityShieldConfig | null {
  return shieldConfig;
}

/**
 * Get current violation count
 */
export function getViolationCount(): number {
  return violationCount;
}
