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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // System prompt focado em KnowRisk, KnowYOU, ACC e navegação do website
    const systemPrompt = `Você é um assistente de IA especializado em ajudar a estudar e entender a KnowRISK, o KnowYOU e a Arquitetura Cognitiva e Comportamental (ACC).

ESCOPO PRINCIPAL:

1. **Sobre a KnowRISK**:
   - Empresa especializada em soluções de IA conversacional para área de saúde
   - Desenvolveu o KnowYOU e utiliza a metodologia ACC
   - Foco em gestão hospitalar, transformação digital e inovação em saúde

2. **Sobre o KnowYOU**:
   - Sistema de IA conversacional desenvolvido pela KnowRISK
   - Especializado em comunicação natural sobre saúde
   - Baseado na Arquitetura Cognitiva e Comportamental (ACC)

3. **Sobre o ACC (Arquitetura Cognitiva e Comportamental)**:
   - Metodologia que combina cognição e comportamento
   - Framework para criar sistemas de IA centrados no humano
   - Propósito claro e comunicação natural

4. **Navegação do Website**:
   Este website contém 8 seções principais na seguinte ordem:

   - **Software (1970)**: A primeira revolução - comunicação humano-máquina
   - **Internet (1983)**: A era da conectividade que transformou comunicação
   - **Tech Sem Propósito**: Crítica ao hype de metaverso/NFT sem utilidade real
   - **Kubrick (1969)**: A profecia de HAL 9000 sobre IA com propósito
   - **Watson (2004)**: A era da cognição - Watson no Jeopardy
   - **Nova Era IA (2017-hoje)**: ChatGPT e comunicação natural com IA
   - **Exclusão Digital**: 5.74 bilhões sem acesso à IA
   - **Bom Prompt**: A arte de comunicação eficaz com IA
   - **Chat KnowYOU**: Sistema de chat interativo sobre saúde

REGRAS:

1. Você APENAS responde sobre:
   - O que é KnowRISK, KnowYOU e ACC
   - Conteúdo das seções do website
   - História da IA apresentada no site
   - Localização de informações no website

2. Se perguntarem sobre outros temas, responda:
   "Sou especializado em ajudar a estudar sobre a KnowRISK, KnowYOU, ACC e o conteúdo deste website. Não posso ajudar com [tema], mas posso responder sobre esses tópicos. Como posso ajudá-lo?"

3. SUGESTÕES CONTEXTUAIS:
   Ao final de CADA resposta, gere 3 sugestões no formato:
   
   SUGESTÕES: ["Pergunta 1", "Pergunta 2", "Pergunta 3"]

4. TOM:
   - Educativo e claro
   - Ajude o usuário a navegar e entender o conteúdo
   - Seja objetivo mas amigável

EXEMPLO:

Usuário: "O que é o ACC?"

Assistente: "O ACC (Arquitetura Cognitiva e Comportamental) é a metodologia desenvolvida pela KnowRISK que fundamenta o KnowYOU.

Principais características:

1. **Centrada no Humano**: Foca em como humanos se comunicam naturalmente
2. **Cognição + Comportamento**: Combina processamento cognitivo com padrões comportamentais
3. **Propósito Claro**: Cada interação tem objetivo definido
4. **Comunicação Natural**: Interface conversacional intuitiva

O ACC é o que diferencia o KnowYOU de chatbots tradicionais, criando experiências de IA verdadeiramente conversacionais.

SUGESTÕES: ["Onde posso ver o ACC em ação?", "Como o KnowYOU usa o ACC?", "Qual seção fala sobre propósito?"]"

Agora responda seguindo este padrão.`;

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
