# AUDITORIA DO SISTEMA - PLANO DE ISOLAMENTO PWA

**Data:** 2026-01-24
**Versão:** 1.0.0
**Objetivo:** Documentar a estrutura atual do sistema para isolamento dos módulos PWA

---

## 1. VISÃO GERAL

O iconsai-core é um sistema monolítico contendo:

| Componente | Descrição | Status |
|------------|-----------|--------|
| **PWA Voice** | Assistente de voz principal (Saúde, Mundo, Ideias, Help) | MANTER |
| **PWA City** | Microserviço - Consultas sobre cidades | MANTER |
| **PWA Health** | Microserviço - Triagem médica | MANTER |
| **Admin Panel** | Dashboard administrativo | REMOVER |
| **Landing Page** | Homepage pública | REMOVER |
| **Documentation** | Documentação pública | REMOVER |

---

## 2. ESTRUTURA DE ARQUIVOS

### 2.1 Arquivos PWA (MANTER)

```
src/
├── components/
│   ├── pwa/                          # 43 arquivos - CORE PWA
│   │   ├── voice/                    # Componentes de voz
│   │   │   ├── PWAVoiceAssistant.tsx # Orquestrador principal
│   │   │   ├── AudioMessageCard.tsx
│   │   │   ├── ConversationDrawer.tsx
│   │   │   ├── FooterModules.tsx
│   │   │   ├── HistoryScreen.tsx
│   │   │   ├── ModuleSelector.tsx
│   │   │   ├── PlayButton.tsx
│   │   │   ├── SlidingMicrophone.tsx
│   │   │   ├── SpectrumAnalyzer.tsx
│   │   │   ├── SplashScreen.tsx
│   │   │   ├── ToggleMicrophoneButton.tsx
│   │   │   ├── UnifiedFooter.tsx
│   │   │   ├── UnifiedHeader.tsx
│   │   │   ├── VoicePlayerBox.tsx
│   │   │   └── VoiceSpectrumBidirectional.tsx
│   │   ├── containers/               # Containers de módulos
│   │   │   ├── HomeContainer.tsx
│   │   │   ├── HealthModuleContainer.tsx
│   │   │   ├── HelpModuleContainer.tsx
│   │   │   ├── IdeasModuleContainer.tsx
│   │   │   └── WorldModuleContainer.tsx
│   │   ├── modules/                  # Módulos visuais
│   │   │   ├── HealthModule.tsx
│   │   │   ├── HelpModule.tsx
│   │   │   ├── IdeasModule.tsx
│   │   │   ├── WorldModule.tsx
│   │   │   └── UnifiedModuleLayout.tsx
│   │   ├── history/
│   │   ├── microphone/
│   │   ├── microservices/
│   │   ├── settings/
│   │   ├── MobileFrame.tsx
│   │   ├── SafariAudioUnlock.tsx
│   │   └── VoiceSpectrum.tsx
│   │
│   ├── pwacity/                      # 5 arquivos - Microserviço City
│   │   ├── ChatMessage.tsx
│   │   ├── PWACityContainer.tsx
│   │   ├── PWACityHeader.tsx
│   │   ├── PromptArea.tsx
│   │   └── ResultArea.tsx
│   │
│   ├── pwahealth/                    # 4 arquivos - Microserviço Health
│   │   ├── PWAHealthContainer.tsx
│   │   ├── PWAHealthHeader.tsx
│   │   ├── PWAHealthPromptArea.tsx
│   │   └── PWAHealthResultArea.tsx
│   │
│   ├── ui/                           # 50+ arquivos - Shadcn UI (compartilhado)
│   │   └── [componentes Radix UI]
│   │
│   └── gates/                        # 10 arquivos - Auth/Device gates
│       ├── PWAAuthGate.tsx
│       ├── PWADesktopBlock.tsx
│       ├── PWAHealthAuthGate.tsx
│       ├── PWAHealthDeviceGate.tsx
│       ├── PWACityAuthGate.tsx
│       ├── PWACityDeviceGate.tsx
│       └── DeviceGate.tsx
│
├── pages/                            # Páginas PWA
│   ├── PWARegisterPage.tsx           # Login por telefone
│   ├── PWACityPage.tsx               # Microserviço City
│   └── PWAHealthPage.tsx             # Microserviço Health
│
├── stores/                           # Estado Zustand
│   ├── pwaVoiceStore.ts              # Estado principal PWA
│   ├── audioManagerStore.ts          # Gerenciador de áudio
│   └── historyStore.ts               # Histórico de mensagens
│
├── hooks/                            # Hooks PWA
│   ├── usePWAAuth.ts
│   ├── usePWACityAuth.ts
│   ├── usePWAHealthAuth.ts
│   ├── usePWAConversations.ts
│   ├── useAudioPlayer.ts
│   ├── useAudioRecorder.ts
│   ├── useMicrophonePermission.ts
│   ├── useTextToSpeech.ts
│   ├── useVoiceRecognition.ts
│   ├── useVoiceNarration.ts
│   ├── useSaveMessage.ts
│   ├── useDeviceFingerprint.ts
│   ├── useDeviceDetection.ts
│   ├── useConfigPWA.ts
│   └── useDemoMode.ts
│
├── modules/                          # Módulos de negócio
│   ├── pwa-voice/
│   │   ├── config.ts
│   │   └── services/
│   ├── pwa-health/
│   │   ├── config.ts
│   │   └── services/
│   └── unified-module/
│       ├── configs/
│       │   ├── health.config.ts
│       │   ├── help.config.ts
│       │   ├── ideas.config.ts
│       │   └── world.config.ts
│       └── services/
│
├── config/
│   └── voice-config.ts
│
├── constants/
│   ├── branding.ts
│   └── systemPrompts.ts
│
├── contexts/                         # Contextos React
│   ├── ThemeContext.tsx
│   └── AudioPlayerContext.tsx
│
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
│
├── utils/                            # Utilitários PWA
│   ├── audio-utils.ts
│   ├── safari-audio-setup.ts
│   ├── safari-ios-session.ts
│   ├── web-speech-setup.ts
│   └── haptics.ts
│
├── types/
│   └── pwa-*.ts
│
└── i18n/                             # Localização
```

### 2.2 Arquivos ADMIN/LEGACY (REMOVER)

```
src/
├── components/
│   ├── admin/                        # 142+ arquivos
│   │   ├── AnalyticsTab.tsx
│   │   ├── ChatConfigTab.tsx
│   │   ├── ContentManagementTab.tsx
│   │   ├── DocumentsTab.tsx
│   │   ├── TagsManagementTab.tsx
│   │   ├── TaxonomyManagerTab.tsx
│   │   ├── UserRegistryTab.tsx
│   │   ├── PWATab.tsx
│   │   ├── PWAConversationsTab.tsx
│   │   ├── PWAInvitesManager.tsx
│   │   └── [130+ outros arquivos]
│   │
│   ├── dashboard/                    # 8 arquivos
│   │   └── [componentes dashboard]
│   │
│   ├── DataFlowDiagram/              # 24 arquivos
│   │   └── [diagramas]
│   │
│   ├── chat/                         # 3 arquivos (não-PWA)
│   │   └── [chat genérico]
│   │
│   └── shared/                       # 5 arquivos
│       └── [componentes compartilhados admin]
│
├── pages/
│   ├── Admin.tsx
│   ├── AdminLogin.tsx
│   ├── AdminSignup.tsx
│   ├── AdminResetPassword.tsx
│   ├── Dashboard.tsx
│   ├── DashboardAdmin.tsx
│   ├── Documentation.tsx
│   ├── Contact.tsx
│   ├── Index.tsx                     # Landing page
│   ├── Hub.tsx
│   ├── Arquitetura.tsx
│   ├── InvitePage.tsx
│   ├── NotFound.tsx
│   └── TestRetailDiagram.tsx
│
├── hooks/
│   ├── useAuth.ts                    # Admin auth
│   ├── useAdminNotifications.ts
│   ├── useAdminSettings.ts
│   ├── useChat.ts
│   └── [12+ hooks admin]
│
├── contexts/
│   ├── DashboardAnalyticsContext.tsx
│   └── DateSyncContext.tsx
│
├── documentation/                    # Toda a pasta
│
├── stories/                          # Storybook
│
├── services/
│   ├── ibge-sidra-renda.ts
│   └── ipeadata-dolar.ts
│
└── data/
    └── demoSeedData.ts               # Opcional
```

---

## 3. DEPENDÊNCIAS SUPABASE

### 3.1 Tabelas PWA (MANTER)

| Tabela | Uso | Crítico |
|--------|-----|---------|
| `pwa_invites` | Convites por telefone | SIM |
| `pwa_user_devices` | Dispositivos registrados | SIM |
| `pwa_conversations` | Histórico de conversas | SIM |
| `pwa_conversation_sessions` | Sessões | SIM |
| `pwa_conversation_messages` | Mensagens | SIM |
| `pwa_conv_summaries` | Resumos | SIM |
| `pwa_access` | Controle de acesso | SIM |
| `admin_settings` | Configurações (leitura) | PARCIAL |
| `security_shield_whitelist` | Whitelist segurança | PARCIAL |

### 3.2 Tabelas Admin/Legacy (REMOVER)

| Tabela | Uso | Status |
|--------|-----|--------|
| `documents` | Upload documentos | REMOVER |
| `documents_chunks` | Chunks RAG | REMOVER |
| `tags` | Taxonomia | REMOVER |
| `tag_suggestions` | Sugestões tags | REMOVER |
| `taxonomy_nodes` | Árvore taxonomia | REMOVER |
| `api_endpoints` | Endpoints externos | REMOVER |
| `api_calls` | Log de chamadas | REMOVER |
| `email_logs` | Logs de email | REMOVER |
| `security_logs` | Logs segurança | REMOVER |
| `chat_analytics` | Analytics chat | REMOVER |
| `chat_agents` | Agentes de chat | REMOVER |
| `generated_images` | Imagens geradas | REMOVER |
| `section_audio` | Áudio de seções | REMOVER |
| `[40+ outras tabelas]` | Diversos | REMOVER |

### 3.3 RPC Functions PWA

```sql
-- MANTER
login_pwa_by_phone_simple(phone, device_info)
verify_pwa_code_simple(phone, code, device_fingerprint)
check_pwa_access(user_id)
get_pwa_users_aggregated()
```

### 3.4 Edge Functions PWA

| Function | Descrição | Crítico |
|----------|-----------|---------|
| `voice-to-text` | STT (Whisper) | SIM |
| `text-to-speech` | TTS (ElevenLabs) | SIM |
| `chat-router` | Roteamento AI | SIM |
| `pwa-save-message` | Salvar conversas | SIM |
| `pwa-contextual-memory` | Memória contexto | SIM |
| `pwa-saude-agent` | Módulo Saúde | SIM |
| `send-sms` | Envio SMS | SIM |
| `search-nearby-clinics` | Busca clínicas | PARCIAL |
| `generate-conversation-summary` | Resumos | PARCIAL |
| `pwacity-agent` | PWA City | SIM |
| `pwacity-gemini` | PWA City Gemini | SIM |
| `pwacity-openai` | PWA City OpenAI | SIM |
| `pwahealth-agent` | PWA Health | SIM |

---

## 4. DEPENDÊNCIAS NPM

### 4.1 PWA (MANTER)

```json
{
  "@hookform/resolvers": "^3.10.0",
  "@radix-ui/react-dialog": "^1.1.14",
  "@radix-ui/react-dropdown-menu": "^2.1.15",
  "@radix-ui/react-label": "^2.1.7",
  "@radix-ui/react-popover": "^1.1.14",
  "@radix-ui/react-select": "^2.2.5",
  "@radix-ui/react-separator": "^1.1.7",
  "@radix-ui/react-slider": "^1.3.5",
  "@radix-ui/react-slot": "^1.2.3",
  "@radix-ui/react-switch": "^1.2.5",
  "@radix-ui/react-tabs": "^1.1.12",
  "@radix-ui/react-toast": "^1.2.14",
  "@radix-ui/react-tooltip": "^1.2.7",
  "@supabase/supabase-js": "^2.84.0",
  "@tanstack/react-query": "^5.83.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "date-fns": "^3.6.0",
  "framer-motion": "^12.23.26",
  "input-otp": "^1.4.2",
  "js-cookie": "^3.0.5",
  "lucide-react": "^0.462.0",
  "next-themes": "^0.3.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-hook-form": "^7.61.1",
  "react-router-dom": "^6.30.1",
  "sonner": "^1.7.4",
  "tailwind-merge": "^2.6.0",
  "tailwindcss-animate": "^1.0.7",
  "zod": "^3.25.76",
  "zustand": "^5.0.9"
}
```

### 4.2 Admin/Legacy (REMOVER)

```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@tanstack/react-virtual": "^3.13.12",
  "dompurify": "^3.3.1",
  "embla-carousel-react": "^8.6.0",
  "html2canvas": "^1.4.1",
  "jspdf": "^3.0.4",
  "jspdf-autotable": "^5.0.2",
  "jszip": "^3.10.1",
  "mermaid": "^11.12.1",
  "papaparse": "^5.5.3",
  "pdfjs-dist": "^5.4.449",
  "qrcode": "^1.5.4",
  "qrcode.react": "^4.2.0",
  "react-dropzone": "^14.3.8",
  "react-markdown": "^10.1.0",
  "react-resizable-panels": "^2.1.9",
  "react-simple-maps": "^3.0.0",
  "recharts": "^2.15.4",
  "regression": "^2.0.1",
  "remark-gfm": "^4.0.1",
  "simple-statistics": "^7.8.8",
  "topojson-client": "^3.1.0",
  "vaul": "^0.9.9",
  "xlsx": "^0.18.5"
}
```

---

## 5. MAPA DE DEPENDÊNCIAS - COMPONENTES PWA

### 5.1 PWAVoiceAssistant (Componente Principal)

```
PWAVoiceAssistant.tsx
├── IMPORTS
│   ├── React, useState, useEffect, useCallback
│   ├── framer-motion (motion, AnimatePresence)
│   ├── lucide-react (icons)
│   ├── @/components/pwa/voice/* (componentes internos)
│   ├── @/stores/pwaVoiceStore
│   ├── @/stores/historyStore
│   ├── @/stores/audioManagerStore
│   ├── @/hooks/usePWAAuth
│   ├── @/hooks/useConfigPWA
│   ├── @/hooks/useDeviceFingerprint
│   ├── @/integrations/supabase/client
│   └── @/components/ui/* (Shadcn)
│
├── RENDERIZA
│   ├── SplashScreen (splash inicial)
│   ├── HomeContainer (home)
│   ├── HealthModuleContainer (módulo saúde)
│   ├── IdeasModuleContainer (módulo ideias)
│   ├── WorldModuleContainer (módulo mundo)
│   ├── HelpModuleContainer (módulo ajuda)
│   ├── FooterModules (footer)
│   └── HistoryScreen (histórico)
│
└── NÃO DEPENDE DE
    ├── components/admin/*
    ├── components/dashboard/*
    ├── pages/Admin*
    └── hooks/useAuth (admin)
```

### 5.2 PWACityContainer (Microserviço)

```
PWACityContainer.tsx
├── IMPORTS
│   ├── React, useState, useCallback, useEffect
│   ├── @/components/pwacity/* (componentes internos)
│   ├── @/integrations/supabase/client
│   ├── sonner (toast)
│   ├── @/hooks/useDemoMode
│   └── @/stores/demoStore
│
├── RENDERIZA
│   ├── PWACityHeader
│   ├── ResultArea
│   └── PromptArea
│
└── NÃO DEPENDE DE
    ├── components/pwa/voice/*
    ├── stores/pwaVoiceStore
    └── módulos admin
```

### 5.3 PWAHealthContainer (Microserviço)

```
PWAHealthContainer.tsx
├── IMPORTS
│   ├── React, useState, useCallback, useEffect
│   ├── @/components/pwahealth/* (componentes internos)
│   ├── @/integrations/supabase/client
│   └── sonner (toast)
│
├── RENDERIZA
│   ├── PWAHealthHeader
│   ├── PWAHealthResultArea
│   └── PWAHealthPromptArea
│
└── NÃO DEPENDE DE
    ├── components/pwa/voice/*
    ├── stores/pwaVoiceStore
    └── módulos admin
```

---

## 6. ERROS ATUAIS (A CORRIGIR)

### 6.1 Tabelas/Colunas Inexistentes

| Erro | Causa | Solução |
|------|-------|---------|
| `chat_analytics` 400 | Tabela não existe ou schema errado | Remover referências ou criar tabela |
| `chat_agents` 406 | Tabela não existe | Remover referências |
| `generated_images.section_id` | Coluna não existe | Remover referências |
| `section_audio` UUID inválido | Formato errado | Remover referências |
| `audio_plays` column | Coluna não existe em chat_analytics | Remover referências |

### 6.2 Componentes com Dependências Quebradas

```
DigitalExclusionSection.tsx
├── Chama: generated_images (coluna section_id não existe)
├── Chama: section_audio (UUID inválido)
└── SOLUÇÃO: Remover componente ou corrigir tabelas
```

### 6.3 Múltiplas Instâncias Supabase

```
Causa: Múltiplos GoTrueClient na mesma página
Solução: Singleton pattern no client.ts
```

---

## 7. PLANO DE MIGRAÇÃO

### Fase 1: Limpeza de Erros (Imediato)

1. [ ] Remover referências a tabelas inexistentes
2. [ ] Corrigir DigitalExclusionSection ou remover
3. [ ] Garantir singleton do Supabase client

### Fase 2: Isolamento de Módulos

1. [ ] Separar rotas: `/pwa/*` para PWA, `/admin/*` para admin
2. [ ] Lazy loading de módulos admin
3. [ ] CSS Modules ou Tailwind scoped

### Fase 3: Extração PWA (Novo Droplet)

1. [ ] Criar novo repositório `iconsai-pwa`
2. [ ] Copiar apenas arquivos PWA listados acima
3. [ ] package.json mínimo
4. [ ] Deploy em Droplet separado

### Fase 4: Core como Gestão

1. [ ] Core vira sistema de gestão
2. [ ] Funcionalidades: cadastro pessoas, logs, configurações
3. [ ] Remove PWA do core

---

## 8. ESTIMATIVA DE REDUÇÃO

| Métrica | Antes | Depois (PWA Only) | Redução |
|---------|-------|-------------------|---------|
| Arquivos | ~400 | ~100 | 75% |
| Bundle Size | ~2MB | ~500KB | 75% |
| Dependencies | 100 | 28 | 72% |
| Tabelas DB | 57+ | 9 | 84% |
| Edge Functions | 60+ | 13 | 78% |

---

## 9. CHECKLIST DE VALIDAÇÃO

### PWA Voice Standalone

- [ ] Splash screen funciona
- [ ] Login por telefone funciona
- [ ] Módulo Saúde funciona (OLDCARTS)
- [ ] Módulo Mundo funciona
- [ ] Módulo Ideias funciona
- [ ] Módulo Help funciona
- [ ] TTS funciona
- [ ] STT funciona
- [ ] Histórico funciona
- [ ] Scroll funciona no desktop (MobileFrame)

### PWA City Standalone

- [ ] Login funciona
- [ ] Chat funciona
- [ ] API routing funciona

### PWA Health Standalone

- [ ] Login funciona
- [ ] Chat funciona
- [ ] Agent funciona

---

## 10. CONTATOS E REFERÊNCIAS

- **Repositório Core:** https://github.com/arbachegit/iconsai-core
- **Repositório Production:** https://github.com/arbachegit/iconsai-production
- **Supabase Project:** eefoiubkvyykalsbcoci
- **Deploy:** DigitalOcean via GitHub Actions

---

*Documento gerado em 2026-01-24 por auditoria automatizada*
