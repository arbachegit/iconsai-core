# Arquitetura do Sistema IconsAI

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE (Browser)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         PÁGINAS (Routes)                             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  /voice-assistant  │  /dashboard  │  /admin  │  /pwa/*              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      COMPONENTES PRINCIPAIS                          │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │   │
│  │  │VoiceAssistantPage│  │    Dashboard     │  │      Admin       │  │   │
│  │  │                  │  │                  │  │                  │  │   │
│  │  │ - VoiceButton    │  │ - Analytics      │  │ - UserManagement │  │   │
│  │  │ - VoiceAnalyzer  │  │ - UserList       │  │ - Institutions   │  │   │
│  │  │ - KaraokeText    │  │ - AgentConfig    │  │ - Invitations    │  │   │
│  │  │ - Transcription  │  │ - ActivityLogs   │  │ - RoleManagement │  │   │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           HOOKS & SERVICES                           │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌────────────────────┐  ┌────────────────────┐                     │   │
│  │  │ useVoiceAssistant  │  │   useKaraokeSync   │                     │   │
│  │  │                    │  │                    │                     │   │
│  │  │ - State machine    │  │ - Audio sync       │                     │   │
│  │  │ - Recording        │  │ - Word index       │                     │   │
│  │  │ - Playback         │  │ - Simulation mode  │                     │   │
│  │  │ - Message history  │  │ - 60fps updates    │                     │   │
│  │  └────────────────────┘  └────────────────────┘                     │   │
│  │                                                                      │   │
│  │  ┌────────────────────┐  ┌────────────────────┐                     │   │
│  │  │    VoicePlayer     │  │   VoiceRecorder    │                     │   │
│  │  │                    │  │                    │                     │   │
│  │  │ - Audio playback   │  │ - MediaRecorder    │                     │   │
│  │  │ - TTS integration  │  │ - Audio capture    │                     │   │
│  │  │ - Frequency data   │  │ - Base64 encoding  │                     │   │
│  │  │ - Safari warmup    │  │ - Frequency data   │                     │   │
│  │  └────────────────────┘  └────────────────────┘                     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE (Backend)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        EDGE FUNCTIONS (Deno)                         │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │  │  voice-to-text  │  │ text-to-speech  │  │  chat-router    │     │   │
│  │  │                 │  │                 │  │                 │     │   │
│  │  │ OpenAI Whisper  │  │ OpenAI TTS      │  │ Perplexity      │     │   │
│  │  │ Word timestamps │  │ Humanization    │  │ Gemini          │     │   │
│  │  └─────────────────┘  └─────────────────┘  │ GPT Fallback    │     │   │
│  │                                            └─────────────────┘     │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │  │ tts-karaoke     │  │ pwa-home-agent  │  │ send-email/sms  │     │   │
│  │  │                 │  │                 │  │                 │     │   │
│  │  │ TTS + Whisper   │  │ Intent classify │  │ Resend          │     │   │
│  │  │ Sync timestamps │  │ Data fetching   │  │ Twilio          │     │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      POSTGRESQL DATABASE                             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  institutions ◄──► platform_users ◄──► pwa_sessions                 │   │
│  │       │                   │                   │                      │   │
│  │       ▼                   ▼                   ▼                      │   │
│  │  departments         user_roles        pwa_conversations            │   │
│  │                                               │                      │   │
│  │  iconsai_agents ◄──► pwa_agent_voice_config   │                      │   │
│  │                                               ▼                      │   │
│  │  phonetic_rules                      pwa_user_activity              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Máquina de Estados - Voice Assistant

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
              ┌──────────┐                                    │
              │   IDLE   │ ◄─────────────────────────────┐    │
              │          │                               │    │
              │ (play)   │                               │    │
              └────┬─────┘                               │    │
                   │ click                               │    │
                   ▼                                     │    │
              ┌──────────┐                               │    │
              │ GREETING │                               │    │
              │          │                               │    │
              │ (audio)  │                               │    │
              └────┬─────┘                               │    │
                   │ audio ends                          │    │
                   ▼                                     │    │
              ┌──────────┐         error                 │    │
    ┌────────►│  READY   │ ──────────────────────────────┘    │
    │         │          │                                    │
    │         │ (mic)    │                                    │
    │         └────┬─────┘                                    │
    │              │ click                                    │
    │              ▼                                          │
    │         ┌──────────┐                                    │
    │         │RECORDING │                                    │
    │         │          │                                    │
    │         │ (stop)   │                                    │
    │         └────┬─────┘                                    │
    │              │ click                                    │
    │              ▼                                          │
    │         ┌──────────┐         error                      │
    │         │PROCESSING│ ───────────────────────────────────┘
    │         │          │
    │         │(spinner) │
    │         └────┬─────┘
    │              │ response ready
    │              ▼
    │         ┌──────────┐
    │         │ SPEAKING │
    │         │          │
    │         │ (audio)  │
    │         └────┬─────┘
    │              │ audio ends
    └──────────────┘
```

## Fluxo de Dados - Karaoke Sync

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUXO KARAOKÊ - ROBÔ                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. text-to-speech-karaoke                                              │
│     │                                                                   │
│     ├──► Gera áudio TTS (OpenAI)                                       │
│     │                                                                   │
│     ├──► Transcreve áudio (Whisper) ──► word timestamps                │
│     │                                                                   │
│     └──► Retorna: { audioBase64, words: [{word, start, end}] }         │
│                                                                         │
│  2. VoicePlayer.fetchKaraokeTTS()                                       │
│     │                                                                   │
│     └──► Converte base64 para blob URL                                 │
│                                                                         │
│  3. useVoiceAssistant.addMessage()                                      │
│     │                                                                   │
│     └──► Adiciona mensagem COM words (ANTES de tocar)                  │
│                                                                         │
│  4. VoicePlayer.play()                                                  │
│     │                                                                   │
│     └──► Inicia reprodução do áudio                                    │
│                                                                         │
│  5. useKaraokeSync (modo áudio real)                                    │
│     │                                                                   │
│     ├──► Polling detecta áudio tocando                                 │
│     │                                                                   │
│     ├──► requestAnimationFrame loop (60fps)                            │
│     │                                                                   │
│     ├──► audioElement.currentTime ──► findCurrentWordIndex()           │
│     │                                                                   │
│     └──► setState({ currentWordIndex, currentTime, isPlaying })        │
│                                                                         │
│  6. KaraokeText                                                         │
│     │                                                                   │
│     └──► Renderiza palavras com estado visual:                         │
│         - pending (opacity 0.4)                                         │
│         - active (highlight + scale 1.05)                               │
│         - completed (opacity 1)                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUXO KARAOKÊ - USUÁRIO                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. voice-to-text                                                       │
│     │                                                                   │
│     └──► Whisper com timestamp_granularities=["word"]                  │
│         └──► Retorna: { text, words: [{word, start, end}] }            │
│                                                                         │
│  2. useVoiceAssistant.addMessage()                                      │
│     │                                                                   │
│     └──► Adiciona mensagem do usuário COM words                        │
│                                                                         │
│  3. useKaraokeSync (modo SIMULADO)                                      │
│     │                                                                   │
│     ├──► Detecta novas words (wordsId)                                 │
│     │                                                                   │
│     ├──► simulationStartRef = performance.now()                        │
│     │                                                                   │
│     ├──► requestAnimationFrame loop (60fps)                            │
│     │                                                                   │
│     ├──► elapsed = (now - start) / 1000                                │
│     │                                                                   │
│     ├──► findCurrentWordIndex(elapsed)                                 │
│     │                                                                   │
│     └──► setState({ currentWordIndex, isPlaying: elapsed < duration }) │
│                                                                         │
│  4. KaraokeText                                                         │
│     │                                                                   │
│     └──► Mesmo render que robô, mas sem áudio real                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Integração com APIs Externas

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          APIs EXTERNAS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         OPENAI                                   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  Whisper API                    TTS API                         │   │
│  │  ─────────────                  ───────                         │   │
│  │  POST /v1/audio/transcriptions  POST /v1/audio/speech           │   │
│  │                                                                  │   │
│  │  Input:                         Input:                          │   │
│  │  - audio file (webm/mp4)        - text                          │   │
│  │  - model: whisper-1             - model: gpt-4o-mini-tts        │   │
│  │  - response_format: verbose_json - voice: nova/shimmer/etc      │   │
│  │  - timestamp_granularities:word  - instructions (humanização)   │   │
│  │                                                                  │   │
│  │  Output:                        Output:                         │   │
│  │  - text                         - audio/mpeg stream             │   │
│  │  - words: [{word, start, end}]                                  │   │
│  │  - duration                                                     │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      GOOGLE AI                                   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  Gemini 2.0 Flash API                                           │   │
│  │  ────────────────────                                           │   │
│  │  POST /v1beta/models/gemini-2.0-flash:generateContent           │   │
│  │                                                                  │   │
│  │  Input:                                                         │   │
│  │  - contents: [{ role, parts: [{ text }] }]                      │   │
│  │  - systemInstruction                                            │   │
│  │  - generationConfig: { temperature, maxOutputTokens }           │   │
│  │                                                                  │   │
│  │  Output:                                                        │   │
│  │  - candidates: [{ content: { parts: [{ text }] } }]             │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    COMUNICAÇÃO                                   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  Resend (Email)     Twilio (SMS/WhatsApp)                       │   │
│  │  ──────────────     ─────────────────────                       │   │
│  │  POST /emails       POST /Messages.json                         │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Segurança e Autenticação

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MODELO DE SEGURANÇA                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    AUTENTICAÇÃO                                  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  Supabase Auth                                                   │   │
│  │  ─────────────                                                   │   │
│  │  - Email/Password login                                         │   │
│  │  - Session tokens (JWT)                                         │   │
│  │  - Refresh tokens                                               │   │
│  │                                                                  │   │
│  │  PWA Sessions                                                    │   │
│  │  ────────────                                                    │   │
│  │  - Device ID tracking (anonymous)                               │   │
│  │  - Session persistence                                          │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    AUTORIZAÇÃO (RBAC)                            │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  Roles:                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │  superadmin  │  │    admin     │  │     user     │          │   │
│  │  ├──────────────┤  ├──────────────┤  ├──────────────┤          │   │
│  │  │ All access   │  │ Institution  │  │ PWA access   │          │   │
│  │  │ All instit.  │  │ scope only   │  │ Voice assist │          │   │
│  │  │ User mgmt    │  │ User mgmt    │  │ No admin     │          │   │
│  │  │ System config│  │ Agent config │  │              │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                ROW LEVEL SECURITY (RLS)                          │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  - Users can only see their institution's data                  │   │
│  │  - Conversations scoped to session/user                         │   │
│  │  - Activity logs scoped to institution                          │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```
