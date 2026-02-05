# Iconsai Voice Sync Engine - Backend Python

Backend FastAPI que substitui as Supabase Edge Functions para processamento de voz com timestamps para karaokê.

## Endpoints

| Endpoint | Descrição |
|----------|-----------|
| `POST /functions/v1/voice-to-text` | STT com Whisper + timestamps por palavra |
| `POST /functions/v1/text-to-speech-karaoke` | TTS com ElevenLabs + timestamps nativos |
| `POST /functions/v1/chat-router` | Proxy para OpenAI Chat |

## Setup

```bash
# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas API keys

# Rodar em desenvolvimento
python -m src.main
# ou: uvicorn src.main:app --reload
```

## Docker

```bash
# Build e run
docker-compose up --build

# Produção
docker build -t iconsai-backend .
docker run -p 8000:8000 --env-file .env iconsai-backend
```

## Uso no Frontend

Apenas altere a variável de ambiente:

```env
# De:
VITE_SUPABASE_URL=https://xyzcompany.supabase.co

# Para:
VITE_SUPABASE_URL=http://localhost:8000
# ou em produção:
VITE_SUPABASE_URL=https://api.iconsai.com
```

**Nenhuma mudança de código é necessária no frontend.**

## Exemplo de Request/Response

### TTS com Karaokê

```bash
curl -X POST http://localhost:8000/functions/v1/text-to-speech-karaoke \
  -H "Content-Type: application/json" \
  -d '{"text": "Olá, como posso ajudar?", "chatType": "assistant"}'
```

Response:
```json
{
  "audioBase64": "//uQxAAA...",
  "audioMimeType": "audio/mpeg",
  "words": [
    {"word": "Olá,", "start": 0.0, "end": 0.32},
    {"word": "como", "start": 0.38, "end": 0.55},
    {"word": "posso", "start": 0.6, "end": 0.85},
    {"word": "ajudar?", "start": 0.9, "end": 1.4}
  ],
  "duration": 1.6
}
```
