# IconsAI MCP Architecture

> Arquitetura MCP-Inspired para Roteamento Inteligente de Conhecimento

**Versão:** 1.0.0
**Data:** 2026-01-26

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Conceitos MCP](#conceitos-mcp)
3. [Arquitetura de Conhecimento](#arquitetura-de-conhecimento)
4. [Classificador de Intenção](#classificador-de-intenção)
5. [Orquestrador](#orquestrador)
6. [Configuração de Agente (MCPServerConfig)](#configuração-de-agente-mcpserverconfig)
7. [Tools (Ferramentas)](#tools-ferramentas)
8. [Resources (Recursos)](#resources-recursos)
9. [Prompts (Templates)](#prompts-templates)
10. [Handlers (Implementações)](#handlers-implementações)
11. [Fluxo de Execução](#fluxo-de-execução)
12. [Criando um Novo Agente MCP](#criando-um-novo-agente-mcp)
13. [API Reference](#api-reference)

---

## Visão Geral

O IconsAI utiliza uma arquitetura **MCP-Inspired** (Model Context Protocol) para organizar e rotear consultas de forma inteligente entre diferentes fontes de conhecimento.

### Por que MCP?

| Conceito MCP | Benefício |
|--------------|-----------|
| **Tools** | Declaração explícita do que cada agente pode FAZER |
| **Resources** | Documentação do que cada agente pode ACESSAR |
| **Prompts** | Padronização de como o agente deve RESPONDER |

### Diferença do MCP Completo

Esta é uma implementação **MCP-Inspired**, não MCP-compliant:

| Aspecto | MCP Completo | Nossa Implementação |
|---------|--------------|---------------------|
| Protocolo | JSON-RPC sobre stdio/SSE | TypeScript direto |
| Processos | Servers separados | Módulos no mesmo processo |
| Comunicação | Inter-processo | Função call direto |
| Benefício | Interoperabilidade | Simplicidade + Performance |

---

## Conceitos MCP

```
┌─────────────────────────────────────────────────────────────┐
│                      MCPServerConfig                         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   TOOLS     │  │  RESOURCES  │  │   PROMPTS   │         │
│  │             │  │             │  │             │         │
│  │ O que FAZ   │  │ O que ACESSA│  │ Como FALA   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  + Handlers (implementação das tools)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquitetura de Conhecimento

O sistema possui 4 camadas de conhecimento em cascata:

```
┌─────────────────────────────────────────────────────────────┐
│                    Pergunta do Usuário                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  1. CLASSIFICADOR                            │
│           (Pattern Matching + LLM se necessário)             │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌────────────┐   ┌────────────┐   ┌────────────┐
   │ SQL        │   │ RAG        │   │ API        │
   │ (Supabase) │   │ (Vetorial) │   │ (Perplexity│
   │            │   │            │   │            │
   │ - Rápido   │   │ - Semântico│   │ - Tempo    │
   │ - Exato    │   │ - Flexível │   │   Real     │
   └────────────┘   └────────────┘   └────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    4. LLM FALLBACK                           │
│              (Gemini/OpenAI para casos gerais)               │
└─────────────────────────────────────────────────────────────┘
```

### Fontes de Dados

| Fonte | Tipo | Latência | Uso |
|-------|------|----------|-----|
| **SQL (Supabase)** | Estruturado | ~100ms | Municípios, hospitais, escolas, dados fiscais |
| **RAG (Vetorial)** | Semântico | ~500ms | Protocolos médicos, documentos, manuais |
| **Perplexity** | Web | ~2s | Notícias, atualidades, dados recentes |
| **LLM Fallback** | Generativo | ~1.5s | Perguntas gerais, conversação |

---

## Classificador de Intenção

O classificador determina qual fonte de dados usar.

### Classificação em 2 Níveis

```typescript
// Nível 1: Pattern Matching (< 10ms)
const FAST_PATTERNS = {
  fiscal: /\b(rreo|rgf|rcl|orçamento|despesa)\b/i,
  localizacao: /\b(onde fica|hospital|escola)\s+próximo/i,
  populacao: /\b(população|habitantes|censo)\b/i,
  // ...
};

// Nível 2: LLM (100-200ms) - só se padrão não bater
const llmClassification = await classifyWithLLM(query);
```

### Tipos de Intenção

```typescript
type IntentType =
  | 'fiscal'       // Dados fiscais SICONFI
  | 'localizacao'  // Hospitais, escolas, endereços
  | 'populacao'    // Dados demográficos IBGE
  | 'saude'        // Sintomas, doenças (RAG)
  | 'protocolo'    // Protocolos clínicos (RAG)
  | 'educacao'     // Escolas, IDEB
  | 'atualidades'  // Notícias (Perplexity)
  | 'geral';       // Fallback LLM
```

### Uso

```typescript
import { classify, classifyFast } from '@/lib/mcp/classifier';

// Classificação rápida (só patterns)
const fast = classifyFast("Qual a população de São Paulo?");
// { type: 'populacao', confidence: 0.85, source: 'sql' }

// Classificação completa (com fallback LLM)
const full = await classify("Me explica como funciona o IPTU");
// { type: 'fiscal', confidence: 0.7, source: 'sql', method: 'llm' }
```

---

## Orquestrador

O orquestrador coordena a execução do pipeline.

```typescript
import { getOrchestrator } from '@/lib/mcp/orchestrator';

const orchestrator = getOrchestrator();

// Registrar agente
orchestrator.registerAgent(HOME_MCP_CONFIG, homeHandlers);

// Executar query
const result = await orchestrator.execute("Onde fica o hospital mais próximo?", {
  deviceId: 'xxx',
  sessionId: 'yyy',
  agentName: 'home',
});

// Resultado
{
  success: true,
  response: "O hospital mais próximo é o Hospital Municipal...",
  source: 'sql',
  agent: 'home',
  tool: 'buscar_estabelecimento_saude',
  totalMs: 350,
  stages: [
    { name: 'classify', durationMs: 8 },
    { name: 'route', durationMs: 2 },
    { name: 'execute', durationMs: 120 },
    { name: 'generate', durationMs: 220 },
  ]
}
```

### Progress Events

O orquestrador emite eventos de progresso para a UI:

```typescript
orchestrator.onProgress((event) => {
  console.log(`Stage: ${event.stage}, Progress: ${event.progress}%`);
});

// Eventos:
// { stage: 'classifying', progress: 10 }
// { stage: 'routing', progress: 20 }
// { stage: 'fetching', progress: 40 }
// { stage: 'generating', progress: 70 }
// { stage: 'speaking', progress: 90 }
```

---

## Configuração de Agente (MCPServerConfig)

Cada agente é definido por um `MCPServerConfig`:

```typescript
interface MCPServerConfig {
  // Identificação
  name: string;           // 'home'
  version: string;        // '1.0.0'
  displayName: string;    // 'IconsAI'
  description: string;
  icon: string;           // 'Home' (Lucide)
  color: string;          // '#00D4FF'

  // Capacidades
  tools: MCPTool[];       // O que pode FAZER
  resources: MCPResource[]; // O que pode ACESSAR
  prompts: MCPPrompt[];   // Como deve RESPONDER

  // Fallback
  fallback?: {
    enabled: boolean;
    provider: 'gemini' | 'openai';
    model?: string;
  };

  // Roteamento
  domains?: string[];     // ['geral', 'localizacao']
  keywords?: string[];    // ['assistente', 'ajuda']
}
```

---

## Tools (Ferramentas)

Tools são funções que o agente pode executar.

```typescript
interface MCPTool {
  name: string;           // 'buscar_municipio'
  description: string;    // Para o classificador entender
  inputSchema: JSONSchema; // Validação de entrada
  handler: string;        // Nome do handler
  source?: 'sql' | 'rag' | 'api' | 'llm';
  estimatedMs?: number;   // Tempo estimado
  keywords?: string[];    // Para roteamento
}
```

### Exemplo de Tool

```typescript
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
        description: 'Nome do município ou código IBGE',
      },
      uf: {
        type: 'string',
        pattern: '^[A-Z]{2}$',
      },
    },
    required: ['termo'],
  },
  handler: 'buscarMunicipio',
}
```

---

## Resources (Recursos)

Resources documentam as fontes de dados disponíveis.

```typescript
interface MCPResource {
  uri: string;            // 'db://municipios'
  name: string;           // 'Municípios Brasileiros'
  description: string;    // '5.570 municípios com código IBGE...'
  mimeType?: string;      // 'application/json'
  readOnly?: boolean;
}
```

### Exemplo de Resources

```typescript
resources: [
  {
    uri: 'db://municipios',
    name: 'Municípios Brasileiros',
    description: '5.570 municípios com código IBGE, nome, UF, população',
    readOnly: true,
  },
  {
    uri: 'rag://protocolos',
    name: 'Protocolos Clínicos',
    description: 'Protocolos e diretrizes médicas indexados',
  },
  {
    uri: 'api://perplexity',
    name: 'Busca Web',
    description: 'Acesso a informações atualizadas da web',
  },
]
```

---

## Prompts (Templates)

Prompts definem como o agente deve responder.

```typescript
interface MCPPrompt {
  name: string;           // 'system'
  description?: string;
  template: string;       // Suporta {{variáveis}}
  arguments?: MCPPromptArgument[];
}
```

### Exemplo de Prompts

```typescript
prompts: [
  {
    name: 'system',
    template: `Você é o IconsAI, um assistente de voz inteligente.

CAPACIDADES:
- Informações sobre municípios brasileiros
- Localização de hospitais e escolas
- Busca em protocolos clínicos

COMO RESPONDER:
- Seja conciso (respostas serão faladas)
- Use dados específicos quando disponíveis
- Máximo 2-3 frases`,
  },
  {
    name: 'resultado_municipio',
    template: '{{nome}} é um município de {{uf}} com {{populacao}} habitantes.',
    arguments: [
      { name: 'nome', required: true },
      { name: 'uf', required: true },
      { name: 'populacao', required: true },
    ],
  },
]
```

---

## Handlers (Implementações)

Handlers são as implementações das tools.

```typescript
// src/agents/home/handlers/index.ts

import type { ToolHandler } from '@/lib/mcp/types';
import { supabase } from '@/integrations/supabase/client';

export const buscarMunicipio: ToolHandler<
  { termo: string; uf?: string },
  unknown
> = async (input, context) => {
  const { termo, uf } = input;

  // Código IBGE
  if (/^\d{7}$/.test(termo)) {
    const { data } = await supabase
      .from('municipios')
      .select('*')
      .eq('codigo_ibge', termo)
      .single();
    return data;
  }

  // Nome
  let query = supabase
    .from('municipios')
    .select('*')
    .ilike('nome', `%${termo}%`);

  if (uf) {
    query = query.eq('uf', uf.toUpperCase());
  }

  const { data } = await query.limit(10);
  return data;
};

// Exportar todos os handlers
export const homeHandlers = {
  buscarMunicipio,
  buscarPopulacao,
  buscarEstabelecimentoSaude,
  // ...
};
```

---

## Fluxo de Execução

```
┌──────────────────────────────────────────────────────────────┐
│                    1. CLASSIFY (10ms)                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Pattern Match → "hospital próximo" → localizacao        │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    2. ROUTE (5ms)                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Intent: localizacao → Agent: home → Tool: buscar_estab  │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    3. EXECUTE (100ms)                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Handler: buscarEstabelecimentoSaude({municipio: 'SP'})  │ │
│  │ Result: [{nome: 'Hospital Municipal', ...}]             │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    4. GENERATE (200ms)                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ LLM formata resposta: "O hospital mais próximo é..."    │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    5. TTS (500ms)                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Edge Function: text-to-speech → audioUrl                │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Tempo Total Típico:** ~800ms (vs. 5-10s no fluxo genérico)

---

## Criando um Novo Agente MCP

### Passo 1: Criar Estrutura

```bash
mkdir -p src/agents/fiscal/{handlers}
```

### Passo 2: Criar mcp-config.ts

```typescript
// src/agents/fiscal/mcp-config.ts

import type { MCPServerConfig } from '@/lib/mcp/types';

export const FISCAL_MCP_CONFIG: MCPServerConfig = {
  name: 'fiscal',
  version: '1.0.0',
  displayName: 'Fiscal',
  description: 'Especialista em dados fiscais municipais',
  icon: 'FileText',
  color: '#10B981',
  isActive: true,

  tools: [
    {
      name: 'buscar_dados_fiscais',
      description: 'Busca RREO, RGF ou DCA de um município',
      source: 'sql',
      inputSchema: {
        type: 'object',
        properties: {
          codigo_ibge: { type: 'string' },
          tipo: { type: 'string', enum: ['RREO', 'RGF', 'DCA'] },
          ano: { type: 'number' },
        },
        required: ['codigo_ibge', 'tipo', 'ano'],
      },
      handler: 'buscarDadosFiscais',
    },
  ],

  resources: [
    {
      uri: 'db://dados_fiscais',
      name: 'Dados Fiscais SICONFI',
      description: 'RREO, RGF, DCA de municípios brasileiros',
    },
  ],

  prompts: [
    {
      name: 'system',
      template: 'Você é um especialista em finanças públicas municipais...',
    },
  ],

  domains: ['fiscal'],
  fallback: { enabled: false },
};
```

### Passo 3: Criar Handlers

```typescript
// src/agents/fiscal/handlers/index.ts

import type { ToolHandler } from '@/lib/mcp/types';
import { supabase } from '@/integrations/supabase/client';

export const buscarDadosFiscais: ToolHandler = async (input, context) => {
  const { codigo_ibge, tipo, ano } = input;

  const { data } = await supabase
    .from('dados_fiscais')
    .select('*')
    .eq('codigo_ibge', codigo_ibge)
    .eq('tipo_relatorio', tipo)
    .eq('ano', ano);

  return data;
};

export const fiscalHandlers = {
  buscarDadosFiscais,
};
```

### Passo 4: Registrar no Orquestrador

```typescript
// No componente do agente ou em um setup central

import { getOrchestrator } from '@/lib/mcp/orchestrator';
import { FISCAL_MCP_CONFIG } from './mcp-config';
import { fiscalHandlers } from './handlers';

const orchestrator = getOrchestrator();
orchestrator.registerAgent(FISCAL_MCP_CONFIG, fiscalHandlers);
```

---

## API Reference

### Classifier

| Função | Descrição |
|--------|-----------|
| `classifyFast(query)` | Classificação por patterns (< 10ms) |
| `classify(query, options?)` | Classificação completa com fallback LLM |
| `findAgentForIntent(intent, agents)` | Encontra agente para intenção |
| `findToolForIntent(intent, agent)` | Encontra tool dentro do agente |

### Orchestrator

| Método | Descrição |
|--------|-----------|
| `registerAgent(config, handlers)` | Registrar agente |
| `getAgents()` | Listar agentes registrados |
| `getAgent(name)` | Obter agente por nome |
| `execute(query, context)` | Executar pipeline completo |
| `onProgress(callback)` | Receber eventos de progresso |

### Types

```typescript
// Importar tipos
import type {
  MCPServerConfig,
  MCPTool,
  MCPResource,
  MCPPrompt,
  ToolHandler,
  ExecutionContext,
  ClassifiedIntent,
  OrchestratorResult,
  ProgressEvent,
} from '@/lib/mcp/types';
```

---

## Estrutura de Arquivos

```
src/lib/mcp/
├── index.ts          # Exports
├── types.ts          # Tipos TypeScript
├── classifier.ts     # Classificador de intenção
└── orchestrator.ts   # Orquestrador

src/agents/home/
├── index.ts
├── config.ts         # Config legado
├── mcp-config.ts     # Config MCP
├── HomeAgent.tsx
├── handlers/
│   └── index.ts      # Implementação das tools
├── hooks/
│   └── useHomeConversation.ts
└── services/
    └── homeAgentService.ts
```

---

## Changelog

### v1.0.0 (2026-01-26)

- Implementação inicial da arquitetura MCP-Inspired
- Classificador de intenção com 2 níveis
- Orquestrador com progress events
- Home Agent adaptado para MCP
- Handlers para SQL tools
- Placeholders para RAG e Perplexity
