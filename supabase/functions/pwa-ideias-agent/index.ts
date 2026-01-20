// ============================================
// PWA IDEIAS AGENT - Advogado do Diabo (Perplexity)
// VERSAO: 1.0.0-PRODUCTION | DEPLOY: 2026-01-19
// STATUS: PRODUÇÃO - Perplexity → Gemini → OpenAI
// PERFIL: MUITO DURO - Crítica construtiva implacável
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const FUNCTION_VERSION = "1.0.0-PRODUCTION";

// API Keys
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY") || Deno.env.get("PERPLEXITY_API_KEY");
const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Endpoints
const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

// System prompt - MÓDULO IDEIAS (ADVOGADO DO DIABO DURO)
const SYSTEM_PROMPT = `Você é um ADVOGADO DO DIABO implacável, treinado pela Arbache AI. Sua função é DESTRUIR ideias fracas e FORTALECER as boas através de crítica brutal mas construtiva.

## SEU PERFIL:
- MUITO DURO e DIRETO
- Zero tolerância para ideias vagas
- Compara SEMPRE com o que já existe no mercado
- Cita concorrentes reais por nome
- Aponta falhas impiedosamente
- MAS oferece caminhos para melhorar

## REGRAS OBRIGATÓRIAS:
1. SEMPRE busque empresas/produtos similares que já existem
2. NOMEIE os concorrentes (ex: "Isso já existe, chama-se Uber/Airbnb/iFood...")
3. Aponte por que a ideia pode FALHAR
4. Questione o diferencial competitivo
5. Pergunte sobre modelo de negócio, receita, custos
6. Seja BRUTAL mas termine com 1-2 sugestões de melhoria

## ESTILO DE RESPOSTA:
- Respostas CURTAS (4-6 frases)
- Tom DIRETO e INCISIVO
- Use dados e exemplos reais
- Faça perguntas difíceis
- Linguagem NATURAL (será lida em voz alta)

## FRASES TÍPICAS:
- "Isso já existe. Chama-se X e tem Y milhões de usuários."
- "Qual seu diferencial? Por que alguém trocaria o X pelo seu?"
- "Você pesquisou o mercado? Tem pelo menos 5 concorrentes fazendo isso."
- "Interessante, mas como você vai monetizar?"
- "Quanto custa adquirir um cliente? Você fez as contas?"

## REGRAS:
- NUNCA seja gentil demais ou elogie sem criticar primeiro
- SEMPRE compare com concorrentes reais
- NUNCA mencione ChatGPT, OpenAI, Perplexity
- Se perguntado quem você é: "Fui desenvolvido pela Arbache AI para testar ideias"`;

interface RequestBody {
  prompt: string;
  sessionId?: string | null;
  deviceId?: string | null;
  history?: Array<{ role: string; content: string }>;
}

interface AIResponse {
  success: boolean;
  response: string;
  model: string;
  tokens: number | null;
  responseTime: number;
  provider: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
}

// ============================================
// PROVIDER FUNCTIONS
// ============================================

async function callPerplexity(prompt: string, history: Array<{ role: string; content: string }> = []): Promise<AIResponse> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  const startTime = Date.now();

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-6),
    { role: "user", content: prompt },
  ];

  const response = await fetch(PERPLEXITY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages,
      temperature: 0.8, // Mais alta para respostas mais incisivas
      max_tokens: 1500,
      return_citations: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const responseTime = Date.now() - startTime;

  // Limpar resposta
  let cleanResponse = data.choices?.[0]?.message?.content || "Sem resposta";
  cleanResponse = cleanResponse
    .replace(/\[\d+\]/g, "")
    .replace(/\[[\d,\s]+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    success: true,
    response: cleanResponse,
    model: "ideas-assistant",
    tokens: data.usage?.total_tokens || null,
    responseTime,
    provider: "ai",
  };
}

async function callGemini(prompt: string, history: Array<{ role: string; content: string }> = []): Promise<AIResponse> {
  if (!GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }

  const startTime = Date.now();
  const url = `${GEMINI_ENDPOINT}?key=${GOOGLE_GEMINI_API_KEY}`;

  const historyText = history.slice(-6).map(m => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`).join("\n");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${SYSTEM_PROMPT}\n\n${historyText ? `Histórico:\n${historyText}\n\n` : ""}Usuário: ${prompt}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1500,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const responseTime = Date.now() - startTime;

  let textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta";
  textContent = textContent.replace(/\[\d+\]/g, "").replace(/\s{2,}/g, " ").trim();

  return {
    success: true,
    response: textContent,
    model: "ideas-assistant",
    tokens: Math.ceil((prompt.length + textContent.length) / 4),
    responseTime,
    provider: "ai",
  };
}

async function callOpenAI(prompt: string, history: Array<{ role: string; content: string }> = []): Promise<AIResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const startTime = Date.now();

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-6),
    { role: "user", content: prompt },
  ];

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.8,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const responseTime = Date.now() - startTime;

  let textContent = data.choices?.[0]?.message?.content || "Sem resposta";
  textContent = textContent.replace(/\[\d+\]/g, "").replace(/\s{2,}/g, " ").trim();

  return {
    success: true,
    response: textContent,
    model: "ideas-assistant",
    tokens: data.usage?.total_tokens || null,
    responseTime,
    provider: "ai",
  };
}

// ============================================
// FALLBACK CHAIN
// ============================================

async function executeWithFallback(prompt: string, history: Array<{ role: string; content: string }> = []): Promise<AIResponse> {
  const providers = [
    { name: "perplexity", fn: () => callPerplexity(prompt, history) },
    { name: "gemini", fn: () => callGemini(prompt, history) },
    { name: "openai", fn: () => callOpenAI(prompt, history) },
  ];

  let lastError: Error | null = null;
  let fallbackReason = "";

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];

    try {
      console.log(`[pwa-ideias-agent] Trying provider: ${provider.name}`);
      const result = await provider.fn();

      if (i > 0) {
        result.fallbackUsed = true;
        result.fallbackReason = `Primary providers failed: ${fallbackReason}`;
      }

      console.log(`[pwa-ideias-agent] Success with ${provider.name}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[pwa-ideias-agent] ${provider.name} failed:`, errorMsg);

      lastError = error instanceof Error ? error : new Error(errorMsg);
      fallbackReason += `${provider.name}: ${errorMsg}; `;
    }
  }

  throw lastError || new Error("All providers failed");
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`[pwa-ideias-agent v${FUNCTION_VERSION}] Request received`);

  try {
    const body: RequestBody = await req.json();
    const { prompt, deviceId, history = [] } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Prompt é obrigatório",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[pwa-ideias-agent] Prompt length: ${prompt.length}`);
    console.log(`[pwa-ideias-agent] Device ID: ${deviceId || "none"}`);

    const result = await executeWithFallback(prompt.trim(), history);

    console.log(`[pwa-ideias-agent] Final provider: ${result.provider}`);
    console.log(`[pwa-ideias-agent] Response time: ${result.responseTime}ms`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[pwa-ideias-agent] Critical error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro ao processar solicitação",
        provider: "none",
        fallbackUsed: true,
        fallbackReason: "All providers failed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
