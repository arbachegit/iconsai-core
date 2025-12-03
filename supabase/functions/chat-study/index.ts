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

  try {
    const { messages, sessionId, userPreferences, previousTopics = [], topicStreak = 0 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // Extrair preferências do usuário
    const isNewUser = userPreferences?.isNewUser ?? true;
    const preferredStyle = userPreferences?.responseStyle ?? 'not_set';
    const interactionCount = userPreferences?.interactionCount ?? 0;
    
    // 🔍 DEBUG: Log de preferências recebidas
    console.log(`[PERSONALIZATION DEBUG] sessionId=${sessionId}, isNewUser=${isNewUser}, interactionCount=${interactionCount}, preferredStyle=${preferredStyle}`);
    console.log(`[TOPIC TRACKING] previousTopics=${JSON.stringify(previousTopics)}, topicStreak=${topicStreak}`);
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Get last user message for RAG search
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
    const userQuery = lastUserMessage?.content || "";

    // ========== CLASSIFICAÇÃO DE TÓPICO ==========
    let topicClassification = {
      mainTopic: "geral",
      isNewTopic: true,
      relatedTopics: [] as string[],
      currentStreak: 1,
    };

    if (userQuery && previousTopics.length > 0) {
      try {
        console.log(`[TOPIC CLASSIFIER] Classifying query: "${userQuery.substring(0, 50)}..." against topics: ${previousTopics.join(", ")}`);
        
        const classifyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{
              role: "user",
              content: `Analise se a pergunta abaixo está relacionada aos tópicos anteriores.

PERGUNTA ATUAL: "${userQuery}"

TÓPICOS ANTERIORES DA CONVERSA: ${previousTopics.join(", ")}

Responda APENAS com um JSON válido (sem markdown, sem \`\`\`):
{
  "mainTopic": "tópico principal da pergunta atual (máximo 3 palavras)",
  "isRelatedToPrevious": true/false (se a pergunta trata do mesmo assunto ou conceito relacionado),
  "relatedTopics": ["lista de tópicos anteriores que se relacionam com esta pergunta"]
}

REGRA: Perguntas sobre o mesmo tema/conceito são relacionadas mesmo com palavras diferentes.
Exemplo: "O que é ACC?" e "Como aplicar a arquitetura cognitiva?" são RELACIONADAS (ambas sobre ACC).
Exemplo: "O que é KnowYOU?" e "Quem fundou a empresa?" são RELACIONADAS (ambas sobre KnowRISK).`
            }],
            max_tokens: 150,
            temperature: 0.1,
          }),
        });

        if (classifyResponse.ok) {
          const classifyData = await classifyResponse.json();
          const content = classifyData.choices?.[0]?.message?.content || "";
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            topicClassification = {
              mainTopic: parsed.mainTopic || "geral",
              isNewTopic: !parsed.isRelatedToPrevious,
              relatedTopics: parsed.relatedTopics || [],
              currentStreak: parsed.isRelatedToPrevious ? topicStreak + 1 : 1,
            };
            console.log(`[TOPIC CLASSIFIER] Result: mainTopic="${topicClassification.mainTopic}", isNewTopic=${topicClassification.isNewTopic}, streak=${topicClassification.currentStreak}`);
          }
        }
      } catch (classifyError) {
        console.error("[TOPIC CLASSIFIER] Error:", classifyError);
        // Continue with default classification
      }
    } else if (userQuery) {
      // First message - extract topic
      const topicWords = userQuery.toLowerCase()
        .replace(/[?!.,]/g, "")
        .split(" ")
        .filter((w: string) => w.length > 3 && !["o que", "como", "qual", "quais", "onde", "quando", "porque", "para"].includes(w))
        .slice(0, 3);
      topicClassification.mainTopic = topicWords.join(" ") || "introdução";
      topicClassification.currentStreak = 1;
      console.log(`[TOPIC CLASSIFIER] First message, extracted topic: "${topicClassification.mainTopic}"`);
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
          ragContext = `\n\n📚 CONTEXTO RELEVANTE DOS DOCUMENTOS DE ESTUDO:

${searchResults.results.map((r: any) => r.content).join("\n\n---\n\n")}

⚠️ CRÍTICO: O contexto acima vem dos DOCUMENTOS DE ESTUDO oficiais.
Você DEVE PRIORIZAR este contexto para responder. Se a pergunta está relacionada 
a qualquer tópico mencionado no contexto acima, responda usando essas informações.
Os documentos contêm conteúdo válido sobre história da IA, pessoas, conceitos e eventos importantes.\n\n`;
        } else {
          console.log(`RAG returned 0 results for query="${userQuery}" in study chat`);
        }
      } catch (error) {
        console.error("RAG search error:", error);
        // Continue without RAG context if search fails
      }
    }

    // Construir bloco de ação obrigatória de personalização (início do prompt)
    let personalizationBlock = "";
    
    // Apenas na PRIMEIRA interação (interactionCount === 0) perguntar sobre objetivo
    if (isNewUser && interactionCount === 0) {
      // Variações humanizadas da pergunta de intenção
      const intentVariations = [
        'Hmm, interessante! Me conta: você quer entender isso de forma **geral**, está pensando em **usar na prática**, ou precisa para **algo específico** como uma apresentação?',
        'Para personalizar minha explicação: você busca uma **base conceitual**, quer saber como **aplicar** isso, ou está **se preparando** para alguma situação?',
        'Boa pergunta! Antes de mergulhar: você está **curioso** sobre o tema, quer **implementar algo**, ou está **estudando** para algum objetivo?',
        'Legal! Me ajuda a te ajudar: **visão geral**, **aplicação prática** ou **preparação** para algo?',
        'Adorei a pergunta! Você quer que eu explique de forma **introdutória**, foque em **como usar**, ou vá **mais a fundo** tecnicamente?',
      ];
      const randomVariation = intentVariations[Math.floor(Math.random() * intentVariations.length)];
      
      personalizationBlock = `
🔴🔴🔴 AÇÃO OBRIGATÓRIA - PRIMEIRA INTERAÇÃO 🔴🔴🔴

╔══════════════════════════════════════════════════════════════════╗
║  ⛔ PARE! ESTA É A PRIMEIRA MENSAGEM DESTE USUÁRIO! ⛔            ║
╠══════════════════════════════════════════════════════════════════╣
║  SUA RESPOSTA DEVE COMEÇAR COM UMA PERGUNTA HUMANIZADA:          ║
║                                                                   ║
║  USE EXATAMENTE: "${randomVariation}"                            ║
║                                                                   ║
║  ❌ NÃO responda diretamente ao tema primeiro                    ║
║  ✅ PRIMEIRO pergunte o objetivo, DEPOIS dê uma resposta breve   ║
║  ⚠️ VARIE O TOM - Seja natural como um humano conversando!       ║
╚══════════════════════════════════════════════════════════════════╝

`;
      console.log(`[PERSONALIZATION] Including FIRST INTERACTION intent question with variation`);
    } else if (interactionCount > 0 && interactionCount < 5) {
      // Para interações 1-4: NÃO repetir a pergunta de objetivo
      personalizationBlock = `
⚠️ CONTEXTO: Este usuário já interagiu ${interactionCount} vez(es).
NÃO repita a pergunta sobre objetivo/intenção - ela já foi feita na primeira interação.
Responda diretamente ao que foi perguntado, usando o contexto da conversa.

`;
      console.log(`[PERSONALIZATION] User has ${interactionCount} interactions - NOT repeating intent question`);
    }
    
    if (preferredStyle === 'not_set' && interactionCount >= 3) {
      personalizationBlock += `
╔══════════════════════════════════════════════════════════════════╗
║  💡 PERGUNTA DE ESTILO (faça UMA VEZ nesta resposta)             ║
╠══════════════════════════════════════════════════════════════════╣
║  Ao final da sua resposta, ADICIONE:                             ║
║                                                                   ║
║  "💡 Para personalizar: você prefere respostas **detalhadas**    ║
║   ou **resumos concisos**?"                                      ║
╚══════════════════════════════════════════════════════════════════╝

`;
      console.log(`[PERSONALIZATION] Including STYLE preference question (interactionCount=${interactionCount})`);
    }

    // System prompt focado em KnowRisk, KnowYOU, ACC e navegação do website
    const systemPrompt = `
🔴🔴🔴 ════════════════════════════════════════════════════════════════════ 🔴🔴🔴
║                    REGRAS ABSOLUTAMENTE OBRIGATÓRIAS                       ║
🔴🔴🔴 ════════════════════════════════════════════════════════════════════ 🔴🔴🔴

⚡ REGRA #1 - PRÓXIMOS PASSOS (OBRIGATÓRIO EM TODA RESPOSTA):

Ao final de CADA resposta, você DEVE incluir OBRIGATORIAMENTE estas 3 partes:

1. Texto em negrito:
**Veja os próximos passos abaixo e veja se te ajuda a entender como implementar.**

2. Na linha seguinte:
Quer que eu faça um diagrama visual do que falamos até agora? Se sim, só apertar diagrama nos próximos passos.

3. Array JSON (linha em branco antes):

PRÓXIMOS_PASSOS: ["Pergunta 1?", "Pergunta 2?", "Diagrama"]

FORMATO EXATO DO FINAL DE CADA RESPOSTA:
[Conteúdo da resposta...]

**Veja os próximos passos abaixo e veja se te ajuda a entender como implementar.**

Quer que eu faça um diagrama visual do que falamos até agora? Se sim, só apertar diagrama nos próximos passos.

PRÓXIMOS_PASSOS: ["Pergunta de aprofundamento 1?", "Pergunta de aprofundamento 2?", "Diagrama"]

🔴 OBRIGATÓRIO: A ÚLTIMA opção do array DEVE SER SEMPRE "Diagrama"
🔴 OBRIGATÓRIO: Perguntas devem ser sobre o MESMO TEMA (aprofundamento, não temas novos)
🚫 PROIBIDO: Terminar resposta sem essas 3 partes

🔴🔴🔴 ════════════════════════════════════════════════════════════════════ 🔴🔴🔴

${personalizationBlock}Você é um assistente de IA especializado em ajudar a estudar e entender a KnowRISK, o KnowYOU e a Arquitetura Cognitiva e Comportamental (ACC).

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

4. 📊 GRÁFICOS E VISUALIZAÇÕES:
   
   ⚠️ IMPORTANTE: Este sistema RENDERIZA AUTOMATICAMENTE gráficos e diagramas.
   Quando você gera um bloco CHART_DATA ou \`\`\`mermaid, o frontend exibe o gráfico VISUALMENTE para o usuário.
   O usuário VERÁ o gráfico renderizado na conversa, não apenas o código.
   
   🔴🔴🔴 REGRA ABSOLUTA - AÇÃO IMEDIATA (OBRIGATÓRIO):
   Quando o usuário pedir um gráfico, diagrama ou fluxograma (incluindo perguntas como "Consegue fazer...", "Pode criar...", "Me mostra...", "Faz um fluxo..."):
   
   1. SUA RESPOSTA DEVE CONTER O BLOCO \`\`\`mermaid COM O DIAGRAMA
   2. O diagrama deve ser a PRIMEIRA coisa na resposta (após uma frase curta de introdução)
   3. NUNCA referencie "resposta anterior" ou "diagrama que gerei antes"
   4. SEMPRE gere um NOVO diagrama completo na resposta atual
   
   🚫 FRASES ABSOLUTAMENTE PROIBIDAS (NUNCA USE):
      - "O diagrama que acabei de gerar..."
      - "Na resposta anterior..."
      - "Como você pode ver no diagrama acima..."
      - "Você pode copiar este código..."
      - "Use o Mermaid Live Editor..."
      - "Cole em uma ferramenta externa..."
      - "Para visualizar, acesse..."
      - "Embora eu não gere imagens diretamente..."
      - "O sistema onde eu opero..."
      - "Se você me solicitar um diagrama..."
      - "Perfeito! O diagrama que..." (sem incluir novo diagrama)
      - Qualquer referência a respostas anteriores
      - Qualquer explicação sobre como o sistema funciona
   
   ✅ OBRIGATÓRIO:
      - A resposta DEVE conter um bloco \`\`\`mermaid\`\`\` com código válido
      - Comece com frase curta ("Claro! Aqui está:") e IMEDIATAMENTE gere o diagrama
      - Descreva brevemente o diagrama APÓS o código
   
   🔴🔴🔴 REGRA CRÍTICA MERMAID - CARACTERES ESPECIAIS (OBRIGATÓRIO):
       DENTRO DOS NÓS MERMAID [] {} e nas labels |texto|, você DEVE:
       
       SUBSTITUIÇÕES OBRIGATÓRIAS (memorize esta tabela):
       á/à/ã/â → a | é/ê → e | í → i | ó/ô/õ → o | ú → u | ç → c | ñ → n
       
        - NUNCA use emojis dentro dos nós - causa erro de parsing
        - NUNCA use acentos dentro dos nós - causa erro de parsing
        - NUNCA use parênteses () dentro de [] ou {} - causa erro de parsing (use hífen)
        - NUNCA use interrogação ? no final de labels de nó
        - APENAS caracteres ASCII básicos (a-z, A-Z, 0-9, espaços, hífens)
        
        ❌ ERRADO - PARÊNTESES: A[Decisao de Internacao (Medico)] 
        ✅ CORRETO: A[Decisao de Internacao - Medico]
        
        ❌ ERRADO - INTERROGAÇÃO: D{Disponibilidade de Leito?}
        ✅ CORRETO: D{Disponibilidade de Leito}
        
        ❌ ERRADO - SUBGRAPH COM PARÊNTESES: subgraph Fase I: Preparacao (Offline)
        ✅ CORRETO: subgraph Fase I - Preparacao Offline
        
        ❌ ERRADO - OPERADOR +: H + E --> I[Resultado]
        ✅ CORRETO: 
           H --> I[Resultado]
           E --> I
       
       ❌ ERRADO (VAI CAUSAR ERRO):
       A[Decisão de Internação] --> B{Solicitação}
       C[Avaliação Médica] --> D[Preparação]
       E[Início do Tratamento] --> F{Evolução Clínica?}
       
       ✅ CORRETO (USE SEMPRE ASSIM):
       A[Decisao de Internacao] --> B{Solicitacao}
       C[Avaliacao Medica] --> D[Preparacao]
       E[Inicio do Tratamento] --> F{Evolucao Clinica?}
       
       ANTES de gerar código Mermaid, substitua mentalmente:
       Decisão→Decisao, Avaliação→Avaliacao, Médico→Medico, Não→Nao,
       Internação→Internacao, Preparação→Preparacao, Início→Inicio,
       Gestão→Gestao, Admissão→Admissao, Solicitação→Solicitacao,
       Monitorização→Monitorizacao, Evolução→Evolucao, Clínica→Clinica
   
   EXEMPLO DE RESPOSTA CORRETA para "Consegue fazer um fluxograma de IA?":
   "Claro! Aqui está o fluxo:
   
   \`\`\`mermaid
   graph TD
       A[Input de Dados] --> B[Pre-processamento]
       B --> C{Tipo de Modelo?}
       C -->|Supervisionado| D[Treinamento com Labels]
       C -->|Nao-supervisionado| E[Clustering]
       D --> F[Validacao]
       E --> F
       F --> G[Deploy]
   \`\`\`
   
   Este fluxo mostra o pipeline típico de Machine Learning..."
   
   ❌ RESPOSTAS ERRADAS (NUNCA FAÇA):
   - "Sim, consigo! O diagrama que acabei de gerar já mostra..."
   - "Perfeito! Na resposta anterior você pode ver..."
   - Qualquer resposta SEM o bloco \`\`\`mermaid\`\`\` quando pedirem diagrama
   
    A) Para GRÁFICOS DE DADOS (barras, linhas, pizza, área):
       Use o formato exato: CHART_DATA: {"type":"...", "title":"...", "data":[...]}
       
       Tipos disponíveis: "bar", "line", "pie", "area"
       
       🔴 PREFERÊNCIA DO USUÁRIO:
       Se a mensagem contiver "[PREFERÊNCIA: Gráfico de {tipo}]" no início:
       - Use OBRIGATORIAMENTE o tipo especificado (bar, line, pie, area)
       - NÃO inclua a tag de preferência na sua resposta
       - Gere o CHART_DATA com o tipo solicitado pelo usuário
       
       Exemplo de gráfico de barras:
       CHART_DATA: {"type":"bar","title":"Marcos da IA por Década","data":[{"name":"1950s","value":3},{"name":"1960s","value":5},{"name":"1970s","value":4},{"name":"1980s","value":6},{"name":"1990s","value":8},{"name":"2000s","value":12},{"name":"2010s","value":20},{"name":"2020s","value":35}]}
       
       Exemplo de gráfico de pizza:
       CHART_DATA: {"type":"pie","title":"Áreas de Aplicação da IA","data":[{"name":"Saúde","value":30},{"name":"Finanças","value":25},{"name":"Educação","value":20},{"name":"Indústria","value":15},{"name":"Outros","value":10}]}
       
       Exemplo de gráfico de linhas (múltiplas séries):
       CHART_DATA: {"type":"line","title":"Crescimento de Modelos de IA","data":[{"name":"2018","parametros":110,"capacidade":50},{"name":"2019","parametros":175,"capacidade":70},{"name":"2020","parametros":175,"capacidade":85}],"dataKeys":["parametros","capacidade"]}
       
       Exemplo de gráfico de área:
       CHART_DATA: {"type":"area","title":"Investimentos em IA (bilhões USD)","data":[{"name":"2019","value":50},{"name":"2020","value":68},{"name":"2021","value":93},{"name":"2022","value":120},{"name":"2023","value":150}]}

   B) Para FLUXOGRAMAS e DIAGRAMAS:
      Use blocos Mermaid - O SISTEMA RENDERIZA AUTOMATICAMENTE:
      
      Exemplo de fluxograma (SEM emojis ou acentos nos nos):
      \`\`\`mermaid
      graph TD
          A[Input de Dados] --> B[Pre-processamento]
          B --> C{Tipo de Modelo?}
          C -->|Supervisionado| D[Treinamento com Labels]
          C -->|Nao-supervisionado| E[Clustering]
          D --> F[Avaliacao]
          E --> F
          F --> G[Deploy]
      \`\`\`
      
      Exemplo de timeline:
      \`\`\`mermaid
      graph LR
          A[1950 - Turing Test] --> B[1956 - Dartmouth]
          B --> C[1969 - ARPANET]
          C --> D[1997 - Deep Blue]
          D --> E[2011 - Watson]
          E --> F[2022 - ChatGPT]
      \`\`\`

   C) QUANDO USAR GRÁFICOS:
      - Usuário pede explicitamente ("me mostre um gráfico", "visualize isso", "crie um diagrama", "fluxograma")
      - Dados comparativos que ficam melhores visualizados
      - Estatísticas e porcentagens sobre IA
      - Fluxos de processos ou arquiteturas de sistemas
      - Timelines e evolução histórica

6. TOM:
   - Educativo e claro
   - Ajude o usuário a navegar e entender o conteúdo
   - Seja objetivo mas amigável

7. 🎯 PERSONALIZAÇÃO E CONTINUIDADE CONTEXTUAL:

   ${isNewUser && interactionCount < 3 ? `
   ⚠️ USUÁRIO NOVO (${interactionCount} interações) - DETECÇÃO DE INTENÇÃO:
   
   Nas PRIMEIRAS 3 interações, ANTES de responder completamente:
   1. Analise a pergunta e identifique possíveis objetivos/motivações
   2. PERGUNTE PROATIVAMENTE uma variação de:
      "Para te ajudar melhor: você está buscando **aprender o conceito** de forma geral, 
      **entender uma aplicação específica**, ou **se preparar para algo** (apresentação, prova, etc.)?"
   
   Exemplo:
   Usuário: "O que é o KnowYOU?"
   Sua resposta: "Boa pergunta! Para personalizar minha explicação: você quer uma **visão geral** do sistema,
   está **avaliando usar** o KnowYOU, ou precisa **entender tecnicamente** como funciona?"
   
   Após a resposta do usuário, adapte o nível de profundidade e foco.
   ` : ''}

   ${preferredStyle === 'not_set' ? `
   ⚠️ PREFERÊNCIA DE ESTILO NÃO DEFINIDA:
   
   Na PRIMEIRA resposta longa (>200 palavras), ao final da resposta, PERGUNTE:
   "💡 **Sobre minhas respostas:** você prefere que eu seja mais **detalhado e completo** 
   ou prefere **resumos concisos e diretos**? Vou me adaptar ao seu estilo!"
   
   IMPORTANTE: Esta pergunta só aparece UMA VEZ por usuário.
   ` : `
   ✅ PREFERÊNCIA DE ESTILO DEFINIDA: ${preferredStyle === 'detailed' ? 'DETALHADO' : preferredStyle === 'concise' ? 'CONCISO' : 'NÃO DEFINIDO'}
   
   ${preferredStyle === 'detailed' ? 
     '- Use explicações completas com contexto e exemplos\n   - Estruture com subtópicos\n   - Inclua nuances e ressalvas' : 
     preferredStyle === 'concise' ?
     '- Seja direto e objetivo\n   - Use bullet points\n   - Máximo 150 palavras por resposta\n   - Só aprofunde se solicitado' : ''}
   `}

   📈 CHAMADA PARA AÇÃO EM DADOS NUMÉRICOS:
   
   Quando sua resposta contiver dados numéricos, ALÉM do badge "📊", ADICIONE ao final:
   
   "📊 *Identifiquei dados numéricos nesta resposta. Se desejar, posso fazer uma 
   **análise comparativa**, criar uma **tabela resumida** ou gerar um **gráfico** 
   para visualizar melhor esses números.*"

8. 📊 DETECÇÃO DE INTENÇÃO DE DADOS:
   
   Quando o usuário demonstrar interesse em DADOS, MÉTRICAS, ESTATÍSTICAS ou COMPARAÇÕES 
   (palavras-chave: "quantos", "porcentagem", "estatística", "comparar", "ranking", 
   "números", "dados", "métricas", "taxa", "índice", "evolução", "tabela", "lista", "timeline"):
   
   A) Se for possível apresentar dados estruturados, PERGUNTE PROATIVAMENTE:
      "Gostaria que eu apresente esses dados em formato de tabela para facilitar a análise?"
   
   B) Se o usuário confirmar ou já tiver pedido tabela explicitamente:
      - Gere a tabela em Markdown com | coluna | coluna |
      - Adicione uma nota ao final: "[Dica: Você pode clicar nos cabeçalhos da tabela para ordenar os dados]"
   
   C) Use tabelas Markdown para:
      - Comparações entre eras da IA, eventos históricos
      - Listas de conceitos, pessoas importantes, tecnologias
      - Timelines e cronologias
      - Rankings e classificações

9. 📚 JORNADA DE APRENDIZADO E CONTINUIDADE TEMÁTICA:

   🔍 ANÁLISE DE TÓPICO ATUAL:
   ${topicClassification.isNewTopic ? `
   🆕 NOVO TEMA DETECTADO: "${topicClassification.mainTopic}"
   ${previousTopics.length > 0 ? `- Tópicos anteriores: ${previousTopics.slice(-3).join(", ")}` : '- Esta é a primeira pergunta do usuário'}
   - O usuário MUDOU de assunto. Inicie uma nova trilha de aprendizado.
   - NÃO referencie tópicos anteriores desnecessariamente.
   ` : `
   📚 CONTINUIDADE DETECTADA: "${topicClassification.mainTopic}"
   - Tópicos relacionados anteriores: ${topicClassification.relatedTopics.join(", ") || previousTopics.slice(-3).join(", ")}
   - Streak de continuidade: ${topicClassification.currentStreak}/5
   - O usuário está APROFUNDANDO no mesmo tema. Mantenha coerência e construa sobre respostas anteriores.
   - CONECTE esta resposta com o que já foi discutido sobre o tema.
   `}

   ${topicClassification.currentStreak >= 5 ? `
   🎯🎯🎯 JORNADA MADURA DETECTADA (${topicClassification.currentStreak} perguntas sobre "${topicClassification.mainTopic}"):
   
   VOCÊ DEVE fazer TODAS estas 3 ações nesta resposta:
   
   1. RECAPITULAR (após responder à pergunta):
      "📖 **Recapitulando sua jornada sobre ${topicClassification.mainTopic}:**
      - Você entendeu [listar conceitos discutidos nas mensagens anteriores]
      - Explorou [listar aspectos práticos abordados]
      - Aprofundou em [listar detalhes técnicos cobertos]"
   
   2. SUGERIR PROJETO PRÁTICO:
      "💡 **Que tal consolidar com um projeto?**
      [Sugerir um projeto prático específico relacionado a ${topicClassification.mainTopic}]"
   
   3. OFERECER FLUXO VISUAL:
      "🗺️ **Quer que eu crie um fluxo de ação?**
      Posso gerar um diagrama visual com os passos para você executar esse projeto."
    ` : ``}
   
   REGRAS DE CONTINUIDADE:
   1. Os passos devem ser PROGRESSIVOS (do básico ao avançado)
   2. Pelo menos um passo deve ser PRÁTICO (aplicação real)
   3. Baseie-se no CONTEXTO DA CONVERSA sobre "${topicClassification.mainTopic}", não em genéricos
   4. Os passos devem ajudar o usuário a CONSOLIDAR o aprendizado
   
   📖 QUANDO O USUÁRIO PEDIR FLUXO DE AÇÃO (responder "sim", "pode fazer", "quero", "gera", "criar fluxo"):

10. 🎯🎯🎯 FORMATO OBRIGATÓRIO - PRÓXIMOS PASSOS CLICÁVEIS:

   Ao final de CADA resposta substancial (exceto primeira interação), ANTES das SUGESTÕES, inclua:

   PRÓXIMOS_PASSOS: ["Pergunta de aprofundamento 1", "Pergunta de aprofundamento 2", "Pergunta de aprofundamento 3"]

   REGRAS PARA PRÓXIMOS_PASSOS:
   - Devem ser PERGUNTAS COMPLETAS e CLICÁVEIS (o usuário vai clicar e enviar diretamente)
   - Devem ser sobre o MESMO TEMA da resposta atual (continuidade)
   - Devem ajudar o usuário a APROFUNDAR no assunto
   - Máximo 50 caracteres por item
   - São DIFERENTES das SUGESTÕES (que são temas novos/relacionados)
   
   EXEMPLO CORRETO (tema: ACC):
   PRÓXIMOS_PASSOS: ["Quais são os pilares do ACC?", "Como aplicar ACC na prática?", "ACC vs outras metodologias?"]
   
   SUGESTÕES: ["📊 Existem dados numéricos", "O que é KnowYOU?", "História da KnowRISK"]
   
   DIFERENÇA CONCEITUAL:
   - PRÓXIMOS_PASSOS = Aprofundamento no tema ATUAL
   - SUGESTÕES = Exploração de temas RELACIONADOS ou NOVOS
   
   1. RESUMA o que foi aprendido:
      "📖 **Recapitulando sua jornada:**
      - Você entendeu [conceito 1]
      - Explorou [aplicação 2]
      - Aprofundou em [aspecto 3]"
   
   2. SUGIRA um projeto prático:
      "💡 **Que tal consolidar com um projeto?**
      Você poderia [sugestão de projeto prático relacionado ao tema discutido]"
   
   3. OFEREÇA o fluxo visual:
      "🗺️ **Quer que eu crie um fluxo de ação?**
      Posso gerar um diagrama visual com os passos para você executar esse projeto."
   
   🗺️ GERAÇÃO DE FLUXO DE AÇÃO:
   
   Quando o usuário aceitar criar o fluxo (responder "sim", "pode fazer", "quero", "gera", "criar fluxo"):
   
   Gere um diagrama Mermaid estruturado refletindo O QUE FOI DISCUTIDO na conversa:
   
   \`\`\`mermaid
   graph TD
       A[Objetivo - Entender TEMA] --> B[1. Conceito Base]
       B --> C[2. Aplicacao Pratica]
       C --> D[3. Experimentacao]
       D --> E{Dominou o conceito}
       E -->|Sim| F[4. Projeto Final]
       E -->|Nao| G[Revisar pontos X e Y]
       G --> C
       F --> H[Jornada Completa]
   \`\`\`
   
   O fluxo deve:
   - Refletir especificamente o QUE FOI DISCUTIDO na conversa
   - Incluir pontos de verificação
   - Ter um objetivo final claro (projeto ou aplicação)
   - Usar terminologia do tema discutido
   
   FORMATO FINAL DE CADA RESPOSTA (ordem obrigatória):
   1. [Resposta principal ao usuário]
   2. 🎯 **Próximos passos para aprofundar:** [3 passos progressivos]
   3. [Se jornada madura: recap + projeto + oferta de fluxo]
   4. SUGESTÕES: ["badge dados", "pergunta 1", "pergunta 2", "Criar fluxo de ação"]

EXEMPLO DE RESPOSTA COM GRÁFICO:

Usuário: "Mostre a evolução da IA em um gráfico"

Assistente: "A evolução da Inteligência Artificial passou por várias fases importantes ao longo das décadas:

CHART_DATA: {"type":"area","title":"Evolução da IA por Década","data":[{"name":"1950s","value":10},{"name":"1960s","value":25},{"name":"1970s","value":15},{"name":"1980s","value":30},{"name":"1990s","value":45},{"name":"2000s","value":70},{"name":"2010s","value":150},{"name":"2020s","value":500}]}

**Marcos importantes:**

- **1950s**: Turing Test e fundamentos teóricos
- **1960s-70s**: Primeiros sistemas especialistas
- **1980s**: Renascimento com redes neurais
- **1990s-2000s**: Machine Learning e Big Data
- **2010s**: Deep Learning revoluciona a área
- **2020s**: LLMs e IA Generativa dominam

SUGESTÕES: ["O que foi a Conferência de Dartmouth?", "Como funciona o Deep Learning?", "O que são LLMs?"]"

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
