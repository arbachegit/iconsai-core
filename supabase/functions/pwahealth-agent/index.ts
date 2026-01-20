// ============================================
// PWA HEALTH - AGENT (Microservice with Fallback Chain)
// VERSAO: 1.1.0-PRODUCTION | DEPLOY: 2026-01-19
// STATUS: PRODUÇÃO - Perplexity → Gemini → OpenAI
// FOCO: Saúde Pública e Gestão de Saúde
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const FUNCTION_VERSION = "1.1.0-PRODUCTION";

// API Keys
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY") || Deno.env.get("PERPLEXITY_API_KEY");
const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Endpoints
const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

// System prompt - FOCO EM SAÚDE PÚBLICA E GESTÃO
const SYSTEM_PROMPT = `Você é um assistente especializado em SAÚDE PÚBLICA e GESTÃO DE SAÚDE, treinado pela Arbache AI. Seu conhecimento é EXCLUSIVAMENTE sobre:

**DOENÇAS E EPIDEMIOLOGIA:**
- Doenças infecciosas, crônicas e degenerativas
- Sintomas, causas e fatores de risco
- Epidemias e pandemias (dados atualizados em tempo real)
- Taxas de incidência e prevalência por região

**INFRAESTRUTURA HOSPITALAR:**
- Condições dos hospitais públicos e privados
- Leitos hospitalares (UTI, enfermaria, maternidade)
- Equipamentos médicos e tecnologia hospitalar
- Falta de insumos e medicamentos

**INDICADORES DE SAÚDE E IDH (COM COMPARAÇÕES):**
- Índice de Desenvolvimento Humano (IDH) geral e por componente
- COMPARAÇÃO DE IDH ENTRE CIDADES DO MESMO PORTE
- Taxa de mortalidade infantil, expectativa de vida
- Cobertura de saneamento básico

**GESTÃO PÚBLICA DE SAÚDE:**
- Políticas públicas de saúde municipais
- Investimentos prioritários em saúde
- Programas de Atenção Básica (UBS, PSF)
- Estratégias para melhorar atendimento

## ESTILO DE RESPOSTA:
- Seja OBJETIVO e INFORMATIVO
- Use dados e estatísticas quando disponíveis
- Compare com outras cidades de mesmo porte
- Sugira ações práticas para gestores

## REGRAS:
- NUNCA faça diagnósticos ou prescrições individuais
- Foco em GESTÃO PÚBLICA, não em consultas médicas
- NUNCA mencione ChatGPT, OpenAI, Perplexity
- Se perguntado quem você é: "Fui desenvolvido pela Arbache AI"`;

interface RequestBody {
  prompt: string;
  sessionId?: string | null;
  userPhone?: string | null;
  preferredProvider?: "perplexity" | "gemini" | "openai";
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

async function callPerplexity(prompt: string): Promise<AIResponse> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  const startTime = Date.now();

  const response = await fetch(PERPLEXITY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
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
    model: "health-assistant",
    tokens: data.usage?.total_tokens || null,
    responseTime,
    provider: "ai",
  };
}

async function callGemini(prompt: string): Promise<AIResponse> {
  if (!GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }

  const startTime = Date.now();
  const url = `${GEMINI_ENDPOINT}?key=${GOOGLE_GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${SYSTEM_PROMPT}\n\nUsuário: ${prompt}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
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
    model: "health-assistant",
    tokens: Math.ceil((prompt.length + textContent.length) / 4),
    responseTime,
    provider: "ai",
  };
}

async function callOpenAI(prompt: string): Promise<AIResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const startTime = Date.now();

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
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
    model: "health-assistant",
    tokens: data.usage?.total_tokens || null,
    responseTime,
    provider: "ai",
  };
}

// ============================================
// FALLBACK CHAIN
// ============================================

async function executeWithFallback(prompt: string): Promise<AIResponse> {
  const providers = [
    { name: "perplexity", fn: callPerplexity },
    { name: "gemini", fn: callGemini },
    { name: "openai", fn: callOpenAI },
  ];

  let lastError: Error | null = null;
  let fallbackReason = "";

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];

    try {
      console.log(`[pwahealth-agent] Trying provider: ${provider.name}`);
      const result = await provider.fn(prompt);

      if (i > 0) {
        result.fallbackUsed = true;
        result.fallbackReason = `Primary providers failed: ${fallbackReason}`;
      }

      console.log(`[pwahealth-agent] Success with ${provider.name}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[pwahealth-agent] ${provider.name} failed:`, errorMsg);

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

  console.log(`[pwahealth-agent v${FUNCTION_VERSION}] Request received`);

  try {
    const body: RequestBody = await req.json();
    const { prompt, sessionId, userPhone } = body;

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

    console.log(`[pwahealth-agent] Prompt length: ${prompt.length}`);
    console.log(`[pwahealth-agent] Session ID: ${sessionId || "none"}`);

    const result = await executeWithFallback(prompt.trim());

    console.log(`[pwahealth-agent] Final provider: ${result.provider}`);
    console.log(`[pwahealth-agent] Response time: ${result.responseTime}ms`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[pwahealth-agent] Critical error:", error);

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
