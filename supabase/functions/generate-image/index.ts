import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, chatType = "health" } = await req.json();
    
    // Validação de entrada
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Prompt inválido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (prompt.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Prompt muito longo (máximo 1000 caracteres)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Buscar scope_topics e tags do banco de dados
    const { data: configData, error: configError } = await supabaseClient
      .from("chat_config")
      .select("scope_topics, document_tags_data")
      .eq("chat_type", chatType)
      .single();

    if (configError) {
      console.error("Erro ao buscar configuração:", configError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar escopo permitido" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Construir lista de keywords permitidas a partir do banco
    const allowedKeywords: string[] = [];
    
    // Adicionar scope_topics (tags parent com alta confiança)
    if (configData?.scope_topics && Array.isArray(configData.scope_topics)) {
      allowedKeywords.push(...configData.scope_topics.map((t: string) => t.toLowerCase()));
    }
    
    // Adicionar todas as tags (parent e child) do document_tags_data
    if (configData?.document_tags_data && Array.isArray(configData.document_tags_data)) {
      configData.document_tags_data.forEach((tag: { tag_name: string }) => {
        if (tag.tag_name) {
          allowedKeywords.push(tag.tag_name.toLowerCase());
        }
      });
    }

    // Se não houver keywords configuradas, rejeitar
    if (allowedKeywords.length === 0) {
      console.log("❌ Nenhum escopo configurado para o chat:", chatType);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "scope_not_configured",
          message: "Nenhum escopo de conteúdo configurado. Adicione documentos ao RAG primeiro."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validar se o prompt contém alguma keyword permitida
    const promptLower = prompt.toLowerCase();
    const containsAllowedKeyword = allowedKeywords.some(keyword => 
      promptLower.includes(keyword)
    );

    if (!containsAllowedKeyword) {
      console.log(`❌ Prompt rejeitado (fora do escopo ${chatType}):`, prompt);
      console.log("Keywords permitidas:", allowedKeywords.slice(0, 20), "...");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "guardrail_violation",
          rejected_term: prompt.trim(),
          scope: chatType,
          message: `Conteúdo fora do escopo permitido para ${chatType === "health" ? "saúde" : "estudo"}.`
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ Prompt aprovado (${chatType}):`, prompt);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log("Gerando imagem com prompt:", prompt);

    // Criar prompt contextualizado baseado no tipo de chat
    const contextPrefix = chatType === "health" 
      ? "Crie uma imagem educativa, profissional e cientificamente precisa sobre saúde para o seguinte tema:"
      : "Crie uma imagem educativa e profissional sobre tecnologia e IA para o seguinte tema:";
    
    const enhancedPrompt = `${contextPrefix} ${prompt}. A imagem deve ser clara, didática e apropriada para profissionais.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: enhancedPrompt,
          }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Limite de uso excedido. Tente novamente em alguns instantes." 
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
            error: "Créditos insuficientes. Adicione créditos ao workspace." 
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
        JSON.stringify({ error: "Erro ao gerar imagem" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log("Resposta da API:", JSON.stringify(data).substring(0, 200));

    // Extrair a imagem base64 da resposta
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("Formato de resposta inesperado:", data);
      return new Response(
        JSON.stringify({ error: "Erro ao processar imagem gerada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Convert Base64 to binary
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    console.log(`Binary size: ${binaryData.length} bytes`);

    // Generate unique filename based on timestamp
    const fileName = `chat-image-${Date.now()}.webp`;
    
    // Upload to Storage as WebP
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('content-images')
      .upload(fileName, binaryData, {
        contentType: 'image/webp',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Fallback to Base64 if storage fails
      return new Response(
        JSON.stringify({ imageUrl }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabaseClient
      .storage
      .from('content-images')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;
    console.log('Image uploaded to Storage:', publicUrl);

    return new Response(
      JSON.stringify({ imageUrl: publicUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Erro ao gerar imagem:", e);
    return new Response(
      JSON.stringify({ 
        error: e instanceof Error ? e.message : "Erro desconhecido ao gerar imagem" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
