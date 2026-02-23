# Agent Template

Template para criar novos agentes na plataforma IconsAI PWA Voice.

## Como Usar

### 1. Copiar o Template

```bash
cp -r src/agents/_template src/agents/[nome-do-agente]
```

### 2. Renomear Arquivos e Classes

Substitua `Template` e `template` pelo nome do seu agente:

- `AgentTemplate.tsx` → `[NomeAgente].tsx`
- `useTemplateConversation.ts` → `use[NomeAgente]Conversation.ts`
- Renomeie classes e exports internos

### 3. Configurar o Agente

**`config.ts`** - Configuração básica:
```typescript
export const AGENT_CONFIG = {
  name: 'meu-agente',
  slug: 'meu-agente',
  displayName: 'Meu Agente',
  icon: 'Bot',
  color: '#00D4FF',
  edgeFunctionName: 'pwa-meu-agente',
};
```

**`mcp-config.ts`** - Ferramentas e recursos MCP:
```typescript
export const MCP_CONFIG: MCPServerConfig = {
  name: 'meu-agente',
  tools: [...],
  resources: [...],
  prompts: [...],
};
```

### 4. Implementar Handlers

Em `handlers/index.ts`, implemente os handlers para cada tool definido no MCP config.

### 5. Registrar o Agente

**`src/config/agents.config.ts`:**
```typescript
export const AGENTS: AgentConfig[] = [
  // ... outros agentes
  {
    name: 'meu-agente',
    slug: 'meu-agente',
    displayName: 'Meu Agente',
    icon: 'Bot',
    color: '#00D4FF',
    edgeFunctionName: 'pwa-meu-agente',
    isActive: true,
    sortOrder: 1,
  },
];
```

**`src/core/Router.tsx`:**
```typescript
const agentModules = {
  home: lazy(() => import('@/agents/home')),
  'meu-agente': lazy(() => import('@/agents/meu-agente')),
};
```

### 6. Criar Edge Function (Supabase)

```bash
supabase functions new pwa-meu-agente
```

## Estrutura de Arquivos

```
src/agents/[nome]/
├── index.ts              # Exports principais
├── config.ts             # Configuração do agente
├── mcp-config.ts         # MCP tools/resources/prompts
├── [NomeAgente].tsx      # Componente principal
├── handlers/
│   └── index.ts          # Implementação dos tools
└── hooks/
    └── useConversation.ts # Hook de conversação
```

## Checklist

- [ ] Copiar template
- [ ] Renomear arquivos e classes
- [ ] Configurar `config.ts`
- [ ] Definir tools em `mcp-config.ts`
- [ ] Implementar handlers
- [ ] Registrar em `agents.config.ts`
- [ ] Adicionar ao Router
- [ ] Criar edge function
- [ ] Testar em `/pwa/agents/[slug]`
