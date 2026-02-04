# IconsAI Backend

Backend Python (FastAPI) para o Voice Sync Engine do IconsAI. Substitui as Supabase Edge Functions problemáticas mantendo **100% de compatibilidade com o frontend existente**.

## Por que este Backend?

| Problema (Edge Functions) | Solução (Python) |
|--------------------------|------------------|
| OpenAI TTS sem timestamps nativos | ElevenLabs com timestamps por caractere |
| Re-alinhamento Whisper adiciona latência | Timestamps nativos eliminam re-processamento |
| Deno/Edge Functions limitam bibliotecas | Python tem scipy, numpy, pydub, etc. |
| Sem controle de estado da sessão | SyncCoordinator com máquina de estados |

## Arquitetura

```
┌────────────────────────────────────────────────────────────────┐
│                      FRONTEND (SEM MUDANÇAS)                   │
│  useVoiceAssistant.ts → VoicePlayer.ts → supabase.functions    │
└─────────────────────────────────┬──────────────────────────────┘
                                  │
                    VITE_SUPABASE_URL = https://api.iconsai.com
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────┐
│                    PYTHON BACKEND (FastAPI)                    │
│                                                                │
│  POST /functions/v1/voice-to-text      → WhisperSTTService     │
│  POST /functions/v1/text-to-speech-karaoke → ElevenLabsTTS     │
│  POST /functions/v1/chat-router        → OpenAI Chat Proxy     │
└────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Instalar dependências

```bash
cd iconsai-backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Editar .env com suas API keys
```

### 3. Executar servidor

```bash
# Desenvolvimento
uvicorn src.main:app --reload --port 8000

# Produção
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### 4. Testar

```bash
# Health check
curl http://localhost:8000/health

# TTS com timestamps
curl -X POST http://localhost:8000/functions/v1/text-to-speech-karaoke \
  -H "Content-Type: application/json" \
  -d '{"text": "Olá, tudo bem?", "chatType": "home"}'
```

## Docker

```bash
# Build e executar
docker-compose up -d backend

# Desenvolvimento com hot reload
docker-compose --profile dev up backend-dev
```

## Endpoints

### POST `/functions/v1/voice-to-text`

Transcreve áudio para texto usando OpenAI Whisper.

**Request:**
```json
{
  "audio": "base64...",
  "mimeType": "audio/webm",
  "language": "pt",
  "includeWordTimestamps": true
}
```

**Response:**
```json
{
  "text": "Olá, como vai você?",
  "words": [
    {"word": "Olá", "start": 0.0, "end": 0.35},
    {"word": "como", "start": 0.4, "end": 0.65}
  ],
  "duration": 1.5
}
```

### POST `/functions/v1/text-to-speech-karaoke`

Sintetiza fala com timestamps de palavras para karaokê.

**Request:**
```json
{
  "text": "Olá, como posso ajudar?",
  "chatType": "assistant",
  "voice": "nova"
}
```

**Response:**
```json
{
  "audioBase64": "...",
  "audioMimeType": "audio/mpeg",
  "words": [
    {"word": "Olá", "start": 0.0, "end": 0.32},
    {"word": "como", "start": 0.38, "end": 0.55}
  ],
  "duration": 1.6
}
```

### POST `/functions/v1/chat-router`

Proxy para chat completions com fallback chain.

**Request:**
```json
{
  "message": "Olá",
  "agentSlug": "home",
  "pwaMode": true
}
```

**Response:**
```json
{
  "response": "Olá! Como posso ajudar você hoje?",
  "source": "perplexity",
  "contextCode": "home"
}
```

## Estrutura do Projeto

```
iconsai-backend/
├── src/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Settings via pydantic-settings
│   ├── api/
│   │   ├── voice_to_text.py # STT endpoint
│   │   ├── text_to_speech.py# TTS karaoke endpoint
│   │   └── chat_router.py   # Chat proxy endpoint
│   ├── services/
│   │   ├── whisper_stt.py   # OpenAI Whisper client
│   │   ├── elevenlabs_tts.py# ElevenLabs client
│   │   ├── openai_tts.py    # OpenAI TTS fallback
│   │   └── timestamp_utils.py# Char→word conversion
│   ├── core/
│   │   ├── sync_coordinator.py # Clock sync NTP-like
│   │   └── session_manager.py  # Session state
│   └── utils/
│       ├── audio.py         # Audio format utilities
│       └── text_normalizer.py# PT-BR normalization
├── tests/
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `OPENAI_API_KEY` | API key do OpenAI | Sim |
| `ELEVENLABS_API_KEY` | API key do ElevenLabs | Recomendado |
| `PERPLEXITY_API_KEY` | API key do Perplexity | Opcional |
| `GEMINI_API_KEY` | API key do Gemini | Opcional |
| `ELEVENLABS_VOICE_ID` | ID da voz ElevenLabs | Não |
| `TTS_PROVIDER` | `elevenlabs` ou `openai` | Não |
| `CORS_ORIGINS` | Origins permitidas (comma-separated) | Não |

## Migração do Frontend

Para usar este backend, altere apenas **uma variável de ambiente** no frontend:

```env
# Antes (Supabase Edge Functions)
VITE_SUPABASE_URL=https://xyzcompany.supabase.co

# Depois (Python Backend)
VITE_SUPABASE_URL=https://api.iconsai.com
```

**Nenhuma linha de código TypeScript/React precisa ser alterada.**

## Testes

```bash
# Executar todos os testes
pytest

# Com cobertura
pytest --cov=src --cov-report=html
```

## Deploy

### DigitalOcean App Platform (Recomendado)

1. Criar App no DigitalOcean
2. Conectar repositório
3. Configurar variáveis de ambiente
4. Deploy automático via push

### Docker em VPS

```bash
docker-compose up -d backend
```

## Documentação da API

Acesse `/docs` para documentação Swagger interativa.

## Licença

Proprietário - IconsAI / Arbache AI
