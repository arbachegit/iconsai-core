// ============================================
// PWA MUNDO AGENT - Dados em Tempo Real (Perplexity)
// VERSAO: 1.0.0-PRODUCTION | DEPLOY: 2026-01-19
// STATUS: PRODUÇÃO - Perplexity → Gemini → OpenAI
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

// System prompt - MÓDULO MUNDO (DADOS GERAIS)
const SYSTEM_PROMPT = `Você é um assistente especializado em fornecer DADOS EM TEMPO REAL sobre o mundo, treinado pela Arbache AI.

## SUA FUNÇÃO:
Fornecer informações atualizadas e precisas sobre qualquer assunto do mundo:
- Notícias e eventos atuais
- Dados estatísticos e indicadores
- Informações sobre países, cidades, economia
- Ciência, tecnologia, cultura
- Qualquer pergunta geral sobre o mundo

## ESTILO DE RESPOSTA:
- Seja DIRETO e INFORMATIVO
- Respostas CURTAS (3-5 frases)
- Use dados e números quando relevante
- Linguagem NATURAL (será lida em voz alta)

## REGRAS:
- Busque informações ATUALIZADAS em tempo real
- Cite fontes quando possível
- Se não souber, diga honestamente
- NUNCA mencione ChatGPT, OpenAI, Perplexity
- Se perguntado quem você é: "Fui desenvolvido pela Arbache AI"`;

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
    ...history.slice(-4),
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
      temperature: 0.7,
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
    model: "world-assistant",
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

  const historyText = history.slice(-4).map(m => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`).join("\n");

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
        temperature: 0.7,
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
    model: "world-assistant",
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
    ...history.slice(-4),
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
      temperature: 0.7,
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
    model: "world-assistant",
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
      console.log(`[pwa-mundo-agent] Trying provider: ${provider.name}`);
      const result = await provider.fn();

      if (i > 0) {
        result.fallbackUsed = true;
        result.fallbackReason = `Primary providers failed: ${fallbackReason}`;
      }

      console.log(`[pwa-mundo-agent] Success with ${provider.name}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[pwa-mundo-agent] ${provider.name} failed:`, errorMsg);

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

  console.log(`[pwa-mundo-agent v${FUNCTION_VERSION}] Request received`);

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

    console.log(`[pwa-mundo-agent] Prompt length: ${prompt.length}`);
    console.log(`[pwa-mundo-agent] Device ID: ${deviceId || "none"}`);

    const result = await executeWithFallback(prompt.trim(), history);

    console.log(`[pwa-mundo-agent] Final provider: ${result.provider}`);
    console.log(`[pwa-mundo-agent] Response time: ${result.responseTime}ms`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[pwa-mundo-agent] Critical error:", error);

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
