"""
OpenAI Chat Completion Service.
Proxy for chat-router endpoint with Perplexity/Gemini fallback support.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)


# Module-specific system prompts (matching Edge Function)
MODULE_PROMPTS = {
    "world": """Você é um assistente inteligente do módulo MUNDO do IconsAI.

## SUA FUNÇÃO:
Você é um analista generalista que ajuda o usuário a entender o MUNDO ao redor:
- Notícias e acontecimentos globais
- Política nacional e internacional
- Tendências e movimentos sociais
- Tecnologia e inovação
- Cultura e sociedade

## ESTILO:
- Informativo e equilibrado
- Máximo 4-5 frases concisas
- Contextualize para a realidade brasileira quando relevante

## REGRAS:
- NUNCA mencione que é ChatGPT, OpenAI ou IA
- Seja objetivo e imparcial""",

    "economia": """Você é um analista econômico especializado em economia brasileira e global.

## DIRECIONAMENTO OBRIGATÓRIO:
1. SEMPRE relacione qualquer tema com ECONOMIA
2. Busque impactos econômicos em qualquer notícia/assunto
3. Cite dados quando possível (IBGE, Banco Central, IPEA)
4. Contextualize para a realidade brasileira

## ESTILO:
- Informativo e analítico
- Máximo 4-5 frases concisas
- Termine com insight econômico relevante

## REGRAS:
- NUNCA mencione que é ChatGPT, OpenAI ou IA
- Sempre conecte ao contexto econômico brasileiro""",

    "health": """Você é um assistente de orientação em saúde empático e cuidadoso.

## DIRECIONAMENTO OBRIGATÓRIO:
1. ACOLHA a pessoa com empatia genuína
2. COMPREENDA o problema fazendo perguntas claras
3. INTERPRETE possíveis causas (sem diagnosticar)
4. ENFATIZE a necessidade de consultar médico se:
   - Sintomas persistentes (> 3 dias)
   - Dor intensa (escala > 7/10)
   - Sinais de alerta (febre alta, sangramento, confusão)

## ESTILO:
- Empático e acolhedor
- Máximo 4-5 frases
- SEMPRE inclua orientação sobre consulta médica

## REGRAS:
- NUNCA diagnostique doenças
- NUNCA prescreva medicamentos
- NUNCA mencione que é ChatGPT, OpenAI ou IA""",

    "ideas": """Você é um consultor de negócios duro e questionador, usando o método "Advogado do Diabo".

## DIRECIONAMENTO OBRIGATÓRIO:
1. QUESTIONE DURAMENTE cada premissa da ideia
2. DESAFIE a pessoa a defender seu projeto
3. BUSQUE FALHAS para FORTALECER a ideia

## TÉCNICA ADVOGADO DO DIABO:
1. Ouça a ideia/resposta
2. Identifique o ponto mais fraco
3. Questione diretamente esse ponto
4. Se defender bem, vá para próximo ponto

## ESTILO:
- DURO mas RESPEITOSO
- Máximo 3-4 frases + 1 pergunta desafiadora
- SEMPRE termine com uma pergunta incisiva

## REGRAS:
- NUNCA seja gentil demais
- NUNCA mencione que é ChatGPT, OpenAI ou IA""",

    "help": """Você é um assistente prestativo do aplicativo IconsAI.

## FUNÇÃO:
Explicar como usar o aplicativo e seus recursos.

## MÓDULOS DO APP:
- MUNDO: Notícias e análises sobre o mundo
- SAÚDE: Orientação sobre sintomas
- IDEIAS: Desenvolvimento de projetos

## ESTILO:
- Claro e objetivo
- Máximo 3-4 frases
- Ofereça ajuda adicional

## REGRAS:
- NUNCA mencione que é ChatGPT, OpenAI ou IA""",

    "general": """Você é um assistente inteligente do IconsAI.

## FUNÇÃO:
Ajudar o usuário com qualquer dúvida de forma clara e objetiva.

## ESTILO:
- Informativo e prestativo
- Máximo 4-5 frases
- Linguagem natural e acessível

## REGRAS:
- NUNCA mencione que é ChatGPT, OpenAI ou IA""",
}

# Branding words to sanitize
FORBIDDEN_BRANDS = [
    "OpenAI", "ChatGPT", "GPT-4", "GPT-3.5", "GPT-3",
    "Claude", "Anthropic", "Gemini", "Google AI", "Bard",
    "LLaMA", "Meta AI", "Llama", "Mistral",
]


def sanitize_branding(text: str) -> str:
    """Remove forbidden brand mentions from response."""
    result = text
    for brand in FORBIDDEN_BRANDS:
        result = result.replace(brand, "Arbache AI")
        result = result.replace(brand.lower(), "Arbache AI")
    return result


@dataclass
class ChatMessage:
    """Chat message."""
    role: str
    content: str

    def to_dict(self) -> dict:
        return {"role": self.role, "content": self.content}


@dataclass
class ChatResult:
    """Result from chat completion."""
    response: str
    source: str = "openai"
    session_id: Optional[str] = None
    context_code: Optional[str] = None
    phonetic_map: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "response": self.response,
            "source": self.source,
            "sessionId": self.session_id,
            "contextCode": self.context_code,
            "phoneticMap": self.phonetic_map,
        }


class OpenAIChatService:
    """
    OpenAI Chat Completion service with Perplexity/Gemini fallback.

    Provides chat responses with:
    - Perplexity as primary (real-time web search)
    - OpenAI as first fallback
    - Gemini as second fallback
    """

    OPENAI_URL = "https://api.openai.com/v1/chat/completions"
    PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions"
    GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

    def __init__(
        self,
        openai_key: Optional[str] = None,
        perplexity_key: Optional[str] = None,
        gemini_key: Optional[str] = None
    ):
        """Initialize chat service with API keys."""
        self.settings = get_settings()
        self.openai_key = openai_key or self.settings.openai_api_key
        self.perplexity_key = perplexity_key or self.settings.perplexity_api_key
        self.gemini_key = gemini_key or self.settings.gemini_api_key

    def _get_system_prompt(self, module_slug: str) -> str:
        """Get module-specific system prompt."""
        prompt = MODULE_PROMPTS.get(module_slug, MODULE_PROMPTS["general"])

        # Add branding instructions
        branding = """
REGRAS OBRIGATÓRIAS:
1. Você é um assistente do IconsAI, desenvolvido pela Arbache AI.
2. NUNCA mencione OpenAI, ChatGPT, GPT-4, Claude, Anthropic, Gemini, ou qualquer outra IA.
3. Se perguntado sobre tecnologia ou quem te criou: "Fui desenvolvido pela Arbache AI."
4. Sempre responda em português brasileiro.
"""
        return branding + "\n\n" + prompt

    async def _call_perplexity(
        self,
        messages: List[dict],
        module_slug: str
    ) -> Optional[str]:
        """Call Perplexity API (real-time web search)."""
        if not self.perplexity_key:
            return None

        logger.info(f"[Chat] Trying Perplexity for {module_slug}")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.PERPLEXITY_URL,
                    headers={
                        "Authorization": f"Bearer {self.perplexity_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "sonar",
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 1500,
                        "return_citations": True,
                    }
                )

                if response.status_code != 200:
                    logger.warning(f"[Chat] Perplexity failed: {response.status_code}")
                    return None

                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

                if not content:
                    return None

                # Sanitize branding and remove citation markers
                content = sanitize_branding(content)
                content = content.replace("[", "").replace("]", "")  # Remove [1], [2], etc.

                logger.info(f"[Chat] Perplexity success for {module_slug}")
                return content

        except Exception as e:
            logger.warning(f"[Chat] Perplexity error: {e}")
            return None

    async def _call_openai(
        self,
        messages: List[dict],
        module_slug: str
    ) -> Optional[str]:
        """Call OpenAI Chat Completions API."""
        if not self.openai_key:
            return None

        logger.info(f"[Chat] Trying OpenAI for {module_slug}")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.OPENAI_URL,
                    headers={
                        "Authorization": f"Bearer {self.openai_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": messages,
                        "max_tokens": 500,
                    }
                )

                if response.status_code != 200:
                    logger.warning(f"[Chat] OpenAI failed: {response.status_code}")
                    return None

                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

                if not content:
                    return None

                content = sanitize_branding(content)
                logger.info(f"[Chat] OpenAI success for {module_slug}")
                return content

        except Exception as e:
            logger.warning(f"[Chat] OpenAI error: {e}")
            return None

    async def _call_gemini(
        self,
        messages: List[dict],
        module_slug: str
    ) -> Optional[str]:
        """Call Gemini API as final fallback."""
        if not self.gemini_key:
            return None

        logger.info(f"[Chat] Trying Gemini for {module_slug}")

        try:
            # Extract system prompt
            system_prompt = ""
            user_messages = []

            for msg in messages:
                if msg["role"] == "system":
                    system_prompt = msg["content"]
                else:
                    user_messages.append({
                        "role": "model" if msg["role"] == "assistant" else "user",
                        "parts": [{"text": msg["content"]}]
                    })

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.GEMINI_URL}?key={self.gemini_key}",
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": user_messages,
                        "systemInstruction": {"parts": [{"text": system_prompt}]},
                        "generationConfig": {
                            "maxOutputTokens": 800,
                            "temperature": 0.7,
                        },
                    }
                )

                if response.status_code != 200:
                    logger.warning(f"[Chat] Gemini failed: {response.status_code}")
                    return None

                data = response.json()
                content = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

                if not content:
                    return None

                content = sanitize_branding(content)
                logger.info(f"[Chat] Gemini success for {module_slug}")
                return content

        except Exception as e:
            logger.warning(f"[Chat] Gemini error: {e}")
            return None

    async def chat(
        self,
        message: str,
        module_slug: str = "general",
        history: Optional[List[ChatMessage]] = None,
        session_id: Optional[str] = None,
    ) -> ChatResult:
        """
        Process chat message with fallback chain.

        Order: Perplexity -> OpenAI -> Gemini

        Args:
            message: User message
            module_slug: Module type (world, health, ideas, etc.)
            history: Conversation history
            session_id: Session identifier

        Returns:
            ChatResult with response
        """
        # Build messages with system prompt
        system_prompt = self._get_system_prompt(module_slug)
        messages = [{"role": "system", "content": system_prompt}]

        # Add history (last 4 messages)
        if history:
            for msg in history[-4:]:
                messages.append(msg.to_dict())

        # Add current message
        messages.append({"role": "user", "content": message})

        # Try providers in order
        response = await self._call_perplexity(messages, module_slug)
        if response:
            return ChatResult(
                response=response,
                source="perplexity",
                session_id=session_id,
                context_code=module_slug,
            )

        response = await self._call_openai(messages, module_slug)
        if response:
            return ChatResult(
                response=response,
                source="openai",
                session_id=session_id,
                context_code=module_slug,
            )

        response = await self._call_gemini(messages, module_slug)
        if response:
            return ChatResult(
                response=response,
                source="gemini",
                session_id=session_id,
                context_code=module_slug,
            )

        # All providers failed
        raise ValueError("All AI providers failed. Please try again later.")

    async def stream_chat(
        self,
        messages: List[dict],
        model: str = "gpt-4o-mini"
    ):
        """
        Stream chat completion (for non-PWA mode).

        Args:
            messages: Full message list including system prompt
            model: Model to use

        Yields:
            Server-Sent Events formatted chunks
        """
        if not self.openai_key:
            raise ValueError("OpenAI API key required for streaming")

        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                self.OPENAI_URL,
                headers={
                    "Authorization": f"Bearer {self.openai_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "stream": True,
                }
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        yield line
