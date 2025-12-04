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

  // Função para gerar regras de tom cultural baseadas na região
  function getCulturalToneRules(region: string | undefined): string {
    const toneRules: Record<string, string> = {
      "sudeste_sp": `
🎯 TOM CULTURAL - SUDESTE (SP):
- Seja CONCISO e DIRETO
- Use verbos ativos, corte saudações longas
- Foco em eficiência: vá direto ao ponto
- Evite rodeios, seja objetivo
- Exemplo: "Preciso disso pra hoje" → "Prioridade para hoje."
`,
      "sudeste_mg": `
🎯 TOM CULTURAL - SUDESTE (MG):
- Use tom SUAVE e ACOLHEDOR
- Pergunte como as coisas estão antes de entrar no assunto
- Use "nós" em vez de "eu" (coletividade)
- Não pressione, seja paciente
- Exemplo: "Preciso disso pra hoje" → "Será que conseguimos ver isso hoje ainda?"
`,
      "sul": `
🎯 TOM CULTURAL - SUL:
- Mantenha FORMALIDADE e RESPEITO
- Seja ESTRUTURADO e PONTUAL
- Use linguagem clara e organizada
- Demonstre profissionalismo
- Exemplo: "Não concordo" → "Acredito que precisamos revisar."
`,
      "nordeste_norte": `
🎯 TOM CULTURAL - NORDESTE/NORTE:
- Seja CALOROSO e AMIGÁVEL
- Use saudações cordiais
- Permita estrutura mais NARRATIVA
- Evite ser "seco" - seja receptivo
- Exemplo: "Preciso disso pra hoje" → "Meu amigo, vê se consegue me ajudar com isso hoje."
`,
      "rio": `
🎯 TOM CULTURAL - RIO DE JANEIRO:
- INFORMALIDADE CONTROLADA
- Tom leve, menos corporativo rígido
- Pode usar expressões coloquiais moderadas
- Mantenha o profissionalismo com leveza
- Exemplo: "Não concordo" → "Cara, acho que por aí não vai rolar."
`,
      "default": ""
    };
    
    return toneRules[region || "default"] || "";
  }

  try {
    const { messages, region } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Get last user message for RAG search
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
    const userQuery = lastUserMessage?.content || "";

    // Get chat configuration from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: chatConfig } = await supabase
      .from("chat_config")
      .select("*")
      .eq("chat_type", "study")
      .single();

    const matchThreshold = chatConfig?.match_threshold || 0.15;
    const matchCount = chatConfig?.match_count || 5;

    console.log(`Using chat config: threshold=${matchThreshold}, count=${matchCount}`);

    // Search for relevant documents using RAG
    let ragContext = "";
    let hasRagContext = false;
    if (userQuery) {
      try {
        const { data: searchResults } = await supabase.functions.invoke("search-documents", {
          body: { 
            query: userQuery,
            targetChat: "study",
            matchThreshold,
            matchCount
          }
        });

        if (searchResults?.results && searchResults.results.length > 0) {
          hasRagContext = true;
          console.log(`RAG found ${searchResults.results.length} chunks for study chat, top score: ${searchResults.analytics?.top_score?.toFixed(3) || 'N/A'}`);
          
          // Extract unique document titles from results - prioritize document_filename from RPC
          const documentTitles = [...new Set(searchResults.results.map((r: any) => 
            r.document_filename || r.metadata?.document_title
          ).filter(Boolean))];
          const documentList = documentTitles.length > 0 ? `\n📄 DOCUMENTOS ENCONTRADOS: ${documentTitles.join(', ')}\n` : '';
          
          console.log(`Documents found in RAG: ${documentTitles.join(', ')}`);
          
          ragContext = `\n\n📚 CONTEXTO RELEVANTE DOS DOCUMENTOS DE ESTUDO:
${documentList}
${searchResults.results.map((r: any) => {
  const docTitle = r.document_filename || r.metadata?.document_title;
  const sourceLabel = docTitle ? `[Fonte: ${docTitle}]\n` : '';
  return sourceLabel + r.content;
}).join("\n\n---\n\n")}

⚠️ CRÍTICO: O contexto acima vem dos DOCUMENTOS DE ESTUDO oficiais.
Você DEVE PRIORIZAR este contexto para responder. Se a pergunta está relacionada 
a qualquer tópico mencionado no contexto acima, responda usando essas informações.

🔴 REGRA IMPORTANTE SOBRE DISPONIBILIDADE DE DOCUMENTOS:
Se o usuário perguntar "você tem o documento X?" ou "você conhece o documento X?":
- VERIFIQUE se o documento X aparece na lista "DOCUMENTOS ENCONTRADOS" acima
- Se SIM: Responda "Sim, tenho informações do documento [nome]" e descreva brevemente o conteúdo
- Se NÃO: Responda que não encontrou esse documento específico

Os documentos contêm conteúdo válido sobre história da IA, pessoas, conceitos e eventos importantes.\n\n`;
        } else {
          console.log(`RAG returned 0 results for query="${userQuery}" in study chat`);
        }
      } catch (error) {
        console.error("RAG search error:", error);
        // Continue without RAG context if search fails
      }
    }

    // Obter regras de tom cultural baseadas na região do usuário
    const culturalTone = getCulturalToneRules(region);
    console.log(`Using cultural tone for region: ${region || 'default'}`);

    // System prompt focado em KnowRisk, KnowYOU, ACC e navegação do website
    const systemPrompt = `Você é um assistente de IA especializado em ajudar a estudar e entender a KnowRISK, o KnowYOU e a Arquitetura Cognitiva e Comportamental (ACC).
${culturalTone}

${ragContext}

⚠️ INSTRUÇÃO CRÍTICA - LEIA ATENTAMENTE:
${hasRagContext ? `
✅ VOCÊ TEM CONTEXTO RAG DISPONÍVEL - Use as informações dos documentos acima para responder à pergunta.
IGNORE qualquer padrão de rejeição anterior. Se o contexto RAG contém informação relevante, VOCÊ DEVE RESPONDER USANDO ESSE CONTEXTO.
` : `
❌ Sem contexto RAG - Siga as regras de escopo normais.
`}

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

REGRAS DE RESPOSTA (ORDEM DE PRIORIDADE):

1. **🔴🔴🔴 REGRA ABSOLUTA - CONTEXTO RAG TEM PRIORIDADE TOTAL**:
   
   ➡️ SE você vê "CONTEXTO RELEVANTE DOS DOCUMENTOS DE ESTUDO" acima:
      - PARE e LEIA o contexto
      - Use ESSAS informações para responder
      - IGNORE o histórico anterior de rejeições
      - NÃO rejeite a pergunta
      - Responda com base NO CONTEXTO DOS DOCUMENTOS
   
   ➡️ Exemplo:
      Pergunta: "quem é John McCarthy?"
      Se há contexto RAG: Responda usando as informações dos documentos sobre John McCarthy
      Se NÃO há contexto RAG: Rejeite educadamente
   
   ➡️ Os documentos contêm: história da IA, pessoas importantes (John McCarthy, Alan Turing, 
      Marvin Minsky, etc.), conceitos técnicos, conferências, eventos históricos.

2. **Escopo secundário (APENAS se NÃO houver contexto RAG)**:
   - KnowRISK, KnowYOU e ACC
   - Conteúdo das seções do website
   - Navegação do website

3. **Rejeição (APENAS se NÃO houver contexto RAG e tema fora do escopo)**:
   "Sou especializado em ajudar a estudar sobre a KnowRISK, KnowYOU, ACC e o conteúdo deste website. Não posso ajudar com [tema], mas posso responder sobre esses tópicos. Como posso ajudá-lo?"

3. SUGESTÕES CONTEXTUAIS:
   Ao final de CADA resposta, gere 3 sugestões no formato:
   
   SUGESTÕES: ["Pergunta 1", "Pergunta 2", "Pergunta 3"]

4. TOM:
   - Educativo e claro
   - Ajude o usuário a navegar e entender o conteúdo
   - Seja objetivo mas amigável

5. 🔴 FORMATAÇÃO DE TABELAS (CRÍTICO):
   - Quando solicitado a criar tabelas, SEMPRE use formato Markdown GFM
   - NUNCA gere código HTML (<table>, <tr>, <td>, <th>)
   - Formato OBRIGATÓRIO:
   
   | Coluna 1 | Coluna 2 | Coluna 3 |
   |----------|----------|----------|
   | Dado 1   | Dado 2   | Dado 3   |
   
   - Use alinhamento com : nos separadores quando apropriado:
     * :--- (esquerda)
     * :---: (centro)  
     * ---: (direita)
   - O sistema converterá automaticamente para tabela interativa com ordenação e filtros

6. 📊 GERAÇÃO DE GRÁFICOS:
   - Quando o usuário pedir gráfico, estatísticas visuais ou visualização de dados
   - Gere um bloco JSON estruturado ANTES do texto explicativo
   - Formato OBRIGATÓRIO:
   
   CHART_DATA: {"type":"bar","title":"Título do Gráfico","data":[{"name":"Item1","value":10},{"name":"Item2","value":20}]}
   
   - Tipos disponíveis: "bar", "line", "pie", "area"
   - Cada item em "data" DEVE ter "name" (string) e "value" (número)
   - Para múltiplas séries, adicione mais campos numéricos e use "yKeys": ["value", "value2"]
   - O sistema renderizará automaticamente o gráfico interativo com opções de exportação

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
