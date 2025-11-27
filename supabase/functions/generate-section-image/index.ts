import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SECTION_PROMPTS: Record<string, string> = {
  'software': 'Ilustração futurista dos anos 1940-1980: primeiros computadores mainframe, programadores com cartões perfurados, linguagens de programação em monitores verdes, nascimento da era digital. Estilo tecnológico vintage. Ultra high resolution. Sem texto.',
  'internet': 'Visualização artística da conectividade global anos 1990-2000: rede de computadores interconectados, fibras ópticas brilhantes, globo terrestre com linhas de conexão, revolução digital. Ultra high resolution. Sem texto.',
  'tech-sem-proposito': 'Representação crítica do hype tecnológico: metaverso vazio e sombrio, NFTs flutuando sem propósito, realidade virtual abandonada, contraste entre promessa e realidade. Ultra high resolution. Sem texto.',
  'kubrick': 'O icônico olho vermelho do HAL 9000 do filme 2001: Uma Odisseia no Espaço, lente circular vermelha brilhante em fundo escuro, estilo cinematográfico de Stanley Kubrick. Ultra high resolution. Sem texto.',
  'watson': 'IBM Watson vencendo no Jeopardy 2011: computador azul IBM em palco de game show, luzes brilhantes, inteligência artificial cognitiva processando linguagem natural. Ultra high resolution. Sem texto.',
  'ia-nova-era': 'Era moderna da IA generativa 2022-presente: interface de chat com IA, assistentes virtuais conversacionais, ChatGPT, comunicação natural humano-máquina, democratização da inteligência artificial. Ultra high resolution. Sem texto.',
  'bom-prompt': 'Arte conceitual de comunicação efetiva: pessoa digitando prompt perfeito, palavras formando conexão com IA, clareza e especificidade visual, a arte de fazer boas perguntas. Ultra high resolution. Sem texto.',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { section_id } = await req.json();

    if (!section_id) {
      console.error('Missing section_id');
      return new Response(
        JSON.stringify({ error: 'section_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = SECTION_PROMPTS[section_id];
    if (!prompt) {
      console.error('Invalid section_id:', section_id);
      return new Response(
        JSON.stringify({ error: 'section_id inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating image for section:', section_id);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos ao seu workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Erro ao gerar imagem' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('No image URL in response');
      return new Response(
        JSON.stringify({ error: 'Nenhuma imagem foi gerada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Image generated successfully for section:', section_id);

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-section-image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
