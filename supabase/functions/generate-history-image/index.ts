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

    // Prompts específicos para cada evento da história da IA
    const eraPrompts: Record<string, string> = {
      // Idade do Bronze - Talos
      talos: "Ilustração artística do mito grego de Talos, o gigante de bronze. Estilo art déco em tons sépia e dourado, gigante mecânico protetor com engrenagens visíveis, arte clássica grega, ultra alta resolução, formato webp, sem texto",
      
      // Fundação Teórica - Máquina de Turing 1936
      'turing-machine': "Diagrama conceitual vintage da Máquina de Turing de 1936, fita infinita, cabeça de leitura/escrita, esquema teórico em estilo blueprint técnico dos anos 1930, tons azuis e pretos, ultra alta resolução, formato webp, sem texto",
      
      // Segunda Guerra - Quebra do Código Enigma
      enigma: "Máquina Enigma alemã em Bletchley Park, ambiente de guerra vintage anos 1940, sala de operações secreta, tubos de vácuo, máquinas de calcular, estilo fotográfico documental em preto e branco com tons sépia, ultra alta resolução, formato webp, sem texto",
      
      // Filosofia da IA - Teste de Turing 1950
      'turing-test': "Ilustração conceitual do Teste de Turing 1950, humano conversando com máquina através de terminal vintage, sala de computação anos 50, estilo retrofuturista com tons azuis e verdes, ultra alta resolução, formato webp, sem texto",
      
      // Internet - ARPANET 1969
      arpanet: "Primeiro nó ARPANET na UCLA 1969, computador mainframe IMP com luzes piscando, cabos conectados, sala de computadores vintage, estilo documental fotográfico dos anos 60, tons verdes e cinzas, ultra alta resolução, formato webp, sem texto",
      
      // Protocolos - TCP/IP 1974
      tcpip: "Diagrama técnico vintage de rede TCP/IP 1974, nós interconectados, pacotes de dados fluindo, estilo esquemático blueprint com tons azuis e verdes tecnológicos, ultra alta resolução, formato webp, sem texto",
      
      // Web - World Wide Web 1989
      www: "Tim Berners-Lee e o primeiro navegador web no CERN 1989, computador NeXT, interface de hipertexto, sala de laboratório científico, estilo documental anos 80, tons neutros e azuis, ultra alta resolução, formato webp, sem texto",
      
      // Social - Facebook/Orkut 2004
      social: "Interface vintage Web 2.0 ano 2004, perfis sociais, ícones estilizados do Facebook e Orkut, telas de computador CRT, estilo nostálgico digital dos anos 2000, tons azuis e brancos, ultra alta resolução, formato webp, sem texto",
      
      // Watson - IBM 2011
      watson: "IBM Watson vencendo Jeopardy! 2011, supercomputador com logo Watson, painéis de dados em tempo real, palco de TV game show, iluminação dramática azul tecnológica, estilo fotojornalístico moderno, ultra alta resolução, formato webp, sem texto",
      
      // OpenAI - Fundação 2015
      openai: "Logo e conceito visual da OpenAI 2015, neural networks abstratas, partículas de dados fluindo, gradientes cyan e roxo neon, estilo futurista minimalista clean tech, ultra alta resolução, formato webp, sem texto",
      
      // GPT-3 - Lançamento 2020
      gpt3: "Interface do GPT-3 Playground 2020, terminal de código com texto gerado por IA, partículas de linguagem natural fluindo, estilo tech moderno com gradientes verdes e azuis, ultra alta resolução, formato webp, sem texto",
      
      // ChatGPT - Febre da IA 2022
      chatgpt: "Interface moderna do ChatGPT 2022, conversação humano-IA fluindo naturalmente, bolhas de chat elegantes, gradientes suaves cyan e roxo, estilo minimalista contemporâneo, ultra alta resolução, formato webp, sem texto",
      
      // Atualidade - Web 3.0, Veo, LLMs
      current: "Colagem futurista 2024 com logos Gemini, GPT-4, Claude, Veo, neural networks complexas, dados fluindo em tempo real, hologramas de IA, gradientes vibrantes multi-coloridos, estilo cyberpunk elegante, ultra alta resolução, formato webp, sem texto"
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
