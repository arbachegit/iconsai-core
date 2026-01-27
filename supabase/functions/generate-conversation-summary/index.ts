/**
 * ============================================================
 * generate-conversation-summary - Edge Function v2.0.0
 * ============================================================
 * Gera resumo de conversa ao sair de um módulo
 * Salva diretamente em pwa_sessions.summary
 * ============================================================
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function extractKeywords(messages: Message[]): string[] {
  const userMessages = messages.filter(m => m.role === "user").map(m => m.content).join(" ");
  const words = userMessages.toLowerCase().split(/\s+/);
  const stopWords = ["eu", "meu", "minha", "tenho", "estou", "com", "uma", "um", "de", "que", "para", "por", "como", "você", "pode", "quero", "preciso", "ajuda", "sobre", "isso", "aqui", "ali", "agora", "depois", "antes"];
  const filtered = words.filter(w => w.length > 3 && !stopWords.includes(w));
  const uniqueWords = [...new Set(filtered)];
  return uniqueWords.slice(0, 10);
}

async function generateSummary(messages: Message[]): Promise<string> {
  const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openAIApiKey) {
    // Fallback: gerar resumo simples sem IA
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length === 0) return "Nenhuma mensagem do usuário";

    const lastUserMessage = userMessages[userMessages.length - 1].content;
    const words = lastUserMessage.split(" ").slice(0, 10).join(" ");
    return words.length < lastUserMessage.length ? `${words}...` : words;
  }

  try {
    const conversationText = messages
      .map(m => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um assistente que resume conversas.
Gere um resumo MUITO CURTO (máximo 50 palavras) do tema principal discutido.
Foque no que o usuário perguntou ou no problema mencionado.
Responda em português brasileiro.
Não use aspas ou formatação especial.`
          },
          {
            role: "user",
            content: `Resuma esta conversa:\n\n${conversationText}`
          }
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "Conversa sobre diversos temas";
  } catch (error) {
    console.error("[generate-summary] Erro ao gerar resumo com IA:", error);

    // Fallback
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length === 0) return "Conversa sem mensagens do usuário";

    const lastUserMessage = userMessages[userMessages.length - 1].content;
    const words = lastUserMessage.split(" ").slice(0, 10).join(" ");
    return words.length < lastUserMessage.length ? `${words}...` : words;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { sessionId, deviceId, moduleSlug, messages } = await req.json();

    if (!sessionId || !messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: sessionId, messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-summary] Processing ${messages.length} messages for session ${sessionId}`);

    const supabase = getSupabaseAdmin();

    // Gerar resumo
    const summary = await generateSummary(messages);
    console.log(`[generate-summary] Summary generated: ${summary.substring(0, 50)}...`);

    // Extrair palavras-chave
    const keywords = extractKeywords(messages);

    // Atualizar pwa_sessions com resumo e keywords
    const { error: updateError } = await supabase
      .from("pwa_sessions")
      .update({
        summary,
        summary_keywords: keywords,
        ended_at: new Date().toISOString(),
        is_active: false,
        total_messages: messages.length,
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("[generate-summary] Error updating session:", updateError);
      throw updateError;
    }

    console.log(`[generate-summary] ✓ Session ${sessionId} updated with summary`);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        keywords,
        messageCount: messages.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[generate-summary] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
