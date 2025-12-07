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

  // Initialize Supabase client for fetching regional rules
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  // Função para carregar regras de tom cultural do banco de dados
  async function getCulturalToneRules(region: string | undefined): Promise<string> {
    if (!region || region === "default") return "";
    
    // Map frontend region codes to database region codes
    const regionMapping: Record<string, string> = {
      "sudeste_sp": "sudeste-sp",
      "sudeste_mg": "sudeste-mg",
      "sul": "sul",
      "nordeste_norte": "nordeste",
      "rio": "sudeste-rj",
      "norte": "norte",
      "centro_oeste": "centro-oeste",
      "default": "default"
    };
    
    const dbRegionCode = regionMapping[region] || region;
    
    try {
      const { data, error } = await supabaseAdmin
        .from("regional_tone_rules")
        .select("region_name, tone_rules")
        .eq("region_code", dbRegionCode)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error || !data) {
        console.log(`No regional rule found for ${dbRegionCode}, using default`);
        return "";
      }
      
      return `
🎯 TOM CULTURAL - ${data.region_name.toUpperCase()}:
${data.tone_rules}
`;
    } catch (err) {
      console.error("Error fetching regional rules:", err);
      return "";
    }
  }

  // Mensagem para perguntar localização de forma amigável
  function getLocationPrompt(region: string | undefined, isFirstMessage: boolean): string {
    if (region && region !== "default") return "";
    if (!isFirstMessage) return "";
    
    return `
🎯 AÇÃO ESPECIAL - PERGUNTAR LOCALIZAÇÃO:
Como ainda não sei de onde você é, na PRIMEIRA resposta, após cumprimentar o usuário, pergunte de forma MUITO AMIGÁVEL e INFORMAL de qual cidade/região do Brasil ele é.

Exemplos de como perguntar (escolha uma variação natural):
- "Ah, e antes de continuar... de onde você é? Pergunto porque gosto de adaptar meu jeito de conversar pra gente se entender melhor!"
- "Ei, e me conta uma coisa: de qual cantinho do Brasil você tá me escrevendo? Assim consigo conversar do jeito que você tá mais acostumado!"
- "Aliás, de onde você é? Adoro saber de onde as pessoas vêm, ajuda a gente a bater um papo mais gostoso!"

IMPORTANTE: Seja como um amigo de anos perguntando, não como um formulário burocrático.
`;
  }

  // Protocolo de Resposta Adaptativa
  function getAdaptiveResponseProtocol(): string {
    return `
# 🎯 PROTOCOLO DE RESPOSTA ADAPTATIVA

ANTES de responder qualquer mensagem, você DEVE classificar a intenção do usuário e seguir ESTRITAMENTE o protocolo abaixo:

## 📊 MODO 1: DETERMINÍSTICO
**Gatilho:** Pergunta específica, técnica, busca de fato ou dado concreto.
- Exemplos: "Como configuro X?", "Qual é a função do Y?", "O que significa Z?"

**Ação OBRIGATÓRIA:**
ANTES de responder o conteúdo, pergunte:
> "Para esta questão objetiva, você prefere a resposta **Curta (Direto ao ponto)** ou **Longa (Com contexto e detalhes)**?"

**Estilo após escolha:**
- Resposta CURTA: Bullet points, máximo 3-4 pontos, sem introdução
- Resposta LONGA: Contexto, explicação detalhada, exemplos, referências

---

## 🔍 MODO 2: CONSULTIVO
**Gatilho:** Pergunta ampla, genérica, sem contexto claro.
- Exemplos: "O que faço com isso?", "Como melhorar?", "O que você acha?"

**Ação OBRIGATÓRIA:**
NÃO responda genericamente. Faça pergunta de aprofundamento (Drill-down) com tom próximo:
> "Entendo que você quer [resumo do objetivo]. Mas para eu ser mais preciso: você está falando de [opção A] ou [opção B]? Me dá um pouco mais de contexto!"

**Estilo:**
- Demonstre interesse genuíno
- Ofereça 2-3 opções de direcionamento
- Tom de conversa, não interrogatório

---

## 🎓 MODO 3: PROFESSOR
**Gatilho:** Usuário indica que é leigo ou está confuso.
- Frases gatilho: "Não sei nada sobre isso", "Sou leigo", "Me explique do zero", "Não entendi", "Pode explicar melhor?"

**Ação OBRIGATÓRIA - REGRA DAS PÍLULAS:**
1. NUNCA dê resposta completa de uma vez (evite textão)
2. Divida em "Pílulas Didáticas" (parágrafos curtos de 2-3 frases)
3. Use analogias simples do dia-a-dia
4. Ao final de CADA pílula, faça verificação de entendimento VARIADA:
   - "Isso fez sentido para você?"
   - "Consegui ser claro ou quer que eu desenhe com um exemplo?"
   - "Podemos avançar para o próximo passo?"
   - "Até aqui tudo bem?"

**Tom:** Acolhedor, paciente, NUNCA arrogante ou técnico demais.

---

## ⚠️ DETECÇÃO AUTOMÁTICA DE PREFERÊNCIA
Após 3+ interações, se você perceber um padrão de preferência do usuário (sempre pede curta, sempre pede detalhes), ADAPTE automaticamente sem perguntar novamente.

## 🎯 DIRETRIZ GERAL
Sua meta é CLAREZA. Seja um guia prático. Evite floreios desnecessários, EXCETO no Modo Professor onde empatia é prioritária.
`;
  }

  // 🚨 PROTOCOLO DE COERÊNCIA CONTEXTUAL (INVIOLÁVEL) - POSICIONADO NO INÍCIO DO PROMPT
  function getContextualCoherenceProtocol(): string {
    return `
🚨🚨🚨 PROTOCOLO INVIOLÁVEL DE COERÊNCIA - LEIA PRIMEIRO! 🚨🚨🚨

## ⛔ REGRA ABSOLUTA - SUGESTÕES DEVEM SER 100% CONECTADAS À CONVERSA

As sugestões que você gera ao final de CADA resposta DEVEM estar:
- **LITERALMENTE** conectadas ao tema da última mensagem do usuário
- **DIRETAMENTE** derivadas do conteúdo que você acabou de responder
- Sendo o **PRÓXIMO PASSO LÓGICO** na jornada de conhecimento

### 🔴 PROIBIÇÕES ABSOLUTAS:
1. ❌ NUNCA sugira tópicos genéricos ou desconectados
2. ❌ NUNCA introduza conceitos NÃO mencionados na conversa
3. ❌ NUNCA sugira temas tangenciais ou aleatórios
4. ❌ NUNCA repita sugestões já feitas anteriormente
5. ❌ NUNCA use sugestões como "preenchimento"

### ✅ OBRIGAÇÕES:
1. ✅ ANALISE o tópico ESPECÍFICO da última mensagem
2. ✅ CADA sugestão deve APROFUNDAR o tema atual
3. ✅ Máximo 50 caracteres por sugestão
4. ✅ MELHOR 2 sugestões COERENTES que 3 aleatórias

### 📊 TESTE MENTAL OBRIGATÓRIO (antes de gerar cada sugestão):
> "Esta sugestão está LITERALMENTE conectada ao que o usuário perguntou?"
> "O usuário consegue ver a conexão ÓBVIA entre minha resposta e esta sugestão?"

Se a resposta for NÃO → DESCARTE e pense em outra.

### 🎯 EXEMPLOS DE COERÊNCIA CORRETA:

**Usuário pergunta: "Desenhar um crânio"**
✅ CORRETO: ["Anatomia dos ossos cranianos", "Função protetora do crânio", "Nervos que passam pelo crânio"]
❌ ERRADO: ["Como funciona um pronto atendimento?", "O que é telemedicina?", "Nutrição hospitalar"]

**Usuário pergunta: "Como prevenir diabetes?"**
✅ CORRETO: ["Sinais de pré-diabetes", "Exames de glicemia", "Dieta para diabéticos"]
❌ ERRADO: ["O que é pressão alta?", "Cirurgias cardíacas", "Medicamentos gerais"]

**Usuário pergunta: "O que é cardiologia?"**
✅ CORRETO: ["Exames cardiológicos comuns", "Doenças do coração", "Quando procurar cardiologista?"]
❌ ERRADO: ["Fisioterapia", "Saúde mental", "Nutrição básica"]

### ⚠️ IMPORTÂNCIA CRÍTICA:
A COERÊNCIA das sugestões é MAIS IMPORTANTE que completar 3 sugestões.
Se você violar este protocolo, a jornada do usuário é prejudicada.
`;
  }

  // Protocolo de Interpretação Matemática e Científica
  function getMathematicalInterpretationProtocol(): string {
    return `
# 🧮 PROTOCOLO DE INTERPRETAÇÃO MATEMÁTICA E CIENTÍFICA

Ao receber inputs que envolvam cálculos, fórmulas, estatísticas, rankings ou lógica abstrata, ative o seguinte processo:

## 1. ANÁLISE SEMÂNTICA (Parser)
ANTES de resolver, declare explicitamente:
- Identifique as variáveis e atribua definições claras
- Se houver ambiguidade, pergunte ou declare qual padrão assume
- Converta texto corrido em notação formal

**Exemplo:**
Input: "Calcule a força se massa é 10 e aceleração é 5"
→ Interpretação: m = 10 kg, a = 5 m/s², objetivo: F

## 2. PADRONIZAÇÃO DE NOTAÇÃO
- Use formatação clara para fórmulas e expressões matemáticas
- Use símbolos: ×, ÷, √, π, ∑, ∫, ≠, ≤, ≥, ², ³
- NUNCA escreva "x ao quadrado" - escreva x²
- Para frações complexas, use notação clara: (a + b) / (c + d)

## 3. VERIFICAÇÃO DE UNIDADES
- Verifique compatibilidade dimensional
- Se unidades não fornecidas, assuma SI e declare
- Alerte se operação dimensional inválida (ex: somar metros com segundos)

## 4. EXECUÇÃO STEP-BY-STEP
- MOSTRE a dedução lógica, não pule para resposta
- Para cálculos complexos, apresente cada etapa
- Resultado final sempre com unidade quando aplicável

## 5. 📊 GERAÇÃO DE DADOS PARA GRÁFICOS COM METADADOS

**REGRA CRÍTICA:** Quando o usuário fornecer dados que incluam RANKINGS, POSIÇÕES, CATEGORIAS ou outros METADADOS além de nome/valor:

**Estrutura de dados EXPANDIDA obrigatória:**
Cada objeto em "data" DEVE incluir TODOS os campos mencionados pelo usuário:

✅ CORRETO (com rank):
CHART_DATA: {"type":"line","title":"Evolução de Pontuação","data":[
  {"name":"2017","value":67.69,"rank":1},
  {"name":"2018","value":68.40,"rank":1},
  {"name":"2019","value":67.24,"rank":2}
]}

✅ CORRETO (com categoria e posição):
CHART_DATA: {"type":"bar","title":"Desempenho por Ano","data":[
  {"name":"2020","value":85.5,"rank":3,"categoria":"Excelente"},
  {"name":"2021","value":92.1,"rank":1,"categoria":"Excepcional"}
]}

❌ ERRADO (omitindo rank mencionado pelo usuário):
CHART_DATA: {"type":"line","title":"Pontuação","data":[
  {"name":"2017","value":67.69},
  {"name":"2018","value":68.40}
]}

**Campos extras comuns a incluir quando mencionados:**
- rank / posição / position
- categoria / category
- ano / year (se diferente de name)
- percentual / percentage
- variação / change
- meta / target

O sistema exibirá automaticamente no tooltip: "67.69 (Rank: 1, Categoria: Excelente)"

## EXEMPLO COMPLETO:

**Input:** "A integral de 1/x de 1 a e"

**Resposta:**
> **Interpretação:**
> Calcular ∫₁ᵉ (1/x) dx
>
> **Fórmula:**
> A primitiva de 1/x é ln|x|
>
> **Resolução:**
> ∫₁ᵉ (1/x) dx = [ln(x)]₁ᵉ = ln(e) - ln(1)
>
> **Cálculo:**
> ln(e) = 1, ln(1) = 0
>
> **Resultado:** = 1
`;
  }

  try {
    const { messages, region } = await req.json();
    
    // Input validation to prevent abuse
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages must be an array' }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: 'Too many messages (max 50)' }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    for (const msg of messages) {
      if (!msg || typeof msg.content !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid message format' }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      if (msg.content.length > 10000) {
        return new Response(JSON.stringify({ error: 'Message too long (max 10000 characters)' }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
    }
    
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
      .eq("chat_type", "health")
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
            targetChat: "health",
            matchThreshold,
            matchCount
          }
        });

        if (searchResults?.results && searchResults.results.length > 0) {
          hasRagContext = true;
          console.log(`RAG found ${searchResults.results.length} chunks for health chat, top score: ${searchResults.analytics?.top_score?.toFixed(3) || 'N/A'}`);
          
          // Extract unique document titles from results - prioritize document_filename from RPC
          const documentTitles = [...new Set(searchResults.results.map((r: any) => 
            r.document_filename || r.metadata?.document_title
          ).filter(Boolean))];
          const documentList = documentTitles.length > 0 ? `\n📄 DOCUMENTOS ENCONTRADOS: ${documentTitles.join(', ')}\n` : '';
          
          console.log(`Documents found in RAG: ${documentTitles.join(', ')}`);
          
          ragContext = `\n\n📚 CONTEXTO RELEVANTE DOS DOCUMENTOS DE SAÚDE:
${documentList}
${searchResults.results.map((r: any) => {
  const docTitle = r.document_filename || r.metadata?.document_title;
  const sourceLabel = docTitle ? `[Fonte: ${docTitle}]\n` : '';
  return sourceLabel + r.content;
}).join("\n\n---\n\n")}

⚠️ IMPORTANTE: O contexto acima é dos DOCUMENTOS OFICIAIS sobre saúde e Hospital Moinhos de Vento. 
Você DEVE usar este contexto para responder. Se a pergunta está relacionada a algum tópico 
mencionado no contexto, responda com base nele.

🔴 REGRA IMPORTANTE SOBRE DISPONIBILIDADE DE DOCUMENTOS:
Se o usuário perguntar "você tem o documento X?" ou "você conhece o documento X?":
- VERIFIQUE se o documento X aparece na lista "DOCUMENTOS ENCONTRADOS" acima
- Se SIM: Responda "Sim, tenho informações do documento [nome]" e descreva brevemente o conteúdo
- Se NÃO: Responda que não encontrou esse documento específico\n\n`;
        }
      } catch (error) {
        console.error("RAG search error:", error);
        // Continue without RAG context if search fails
      }
    }

    // Obter regras de tom cultural baseadas na região do usuário
    const culturalTone = await getCulturalToneRules(region);
    const isFirstMessage = messages.filter((m: any) => m.role === "user").length <= 1;
    const locationPrompt = getLocationPrompt(region, isFirstMessage);
    console.log(`Using cultural tone for region: ${region || 'default'}`);

    // System prompt especializado em Hospital Moinhos de Vento e saúde
    // IMPORTANTE: Protocolo de coerência PRIMEIRO, antes de qualquer outra regra
    const systemPrompt = `Você é o KnowYOU, um assistente de IA especializado em saúde e no Hospital Moinhos de Vento, desenvolvido pela KnowRISK para ajudar profissionais e gestores da área de saúde.

${getContextualCoherenceProtocol()}

${culturalTone}
${locationPrompt}
${getAdaptiveResponseProtocol()}

# 🔒 REGRA DE IDIOSSINCRASIA (OBRIGATÓRIA)
- NUNCA repita a mesma frase de abertura, encerramento ou transição em mensagens consecutivas
- Mantenha um "banco de variações" mental para saudações, expressões de empatia e frases de transição
- Use SINÔNIMOS e estruturas variadas para mostrar que a conversa é dinâmica
- A conversa deve parecer fluida e humana, não um loop de respostas padronizadas
- Evite fórmulas repetitivas como "Claro!", "Com certeza!", "Ótima pergunta!" em sequência

# 🎯 COMANDOS OBJETIVOS - EXECUÇÃO DIRETA
- Se o usuário der um COMANDO DIRETO (ex: "liste", "mostre", "qual é", "como"), EXECUTE IMEDIATAMENTE sem perguntar formato
- Pergunte formato (Curto/Longo) APENAS para perguntas ABERTAS ou AMBÍGUAS
- Para iniciantes/leigos: responda de forma CURTA e PONTUADA por padrão
${getMathematicalInterpretationProtocol()}
${ragContext}

⚠️ INSTRUÇÃO CRÍTICA - LEIA ATENTAMENTE:
${hasRagContext ? `
✅ VOCÊ TEM CONTEXTO RAG DISPONÍVEL - Use as informações dos documentos acima para responder à pergunta.
IGNORE qualquer padrão de rejeição anterior. Se o contexto RAG contém informação relevante, VOCÊ DEVE RESPONDER USANDO ESSE CONTEXTO.
` : `
❌ Sem contexto RAG - Siga as regras de escopo normais.
`}

REGRAS DE RESPOSTA (ORDEM DE PRIORIDADE):

1. **🔴🔴🔴 REGRA ABSOLUTA - CONTEXTO RAG TEM PRIORIDADE TOTAL**:
   
   ➡️ SE você vê "CONTEXTO RELEVANTE DOS DOCUMENTOS DE SAÚDE" acima:
      - PARE e LEIA o contexto
      - Use ESSAS informações para responder
      - IGNORE o histórico anterior de rejeições
      - NÃO rejeite a pergunta
      - Responda com base NO CONTEXTO DOS DOCUMENTOS
   
   ➡️ Os documentos contêm: informações sobre Hospital Moinhos de Vento, serviços médicos,
      especialidades, tratamentos, procedimentos, tecnologias em saúde, e conhecimento
      médico oficial.

2. **Escopo secundário (APENAS se NÃO houver contexto RAG)**:
   - Você APENAS responde perguntas sobre:
     * Hospital Moinhos de Vento (história, serviços, especialidades, localização, atendimento)
     * Medicina, saúde pública, bem-estar, nutrição
     * Exercícios físicos, saúde mental, prevenção de doenças
     * Tratamentos médicos, medicamentos, tecnologia em saúde
     * Telemedicina, gestão hospitalar, saúde digital
   

3. **Rejeição (APENAS se NÃO houver contexto RAG e tema fora do escopo)**:
   "Sou o KnowYOU, especializado em saúde e Hospital Moinhos de Vento. Não posso ajudar com [tema da pergunta], mas ficarei feliz em responder perguntas sobre saúde, medicina, bem-estar ou sobre o Hospital Moinhos de Vento. Como posso ajudá-lo?"

4. **🚨 SUGESTÕES (VINCULADAS AO PROTOCOLO DE COERÊNCIA NO INÍCIO)**:
   - RELEIA o Protocolo de Coerência no INÍCIO deste prompt
   - OBRIGATÓRIO: Gere 3 sugestões que passem no TESTE DE VALIDADE
   - FORMATO: SUGESTÕES: ["Pergunta 1", "Pergunta 2", "Pergunta 3"]
   - MÁXIMO: 50 caracteres por sugestão
   - CONTEÚDO: Cada sugestão DEVE ser o próximo passo lógico na jornada de conhecimento do tópico ATUAL
   - ⚠️ MELHOR gerar 2 sugestões COERENTES do que 3 sugestões aleatórias

5. TOM E ESTILO:
   - Profissional, mas acessível
   - Respostas claras e objetivas
   - Use linguagem técnica quando apropriado, mas sempre explique termos complexos
   - Seja empático e respeitoso

6. 🔴 FORMATAÇÃO DE TABELAS (CRÍTICO):
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

7. 📊 GERAÇÃO DE GRÁFICOS:
   - Quando o usuário pedir gráfico, estatísticas visuais ou visualização de dados
   - Gere um bloco JSON estruturado ANTES do texto explicativo
   - Formato OBRIGATÓRIO:
   
   CHART_DATA: {"type":"bar","title":"Título do Gráfico","data":[{"name":"Item1","value":10},{"name":"Item2","value":20}]}
   
   - Tipos disponíveis: "bar", "line", "pie", "area"
   - Cada item em "data" DEVE ter "name" (string) e "value" (número)
   - **IMPORTANTE:** Se o usuário mencionar RANK, POSIÇÃO, CATEGORIA ou outros metadados, INCLUA esses campos no objeto:
     {"name":"2017","value":67.69,"rank":1,"categoria":"Excelente"}
   - Para múltiplas séries, adicione mais campos numéricos e use "yKeys": ["value", "value2"]
   - O sistema renderizará automaticamente o gráfico interativo com tooltip mostrando TODOS os campos

EXEMPLO DE RESPOSTA COMPLETA:

Usuário: "Como prevenir diabetes?"

Assistente: "A prevenção do diabetes tipo 2 envolve várias estratégias:

1. **Alimentação balanceada**: Priorize alimentos integrais, vegetais, proteínas magras e reduza açúcares e carboidratos refinados.

2. **Atividade física regular**: Pelo menos 150 minutos de exercícios moderados por semana.

3. **Controle de peso**: Manter IMC adequado reduz significativamente o risco.

4. **Exames preventivos**: Especialmente se houver histórico familiar ou fatores de risco.

SUGESTÕES: ["Quais são os sinais de pré-diabetes?", "Que exames detectam diabetes?", "Como funciona a resistência insulínica?"]"

Agora, responda às mensagens mantendo sempre este padrão.`;

    // 📊 LOGGING DE AUDITORIA DE COERÊNCIA
    console.log(`[COHERENCE_AUDIT] Chat: health | Query: "${userQuery.substring(0, 100)}..." | RAG Context: ${hasRagContext ? 'YES' : 'NO'} | Region: ${region || 'default'}`);
    if (hasRagContext) {
      console.log(`[COHERENCE_AUDIT] Expected coherent topics from RAG: documents about health/Hospital Moinhos de Vento`);
    }

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
