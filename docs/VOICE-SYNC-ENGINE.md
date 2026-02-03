# IconsAI Voice Sync Engine

## Arquitetura Profissional para Sincronização Voz-Texto em Tempo Real

### Problema Resolvido

A dessincronização entre voz e texto no IconsAI ocorre por múltiplos fatores:

1. **OpenAI TTS não fornece timestamps nativos** - impossível sincronizar sem pós-processamento
2. **React/TypeScript Event Loop** - ciclos de renderização assíncronos causam delays variáveis
3. **Falta de encapsulamento** - funções dispersas sem controle de estado unificado
4. **Latência de rede variável** - sem compensação para jitter

### Solução Proposta

Arquitetura **Python Backend + WebSocket Bidirecional** com três estratégias de sincronização:

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React PWA)                       │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────┐    │
│  │ Mic Capture │    │   Karaoke   │    │ Audio Playback   │    │
│  │  (WebRTC)   │    │   Display   │    │  (Web Audio)     │    │
│  └──────┬──────┘    └──────▲──────┘    └────────▲─────────┘    │
│         │                  │                    │               │
│         └──────────────────┼────────────────────┘               │
│                            │                                    │
│              ══════════════╪════════════════                    │
│              ║  WebSocket  ║  Bidirecional ║                    │
│              ══════════════╪════════════════                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                      PYTHON BACKEND                             │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────┐         │
│  │              WebSocket Server (FastAPI)            │         │
│  │        Gerenciador de Estado da Conversa           │         │
│  └──────────┬─────────────────────────────┬──────────┘         │
│             │                             │                     │
│  ┌──────────▼──────────┐       ┌──────────▼──────────┐         │
│  │   STT Pipeline      │       │   TTS Pipeline      │         │
│  │  ┌───────────────┐  │       │  ┌───────────────┐  │         │
│  │  │ Whisper API   │  │       │  │ ElevenLabs    │  │         │
│  │  │ + Timestamps  │  │       │  │ + Timestamps  │  │         │
│  │  └───────────────┘  │       │  └───────────────┘  │         │
│  │  ┌───────────────┐  │       │  ┌───────────────┐  │         │
│  │  │ Forced Align  │  │       │  │ Char→Word    │  │         │
│  │  │ (Fallback)    │  │       │  │ Aggregator   │  │         │
│  │  └───────────────┘  │       │  └───────────────┘  │         │
│  └─────────────────────┘       └─────────────────────┘         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 Sync Coordinator                          │  │
│  │  • Buffer de compensação de latência                      │  │
│  │  • Clock sync entre cliente/servidor                      │  │
│  │  • Multiplexação de streams                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Estrutura do Projeto

```
iconsai-voice-sync/
├── src/
│   ├── __init__.py
│   ├── main.py                 # Entry point FastAPI
│   ├── config.py               # Configurações centralizadas
│   │
│   ├── core/                   # Núcleo do sistema
│   │   ├── __init__.py
│   │   ├── state_machine.py    # Máquina de estados da conversa
│   │   ├── sync_coordinator.py # Coordenador de sincronização
│   │   └── clock_sync.py       # Sincronização de relógio
│   │
│   ├── stt/                    # Speech-to-Text
│   │   ├── __init__.py
│   │   ├── whisper_client.py   # Cliente OpenAI Whisper
│   │   ├── streaming_stt.py    # STT em tempo real
│   │   └── forced_aligner.py   # Fallback para alinhamento
│   │
│   ├── tts/                    # Text-to-Speech
│   │   ├── __init__.py
│   │   ├── elevenlabs_client.py # Cliente ElevenLabs com timestamps
│   │   ├── openai_tts_client.py # Cliente OpenAI TTS
│   │   └── timestamp_generator.py # Gerador de timestamps por re-alinhamento
│   │
│   ├── websocket/              # Comunicação
│   │   ├── __init__.py
│   │   ├── server.py           # WebSocket server
│   │   ├── protocol.py         # Protocolo de mensagens
│   │   └── audio_streamer.py   # Streaming de áudio
│   │
│   └── utils/                  # Utilitários
│       ├── __init__.py
│       ├── audio_utils.py      # Manipulação de áudio
│       ├── text_normalizer.py  # Normalização PT-BR
│       └── pronunciation.py    # Dicionário de pronúncia
│
├── tests/
│   ├── test_sync.py
│   ├── test_stt.py
│   └── test_tts.py
│
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Dependências Principais

```txt
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
websockets>=12.0
python-multipart>=0.0.6
httpx>=0.26.0
numpy>=1.26.0
scipy>=1.12.0
pydub>=0.25.1
openai>=1.12.0
elevenlabs>=1.0.0
ctc-forced-aligner>=1.0.0   # Para fallback de alinhamento
aiofiles>=23.2.1
python-dotenv>=1.0.0
```

## Quick Start

```bash
# Clone e instale
cd iconsai-voice-sync
pip install -r requirements.txt

# Configure as chaves de API
cp .env.example .env
# Edite .env com suas chaves

# Execute
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

## Protocolo WebSocket

### Mensagens do Cliente → Servidor

```json
// Iniciar gravação
{"type": "start_recording", "session_id": "uuid"}

// Chunk de áudio (base64)
{"type": "audio_chunk", "data": "base64...", "timestamp": 1234567890}

// Parar gravação
{"type": "stop_recording"}

// Solicitar TTS
{"type": "tts_request", "text": "Olá, como posso ajudar?"}

// Sync de relógio
{"type": "clock_sync", "client_time": 1234567890}
```

### Mensagens do Servidor → Cliente

```json
// Transcrição parcial (enquanto fala)
{
  "type": "transcription_partial",
  "text": "Olá, tudo bem",
  "words": [
    {"word": "Olá", "start": 0.0, "end": 0.3, "confidence": 0.98},
    {"word": "tudo", "start": 0.35, "end": 0.6, "confidence": 0.95},
    {"word": "bem", "start": 0.65, "end": 0.9, "confidence": 0.97}
  ],
  "is_final": false
}

// Transcrição final
{
  "type": "transcription_final",
  "text": "Olá, tudo bem?",
  "words": [...],
  "is_final": true
}

// Áudio TTS com timestamps
{
  "type": "tts_response",
  "audio_base64": "...",
  "audio_format": "mp3",
  "duration_ms": 2500,
  "words": [
    {"word": "Olá", "start_ms": 0, "end_ms": 350},
    {"word": "como", "start_ms": 400, "end_ms": 600},
    {"word": "posso", "start_ms": 650, "end_ms": 950},
    {"word": "ajudar", "start_ms": 1000, "end_ms": 1500}
  ]
}

// Sync de relógio (resposta)
{
  "type": "clock_sync_response",
  "client_time": 1234567890,
  "server_time": 1234567895,
  "latency_estimate_ms": 25
}

// Karaoke tick (durante reprodução)
{
  "type": "karaoke_tick",
  "current_word_index": 2,
  "progress_percent": 45.5,
  "elapsed_ms": 650
}
```

## Estratégias de Sincronização

### 1. ElevenLabs com Timestamps Nativos (Recomendado)

ElevenLabs fornece timestamps de caracteres nativamente. O sistema:
1. Recebe character-level timestamps da API
2. Agrega em word-level timestamps
3. Envia junto com o áudio para o cliente
4. Cliente usa Web Audio API + requestAnimationFrame para karaokê

### 2. OpenAI TTS + Re-alinhamento via Whisper

Quando usar OpenAI TTS:
1. Gera áudio com OpenAI TTS
2. Passa o áudio gerado pelo Whisper com `timestamp_granularities: ["word"]`
3. Obtém timestamps precisos do próprio áudio gerado
4. Combina áudio + timestamps

### 3. Forced Alignment (Fallback)

Para casos onde as outras estratégias falham:
1. Usa `ctc-forced-aligner` com modelo Wav2Vec2
2. Alinha texto original com áudio gerado
3. Produz timestamps word-level

## Máquina de Estados

```
┌─────────┐     start_recording      ┌───────────┐
│  IDLE   │ ───────────────────────► │ RECORDING │
└────┬────┘                          └─────┬─────┘
     │                                     │
     │ tts_request                         │ stop_recording
     │                                     ▼
     │                               ┌───────────┐
     │                               │TRANSCRIBING│
     │                               └─────┬─────┘
     │                                     │
     │                                     │ transcription_complete
     │                                     ▼
     │                               ┌───────────┐
     │ ◄──────── speaking_done ───── │  SPEAKING │
     │                               └───────────┘
     │
     ▼
┌─────────┐
│GENERATING│ ──── tts_ready ────►  [SPEAKING]
│   TTS   │
└─────────┘
```

## Testes

```bash
# Testes unitários
pytest tests/ -v

# Teste de latência
python -m tests.benchmark_latency

# Teste de sincronização
python -m tests.test_sync_accuracy
```

## Métricas de Qualidade

O sistema monitora:
- **Latência STT**: tempo entre fim da fala e recebimento da transcrição
- **Latência TTS**: tempo entre requisição e início do áudio
- **Drift de sincronização**: diferença entre posição esperada e real do karaokê
- **Taxa de sucesso de timestamps**: % de palavras com timestamps válidos

## Variáveis de Ambiente

```env
# API Keys
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...

# Configurações
TTS_PROVIDER=elevenlabs  # ou openai
STT_MODEL=whisper-1
ELEVENLABS_VOICE_ID=...
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5

# WebSocket
WS_PORT=8000
WS_HOST=0.0.0.0
MAX_CONNECTIONS=100

# Sync
CLOCK_SYNC_INTERVAL_MS=5000
AUDIO_BUFFER_MS=100
```

## Notas de Implementação

### Por que Python e não Node.js/TypeScript?

1. **Ecossistema de áudio mais maduro**: numpy, scipy, pydub
2. **Bibliotecas de ML nativas**: ctc-forced-aligner, torch
3. **Menor overhead de event loop**: asyncio é mais previsível que Node.js para streaming
4. **Melhor debugging**: stack traces mais claros para pipelines de áudio

### Por que não processar tudo no frontend?

1. **Web Audio API tem limitações**: não consegue fazer forced alignment em tempo real
2. **Carga computacional**: alignment e processamento pesado sobrecarrega dispositivos móveis
3. **Consistência**: servidor centralizado garante mesmos resultados em qualquer dispositivo
4. **Chaves de API**: não expor no frontend

## Integração com Frontend Existente

O frontend React/TypeScript existente precisa apenas:

1. Substituir chamadas diretas às APIs por WebSocket
2. Implementar player de áudio sincronizado com karaokê
3. Usar timestamps recebidos para highlight de palavras

Exemplo de integração mínima:

```typescript
// hooks/useVoiceSync.ts
const ws = new WebSocket('wss://api.iconsai.com/voice');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'tts_response') {
    // Reproduz áudio
    playAudio(msg.audio_base64);
    // Inicia karaokê com timestamps
    startKaraoke(msg.words);
  }
};
```

---

## Comparação: Implementação Atual vs Proposta

### Sistema Atual (Supabase Edge Functions)

| Aspecto | Implementação Atual |
|---------|---------------------|
| **Backend** | Supabase Edge Functions (Deno) |
| **STT** | OpenAI Whisper via `voice-to-text` |
| **TTS** | OpenAI TTS via `text-to-speech-karaoke` |
| **Timestamps** | Whisper re-alignment do áudio TTS |
| **Comunicação** | HTTP Request/Response |
| **Sync Frontend** | `useKaraokeSync` hook (requestAnimationFrame) |

### Sistema Proposto (Python + WebSocket)

| Aspecto | Proposta |
|---------|----------|
| **Backend** | FastAPI + WebSocket (Python) |
| **STT** | Whisper + Streaming parcial |
| **TTS** | ElevenLabs (timestamps nativos) ou OpenAI + Whisper |
| **Timestamps** | Nativos ou Forced Alignment fallback |
| **Comunicação** | WebSocket Bidirecional |
| **Sync Frontend** | Server-driven ticks + requestAnimationFrame |

### Benefícios da Proposta

1. **Streaming em tempo real** - transcrição parcial enquanto fala
2. **Menor latência** - WebSocket vs HTTP
3. **Clock sync** - compensação de latência
4. **ElevenLabs** - timestamps nativos sem re-processamento
5. **Fallback robusto** - Forced Alignment para casos edge

### Custos da Migração

1. Novo serviço para hospedar (Python/FastAPI)
2. Refatoração do frontend para WebSocket
3. Integração com ElevenLabs (novo provider)
4. Manutenção de dois backends

---

**Próximos Passos:**
1. Implementar `elevenlabs_client.py` com timestamps
2. Implementar `sync_coordinator.py`
3. Testes de integração
4. Deploy em DigitalOcean
