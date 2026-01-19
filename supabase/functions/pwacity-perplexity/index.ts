// ============================================
// PWA CITY - PERPLEXITY INTEGRATION
// VERSAO: 1.0.0-PRODUCTION | DEPLOY: 2026-01-18
// STATUS: ✅ PRODUÇÃO - Conectado à API Perplexity
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const FUNCTION_VERSION = "1.0.0-PRODUCTION";
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions";

interface RequestBody {
  prompt: string;
  sessionId?: string | null;
  userPhone?: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`[pwacity-perplexity v${FUNCTION_VERSION}] Request received`);

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { prompt, sessionId, userPhone } = body;

    // Validate input
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

    console.log(`[pwacity-perplexity] Prompt length: ${prompt.length}`);
    console.log(`[pwacity-perplexity] Session ID: ${sessionId || "none"}`);
    console.log(`[pwacity-perplexity] User Phone: ${userPhone || "none"}`);

    // Validar API Key
    if (!PERPLEXITY_API_KEY) {
      console.error("[pwacity-perplexity] PERPLEXITY_API_KEY not found in environment");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuração da API Perplexity não encontrada. Configure PERPLEXITY_API_KEY nas variáveis de ambiente.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ============================================
    // INTEGRAÇÃO COM PERPLEXITY API
    // ============================================
    const startTime = Date.now();

    try {
      console.log("[pwacity-perplexity] Calling Perplexity API...");

      const perplexityResponse = await fetch(PERPLEXITY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-large-128k-online",
          messages: [
            {
              role: "system",
              content: "Você é um assistente inteligente do PWA City, focado em ajudar usuários com informações gerais, recomendações e suporte. Seja objetivo, claro e prestativo. Responda em português do Brasil. Use informações atualizadas da web quando relevante.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          return_citations: true,
          return_images: false,
        }),
      });

      if (!perplexityResponse.ok) {
        const errorText = await perplexityResponse.text();
        console.error("[pwacity-perplexity] Perplexity API error:", errorText);
        throw new Error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`);
      }

      const perplexityData = await perplexityResponse.json();
      const responseTime = Date.now() - startTime;

      console.log("[pwacity-perplexity] ✅ Perplexity response received");
      console.log(`[pwacity-perplexity] Response time: ${responseTime}ms`);
      console.log(`[pwacity-perplexity] Tokens used: ${perplexityData.usage?.total_tokens || "unknown"}`);

      // Extrair resposta
      const assistantMessage = perplexityData.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";

      // Extrair citações se disponíveis
      const citations = perplexityData.citations || [];

      const responseData = {
        success: true,
        response: assistantMessage,
        model: perplexityData.model || "llama-3.1-sonar-large-128k-online",
        tokens: perplexityData.usage?.total_tokens || null,
        responseTime,
        provider: "perplexity",
        citations,
        mock: false,
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (apiError) {
      console.error("[pwacity-perplexity] Error calling Perplexity:", apiError);

      return new Response(
        JSON.stringify({
          success: false,
          error: apiError instanceof Error ? apiError.message : "Erro ao processar sua solicitação com Perplexity",
          mock: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("[pwacity-perplexity] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        mock: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
