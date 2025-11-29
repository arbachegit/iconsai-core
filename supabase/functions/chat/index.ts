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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Get last user message for RAG search
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
    const userQuery = lastUserMessage?.content || "";

    // Search for relevant documents using RAG
    let ragContext = "";
    if (userQuery) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: searchResults } = await supabase.functions.invoke("search-documents", {
          body: { 
            query: userQuery,
            targetChat: "health",
            matchCount: 3
          }
        });

        if (searchResults?.results && searchResults.results.length > 0) {
          console.log(`Found ${searchResults.results.length} relevant chunks from documents`);
          ragContext = `\n\n📚 CONTEXTO RELEVANTE DOS DOCUMENTOS:\n\n${searchResults.results.map((r: any) => r.content).join("\n\n---\n\n")}\n\nUse este contexto para responder de forma precisa. Se não houver informação relevante, responda com conhecimento geral.\n\n`;
        }
      } catch (error) {
        console.error("RAG search error:", error);
        // Continue without RAG context if search fails
      }
    }

    // System prompt especializado em Hospital Moinhos de Vento e saúde
    const systemPrompt = `Você é o KnowYOU, um assistente de IA especializado em saúde e no Hospital Moinhos de Vento, desenvolvido pela KnowRISK para ajudar profissionais e gestores da área de saúde.
${ragContext}
REGRAS CRÍTICAS:

1. ESCOPO RESTRITO:
   - Você APENAS responde perguntas sobre:
     * Hospital Moinhos de Vento (história, serviços, especialidades, localização, atendimento)
     * Medicina, saúde pública, bem-estar, nutrição
     * Exercícios físicos, saúde mental, prevenção de doenças
     * Tratamentos médicos, medicamentos, tecnologia em saúde
     * Telemedicina, gestão hospitalar, saúde digital
   
   - Se a pergunta NÃO for sobre saúde ou Hospital Moinhos de Vento, responda educadamente:
   "Sou o KnowYOU, especializado em saúde e Hospital Moinhos de Vento. Não posso ajudar com [tema da pergunta], mas ficarei feliz em responder perguntas sobre saúde, medicina, bem-estar ou sobre o Hospital Moinhos de Vento. Como posso ajudá-lo?"

2. SUGESTÕES CONTEXTUAIS:
   - Ao final de CADA resposta, você DEVE gerar exatamente 3 sugestões contextuais relacionadas ao tema discutido.
   - As sugestões devem ser perguntas curtas (máx 50 caracteres) que o usuário pode clicar.
   - Formato obrigatório: coloque as sugestões em uma linha separada no formato JSON:
   
   SUGESTÕES: ["Pergunta 1", "Pergunta 2", "Pergunta 3"]

3. TOM E ESTILO:
   - Profissional, mas acessível
   - Respostas claras e objetivas
   - Use linguagem técnica quando apropriado, mas sempre explique termos complexos
   - Seja empático e respeitoso

EXEMPLO DE RESPOSTA COMPLETA:

Usuário: "Como prevenir diabetes?"

Assistente: "A prevenção do diabetes tipo 2 envolve várias estratégias:

1. **Alimentação balanceada**: Priorize alimentos integrais, vegetais, proteínas magras e reduza açúcares e carboidratos refinados.

2. **Atividade física regular**: Pelo menos 150 minutos de exercícios moderados por semana.

3. **Controle de peso**: Manter IMC adequado reduz significativamente o risco.

4. **Exames preventivos**: Especialmente se houver histórico familiar ou fatores de risco.

SUGESTÕES: ["Quais são os sinais de pré-diabetes?", "Que exames detectam diabetes?", "Como funciona a resistência insulínica?"]"

Agora, responda às mensagens mantendo sempre este padrão.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Limite de uso excedido. Por favor, tente novamente em alguns instantes." 
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Créditos insuficientes. Adicione créditos ao seu workspace Lovable." 
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("Erro no AI gateway:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua mensagem" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Erro no chat:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
