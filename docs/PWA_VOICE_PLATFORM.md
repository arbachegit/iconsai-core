# IconsAI PWA Voice Platform

> Arquitetura modular de agentes de voz para Progressive Web App

**Versão:** 1.0.0
**Data:** 2026-01-25

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Estrutura de Diretórios](#estrutura-de-diretórios)
4. [Core Infrastructure](#core-infrastructure)
5. [Core Components](#core-components)
6. [Roteamento](#roteamento)
7. [Home Agent](#home-agent)
8. [Criando Novos Agentes](#criando-novos-agentes)
9. [Fluxo de Interação](#fluxo-de-interação)
10. [Banco de Dados](#banco-de-dados)
11. [Compatibilidade Safari/iOS](#compatibilidade-safariios)
12. [API Reference](#api-reference)

---

## Visão Geral

O IconsAI PWA Voice Platform é uma arquitetura modular para criação de agentes de voz interativos. Cada agente é uma mini-aplicação independente com:

- **Isolamento Absoluto**: Agentes não dependem uns dos outros
- **Interface Unificada**: Header + Spectrum + UnifiedButton + Footer
- **Comunicação via Eventos**: Sem acoplamento direto entre componentes
- **Core Shell Mínimo**: Apenas roteamento e componentes base

### Características Principais

| Feature | Descrição |
|---------|-----------|
| Botão Unificado | Um único botão para play/record com máquina de estados |
| Spectrum Analyzer | Visualização bidirecional de áudio |
| EventBus | Sistema de eventos tipado para comunicação desacoplada |
| Safari Support | Compatibilidade total com Safari/iOS via audio warmup |
| Lazy Loading | Agentes carregados sob demanda para performance |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│                    (React Router)                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     CoreApp.tsx                              │
│              (Safari Audio Unlock + Router)                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    AgentRouter.tsx                           │
│           (Dynamic Agent Loading + Navigation)               │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Home    │    │  Fiscal  │    │  Health  │
    │  Agent   │    │  Agent   │    │  Agent   │
    └──────────┘    └──────────┘    └──────────┘
```

### Camadas

1. **Core Layer**: EventBus, AudioEngine, Types
2. **Components Layer**: UnifiedButton, SpectrumAnalyzer, Header, Footer
3. **Router Layer**: AgentRouter, NavigationFooter
4. **Agent Layer**: HomeAgent, FiscalAgent, etc.

---

## Estrutura de Diretórios

```
src/
├── core/
│   ├── App.tsx                 # Shell mínimo
│   ├── Router.tsx              # Roteamento dinâmico /pwa/agents/:agentName
│   ├── AudioEngine.ts          # Motor de áudio compartilhado
│   ├── EventBus.ts             # Barramento de eventos tipados
│   ├── index.ts                # Exports principais
│   ├── types/
│   │   └── index.ts            # AgentConfig, UnifiedButtonState, etc.
│   └── components/
│       ├── UnifiedButton.tsx   # Botão único play/mic
│       ├── SpectrumAnalyzer.tsx
│       ├── ModuleHeader.tsx
│       ├── NavigationFooter.tsx
│       ├── HistoryButton.tsx
│       └── index.ts
│
├── agents/
│   └── home/
│       ├── index.ts            # Export barrel
│       ├── config.ts           # Configurações do agente
│       ├── HomeAgent.tsx       # Componente principal
│       ├── hooks/
│       │   └── useHomeConversation.ts
│       └── services/
│           └── homeAgentService.ts
│
├── config/
│   └── agents.config.ts        # Registry de agentes
│
└── supabase/
    └── migrations/
        └── 20260125000000_iconsai_agents.sql
```

---

## Core Infrastructure

### EventBus

Sistema de eventos tipado para comunicação entre componentes sem acoplamento direto.

```typescript
import { EventBus, useEventBus } from '@/core/EventBus';

// Eventos disponíveis
interface EventMap {
  'audio:play': { url: string; agentName: string };
  'audio:stop': { agentName: string };
  'audio:ended': { agentName: string };
  'recording:start': { agentName: string };
  'recording:stop': { audioBlob: Blob; duration: number };
  'button:stateChange': { state: UnifiedButtonState };
  'footer:show': void;
  'navigation:change': { agentName: string };
}

// Emitir evento
EventBus.emit('audio:play', { url: 'https://...', agentName: 'home' });

// Escutar evento (classe)
const subscription = EventBus.on('audio:ended', (data) => {
  console.log(`Audio ended for ${data.agentName}`);
});
subscription.unsubscribe(); // Cleanup

// Escutar evento (React hook)
useEventBus('footer:show', () => {
  setIsVisible(true);
});
```

### AudioEngine

Wrapper unificado sobre `audioManagerStore` com suporte a Safari/iOS.

```typescript
import { AudioEngine, useAudioEngine } from '@/core/AudioEngine';

// Uso direto (singleton)
AudioEngine.warmup();           // Chamar em gesto do usuário
AudioEngine.play(url, 'home');  // Reproduzir áudio
AudioEngine.stop();             // Parar reprodução
AudioEngine.getFrequencyData(); // Dados para visualização

// React Hook
const {
  play,
  stop,
  pause,
  resume,
  warmup,
  state,        // 'idle' | 'loading' | 'playing' | 'paused'
  progress,     // 0-1
  frequencyData,
  isReady,
} = useAudioEngine({
  onEnded: () => startRecording(),
  onFrequencyData: (data) => setFrequencyData(data),
});
```

### Types

Tipos TypeScript compartilhados entre todos os módulos.

```typescript
// Estado do botão unificado
type UnifiedButtonState = 'idle' | 'playing' | 'recording' | 'processing';

// Configuração de agente
interface AgentConfig {
  name: string;           // Nome interno (código)
  slug: string;           // URL slug para roteamento
  displayName: string;    // Nome exibido ao usuário
  icon: string;           // Nome do ícone Lucide
  color: string;          // Cor primária (hex)
  welcomeAudioUrl?: string;
  edgeFunctionName: string;
  isActive?: boolean;
  sortOrder?: number;
}

// Props recebidas por agentes
interface AgentProps {
  deviceId: string;
  sessionId: string;
  config: AgentConfig;
}
```

---

## Core Components

### UnifiedButton

Botão único com máquina de estados para controle de interação.

```typescript
import { UnifiedButton } from '@/core/components';

<UnifiedButton
  state={buttonState}        // 'idle' | 'playing' | 'recording' | 'processing'
  onPlay={handlePlay}        // Ação ao clicar em idle
  onRecord={handleRecord}    // Ação para iniciar gravação
  onStop={handleStop}        // Ação para parar (playing/recording)
  progress={0.5}             // Progresso do áudio (0-1)
  primaryColor="#00D4FF"     // Cor do botão
  size="lg"                  // 'sm' | 'md' | 'lg'
  disabled={false}
/>
```

**Máquina de Estados:**

```
idle ──[click]──> playing (welcome)
                      │
                      ▼
              [audio ends]
                      │
                      ▼
                 recording ──[stop/timeout]──> processing
                      ▲                            │
                      │                            ▼
                      └────[audio ends]─────── playing
```

### SpectrumAnalyzer

Visualizador de espectro bidirecional.

```typescript
import { SpectrumAnalyzer } from '@/core/components';

<SpectrumAnalyzer
  mode="playing"             // 'idle' | 'playing' | 'recording'
  frequencyData={[...]}      // Array de valores 0-255
  primaryColor="#00D4FF"
  secondaryColor="#8B5CF6"
  barCount={24}
  width={160}
  height={80}
/>
```

### ModuleHeader

Cabeçalho com ícone do agente, nome e botão de histórico.

```typescript
import { ModuleHeader } from '@/core/components';

<ModuleHeader
  config={agentConfig}
  onHistoryClick={() => setShowHistory(true)}
  hasHistory={messages.length > 0}
/>
```

### NavigationFooter

Rodapé de navegação entre agentes. **Oculto até primeira interação.**

```typescript
import { NavigationFooter } from '@/core/components';

<NavigationFooter
  agents={activeAgents}
  forceVisible={false}       // Forçar visibilidade
/>

// Para mostrar o footer, emita o evento:
EventBus.emit('footer:show');
```

---

## Roteamento

### Configuração de Agentes

```typescript
// src/config/agents.config.ts

export const AGENTS: AgentConfig[] = [
  {
    name: 'home',
    slug: 'home',
    displayName: 'IconsAI',
    icon: 'Home',
    color: '#00D4FF',
    edgeFunctionName: 'pwa-home-agent',
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'fiscal',
    slug: 'fiscal',
    displayName: 'Fiscal',
    icon: 'FileText',
    color: '#10B981',
    edgeFunctionName: 'pwa-fiscal-agent',
    isActive: true,
    sortOrder: 1,
  },
];

// Helpers
getAgentBySlug('home');     // AgentConfig | undefined
getAgentByName('home');     // AgentConfig | undefined
getActiveAgents();          // AgentConfig[]
getDefaultAgent();          // AgentConfig
agentExists('home');        // boolean
```

### URLs

| URL | Descrição |
|-----|-----------|
| `/pwa/agents` | Redireciona para agente padrão |
| `/pwa/agents/home` | Home Agent |
| `/pwa/agents/fiscal` | Fiscal Agent |
| `/pwa/agents/:slug` | Qualquer agente registrado |

---

## Home Agent

### Estrutura

```
agents/home/
├── index.ts                    # Export barrel
├── config.ts                   # Configurações
├── HomeAgent.tsx               # Componente principal
├── hooks/
│   └── useHomeConversation.ts  # Estado da conversa
└── services/
    └── homeAgentService.ts     # Comunicação com APIs
```

### Uso

```typescript
// O HomeAgent é carregado automaticamente pelo Router
// Acesse via: /pwa/agents/home
```

### Hook useHomeConversation

```typescript
const {
  conversation,              // AgentConversation | null
  messages,                  // ConversationMessage[]
  isProcessing,              // boolean
  error,                     // string | null
  sendAudioMessage,          // (audioBase64: string) => Promise<...>
  getWelcomeAudio,           // () => Promise<string | null>
  clearConversation,         // () => void
  setFirstInteractionComplete,
  isFirstInteractionComplete,
} = useHomeConversation({
  deviceId,
  sessionId,
  agentName: 'home',
});
```

### Service API

```typescript
import {
  transcribeAudio,
  getAIResponse,
  textToSpeech,
  processVoiceInput,
} from '@/agents/home/services/homeAgentService';

// Transcrever áudio
const result = await transcribeAudio(audioBase64, context);

// Obter resposta da IA
const response = await getAIResponse(userMessage, context);

// Converter texto em fala
const tts = await textToSpeech(text, { voice: 'nova', rate: 1.0 });

// Fluxo completo: transcrição + IA + TTS
const full = await processVoiceInput(audioBase64, context);
// { success, userText, assistantText, audioUrl, error }
```

---

## Criando Novos Agentes

### Passo 1: Criar Estrutura

```bash
mkdir -p src/agents/fiscal/{hooks,services}
```

### Passo 2: Criar Arquivos

**config.ts:**
```typescript
import type { AgentConfig } from '@/core/types';

export const FISCAL_AGENT_CONFIG: AgentConfig = {
  name: 'fiscal',
  slug: 'fiscal',
  displayName: 'Fiscal',
  icon: 'FileText',
  color: '#10B981',
  edgeFunctionName: 'pwa-fiscal-agent',
  isActive: true,
  sortOrder: 1,
};
```

**FiscalAgent.tsx:**
```typescript
import React from 'react';
import type { AgentProps } from '@/core/types';
import { UnifiedButton, SpectrumAnalyzer, ModuleHeader } from '@/core/components';

export const FiscalAgent: React.FC<AgentProps> = ({
  deviceId,
  sessionId,
  config,
}) => {
  // Implementar lógica similar ao HomeAgent
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <ModuleHeader config={config} />
      {/* ... */}
    </div>
  );
};

export default FiscalAgent;
```

**index.ts:**
```typescript
export { FiscalAgent as default } from './FiscalAgent';
export { FiscalAgent } from './FiscalAgent';
export { FISCAL_AGENT_CONFIG } from './config';
```

### Passo 3: Registrar no Config

```typescript
// src/config/agents.config.ts
export const AGENTS: AgentConfig[] = [
  // ... existing agents
  {
    name: 'fiscal',
    slug: 'fiscal',
    displayName: 'Fiscal',
    icon: 'FileText',
    color: '#10B981',
    edgeFunctionName: 'pwa-fiscal-agent',
    isActive: true,
    sortOrder: 1,
  },
];
```

### Passo 4: Adicionar ao Router

```typescript
// src/core/Router.tsx
const agentModules = {
  home: lazy(() => import('@/agents/home')),
  fiscal: lazy(() => import('@/agents/fiscal')), // Adicionar
};
```

### Passo 5: Criar Edge Function

Criar `supabase/functions/pwa-fiscal-agent/index.ts` com a lógica do agente.

---

## Fluxo de Interação

```
┌──────────────────────────────────────────────────────────────┐
│                 Usuário abre /pwa/agents/home                │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│        Tela: Header + Spectrum (idle) + Button (play)        │
└──────────────────────────┬───────────────────────────────────┘
                           │
                    [Usuário clica]
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              Button: playing, TTS welcome                     │
│              Spectrum: modo playing                           │
└──────────────────────────┬───────────────────────────────────┘
                           │
                    [Áudio termina]
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              Button: recording (auto)                         │
│              Spectrum: modo recording                         │
└──────────────────────────┬───────────────────────────────────┘
                           │
              [Usuário fala ou timeout 60s]
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              Button: processing                               │
│              Envia áudio para edge function                   │
└──────────────────────────┬───────────────────────────────────┘
                           │
                   [Resposta retorna]
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              Button: playing (resposta)                       │
│              Footer aparece (primeira vez)                    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                    [Ciclo continua...]
```

---

## Banco de Dados

### Tabela: iconsai_agents

```sql
CREATE TABLE public.iconsai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT DEFAULT 'Bot',
  color TEXT DEFAULT '#00D4FF',
  welcome_audio_url TEXT,
  edge_function_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policies

| Policy | Descrição |
|--------|-----------|
| Public read | Leitura pública apenas para agentes ativos |
| Authenticated read | Usuários autenticados leem todos |
| Service role full | Acesso total para service role |

### Índices

- `idx_iconsai_agents_slug`: Lookup rápido por slug
- `idx_iconsai_agents_active`: Filtro de agentes ativos

---

## Compatibilidade Safari/iOS

O sistema utiliza várias técnicas para garantir funcionamento no Safari/iOS:

### Audio Warmup

```typescript
import { warmupAudioSync } from '@/utils/audio-warmup';

// SEMPRE chamar em resposta a gesto do usuário
const handleClick = () => {
  warmupAudioSync(); // Primeiro!
  playAudio();       // Depois
};
```

### SafariAudioUnlock

Componente invisível que desbloqueia áudio automaticamente:

```typescript
import { SafariAudioUnlock } from '@/components/pwa/SafariAudioUnlock';

// Incluído automaticamente no CoreApp
<SafariAudioUnlock />
```

### AudioEngine

O AudioEngine detecta automaticamente se deve usar o sistema de warmup:

```typescript
if (isAudioWarmed()) {
  await playWarmedAudio(url);  // Mobile path
} else {
  await audioManager.playAudio(id, url, source);  // Desktop path
}
```

---

## API Reference

### EventBus

| Método | Descrição |
|--------|-----------|
| `on(event, callback)` | Inscrever em evento |
| `once(event, callback)` | Inscrever uma vez |
| `emit(event, data)` | Emitir evento |
| `off(event)` | Remover listeners do evento |
| `clear()` | Remover todos os listeners |
| `listenerCount(event)` | Contar listeners |
| `setDebugMode(enabled)` | Habilitar logs |

### AudioEngine

| Método | Descrição |
|--------|-----------|
| `warmup()` | Preparar áudio (gesto) |
| `isReady()` | Verificar se está pronto |
| `play(url, agentName)` | Reproduzir áudio |
| `stop()` | Parar reprodução |
| `pause()` | Pausar |
| `resume()` | Retomar |
| `getState()` | Estado atual |
| `getProgress()` | Progresso (0-1) |
| `getFrequencyData()` | Dados de frequência |
| `setCallbacks(callbacks)` | Definir callbacks |
| `destroy()` | Limpar recursos |

### agents.config

| Função | Descrição |
|--------|-----------|
| `getAgentBySlug(slug)` | Buscar por slug |
| `getAgentByName(name)` | Buscar por nome |
| `getActiveAgents()` | Listar ativos |
| `getDefaultAgent()` | Agente padrão |
| `agentExists(slug)` | Verificar existência |

---

## Verificação

### Testes Manuais

1. Acessar `https://core.iconsai.ai/pwa/agents/home`
2. Verificar tela inicial: Header + Spectrum + Button
3. Clicar no botão → áudio de boas-vindas
4. Aguardar transição automática para gravação
5. Falar e verificar spectrum animando
6. Parar gravação → processing → resposta
7. Verificar footer aparece após primeira interação
8. Navegar para outro agente (quando disponível)

### Comandos de Teste

```bash
# TypeScript
npx tsc --noEmit

# Build
npm run build

# Testes unitários
npm run test -- --grep "UnifiedButton"
npm run test -- --grep "EventBus"

# Testes E2E
npm run test:e2e -- --grep "PWA Voice Flow"
```

---

## Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| **EventBus** | Comunicação desacoplada entre componentes |
| **Botão Único** | UX simplificada, ciclo previsível |
| **Footer Oculto** | Menos ruído visual no onboarding |
| **Agentes Isolados** | Desenvolvimento independente |
| **Reuso de Hooks** | Compatibilidade Safari já testada |
| **Lazy Loading** | Performance otimizada |

---

## Changelog

### v1.0.0 (2026-01-25)

- Implementação inicial da arquitetura
- Core: EventBus, AudioEngine, Types
- Components: UnifiedButton, SpectrumAnalyzer, ModuleHeader, NavigationFooter
- Router dinâmico para agentes
- Home Agent completo
- Migration para tabela iconsai_agents
