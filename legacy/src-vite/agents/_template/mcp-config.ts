/**
 * Template Agent MCP Configuration
 * @version 1.0.0
 *
 * Defines the tools, resources, and prompts for this agent.
 *
 * INSTRUCTIONS:
 * 1. Define tools the agent can execute
 * 2. Define resources the agent can access
 * 3. Define prompts for system behavior
 * 4. Implement handlers in handlers/index.ts
 */

import type { MCPServerConfig } from '@/lib/mcp/types';

export const TEMPLATE_MCP_CONFIG: MCPServerConfig = {
  // ============================================
  // BASIC CONFIGURATION
  // ============================================
  name: 'template',
  version: '1.0.0',
  displayName: 'Template Agent',
  description: 'Template agent for creating new agents',
  icon: 'Bot',
  color: '#8B5CF6',
  isActive: true,
  sortOrder: 99,

  // ============================================
  // TOOLS - What this agent can DO
  // ============================================
  tools: [
    // Example: Database query tool
    {
      name: 'buscar_dados',
      description: 'Busca dados no banco de dados',
      source: 'sql', // 'sql' | 'mcp' | 'rag' | 'api' | 'llm'
      estimatedMs: 100,
      keywords: ['buscar', 'dados', 'consultar'],
      inputSchema: {
        type: 'object',
        properties: {
          termo: {
            type: 'string',
            description: 'Termo de busca',
          },
          limite: {
            type: 'number',
            description: 'Limite de resultados',
            default: 10,
          },
        },
        required: ['termo'],
      },
      handler: 'buscarDados', // Must match function name in handlers/index.ts
    },

    // Example: External API tool
    {
      name: 'consultar_api',
      description: 'Consulta API externa',
      source: 'api',
      estimatedMs: 2000,
      keywords: ['api', 'externo', 'consulta'],
      inputSchema: {
        type: 'object',
        properties: {
          endpoint: {
            type: 'string',
            description: 'Endpoint da API',
          },
          params: {
            type: 'object',
            description: 'Parâmetros da requisição',
          },
        },
        required: ['endpoint'],
      },
      handler: 'consultarApi',
    },

    // Example: LLM generation tool (fallback)
    {
      name: 'resposta_geral',
      description: 'Gera resposta para perguntas gerais usando LLM',
      source: 'llm',
      estimatedMs: 1500,
      keywords: ['geral', 'conversa', 'ajuda'],
      inputSchema: {
        type: 'object',
        properties: {
          pergunta: {
            type: 'string',
            description: 'Pergunta do usuário',
          },
          contexto: {
            type: 'string',
            description: 'Contexto adicional (opcional)',
          },
        },
        required: ['pergunta'],
      },
      handler: 'respostaGeral',
    },
  ],

  // ============================================
  // RESOURCES - What this agent can ACCESS
  // ============================================
  resources: [
    {
      uri: 'db://example_table',
      name: 'Tabela de Exemplo',
      description: 'Descrição da tabela de dados',
      mimeType: 'application/json',
      readOnly: true,
    },
    {
      uri: 'api://external_service',
      name: 'Serviço Externo',
      description: 'API externa para consultas',
      mimeType: 'application/json',
    },
  ],

  // ============================================
  // PROMPTS - How this agent should RESPOND
  // ============================================
  prompts: [
    {
      name: 'system',
      description: 'System prompt principal do agente',
      template: `Você é o Template Agent, um assistente de voz especializado.

SUAS CAPACIDADES:
- Buscar dados no banco de dados
- Consultar APIs externas
- Responder perguntas gerais

COMO RESPONDER:
- Seja conciso e direto (respostas serão faladas)
- Use números e dados específicos quando disponíveis
- Se não tiver certeza, diga claramente
- Máximo 2-3 frases por resposta

FORMATO:
- Não use listas longas
- Evite jargões técnicos
- Pronuncie siglas por extenso na primeira menção`,
    },
    {
      name: 'boas_vindas',
      description: 'Mensagem de boas-vindas',
      template: `Olá! Sou o Template Agent. Como posso ajudar você hoje?`,
    },
    {
      name: 'erro_busca',
      description: 'Mensagem quando não encontra dados',
      template: `Não encontrei informações sobre {{termo}}. Pode tentar de outra forma?`,
      arguments: [
        { name: 'termo', description: 'Termo buscado', required: true },
      ],
    },
  ],

  // ============================================
  // FALLBACK CONFIGURATION
  // ============================================
  fallback: {
    enabled: true,
    provider: 'gemini',
    model: 'gemini-1.5-flash',
  },

  // ============================================
  // ROUTING CONFIGURATION
  // ============================================
  domains: ['geral', 'dados', 'consulta'],
  keywords: ['template', 'agente', 'assistente'],
};

export default TEMPLATE_MCP_CONFIG;
