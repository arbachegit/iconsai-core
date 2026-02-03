# IconsAI - Documentação do Sistema

> Plataforma PWA de Assistente de Voz Inteligente

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Funcionalidades Principais](#funcionalidades-principais)
4. [Stack Tecnológico](#stack-tecnológico)
5. [Estrutura do Projeto](#estrutura-do-projeto)
6. [Edge Functions](#edge-functions)
7. [Banco de Dados](#banco-de-dados)
8. [Fluxos de Usuário](#fluxos-de-usuário)
9. [Recursos Avançados](#recursos-avançados)
10. [Painel Administrativo](#painel-administrativo)
11. [Configuração e Deploy](#configuração-e-deploy)

---

## Visão Geral

O **IconsAI** é uma **Progressive Web Application (PWA)** com assistentes de voz inteligentes, projetada para permitir que cidadãos brasileiros acessem informações e serviços através de conversas por voz em português natural.

### Principais Características

- **Interação por Voz**: Transcrição e síntese de voz em tempo real
- **Agentes Inteligentes**: Arquitetura modular com múltiplos agentes especializados
- **Multi-institucional**: Suporte a múltiplas organizações com controle de acesso
- **PWA**: Instalável, offline-first, mobile-first
- **Dashboard Administrativo**: Gestão completa de usuários, agentes e analytics

---

## Arquitetura

### Visão de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React PWA)                      │
├─────────────────────────────────────────────────────────────────┤
│  VoiceAssistantPage  │  Dashboard  │  Admin  │  PWA Simulator   │
├─────────────────────────────────────────────────────────────────┤
│                    Core Services & Hooks                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ VoicePlayer  │ │VoiceRecorder │ │ useVoiceAssistant        │ │
│  │ AudioEngine  │ │ EventBus     │ │ useKaraokeSync           │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend)                            │
├─────────────────────────────────────────────────────────────────┤
│  Edge Functions (Deno)          │  PostgreSQL Database          │
│  ┌────────────────────────────┐ │  ┌──────────────────────────┐ │
│  │ voice-to-text (Whisper)   │ │  │ institutions             │ │
│  │ text-to-speech (OpenAI)   │ │  │ platform_users           │ │
│  │ text-to-speech-karaoke    │ │  │ pwa_sessions             │ │
│  │ chat-router (LLM)         │ │  │ pwa_conversations        │ │
│  │ pwa-home-agent            │ │  │ iconsai_agents           │ │
│  └────────────────────────────┘ │  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL APIs                                 │
├─────────────────────────────────────────────────────────────────┤
│  OpenAI Whisper  │  OpenAI TTS  │  Google Gemini  │  Twilio     │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados - Interação por Voz

```
Usuário fala ──► VoiceRecorder ──► Base64 Audio
                                        │
                                        ▼
                              voice-to-text (Whisper)
                                        │
                                        ▼
                              Texto + Word Timestamps
                                        │
                                        ▼
                              chat-router (LLM)
                                        │
                                        ▼
                              Resposta em Texto
                                        │
                                        ▼
                          text-to-speech-karaoke
                                        │
                                        ▼
                          Audio + Word Timestamps
                                        │
                                        ▼
                    VoicePlayer ──► Usuário ouve
                          +
                    KaraokeText (sync visual)
```

---

## Funcionalidades Principais

### 1. Interação por Voz

| Recurso | Descrição |
|---------|-----------|
| **Transcrição em tempo real** | OpenAI Whisper com timestamps palavra-por-palavra |
| **Síntese de voz natural** | OpenAI gpt-4o-mini-tts com humanização configurável |
| **Efeito Karaokê** | Texto destacado sincronizado com o áudio (60fps) |
| **Analisador de espectro** | Feedback visual bidirecional (usuário/robô) |
| **Compatibilidade Safari/iOS** | Warmup e unlock de áudio para dispositivos Apple |

### 2. Sistema de Agentes Inteligentes

- **Arquitetura modular**: Cada agente é independente e extensível
- **Classificação de intenção**: Identifica automaticamente o tipo de pergunta
  - `localizacao` - "onde fica", "como chegar"
  - `populacao` - "quantos habitantes", "dados demográficos"
  - `saude` - "hospital", "consulta", "emergência"
  - `educacao` - "escola", "matrícula", "ensino"
  - `atualidades` - "notícias", "últimas novidades"
  - `geral` - fallback para perguntas gerais
- **Respostas contextuais**: Busca dados no banco antes de gerar resposta via IA

### 3. Interface de Usuário

**Layout em 3 colunas:**

```
┌────────────────┬────────────────────┬────────────────┐
│                │                    │                │
│   USUÁRIO      │      CENTRO        │   ASSISTENTE   │
│                │                    │                │
│  Histórico     │   Logo IconsAI     │  Histórico     │
│  de mensagens  │                    │  de respostas  │
│  do usuário    │   Título dinâmico  │  do assistente │
│                │                    │                │
│  (emerald)     │   [VoiceButton]    │  (cyan)        │
│                │                    │                │
│                │   VoiceAnalyzer    │                │
│                │                    │                │
│                │   Legenda + Badges │                │
│                │                    │                │
└────────────────┴────────────────────┴────────────────┘
```

**Estados do botão de voz:**
- `idle` - Aguardando início (ícone play)
- `greeting` - Reproduzindo boas-vindas
- `ready` - Pronto para gravar (ícone microfone)
- `recording` - Gravando (ícone stop)
- `processing` - Processando (spinner)
- `speaking` - Reproduzindo resposta

---

## Stack Tecnológico

### Frontend

| Tecnologia | Versão | Finalidade |
|------------|--------|------------|
| React | 18.3 | Framework UI |
| TypeScript | 5.8 | Tipagem estática |
| Vite | 5.4 | Build tool |
| Tailwind CSS | 3.x | Estilização |
| shadcn/ui | - | Componentes UI |
| Radix UI | - | Primitivos acessíveis |
| Framer Motion | - | Animações |
| TanStack Query | - | Data fetching |
| Zustand | - | State management |
| React Router | 6.x | Navegação |

### Áudio e Voz

| Tecnologia | Finalidade |
|------------|------------|
| OpenAI Whisper | Speech-to-text com word timestamps |
| OpenAI gpt-4o-mini-tts | Text-to-speech com instruções |
| Google Cloud TTS | TTS fallback |
| Web Audio API | Análise de frequência |

### Inteligência Artificial

| Tecnologia | Finalidade |
|------------|------------|
| Google Gemini 2.0 Flash | Respostas conversacionais |
| OpenAI GPT | Fallback LLM |
| Perplexity | Busca com contexto web |

### Backend

| Tecnologia | Finalidade |
|------------|------------|
| Supabase | BaaS (Auth + DB + Functions) |
| PostgreSQL | Banco de dados |
| Deno | Runtime das Edge Functions |

---

## Estrutura do Projeto

```
iconsai-core/
├── docs/                          # Documentação
├── public/                        # Assets estáticos
├── src/
│   ├── assets/                    # Imagens e logos
│   ├── components/
│   │   ├── ui/                    # Componentes shadcn/ui
│   │   ├── voice-assistant/       # Componentes do assistente de voz
│   │   │   ├── VoiceAssistantPage.tsx
│   │   │   ├── VoiceButton.tsx
│   │   │   ├── VoiceAnalyzer.tsx
│   │   │   ├── KaraokeText.tsx
│   │   │   └── types.ts
│   │   ├── admin/                 # Componentes administrativos
│   │   └── dashboard/             # Componentes do dashboard
│   ├── core/
│   │   └── services/
│   │       └── VoiceService/
│   │           ├── VoicePlayer.ts
│   │           └── VoiceRecorder.ts
│   ├── hooks/
│   │   ├── useVoiceAssistant.ts   # Hook principal do assistente
│   │   └── useKaraokeSync.ts      # Sincronização karaokê
│   ├── integrations/
│   │   └── supabase/              # Cliente Supabase
│   ├── pages/                     # Páginas da aplicação
│   └── lib/                       # Utilitários
├── supabase/
│   └── functions/                 # Edge Functions
│       ├── voice-to-text/
│       ├── text-to-speech/
│       ├── text-to-speech-karaoke/
│       ├── chat-router/
│       └── pwa-home-agent/
└── package.json
```

---

## Edge Functions

### voice-to-text (v3.0.0)

Transcreve áudio para texto usando OpenAI Whisper.

**Entrada:**
```typescript
{
  audio: string;              // Base64 encoded audio
  mimeType: string;           // "audio/webm", "audio/mp4", etc.
  includeWordTimestamps?: boolean;  // Retornar timestamps por palavra
}
```

**Saída:**
```typescript
{
  text: string;               // Texto transcrito
  words?: WordTiming[];       // [{word, start, end}, ...]
  duration?: number;          // Duração total em segundos
}
```

### text-to-speech-karaoke (v1.0.0)

Gera áudio TTS com timestamps palavra-por-palavra para sincronização karaokê.

**Fluxo interno:**
1. Gera áudio TTS (OpenAI)
2. Transcreve o áudio gerado (Whisper) para obter timestamps
3. Retorna áudio + timestamps

**Entrada:**
```typescript
{
  text: string;       // Texto para sintetizar
  chatType: string;   // Tipo de agente ("home", "health", etc.)
  voice: string;      // Voz ("nova", "shimmer", etc.)
  speed?: number;     // Velocidade (0.5 - 2.0)
}
```

**Saída:**
```typescript
{
  audioBase64: string;        // Áudio em base64
  audioMimeType: string;      // "audio/mpeg"
  words: WordTiming[];        // Timestamps por palavra
  duration: number;           // Duração total
  text: string;               // Texto processado
}
```

### chat-router

Roteia requisições para o LLM mais adequado com fallback.

**Ordem de prioridade:**
1. Perplexity (busca com contexto web)
2. Google Gemini 2.0 Flash
3. OpenAI GPT-4

---

## Banco de Dados

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `institutions` | Organizações/empresas usando a plataforma |
| `departments` | Departamentos dentro de instituições |
| `platform_users` | Contas de usuário com roles |
| `user_invites` | Rastreamento de convites |
| `user_roles` | Atribuições de papel (superadmin, admin, user) |
| `iconsai_agents` | Configuração de agentes/módulos |
| `pwa_sessions` | Sessões de usuário com device tracking |
| `pwa_conversations` | Histórico de conversas com análise de sentimento |
| `pwa_user_activity` | Log de ações do usuário |
| `phonetic_rules` | Regras de pronúncia customizadas |
| `pwa_agent_voice_config` | Configurações de humanização de voz por agente |

### Modelo de Dados Simplificado

```
institutions (1) ──────► (N) departments
      │
      └──► (N) platform_users ──► (N) user_roles
                    │
                    └──► (N) pwa_sessions ──► (N) pwa_conversations
```

---

## Fluxos de Usuário

### Fluxo Principal - Assistente de Voz

```
1. Usuário acessa /voice-assistant
2. Clica no botão central (estado: idle)
3. Sistema reproduz mensagem de boas-vindas (estado: greeting)
   └─► Texto aparece com efeito karaokê sincronizado
4. Transição automática para modo gravação (estado: ready)
5. Usuário fala sua pergunta
6. Clica para parar gravação (estado: processing)
7. Sistema processa:
   a. Transcreve áudio (Whisper)
   b. Classifica intenção
   c. Busca dados contextuais
   d. Gera resposta (LLM)
   e. Sintetiza voz (TTS)
8. Reproduz resposta com texto sincronizado (estado: speaking)
9. Retorna ao estado ready para próxima pergunta
```

### Fluxo de Convite de Usuário

```
1. Admin acessa Dashboard → Usuários → Convidar
2. Preenche dados (nome, email, role)
3. Seleciona método de envio (email/WhatsApp/SMS)
4. Sistema gera código de verificação
5. Usuário recebe convite com link
6. Usuário clica no link → página de aceite
7. Insere código de verificação
8. Define senha
9. Acesso liberado à plataforma
```

---

## Recursos Avançados

### Sistema de Pronúncia Fonética

O sistema inclui mais de 200 termos brasileiros com pronúncia customizada:

```typescript
// Exemplos de mapeamento fonético
"PIB" → "pi-bi"
"IBGE" → "i-bê-gê-ê"
"COVID" → "côvid"
"R$" → "reais"
```

**Normalização de números:**
```
"R$ 1.234,56" → "mil duzentos e trinta e quatro reais e cinquenta e seis centavos"
"15%" → "quinze por cento"
"2024" → "dois mil e vinte e quatro"
```

### Humanização de Voz

Configurações ajustáveis por agente através do dashboard:

| Parâmetro | Range | Descrição |
|-----------|-------|-----------|
| Calor (warmth) | 0-100 | Tom emocional |
| Entusiasmo | 0-100 | Nível de energia |
| Ritmo (pace) | 0-100 | Cadência da fala |
| Expressividade | 0-100 | Variação melódica |
| Formalidade | 0-100 | Registro linguístico |
| Velocidade | 0.5x-2x | Taxa de fala |

**Recursos adicionais:**
- Palavras de preenchimento ("então", "olha", "veja")
- Pausas naturais simulando respiração
- Respostas emocionais contextuais

### Sincronização Karaokê (v3.1.0)

O hook `useKaraokeSync` sincroniza texto com áudio em tempo real:

```typescript
const { currentWordIndex, currentTime, isPlaying } = useKaraokeSync({
  words: message.words,           // Array de WordTiming
  getAudioElement,                // Getter do elemento de áudio
  enabled: true,
  simulatePlayback: false,        // true para modo sem áudio
});
```

**Características:**
- Atualização a 60fps via requestAnimationFrame
- Modo simulado para transcrições do usuário (sem áudio real)
- Detecção robusta de novas palavras
- Compatível com Safari/iOS

---

## Painel Administrativo

### Níveis de Acesso

| Role | Permissões |
|------|------------|
| **Superadmin** | Acesso total: todas instituições, usuários, configurações |
| **Admin** | Gestão da própria instituição: usuários, agentes, logs |
| **User** | Acesso ao PWA e assistente de voz |

### Funcionalidades do Dashboard

#### Aba: Indicadores
- KPIs de uso (sessões, conversas, tempo médio)
- Gráficos de tendência
- Tempos de resposta
- Taxa de satisfação

#### Aba: Instituições
- CRUD de organizações
- Gestão de departamentos
- Configurações por instituição

#### Aba: Usuários
- Lista de usuários com filtros
- Convites (email/WhatsApp/SMS)
- Edição de perfil e roles
- Ativação/desativação

#### Aba: Agentes
- Configuração de agentes disponíveis
- Ajustes de voz (humanização)
- Status e visibilidade
- Mensagens de boas-vindas

#### Aba: Logs de Atividade
- Timeline de ações
- Filtros por usuário/período
- Análise de emoções
- Exportação de dados

---

## Configuração e Deploy

### Variáveis de Ambiente

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# OpenAI (Edge Functions)
OPENAI_API_KEY=sk-xxx

# Google (Edge Functions)
GOOGLE_AI_API_KEY=xxx

# Twilio (opcional)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
```

### Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install

# Desenvolvimento local
npm run dev

# Build de produção
npm run build

# Deploy das Edge Functions
supabase functions deploy voice-to-text
supabase functions deploy text-to-speech-karaoke
supabase functions deploy chat-router

# Deploy do frontend (Netlify)
netlify deploy --prod --dir=dist
```

### Estrutura de Build

O Vite está configurado com code-splitting otimizado:

```
dist/
├── assets/
│   ├── vendor-react-xxx.js      # React core
│   ├── vendor-radix-xxx.js      # Radix UI
│   ├── vendor-charts-xxx.js     # Recharts
│   ├── vendor-supabase-xxx.js   # Supabase client
│   ├── vendor-heavy-xxx.js      # Dependências pesadas
│   └── index-xxx.js             # App principal
└── index.html
```

---

## Versionamento

### Componentes Principais

| Componente | Versão | Última Atualização |
|------------|--------|-------------------|
| VoiceAssistantPage | v5.2.0 | Simplificação karaokê |
| useVoiceAssistant | v3.1.0 | Fetch words antes de tocar |
| useKaraokeSync | v3.1.0 | Fix race conditions |
| VoicePlayer | v2.0.0 | Karaoke TTS support |
| voice-to-text | v3.0.0 | Word timestamps |
| text-to-speech-karaoke | v1.0.0 | TTS + Whisper sync |

---

## Suporte

Para dúvidas ou problemas:
- Abra uma issue no repositório
- Contate o time de desenvolvimento

---

*Documentação gerada em 2026-02-03*
