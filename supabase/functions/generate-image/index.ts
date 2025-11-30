import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
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

    // Validação de keywords de saúde (PT e EN)
    const healthKeywords = [
      // Português - termos clássicos de saúde
      "saúde", "médico", "hospital", "paciente", "tratamento", "diagnóstico",
      "anatomia", "coração", "cérebro", "medicina", "cirurgia", "enfermagem",
      "farmácia", "medicamento", "doença", "terapia", "exame", "consulta",
      "clínica", "bem-estar", "nutrição", "fisioterapia", "saúde mental",
      "sistema", "órgão", "célula", "corpo", "humano", "respiratório",
      "digestivo", "circulatório", "nervoso", "esqueleto", "moinhos de vento",
      
      // Português - IA/RAG em contexto de saúde
      "fluxo rag", "rag clínico", "rag em saúde", "ia em saúde", "inteligência artificial em saúde",
      "sistema de apoio à decisão clínica", "prontuário eletrônico", "prontuario eletrônico",
      "hospital moinhos", "hospital moinhos de vento",
      
      // English - termos clássicos de saúde
      "health", "medical", "doctor", "hospital", "patient", "treatment", "diagnosis",
      "anatomy", "heart", "brain", "medicine", "surgery", "nursing",
      "pharmacy", "medication", "disease", "therapy", "exam", "consultation",
      "clinic", "wellness", "nutrition", "physiotherapy", "mental health",
      "system", "organ", "cell", "body", "human", "respiratory",
      "digestive", "circulatory", "nervous", "skeleton", "bone",

      // English - AI/RAG em contexto de saúde
      "rag flow", "rag pipeline", "clinical rag", "medical rag", "ai in healthcare",
      "clinical decision support", "electronic health record", "ehr", "emr"
    ];

    const promptLower = prompt.toLowerCase();
    const containsHealthKeyword = healthKeywords.some(keyword => 
      promptLower.includes(keyword)
    );

    if (!containsHealthKeyword) {
      console.log("❌ Prompt rejeitado (sem keywords de saúde):", prompt);
      return new Response(
        JSON.stringify({ error: "Apenas imagens relacionadas à área da saúde são permitidas" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Prompt aprovado:", prompt);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log("Gerando imagem com prompt:", prompt);

    // Criar prompt contextualizado para saúde
    const enhancedPrompt = `Crie uma imagem educativa, profissional e cientificamente precisa sobre saúde para o seguinte tema: ${prompt}. A imagem deve ser clara, didática e apropriada para profissionais de saúde.`;

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

    return new Response(
      JSON.stringify({ imageUrl }),
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
