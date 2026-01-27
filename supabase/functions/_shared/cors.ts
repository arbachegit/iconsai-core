// ============================================
// VERSAO: 2.2.0 | DEPLOY: 2026-01-28
// FIX: Restricted CORS to allowed origins only
// ============================================

/**
 * Módulo centralizado de CORS para Edge Functions
 * Elimina duplicação de headers CORS em todas as funções
 */

// Whitelist of allowed origins
const ALLOWED_ORIGINS = [
  "https://app.iconsai.com.br",
  "https://core.iconsai.ai",
  "https://iconsai.com.br",
  "https://www.iconsai.com.br",
  // Development origins (remove in production if needed)
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

/**
 * Get CORS headers with origin validation
 * @param origin - The request origin header
 * @returns CORS headers with validated origin
 */
export function getCorsHeaders(origin?: string | null): Record<string, string> {
  // Check if origin is in whitelist
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Legacy export for backwards compatibility
// WARNING: Deprecated - use getCorsHeaders(req.headers.get("origin")) instead
export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

/**
 * Handler para requisições preflight (OPTIONS)
 * @param req - Request object
 * @returns Response para OPTIONS ou null para continuar processamento
 */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }
  return null;
}

/**
 * Verifica se o método HTTP é permitido
 * @param req - Request object
 * @param allowedMethods - Lista de métodos permitidos
 * @returns true se o método é permitido
 */
export function isMethodAllowed(req: Request, allowedMethods: string[]): boolean {
  return allowedMethods.includes(req.method);
}
