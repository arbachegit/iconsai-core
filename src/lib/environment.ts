/**
 * Environment detection and feature flags system
 */

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Feature flags configuration
export const FEATURE_FLAGS = {
  ENABLE_ANIMATIONS: isDevelopment, // Disable animations in production to debug scroll
  ENABLE_FLOATING_BUTTON_GLOW: isDevelopment, // Complex glow effects only in dev
  ENABLE_CAROUSEL_ANIMATIONS: true, // Keep carousel animations (no autoplay anyway)
  ENABLE_DEBUG_LOGS: true, // Always enable debug logs for now
  ENABLE_SCROLL_SMOOTH: isDevelopment, // Disable smooth scroll in production
} as const;

/**
 * Debug logger that only logs in development or when DEBUG_LOGS flag is on
 */
export const debugLog = {
  scroll: (message: string, data?: any) => {
    if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
      console.log(`[SCROLL DEBUG] ${message}`, data || '');
    }
  },
  
  animation: (message: string, data?: any) => {
    if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
      console.log(`[ANIMATION DEBUG] ${message}`, data || '');
    }
  },
  
  carousel: (message: string, data?: any) => {
    if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
      console.log(`[CAROUSEL DEBUG] ${message}`, data || '');
    }
  },
  
  mount: (componentName: string, data?: any) => {
    if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
      console.log(`[MOUNT] ${componentName}`, data || '');
    }
  },
  
  effect: (componentName: string, message: string, data?: any) => {
    if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
      console.log(`[EFFECT - ${componentName}] ${message}`, data || '');
    }
  }
};

/**
 * Get environment info for debugging
 */
export const getEnvironmentInfo = () => ({
  isDevelopment,
  isProduction,
  mode: import.meta.env.MODE,
  flags: FEATURE_FLAGS,
  url: window.location.href,
  viewport: {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  }
});
