/**
 * Home Agent MCP Configuration
 * @version 1.0.0
 * @date 2026-01-26
 *
 * Defines the tools, resources, and prompts for the Home Agent.
 * This is the main IconsAI assistant that can route to specialized domains.
 */

import type { MCPServerConfig } from '@/lib/mcp/types';

export const HOME_MCP_CONFIG: MCPServerConfig = {
  name: 'home',
  version: '1.0.0',
  displayName: 'IconsAI',
  description: 'Assistente principal do IconsAI - roteia para domínios especializados',
  icon: 'Home',
  color: '#00D4FF',
  isActive: true,
  sortOrder: 0,

  // ============================================
  // TOOLS - O que este agente pode FAZER
  // ============================================
  tools: [
    // --- SQL Tools (Dados Estruturados) ---
    {
      name: 'buscar_municipio',
      description: 'Busca informações de um município brasileiro por nome ou código IBGE',
      source: 'sql',
      estimatedMs: 100,
      keywords: ['municipio', 'cidade', 'ibge'],
      inputSchema: {
        type: 'object',
        properties: {
          termo: {
            type: 'string',
            description: 'Nome do município ou código IBGE (7 dígitos)',
          },
          uf: {
            type: 'string',
            description: 'Sigla do estado (opcional)',
            pattern: '^[A-Z]{2}$',
          },
        },
        required: ['termo'],
      },
      handler: 'buscarMunicipio',
    },
    {
      name: 'buscar_populacao',
      description: 'Busca dados populacionais de um município',
      source: 'sql',
      estimatedMs: 100,
      keywords: ['populacao', 'habitantes', 'censo'],
      inputSchema: {
        type: 'object',
        properties: {
          codigo_ibge: {
            type: 'string',
            description: 'Código IBGE do município (7 dígitos)',
          },
          municipio: {
            type: 'string',
            description: 'Nome do município (alternativa ao código)',
          },
        },
      },
      handler: 'buscarPopulacao',
    },
    {
      name: 'buscar_estabelecimento_saude',
      description: 'Busca hospitais, UPAs, UBS e outros estabelecimentos de saúde',
      source: 'sql',
      estimatedMs: 150,
      keywords: ['hospital', 'upa', 'ubs', 'saude', 'localizacao'],
      inputSchema: {
        type: 'object',
        properties: {
          municipio: {
            type: 'string',
            description: 'Nome ou código do município',
          },
          tipo: {
            type: 'string',
            enum: ['HOSPITAL', 'UPA', 'UBS', 'CLINICA', 'TODOS'],
            default: 'TODOS',
          },
          limite: {
            type: 'number',
            default: 10,
            maximum: 50,
          },
        },
        required: ['municipio'],
      },
      handler: 'buscarEstabelecimentoSaude',
    },
    {
      name: 'buscar_escola',
      description: 'Busca escolas e instituições de ensino',
      source: 'sql',
      estimatedMs: 150,
      keywords: ['escola', 'colegio', 'educacao'],
      inputSchema: {
        type: 'object',
        properties: {
          municipio: {
            type: 'string',
            description: 'Nome ou código do município',
          },
          tipo: {
            type: 'string',
            enum: ['INFANTIL', 'FUNDAMENTAL', 'MEDIO', 'SUPERIOR', 'TODOS'],
            default: 'TODOS',
          },
          limite: {
            type: 'number',
            default: 10,
            maximum: 50,
          },
        },
        required: ['municipio'],
      },
      handler: 'buscarEscola',
    },

    // --- RAG Tools (Busca Semântica) ---
    {
      name: 'buscar_protocolo',
      description: 'Busca protocolos clínicos e procedimentos médicos por similaridade',
      source: 'rag',
      estimatedMs: 500,
      keywords: ['protocolo', 'procedimento', 'clinico', 'medico'],
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Descrição do protocolo ou sintomas',
          },
          categoria: {
            type: 'string',
            enum: ['urgencia', 'ambulatorial', 'internacao', 'todos'],
            default: 'todos',
          },
          limite: {
            type: 'number',
            default: 5,
            maximum: 20,
          },
        },
        required: ['query'],
      },
      handler: 'buscarProtocolo',
    },
    {
      name: 'buscar_documento',
      description: 'Busca documentos e manuais por similaridade semântica',
      source: 'rag',
      estimatedMs: 500,
      keywords: ['documento', 'manual', 'legislacao'],
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Termo de busca ou pergunta',
          },
          categoria: {
            type: 'string',
            description: 'Categoria de documento (opcional)',
          },
          limite: {
            type: 'number',
            default: 5,
          },
        },
        required: ['query'],
      },
      handler: 'buscarDocumento',
    },

    // --- API Tools (Dados Externos) ---
    {
      name: 'buscar_atualidades',
      description: 'Busca notícias e informações atualizadas na web',
      source: 'api',
      estimatedMs: 2000,
      keywords: ['noticia', 'atualidade', 'hoje', 'recente'],
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Termo de busca',
          },
          foco: {
            type: 'string',
            enum: ['noticias', 'academico', 'geral'],
            default: 'geral',
          },
          recencia: {
            type: 'string',
            enum: ['dia', 'semana', 'mes'],
            default: 'semana',
          },
        },
        required: ['query'],
      },
      handler: 'buscarAtualidades',
    },

    // --- LLM Tools (Geração) ---
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
  // RESOURCES - O que este agente pode ACESSAR
  // ============================================
  resources: [
    {
      uri: 'db://municipios',
      name: 'Municípios Brasileiros',
      description: '5.570 municípios com código IBGE, nome, UF, população e área',
      mimeType: 'application/json',
      readOnly: true,
    },
    {
      uri: 'db://estabelecimentos_saude',
      name: 'Estabelecimentos de Saúde',
      description: 'Hospitais, UPAs, UBS e clínicas do CNES',
      mimeType: 'application/json',
      readOnly: true,
    },
    {
      uri: 'db://escolas',
      name: 'Instituições de Ensino',
      description: 'Escolas públicas e privadas do Censo Escolar',
      mimeType: 'application/json',
      readOnly: true,
    },
    {
      uri: 'rag://protocolos',
      name: 'Protocolos Clínicos',
      description: 'Protocolos e diretrizes clínicas indexados',
      mimeType: 'application/json',
    },
    {
      uri: 'rag://documentos',
      name: 'Base de Documentos',
      description: 'Manuais, legislações e documentos diversos',
      mimeType: 'application/json',
    },
    {
      uri: 'api://perplexity',
      name: 'Busca Web (Perplexity)',
      description: 'Acesso a informações atualizadas da web',
      mimeType: 'application/json',
    },
  ],

  // ============================================
  // PROMPTS - Como este agente deve RESPONDER
  // ============================================
  prompts: [
    {
      name: 'system',
      description: 'System prompt principal do Home Agent',
      template: `Você é o IconsAI, um assistente de voz inteligente especializado em dados brasileiros.

SUAS CAPACIDADES:
- Informações sobre municípios brasileiros (população, localização, dados gerais)
- Localização de hospitais, UPAs, UBS e escolas
- Busca em protocolos clínicos e documentos
- Notícias e informações atualizadas

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
      template: `Olá! Sou o IconsAI, seu assistente de voz. Posso ajudar com informações sobre cidades brasileiras, localizar hospitais e escolas, ou responder suas dúvidas. Como posso ajudar?`,
    },
    {
      name: 'erro_busca',
      description: 'Mensagem quando não encontra dados',
      template: `Não encontrei informações sobre {{termo}}. Pode tentar de outra forma ou verificar se o nome está correto?`,
      arguments: [
        { name: 'termo', description: 'Termo buscado', required: true },
      ],
    },
    {
      name: 'resultado_municipio',
      description: 'Template para apresentar dados de município',
      template: `{{nome}} é um município de {{uf}} com aproximadamente {{populacao}} habitantes. {{complemento}}`,
      arguments: [
        { name: 'nome', required: true },
        { name: 'uf', required: true },
        { name: 'populacao', required: true },
        { name: 'complemento', required: false, default: '' },
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
  domains: ['geral', 'localizacao', 'populacao', 'saude', 'educacao', 'atualidades'],
  keywords: ['iconsai', 'assistente', 'ajuda', 'informacao'],
};

export default HOME_MCP_CONFIG;
