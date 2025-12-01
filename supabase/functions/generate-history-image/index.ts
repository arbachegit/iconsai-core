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
    const { eraId, forceRegenerate } = await req.json();
    
    // Initialize Supabase client for caching
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    if (!eraId) {
      throw new Error("Era ID é obrigatório");
    }
    
    // Check cache first (unless forced regeneration)
    const cacheKey = `history-${eraId}`;
    
    if (!forceRegenerate) {
      const { data: cached } = await supabaseClient
        .from('generated_images')
        .select('image_url')
        .eq('section_id', cacheKey)
        .maybeSingle();
      
      if (cached?.image_url) {
        console.log(`Cache hit para era: ${eraId}`);
        return new Response(
          JSON.stringify({ imageUrl: cached.image_url, fromCache: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não está configurada");
    }

    const eraPrompts: Record<string, string> = {
      talos: "Gigante de bronze grego mitológico, estilo art déco sépia dourado, webp sem texto",
      'turing-machine': "Máquina de Turing 1936, diagrama blueprint técnico vintage azul preto, webp sem texto",
      enigma: "Máquina Enigma Bletchley Park 1940s, preto branco sépia documental, webp sem texto",
      'turing-test': "Teste de Turing 1950, humano e terminal vintage retrofuturista azul verde, webp sem texto",
      arpanet: "ARPANET UCLA 1969, mainframe IMP vintage verde cinza, webp sem texto",
      tcpip: "Rede TCP/IP 1974, diagrama blueprint tecnológico azul verde, webp sem texto",
      www: "Tim Berners-Lee CERN 1989, navegador NeXT anos 80 azul neutro, webp sem texto",
      social: "Web 2.0 Facebook Orkut 2004, interface CRT nostálgica azul branco, webp sem texto",
      watson: "IBM Watson Jeopardy 2011, supercomputador palco TV azul moderno, webp sem texto",
      openai: "OpenAI 2015, neural networks cyan roxo neon futurista minimalista, webp sem texto",
      gpt3: "GPT-3 Playground 2020, terminal código IA verde azul tech moderno, webp sem texto",
      chatgpt: "ChatGPT 2022, chat interface cyan roxo minimalista contemporâneo, webp sem texto",
      current: "IA 2024 Gemini GPT-4 Claude Veo neural networks cyberpunk multi-colorido, webp sem texto"
    };

    const prompt = eraPrompts[eraId];
    if (!prompt) {
      throw new Error(`Era ID inválido: ${eraId}`);
    }

    console.log(`Gerando imagem para era: ${eraId}`);

    console.log(`Chamando Lovable AI Gateway com modelo: google/gemini-3-pro-image-preview`);
    
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
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da API Lovable AI:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Falha ao gerar imagem: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Response data structure:", JSON.stringify({
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasMessage: !!data.choices?.[0]?.message,
      hasImages: !!data.choices?.[0]?.message?.images,
      imagesLength: data.choices?.[0]?.message?.images?.length,
      firstImageType: data.choices?.[0]?.message?.images?.[0]?.type,
    }));
    
    // Try multiple possible response structures
    let imageUrl;
    
    // Structure 1: choices[0].message.images[0].image_url.url
    if (data.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
      imageUrl = data.choices[0].message.images[0].image_url.url;
      console.log("Found image at: choices[0].message.images[0].image_url.url");
    }
    // Structure 2: choices[0].message.content (might be base64)
    else if (data.choices?.[0]?.message?.content) {
      imageUrl = data.choices[0].message.content;
      console.log("Found image at: choices[0].message.content");
    }
    // Structure 3: Direct image field
    else if (data.image) {
      imageUrl = data.image;
      console.log("Found image at: data.image");
    }

    if (!imageUrl) {
      console.error("Full response data:", JSON.stringify(data, null, 2));
      throw new Error("Nenhuma imagem gerada na resposta. Estrutura de resposta não reconhecida.");
    }
    
    console.log("Image URL length:", imageUrl.length);
    
    // Save to cache
    await supabaseClient
      .from('generated_images')
      .upsert({
        section_id: cacheKey,
        prompt_key: eraId,
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'section_id'
      });
    
    console.log(`Imagem gerada e cacheada para era: ${eraId}`);

    return new Response(
      JSON.stringify({ imageUrl, fromCache: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro ao gerar imagem histórica:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
