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
Na sua resposta, após ajudar o usuário, pergunte de forma MUITO AMIGÁVEL e INFORMAL de qual cidade/região do Brasil ele é.
Exemplo: "Ah, e de onde você é? Pergunto porque gosto de adaptar meu jeito de conversar!"
Seja como um amigo de anos, não burocrático.
`;
  }

  // Protocolo de Resposta Adaptativa
  function getAdaptiveResponseProtocol(): string {
    return `
# 🎯 PROTOCOLO DE RESPOSTA ADAPTATIVA

Classifique a intenção do usuário e adapte sua resposta:

## 📊 MODO 1: DETERMINÍSTICO
**Gatilho:** Pergunta específica, técnica, busca de fato ou dado concreto.

**Ação:** Responda de forma direta e objetiva, adaptando a profundidade conforme a complexidade.

**Estilo:**
- Perguntas simples: Resposta concisa, 2-3 pontos principais
- Perguntas complexas: Explicação estruturada com contexto necessário

---

## 🔍 MODO 2: CONSULTIVO
**Gatilho:** Pergunta ampla, genérica, sem contexto claro.

**Ação:** Quando necessário para dar uma resposta útil, peça esclarecimentos de forma natural e contextualizada.

**Estilo:**
- Demonstre interesse genuíno
- Ofereça direcionamentos quando apropriado
- Tom de conversa natural

---

## 🎓 MODO 3: PROFESSOR
**Gatilho:** Usuário indica que é leigo ou está confuso.

**Ação:**
1. Divida explicações complexas em partes menores
2. Use analogias simples do dia-a-dia
3. Verifique entendimento quando apropriado, de forma natural

**Tom:** Acolhedor, paciente, acessível.

---

## 🎯 DIRETRIZ GERAL
Sua meta é CLAREZA. Seja um guia prático. Adapte-se ao contexto e necessidades do usuário.
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

**Usuário pergunta: "O que é o KnowYOU?"**
✅ CORRETO: ["Como o KnowYOU usa a ACC?", "Funcionalidades do KnowYOU", "KnowYOU vs chatbots tradicionais"]
❌ ERRADO: ["O que é IA?", "História da computação", "Como funciona a internet?"]

**Usuário pergunta: "Arquitetura Cognitiva e Comportamental"**
✅ CORRETO: ["Pilares da ACC", "ACC aplicada na prática", "ACC vs outras metodologias"]
❌ ERRADO: ["O que é Machine Learning?", "Redes neurais", "Computação quântica"]

**Usuário pergunta: "Quem é Alan Turing?"**
✅ CORRETO: ["Contribuições de Turing para IA", "Teste de Turing explicado", "Máquina de Turing"]
❌ ERRADO: ["O que é KnowRISK?", "Navegação do website", "Seções do site"]

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

    // Check if any message contains file data
    let fileDataContext = "";
    for (const msg of messages) {
      if (msg.fileData && msg.fileData.data && Array.isArray(msg.fileData.data)) {
        const { data, fileName, columns, totalRecords } = msg.fileData;
        const actualTotal = totalRecords || data.length;
        const sampleSize = Math.min(50, data.length);
        const sampleData = data.slice(0, sampleSize);
        const isPartialSample = actualTotal > data.length;
        
        fileDataContext = `\n\n📊 DADOS DO ARQUIVO CARREGADO: ${fileName}
Colunas: ${columns.join(", ")}
Total de registros no arquivo: ${actualTotal}
${isPartialSample 
  ? `⚠️ AMOSTRA PARCIAL: Você está vendo ${data.length} de ${actualTotal} registros.` 
  : `Registros disponíveis: ${data.length}`}

Amostra dos primeiros ${sampleSize} registros:
${JSON.stringify(sampleData, null, 2)}

⚠️ IMPORTANTE: O usuário carregou este arquivo para análise. Você TEM ACESSO aos dados acima.
Use estes dados para responder às perguntas sobre o arquivo. Você pode analisar padrões, gerar estatísticas, 
identificar tendências e criar visualizações com esses dados.
${isPartialSample ? `\nNOTA: Como está trabalhando com amostra parcial, indique ao usuário quando uma análise completa precisaria de todos os dados.` : ''}\n`;
        
        console.log(`File data detected: ${fileName} with ${actualTotal} total records (${data.length} in sample)`);
        break; // Only process the first file
      }
    }

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
    const culturalTone = await getCulturalToneRules(region);
    const isFirstMessage = messages.filter((m: any) => m.role === "user").length <= 1;
    const locationPrompt = getLocationPrompt(region, isFirstMessage);
    console.log(`Using cultural tone for region: ${region || 'default'}`);

    // System prompt focado em KnowRisk, KnowYOU, ACC e navegação do website
    // IMPORTANTE: Protocolo de coerência PRIMEIRO, antes de qualquer outra regra
    const systemPrompt = `Você é um assistente de IA especializado em ajudar a estudar e entender a KnowRISK, o KnowYOU e a Arquitetura Cognitiva e Comportamental (ACC).

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
${fileDataContext}
⚠️ INSTRUÇÃO CRÍTICA - LEIA ATENTAMENTE:
${hasRagContext ? `
✅ VOCÊ TEM CONTEXTO RAG DISPONÍVEL - Use as informações dos documentos acima para responder à pergunta.
IGNORE qualquer padrão de rejeição anterior. Se o contexto RAG contém informação relevante, VOCÊ DEVE RESPONDER USANDO ESSE CONTEXTO.
` : `
❌ Sem contexto RAG - Siga as regras de escopo normais.
`}
${fileDataContext ? `
📊 VOCÊ TEM DADOS DE ARQUIVO DISPONÍVEL - O usuário carregou um arquivo com dados.
Use os dados da amostra acima para responder. Você pode fazer análises estatísticas, identificar padrões e gerar insights.
IGNORE qualquer restrição de escopo quando o usuário está perguntando sobre os dados do arquivo que ele mesmo carregou.
` : ``}

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

4. **🚨 SUGESTÕES (VINCULADAS AO PROTOCOLO DE COERÊNCIA NO INÍCIO)**:
   - RELEIA o Protocolo de Coerência no INÍCIO deste prompt
   - OBRIGATÓRIO: Gere 3 sugestões que passem no TESTE DE VALIDADE
   - FORMATO: SUGESTÕES: ["Pergunta 1", "Pergunta 2", "Pergunta 3"]
   - MÁXIMO: 50 caracteres por sugestão
   - CONTEÚDO: Cada sugestão DEVE ser o próximo passo lógico na jornada de conhecimento do tópico ATUAL
   - ⚠️ MELHOR gerar 2 sugestões COERENTES do que 3 sugestões aleatórias

5. TOM:
   - Educativo e claro
   - Ajude o usuário a navegar e entender o conteúdo
   - Seja objetivo mas amigável

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

    // 📊 LOGGING DE AUDITORIA DE COERÊNCIA
    console.log(`[COHERENCE_AUDIT] Chat: study | Query: "${userQuery.substring(0, 100)}..." | RAG Context: ${hasRagContext ? 'YES' : 'NO'} | Region: ${region || 'default'}`);
    if (hasRagContext) {
      console.log(`[COHERENCE_AUDIT] Expected coherent topics from RAG: documents about KnowRISK/KnowYOU/ACC`);
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
