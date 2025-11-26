import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    // Validação: apenas prompts relacionados à área de saúde
    const healthKeywords = [
      'saúde', 'médico', 'hospital', 'paciente', 'tratamento', 'diagnóstico',
      'anatomia', 'coração', 'cérebro', 'medicina', 'cirurgia', 'enfermagem',
      'farmácia', 'medicamento', 'doença', 'terapia', 'exame', 'consulta',
      'clínica', 'bem-estar', 'nutrição', 'fisioterapia', 'saúde mental',
      'vacina', 'sangue', 'órgão', 'sintoma', 'cuidado', 'prevenção',
      'health', 'medical', 'doctor', 'patient', 'treatment', 'diagnosis',
      'surgery', 'clinic', 'nurse', 'pharmacy', 'disease', 'therapy'
    ];

    const isHealthRelated = healthKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword)
    );

    if (!isHealthRelated) {
      return new Response(
        JSON.stringify({ 
          error: "Apenas imagens relacionadas à área da saúde são permitidas. Por favor, refaça seu pedido com um tema de saúde ou medicina." 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Adicionar prefixo explícito para forçar geração de imagem
    const imagePrompt = `[IMAGE GENERATION REQUEST] Generate a visual image based on this description: ${prompt}. IMPORTANT: Only generate the image, do not respond with text.`;
    
    console.log("Gerando imagem com prompt:", imagePrompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt,
          }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Registrar uso de crédito com falha (rate limit)
        await supabase.rpc('log_credit_usage', {
          p_operation_type: 'image_generation',
          p_success: false,
          p_error_code: '429',
          p_section_id: null,
          p_metadata: null
        });
        
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
        // Registrar uso de crédito com falha (sem créditos)
        await supabase.rpc('log_credit_usage', {
          p_operation_type: 'image_generation',
          p_success: false,
          p_error_code: '402',
          p_section_id: null,
          p_metadata: null
        });
        
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
    console.log("Resposta completa da API:", JSON.stringify(data, null, 2));

    // Extrair a imagem base64 da resposta em diferentes formatos possíveis
    const choice = data.choices?.[0];
    const message = choice?.message;

    let imageUrl = message?.images?.[0]?.image_url?.url;

    // Fallback: images[].url diretamente
    if (!imageUrl) {
      imageUrl = message?.images?.[0]?.url;
    }

    // Fallback: imagens embutidas em message.content como partes estruturadas
    if (!imageUrl && Array.isArray(message?.content)) {
      try {
        const imagePart = message.content.find((part: any) =>
          part?.type === "image_url" || part?.type === "output_image"
        );
        imageUrl = imagePart?.image_url?.url || imagePart?.url;
      } catch (err) {
        console.error("Erro ao tentar extrair imagem de message.content:", err);
      }
    }

    // Fallback: algumas implementações colocam images no nível do choice
    if (!imageUrl && Array.isArray(choice?.images)) {
      const first = choice.images[0];
      imageUrl = first?.image_url?.url || first?.url;
    }

    // Fallback: imagens no nível raiz (ex.: { images: [...] } ou { data: [...] })
    if (!imageUrl && Array.isArray(data.images)) {
      const first = data.images[0];
      imageUrl = first?.image_url?.url || first?.url || first?.b64_json;
    }

    if (!imageUrl && Array.isArray(data.data)) {
      const first = data.data[0];
      imageUrl = first?.url || first?.b64_json;
    }

    if (!imageUrl) {
      console.error("Formato de resposta inesperado. Estrutura completa:", JSON.stringify(data, null, 2));
      console.error("Choices:", data.choices);
      if (data.choices?.[0]) {
        console.error("Message:", data.choices[0].message);
        console.error("Images:", data.choices[0].message?.images);
      }
      
      // Registrar falha
      await supabase.rpc('log_credit_usage', {
        p_operation_type: 'image_generation',
        p_success: false,
        p_error_code: 'no_image_url',
        p_section_id: null,
        p_metadata: null
      });
      
      return new Response(
        JSON.stringify({ 
          error: "Erro ao processar imagem gerada",
          details: "Formato de resposta inesperado da API"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Registrar sucesso
    await supabase.rpc('log_credit_usage', {
      p_operation_type: 'image_generation',
      p_success: true,
      p_error_code: null,
      p_section_id: null,
      p_metadata: { prompt_length: prompt.length }
    });

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
