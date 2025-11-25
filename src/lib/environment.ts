/**
 * Environment detection and feature flags system
 */

import { supabase } from "@/integrations/supabase/client";

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Default feature flags configuration (fallback)
export const DEFAULT_FEATURE_FLAGS = {
  ENABLE_ANIMATIONS: isDevelopment,
  ENABLE_FLOATING_BUTTON_GLOW: isDevelopment,
  ENABLE_CAROUSEL_ANIMATIONS: true,
  ENABLE_DEBUG_LOGS: true,
  ENABLE_SCROLL_SMOOTH: isDevelopment,
};

// Feature flags will be loaded from database
export let FEATURE_FLAGS: Record<string, boolean> = { ...DEFAULT_FEATURE_FLAGS };

/**
 * Load feature flags from database
 */
export const loadFeatureFlags = async () => {
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*');
    
    if (error) throw error;
    
    if (data) {
      data.forEach(flag => {
        FEATURE_FLAGS[flag.flag_name as keyof typeof FEATURE_FLAGS] = flag.enabled;
      });
    }
  } catch (error) {
    console.error('Error loading feature flags:', error);
  }
};

// Load flags on module initialization
loadFeatureFlags();

/**
 * Save log to database
 */
const saveLogToDatabase = async (
  logType: string,
  component: string | undefined,
  message: string,
  data?: any
) => {
  if (!FEATURE_FLAGS.ENABLE_DEBUG_LOGS) return;
  
  try {
    await supabase.from('debug_logs').insert({
      log_type: logType,
      component,
      message,
      data: data ? (typeof data === 'object' ? data : { value: data }) : null,
      environment: isProduction ? 'production' : 'development',
      user_agent: navigator.userAgent,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      scroll_x: window.scrollX,
      scroll_y: window.scrollY,
    });
  } catch (error) {
    // Silently fail - don't break the app if logging fails
    console.error('Failed to save log:', error);
  }
};

/**
 * Debug logger that logs to console AND database
 */
export const debugLog = {
  scroll: (message: string, data?: any) => {
    if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
      console.log(`[SCROLL DEBUG] ${message}`, data || '');
      saveLogToDatabase('scroll', undefined, message, data);
    }
  },
  
  animation: (message: string, data?: any) => {
    if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
      console.log(`[ANIMATION DEBUG] ${message}`, data || '');
      saveLogToDatabase('animation', undefined, message, data);
    }
  },
  
  carousel: (message: string, data?: any) => {
    if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
      console.log(`[CAROUSEL DEBUG] ${message}`, data || '');
      saveLogToDatabase('carousel', undefined, message, data);
    }
  },
  
  mount: (componentName: string, data?: any) => {
    if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
      console.log(`[MOUNT] ${componentName}`, data || '');
      saveLogToDatabase('mount', componentName, `Component mounted`, data);
    }
  },
  
  effect: (componentName: string, message: string, data?: any) => {
    if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
      console.log(`[EFFECT - ${componentName}] ${message}`, data || '');
      saveLogToDatabase('effect', componentName, message, data);
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
