/**
 * Intent Classifier for MCP Orchestrator
 * @version 1.0.0
 * @date 2026-01-26
 *
 * Two-level classification:
 * 1. Fast pattern matching (< 10ms)
 * 2. LLM classification for ambiguous cases (100-200ms)
 */

import type { ClassifiedIntent, IntentType, MCPServerConfig } from './types';

// ============================================
// PATTERN-BASED CLASSIFICATION (FAST)
// ============================================

interface PatternRule {
  intent: IntentType;
  patterns: RegExp[];
  source: 'sql' | 'rag' | 'api' | 'llm';
  entityExtractors?: Record<string, RegExp>;
}

const CLASSIFICATION_RULES: PatternRule[] = [
  {
    intent: 'fiscal',
    patterns: [
      /\b(rreo|rgf|dca|rcl|siconfi|lrf)\b/i,
      /\b(orçamento|orcamento|despesa|receita)\s+(pública|publica|municipal)/i,
      /\b(gasto|investimento)\s+(público|publico)/i,
      /\b(dívida|divida)\s+(consolidada|pública|publica)/i,
      /\b(limite)\s+(prudencial|alerta|lrf)/i,
      /\b(despesa)\s+(com\s+)?(pessoal)/i,
    ],
    source: 'sql',
    entityExtractors: {
      ano: /\b(20\d{2})\b/,
      municipio: /(?:município|municipio|cidade)\s+(?:de\s+)?([A-Za-zÀ-ÿ\s]+)/i,
      uf: /\b([A-Z]{2})\b/,
    },
  },
  {
    intent: 'localizacao',
    patterns: [
      /\b(onde\s+fica|localização|localizacao|endereço|endereco)\b/i,
      /\b(hospital|upa|ubs|posto\s+de\s+saúde|posto\s+de\s+saude)\s+(mais\s+)?próximo/i,
      /\b(escola|creche|universidade)\s+(mais\s+)?próxim/i,
      /\b(como\s+chegar|rota\s+para|caminho\s+para)\b/i,
    ],
    source: 'sql',
    entityExtractors: {
      tipo: /(hospital|upa|ubs|escola|creche|universidade)/i,
      municipio: /(?:em|de|no|na)\s+([A-Za-zÀ-ÿ\s]+)/i,
    },
  },
  {
    intent: 'populacao',
    patterns: [
      /\b(população|populacao|habitantes|moradores)\b/i,
      /\b(quantos?\s+)(pessoas|habitantes|moradores)\b/i,
      /\b(censo|ibge)\b/i,
      /\b(densidade)\s+(demográfica|demografica|populacional)/i,
    ],
    source: 'sql',
    entityExtractors: {
      municipio: /(?:de|em|do|da)\s+([A-Za-zÀ-ÿ\s]+)/i,
      ano: /\b(20\d{2})\b/,
    },
  },
  {
    intent: 'saude',
    patterns: [
      /\b(sintoma|sintomas|doença|doenca|enfermidade)\b/i,
      /\b(tratamento|medicamento|remédio|remedio)\b/i,
      /\b(dor\s+de|dor\s+no|dor\s+na)\b/i,
      /\b(febre|tosse|gripe|covid|dengue)\b/i,
    ],
    source: 'rag',
    entityExtractors: {
      sintoma: /(dor\s+(?:de|no|na)\s+\w+|febre|tosse|gripe)/i,
    },
  },
  {
    intent: 'protocolo',
    patterns: [
      /\b(protocolo|procedimento|diretriz)\s+(clínico|clinico|médico|medico)/i,
      /\b(cid|cid-10|cid10)\s*[-:]?\s*([A-Z]\d{2})/i,
      /\b(manejo|conduta)\s+(clínic|clinic)/i,
      /\b(fluxograma|algoritmo)\s+(de\s+)?(atendimento|tratamento)/i,
    ],
    source: 'rag',
    entityExtractors: {
      cid: /\b([A-Z]\d{2}(?:\.\d)?)\b/,
    },
  },
  {
    intent: 'educacao',
    patterns: [
      /\b(escola|colégio|colegio|ensino)\b/i,
      /\b(matrícula|matricula|vaga)\s+(escolar)?/i,
      /\b(ideb|enem|saeb)\b/i,
      /\b(educação|educacao)\s+(básica|basica|infantil|fundamental|médio|medio)/i,
    ],
    source: 'sql',
  },
  {
    intent: 'atualidades',
    patterns: [
      /\b(notícia|noticia|hoje|ontem|recente|último|ultima)\b/i,
      /\b(aconteceu|ocorreu|anunciou|declarou)\b/i,
      /\b(atualização|atualizacao|novidade)\b/i,
      /\b(previsão|previsao)\s+(do\s+)?(tempo|clima)/i,
    ],
    source: 'api', // Perplexity
  },
];

/**
 * Fast pattern-based classification (< 10ms)
 */
export function classifyFast(query: string): ClassifiedIntent | null {
  const normalizedQuery = query.toLowerCase().normalize('NFD');

  for (const rule of CLASSIFICATION_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(query)) {
        const entities: Record<string, string | number> = {};

        // Extract entities if extractors defined
        if (rule.entityExtractors) {
          for (const [key, extractor] of Object.entries(rule.entityExtractors)) {
            const match = query.match(extractor);
            if (match && match[1]) {
              entities[key] = key === 'ano' ? parseInt(match[1], 10) : match[1].trim();
            }
          }
        }

        return {
          type: rule.intent,
          confidence: 0.85,
          entities,
          suggestedSource: rule.source,
          method: 'pattern',
        };
      }
    }
  }

  return null;
}

/**
 * Find best matching agent for an intent
 */
export function findAgentForIntent(
  intent: ClassifiedIntent,
  agents: MCPServerConfig[]
): MCPServerConfig | null {
  // First, try to match by domains
  for (const agent of agents) {
    if (agent.domains?.includes(intent.type)) {
      return agent;
    }
  }

  // Then, try to match by keywords in tools
  for (const agent of agents) {
    for (const tool of agent.tools) {
      if (tool.keywords?.some((kw) => intent.type.includes(kw))) {
        return agent;
      }
    }
  }

  // Fallback: return first active agent
  return agents.find((a) => a.isActive) || null;
}

/**
 * Find best matching tool for an intent within an agent
 */
export function findToolForIntent(
  intent: ClassifiedIntent,
  agent: MCPServerConfig
): { tool: string; confidence: number } | null {
  const tools = agent.tools.filter((t) => t.source === intent.suggestedSource);

  if (tools.length === 0) {
    // No tool for suggested source, try any tool
    return agent.tools.length > 0
      ? { tool: agent.tools[0].name, confidence: 0.5 }
      : null;
  }

  // Match by keywords
  for (const tool of tools) {
    if (tool.keywords?.some((kw) => intent.type.includes(kw))) {
      return { tool: tool.name, confidence: 0.9 };
    }
  }

  // Return first matching source tool
  return { tool: tools[0].name, confidence: 0.7 };
}

/**
 * LLM-based classification for ambiguous cases
 * Uses a small, fast model for classification only
 */
export async function classifyWithLLM(
  query: string,
  availableIntents: IntentType[]
): Promise<ClassifiedIntent> {
  // This would call a small LLM (e.g., Gemini Flash) for classification
  // For now, return a default classification

  // TODO: Implement actual LLM call
  // const prompt = `Classify the following query into one of these categories: ${availableIntents.join(', ')}
  // Query: "${query}"
  // Respond with JSON: { "intent": "category", "confidence": 0.0-1.0, "entities": {} }`;

  return {
    type: 'geral',
    confidence: 0.5,
    entities: {},
    suggestedSource: 'llm',
    method: 'llm',
  };
}

/**
 * Main classification function - tries fast first, falls back to LLM
 */
export async function classify(
  query: string,
  options?: {
    forceLLM?: boolean;
    availableIntents?: IntentType[];
  }
): Promise<ClassifiedIntent> {
  // Try fast classification first
  if (!options?.forceLLM) {
    const fastResult = classifyFast(query);
    if (fastResult && fastResult.confidence >= 0.7) {
      return fastResult;
    }
  }

  // Fall back to LLM for ambiguous cases
  const llmResult = await classifyWithLLM(
    query,
    options?.availableIntents || ['fiscal', 'localizacao', 'saude', 'atualidades', 'geral']
  );

  return llmResult;
}

export default {
  classify,
  classifyFast,
  findAgentForIntent,
  findToolForIntent,
};
