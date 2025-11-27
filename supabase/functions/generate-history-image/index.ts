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

    // Prompts específicos para cada era da história da IA
    const eraPrompts: Record<string, string> = {
      dream: "Ilustração artística vintage de autômatos mecânicos gregos em bronze dourado, Talos o gigante de bronze, engrenagens visíveis, estilo art déco e steampunk, tons sépia e dourado, ultra alta resolução, sem texto",
      birth: "Alan Turing trabalhando em máquina de computação dos anos 1950, ambiente científico retrô, tubos de vácuo, fitas magnéticas, estilo fotográfico vintage em preto e branco com toques azuis, ultra alta resolução, sem texto",
      childhood: "O icônico olho vermelho brilhante do HAL 9000 de 2001 Uma Odisseia no Espaço, close-up cinematográfico, reflexo futurista, fundo escuro espacial, estilo cinematográfico sci-fi clássico, ultra alta resolução, sem texto",
      adulthood: "Deep Blue da IBM jogando xadrez contra Garry Kasparov, tabuleiro de xadrez em primeiro plano, computador massivo ao fundo, iluminação dramática, estilo fotojornalístico dos anos 90, tons verdes e cinzas tecnológicos, ultra alta resolução, sem texto",
      revolution: "Interface moderna do ChatGPT com partículas de dados e neurônios artificiais fluindo em rede neural, gradientes cyan e roxo neon, estilo futurista minimalista, holográfico, ultra alta resolução, sem texto"
    };

    const prompt = eraPrompts[eraId];
    if (!prompt) {
      throw new Error(`Era ID inválido: ${eraId}`);
    }

    console.log(`Gerando imagem para era: ${eraId}`);

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

      throw new Error(`Falha ao gerar imagem: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("Nenhuma imagem gerada na resposta");
    }
    
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
