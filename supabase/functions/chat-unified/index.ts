import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  chatType: 'health' | 'study' | 'general';
  documentId?: string;
  sessionId?: string;
  manualRedirect?: 'health' | 'study' | null;
}

// Helper function to get category-specific guardrails
const getCategoryGuardrails = (category: string): string => {
  const guardrails = {
    health: `
- ⚕️ Você NÃO substitui profissionais de saúde.
- Todas as informações são EDUCACIONAIS e INFORMATIVAS.
- Sempre recomende consultar um médico ou profissional qualificado.
- Foco: Hospital Moinhos de Vento, medicina, saúde, bem-estar.
- RECUSE perguntas fora do escopo de saúde.`,

    study: `
- 📚 Foco em explicação e aprendizado do material fornecido.
- Escopo: KnowRISK, KnowYOU, ACC, conteúdo do website, história da IA.
- Ajude o usuário a compreender e navegar pelo conteúdo.
- RECUSE perguntas não relacionadas ao material de estudo.`,

    general: `
- 🔒 Escopo limitado - conteúdo usado apenas para resposta imediata.
- Não expanda permanentemente o contexto do chat.
- Sugira ao usuário redirecionar para Health ou Study se apropriado.
- Mantenha respostas objetivas e genéricas.`
  };
  
  return guardrails[category as keyof typeof guardrails] || guardrails.general;
};

// Helper function to get disclaimer based on category and document
const getDisclaimer = (category: string, document: any): string => {
  if (category === 'health') {
    return `⚠️ Este chat foi ampliado com o documento "${document.filename}". As informações são EDUCACIONAIS. Consulte um profissional de saúde para orientação personalizada.`;
  }
  
  if (category === 'study') {
    return `⚠️ Este chat foi ampliado com o documento "${document.filename}". As sugestões abaixo focam exclusivamente neste novo contexto de estudo.`;
  }
  
  return `⚠️ Documento "${document.filename}" carregado temporariamente. O escopo do chat permanece inalterado.`;
};

// Build dynamic prompt based on category, document, and context
const buildDynamicPrompt = ({
  category,
  document,
  scopeDescription,
  ragContext,
}: {
  category: string;
  document?: any;
  scopeDescription: string;
  ragContext: string;
}): string => {
  return `Você é um assistente de IA com a função de fornecer informações precisas, relevantes e seguras, sempre respeitando as diretrizes internas de segurança de conteúdo.

**Contexto Principal:** ${category.toUpperCase()}

**1. Escopo Atual do Chat:**
${scopeDescription}

**2. Diretrizes de Segurança (Guardrail ${category}):**
${getCategoryGuardrails(category)}

${document ? `
**3. Documento Inserido (Contexto Ampliado):**
- **ID:** ${document.id}
- **Nome:** ${document.filename}
- **Resumo:** ${document.ai_summary || 'Resumo não disponível'}

⚠️ ${getDisclaimer(category, document)}

**4. Contexto do Documento:**
${ragContext}
` : ragContext ? `
**3. Contexto Relevante dos Documentos:**
${ragContext}
` : ''}

**${document ? '5' : ragContext ? '4' : '3'}. Geração de Sugestões:**
${document 
  ? `- A PRIMEIRA sugestão DEVE introduzir o novo material: "${document.filename}"
- As demais sugestões devem explorar EXCLUSIVAMENTE o conteúdo do documento
- Inclua o disclaimer nas sugestões se for a primeira resposta com este documento`
  : 'Gere sugestões contextuais relacionadas ao tema discutido.'
}

FORMATO OBRIGATÓRIO DAS SUGESTÕES:
SUGESTÕES: ["Pergunta 1", "Pergunta 2", "Pergunta 3"]`;
};

// Log document routing to database
const logDocumentRouting = async (
  supabase: any,
  params: {
    documentId: string;
    documentName: string;
    originalCategory: string;
    finalCategory: string;
    actionType: 'auto_expanded' | 'manual_redirect' | 'kept_general';
    sessionId: string;
    scopeChanged: boolean;
    disclaimerShown: boolean;
  }
) => {
  try {
    const { error } = await supabase.from('document_routing_log').insert({
      document_id: params.documentId,
      document_name: params.documentName,
      original_category: params.originalCategory,
      final_category: params.finalCategory,
      action_type: params.actionType,
      session_id: params.sessionId,
      scope_changed: params.scopeChanged,
      disclaimer_shown: params.disclaimerShown,
      metadata: { timestamp: new Date().toISOString() }
    });

    if (error) {
      console.error('Error logging document routing:', error);
    }
  } catch (error) {
    console.error('Failed to log document routing:', error);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, chatType, documentId, sessionId, manualRedirect }: ChatRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get last user message for RAG search
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
    const userQuery = lastUserMessage?.content || "";

    // Initialize variables for document and context
    let document = null;
    let ragContext = "";
    let finalChatType = chatType;
    let requiresManualRedirect = false;
    let suggestedTags: string[] = [];

    // If documentId is provided, fetch document and determine routing
    if (documentId) {
      const { data: docData } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docData) {
        document = docData;
        const originalCategory = docData.target_chat;

        // FLOW A: Health or Study - Auto-expand
        if (originalCategory === 'health' || originalCategory === 'study') {
          finalChatType = originalCategory;
          
          // Get relevant chunks from the document
          const { data: chunks } = await supabase
            .from('document_chunks')
            .select('content')
            .eq('document_id', documentId)
            .limit(3);

          if (chunks && chunks.length > 0) {
            ragContext = `\n\n📚 CONTEXTO DO DOCUMENTO "${document.filename}":\n\n${chunks.map((c: any) => c.content).join("\n\n---\n\n")}\n\n`;
          }

          // Log auto-expansion
          if (sessionId) {
            await logDocumentRouting(supabase, {
              documentId,
              documentName: document.filename,
              originalCategory,
              finalCategory: originalCategory,
              actionType: 'auto_expanded',
              sessionId,
              scopeChanged: true,
              disclaimerShown: true,
            });
          }
        }
        // FLOW B: General - Requires manual redirect
        else if (originalCategory === 'general') {
          // Get document tags
          const { data: tags } = await supabase
            .from('document_tags')
            .select('tag_name')
            .eq('document_id', documentId)
            .limit(5);

          suggestedTags = tags?.map((t: any) => t.tag_name) || [];

          // If manualRedirect is provided, apply it
          if (manualRedirect) {
            finalChatType = manualRedirect;
            
            // Get chunks
            const { data: chunks } = await supabase
              .from('document_chunks')
              .select('content')
              .eq('document_id', documentId)
              .limit(3);

            if (chunks && chunks.length > 0) {
              ragContext = `\n\n📚 CONTEXTO DO DOCUMENTO "${document.filename}":\n\n${chunks.map((c: any) => c.content).join("\n\n---\n\n")}\n\n`;
            }

            // Log manual redirect
            if (sessionId) {
              await logDocumentRouting(supabase, {
                documentId,
                documentName: document.filename,
                originalCategory: 'general',
                finalCategory: manualRedirect,
                actionType: 'manual_redirect',
                sessionId,
                scopeChanged: true,
                disclaimerShown: true,
              });
            }
          } else {
            // Return response indicating manual redirect is required
            requiresManualRedirect = true;
          }
        }
      }
    }

    // If manual redirect is required, return early with tags
    if (requiresManualRedirect) {
      return new Response(
        JSON.stringify({
          requires_manual_redirect: true,
          document: {
            id: documentId,
            filename: document?.filename,
            suggestedTags,
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Perform RAG search if no document-specific context
    if (!ragContext && userQuery) {
      try {
        const { data: searchResults } = await supabase.functions.invoke("search-documents", {
          body: { 
            query: userQuery,
            targetChat: finalChatType,
            matchCount: 3
          }
        });

        if (searchResults?.results && searchResults.results.length > 0) {
          console.log(`Found ${searchResults.results.length} relevant chunks from RAG`);
          ragContext = `\n\n📚 CONTEXTO RELEVANTE DOS DOCUMENTOS:\n\n${searchResults.results.map((r: any) => r.content).join("\n\n---\n\n")}\n\n`;
        }
      } catch (error) {
        console.error("RAG search error:", error);
      }
    }

    // Build scope description based on chat type
    let scopeDescription = "";
    if (finalChatType === 'health') {
      scopeDescription = "Hospital Moinhos de Vento e área de saúde";
    } else if (finalChatType === 'study') {
      scopeDescription = "KnowRISK, KnowYOU, ACC e conteúdo do website";
    } else {
      scopeDescription = "Conteúdo geral";
    }

    // Build the dynamic system prompt
    const systemPrompt = buildDynamicPrompt({
      category: finalChatType,
      document: document || undefined,
      scopeDescription,
      ragContext,
    });

    // Call Lovable AI Gateway
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
          JSON.stringify({ error: "Limite de uso excedido. Tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar mensagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat unified error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});