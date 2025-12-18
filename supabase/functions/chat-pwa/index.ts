import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, agentSlug = "economia", sessionId } = await req.json();

    if (!message) {
      throw new Error("Mensagem é obrigatória");
    }

    console.log(`[chat-pwa] Mensagem recebida: "${message.substring(0, 50)}..."`);
    console.log(`[chat-pwa] Agente: ${agentSlug}, Session: ${sessionId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar configurações do agente
    const { data: agent, error: agentError } = await supabase
      .from("chat_agents")
      .select("*")
      .eq("slug", agentSlug)
      .eq("is_active", true)
      .single();

    if (agentError || !agent) {
      console.error("[chat-pwa] Agente não encontrado:", agentSlug, agentError);
      throw new Error("Agente não encontrado ou inativo");
    }

    console.log(`[chat-pwa] Agente carregado: ${agent.name}`);

    // 2. Buscar contexto RAG (se configurado)
    let ragContext = "";
    
    if (agent.rag_collection) {
      try {
        // Gerar embedding da pergunta usando Lovable AI
        const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: message,
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const queryEmbedding = embeddingData.data?.[0]?.embedding;

          if (queryEmbedding) {
            // Buscar documentos similares
            const { data: docs } = await supabase.rpc("search_documents", {
              query_embedding: queryEmbedding,
              target_chat_filter: agent.rag_collection,
              match_threshold: agent.match_threshold || 0.15,
              match_count: agent.match_count || 5,
            });

            if (docs?.length) {
              ragContext = docs.map((d: any) => d.content).join("\n\n---\n\n");
              console.log(`[chat-pwa] RAG encontrou ${docs.length} documentos`);
            }
          }
        }
      } catch (ragError) {
        console.error("[chat-pwa] Erro no RAG (continuando sem contexto):", ragError);
      }
    }

    // 3. Construir prompt do sistema
    const systemPrompt = `${agent.system_prompt || "Você é um assistente prestativo."}

${ragContext ? `
## CONTEXTO DOS DOCUMENTOS (use para responder):
${ragContext}
` : ""}

## REGRAS ADICIONAIS PARA VOZ:
- Respostas CURTAS (máximo 3-4 frases)
- Linguagem SIMPLES (para pessoas sem instrução formal)
- Se não souber, diga "não tenho essa informação"
- Cite fontes quando mencionar dados (Banco Central, IBGE, etc.)
- Evite números muito grandes ou porcentagens complexas
`;

    // 4. Chamar Lovable AI Gateway (google/gemini-2.5-flash)
    console.log("[chat-pwa] Chamando Lovable AI Gateway...");
    
    const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error("[chat-pwa] Erro Lovable AI:", chatResponse.status, errorText);
      
      if (chatResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Muitas requisições. Tente novamente em alguns segundos.",
            response: "Desculpe, estou recebendo muitas perguntas. Por favor, aguarde um momento e tente novamente."
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (chatResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Créditos insuficientes.",
            response: "Desculpe, o serviço está temporariamente indisponível. Por favor, tente mais tarde."
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Erro ao processar: ${chatResponse.status}`);
    }

    const chatData = await chatResponse.json();
    const response = chatData.choices?.[0]?.message?.content || 
                     agent.rejection_message || 
                     "Desculpe, não consegui processar sua pergunta.";

    console.log(`[chat-pwa] Resposta gerada: "${response.substring(0, 100)}..."`);

    return new Response(
      JSON.stringify({ response }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[chat-pwa] Erro:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        response: "Desculpe, ocorreu um erro. Por favor, tente novamente."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
