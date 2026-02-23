/**
 * Template Agent Handlers
 * @version 1.0.0
 *
 * Implementation of tools defined in mcp-config.ts.
 * Each handler corresponds to a tool's 'handler' field.
 *
 * INSTRUCTIONS:
 * 1. Implement each handler function
 * 2. Handler names must match mcp-config.ts tool handlers
 * 3. Export all handlers in templateHandlers object
 */

import type { ToolHandler, ExecutionContext } from '@/lib/mcp/types';

// Import data provider (auto-switches between mock and real)
// import { getDataProvider } from '@/lib/mcp/mock-provider';
// const dataProvider = getDataProvider();

// ============================================
// DATABASE HANDLERS
// ============================================

/**
 * Busca dados no banco de dados
 * Handler for: buscar_dados tool
 */
export const buscarDados: ToolHandler<
  { termo: string; limite?: number },
  unknown
> = async (input, context) => {
  const { termo, limite = 10 } = input;

  console.log('[Template] buscarDados:', termo, limite);

  // TODO: Implement your database query logic here
  // Example:
  // const results = await supabase
  //   .from('your_table')
  //   .select('*')
  //   .ilike('name', `%${termo}%`)
  //   .limit(limite);

  // Placeholder response
  return {
    message: 'Busca realizada com sucesso',
    termo,
    limite,
    resultados: [],
    total: 0,
  };
};

// ============================================
// API HANDLERS
// ============================================

/**
 * Consulta API externa
 * Handler for: consultar_api tool
 */
export const consultarApi: ToolHandler<
  { endpoint: string; params?: Record<string, unknown> },
  unknown
> = async (input, context) => {
  const { endpoint, params } = input;

  console.log('[Template] consultarApi:', endpoint, params);

  // TODO: Implement your API call logic here
  // Example:
  // const response = await fetch(`https://api.example.com${endpoint}`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // });
  // const data = await response.json();

  // Placeholder response
  return {
    message: 'API consultada com sucesso',
    endpoint,
    params,
    data: null,
  };
};

// ============================================
// LLM HANDLERS
// ============================================

/**
 * Gera resposta geral usando LLM
 * Handler for: resposta_geral tool
 */
export const respostaGeral: ToolHandler<
  { pergunta: string; contexto?: string },
  unknown
> = async (input, context) => {
  const { pergunta, contexto } = input;

  console.log('[Template] respostaGeral:', pergunta);

  // This handler signals that LLM generation is needed
  // The orchestrator will handle the actual generation
  return {
    pergunta,
    contexto,
    needsLLMGeneration: true,
  };
};

// ============================================
// EXPORT ALL HANDLERS
// ============================================

/**
 * All handlers for this agent
 * Keys must match the 'handler' field in mcp-config.ts tools
 */
export const templateHandlers: Record<string, ToolHandler> = {
  buscarDados,
  consultarApi,
  respostaGeral,
};

export default templateHandlers;
