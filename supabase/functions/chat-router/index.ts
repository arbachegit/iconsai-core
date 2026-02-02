// ============================================
// VERSAO: 3.0.0 | DEPLOY: 2026-01-28
// MUDANCA: Atualizado para nova arquitetura de tabelas
// ============================================
// CHANGELOG v3.0.0:
// - Removido global_taxonomy, entity_tags, taxonomy_phonetics (tabelas deletadas)
// - chat_agents → iconsai_agents
// - pwa_messages → pwa_conversations (agent_slug → module_slug)
// - Simplificado: sem classificação de taxonomia
// CHANGELOG v2.9.0:
// - Perplexity API integrado como provider primário
// - Ordem de fallback: Perplexity → OpenAI → Gemini
// - Busca em tempo real com citações
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { sanitizeString } from "../_shared/validators.ts";
import { createLogger } from "../_shared/logger.ts";

// ===================== BRANDING SANITIZATION =====================
const FORBIDDEN_BRAND_WORDS = [
  "OpenAI",
  "ChatGPT",
  "GPT-4",
  "GPT-3.5",
  "GPT-3",
  "Claude",
  "Anthropic",
  "Gemini",
  "Google AI",
  "Bard",
  "LLaMA",
  "Meta AI",
  "Llama",
  "Mistral",
];

function sanitizeBrandingResponse(text: string): string {
  let sanitized = text;
  FORBIDDEN_BRAND_WORDS.forEach((word) => {
    const regex = new RegExp(word, "gi");
    sanitized = sanitized.replace(regex, "Arbache AI");
  });
  return sanitized;
}

// ===================== PHONETIC MAP (SIMPLIFIED) =====================
// v3.0.0: Stub - lexicon_terms table removed

interface TaxonomyTag {
  code: string;
  name: string;
  confidence: number;
}

async function getPhoneticMap(
  supabase: any,
  moduleType: string,
): Promise<Record<string, string>> {
  return {};
}

// Stub simplificado - retorna apenas phoneticMap (sem taxonomia)
async function classifyAndEnrichResponse(
  supabase: any,
  responseText: string,
  moduleType: string,
  messageId?: string,
): Promise<{ taxonomyTags: TaxonomyTag[]; phoneticMap: Record<string, string> }> {
  try {
    const phoneticMap = await getPhoneticMap(supabase, moduleType);
    return { taxonomyTags: [], phoneticMap };
  } catch (err) {
    console.error("[Classify] Error:", err);
    return { taxonomyTags: [], phoneticMap: {} };
  }
}

// ===================== CHATGPT MODULE-SPECIFIC PROMPTS =====================
// CORRECAO v2.5.0: Cada módulo tem prompt ÚNICO e ESPECÍFICO
const CHATGPT_MODULE_PROMPTS: Record<string, string> = {
  // ===== MÓDULO MUNDO (GENERALISTA - NÃO É ECONOMIA) =====
  world: `Você é um assistente inteligente do módulo MUNDO do IconsAI.

## SUA FUNÇÃO:
Você é um analista generalista que ajuda o usuário a entender o MUNDO ao redor:
- Notícias e acontecimentos globais
- Política nacional e internacional
- Tendências e movimentos sociais
- Tecnologia e inovação
- Cultura e sociedade

## QUANDO O TEMA FOR ECONÔMICO:
Se o usuário perguntar especificamente sobre economia, indicadores ou mercado financeiro,
responda normalmente mas sugira: "Para análises econômicas mais aprofundadas, 
você pode usar nosso módulo especializado."

## ESTILO:
- Informativo e equilibrado
- Máximo 4-5 frases concisas
- Contextualize para a realidade brasileira quando relevante
- Cite fontes quando possível

## REGRAS:
- NUNCA mencione que é ChatGPT, OpenAI ou IA
- Seja objetivo e imparcial
- Priorize informações atuais e verificáveis`,

  // ===== MÓDULO ECONOMIA (ESPECÍFICO) =====
  economia: `Você é um analista econômico especializado em economia brasileira e global.

## DIRECIONAMENTO OBRIGATÓRIO:
1. SEMPRE relacione qualquer tema com ECONOMIA
2. Busque impactos econômicos em qualquer notícia/assunto
3. Cite dados quando possível (IBGE, Banco Central, IPEA)
4. Contextualize para a realidade brasileira

## EXEMPLOS DE CONEXÃO ECONÔMICA:
- Política → Impacto no mercado/investimentos
- Tecnologia → Produtividade/empregos
- Saúde → Custos/PIB/previdência
- Clima → Agronegócio/commodities
- Internacional → Câmbio/comércio exterior

## ESTILO:
- Informativo e analítico
- Máximo 4-5 frases concisas
- Termine com insight econômico relevante

## REGRAS:
- NUNCA mencione que é ChatGPT, OpenAI ou IA
- Sempre conecte ao contexto econômico brasileiro
- Priorize informações atuais e verificáveis`,

  // ===== MÓDULO SAÚDE =====
  health: `Você é um assistente de orientação em saúde empático e cuidadoso.

## DIRECIONAMENTO OBRIGATÓRIO:
1. ACOLHA a pessoa com empatia genuína
2. COMPREENDA o problema fazendo perguntas claras
3. INTERPRETE possíveis causas (sem diagnosticar)
4. ENFATIZE a necessidade de consultar médico se:
   - Sintomas persistentes (> 3 dias)
   - Dor intensa (escala > 7/10)
   - Sinais de alerta (febre alta, sangramento, confusão)
   - Qualquer sintoma que preocupe a pessoa

## PROTOCOLO DE PERGUNTAS:
- Quando começou?
- Onde exatamente sente?
- Como é a sensação? (dor, queimação, pressão)
- O que melhora ou piora?
- Está tomando alguma medicação?

## FRASES DE ENCAMINHAMENTO MÉDICO:
- "Isso merece uma avaliação médica para ter certeza"
- "Recomendo procurar um profissional de saúde"
- "Um médico poderá examinar e indicar o melhor tratamento"
- "Não deixe de consultar um especialista"

## ESTILO:
- Empático e acolhedor
- Máximo 4-5 frases
- SEMPRE inclua orientação sobre consulta médica
- Faça UMA pergunta por vez

## REGRAS:
- NUNCA diagnostique doenças
- NUNCA prescreva medicamentos
- NUNCA minimize sintomas graves
- NUNCA mencione que é ChatGPT, OpenAI ou IA`,

  saude: `Você é um assistente de orientação em saúde empático e cuidadoso.

## DIRECIONAMENTO OBRIGATÓRIO:
1. ACOLHA a pessoa com empatia genuína
2. COMPREENDA o problema fazendo perguntas claras
3. INTERPRETE possíveis causas (sem diagnosticar)
4. ENFATIZE a necessidade de consultar médico se:
   - Sintomas persistentes (> 3 dias)
   - Dor intensa (escala > 7/10)
   - Sinais de alerta (febre alta, sangramento, confusão)
   - Qualquer sintoma que preocupe a pessoa

## PROTOCOLO DE PERGUNTAS:
- Quando começou?
- Onde exatamente sente?
- Como é a sensação? (dor, queimação, pressão)
- O que melhora ou piora?
- Está tomando alguma medicação?

## FRASES DE ENCAMINHAMENTO MÉDICO:
- "Isso merece uma avaliação médica para ter certeza"
- "Recomendo procurar um profissional de saúde"
- "Um médico poderá examinar e indicar o melhor tratamento"
- "Não deixe de consultar um especialista"

## ESTILO:
- Empático e acolhedor
- Máximo 4-5 frases
- SEMPRE inclua orientação sobre consulta médica
- Faça UMA pergunta por vez

## REGRAS:
- NUNCA diagnostique doenças
- NUNCA prescreva medicamentos
- NUNCA minimize sintomas graves
- NUNCA mencione que é ChatGPT, OpenAI ou IA`,

  // ===== MÓDULO IDEIAS =====
  ideas: `Você é um consultor de negócios duro e questionador, usando o método "Advogado do Diabo".

## DIRECIONAMENTO OBRIGATÓRIO:
1. QUESTIONE DURAMENTE cada premissa da ideia
2. DESAFIE a pessoa a defender seu projeto
3. BUSQUE FALHAS para FORTALECER a ideia
4. NUNCA aceite respostas vagas ou otimistas demais

## PERGUNTAS DURAS OBRIGATÓRIAS:
- "O que te faz pensar que alguém pagaria por isso?"
- "Por que VOCÊ e não alguém com mais recursos?"
- "Qual é seu plano B se X falhar?"
- "Você testou isso com clientes REAIS?"
- "Quanto tempo até ficar sem dinheiro se não der certo?"
- "Quem são seus 3 maiores concorrentes e por que você é melhor?"
- "Se fosse tão bom, por que ninguém fez ainda?"

## TÉCNICA ADVOGADO DO DIABO:
1. Ouça a ideia/resposta
2. Identifique o ponto mais fraco
3. Questione diretamente esse ponto
4. Se a pessoa defender bem, reconheça e vá para próximo ponto
5. Se defender mal, aprofunde o questionamento

## ESTILO:
- DURO mas RESPEITOSO
- Direto e sem rodeios
- Máximo 3-4 frases + 1 pergunta desafiadora
- SEMPRE termine com uma pergunta incisiva

## OBJETIVO FINAL:
- Fortalecer a ideia através do questionamento
- Se a ideia sobreviver, elogiar a resiliência
- Preparar a pessoa para investidores/mercado real

## REGRAS:
- NUNCA seja gentil demais
- NUNCA aceite "vai dar certo porque acredito"
- NUNCA mencione que é ChatGPT, OpenAI ou IA`,

  ideias: `Você é um consultor de negócios duro e questionador, usando o método "Advogado do Diabo".

## DIRECIONAMENTO OBRIGATÓRIO:
1. QUESTIONE DURAMENTE cada premissa da ideia
2. DESAFIE a pessoa a defender seu projeto
3. BUSQUE FALHAS para FORTALECER a ideia
4. NUNCA aceite respostas vagas ou otimistas demais

## PERGUNTAS DURAS OBRIGATÓRIAS:
- "O que te faz pensar que alguém pagaria por isso?"
- "Por que VOCÊ e não alguém com mais recursos?"
- "Qual é seu plano B se X falhar?"
- "Você testou isso com clientes REAIS?"
- "Quanto tempo até ficar sem dinheiro se não der certo?"
- "Quem são seus 3 maiores concorrentes e por que você é melhor?"
- "Se fosse tão bom, por que ninguém fez ainda?"

## TÉCNICA ADVOGADO DO DIABO:
1. Ouça a ideia/resposta
2. Identifique o ponto mais fraco
3. Questione diretamente esse ponto
4. Se a pessoa defender bem, reconheça e vá para próximo ponto
5. Se defender mal, aprofunde o questionamento

## ESTILO:
- DURO mas RESPEITOSO
- Direto e sem rodeios
- Máximo 3-4 frases + 1 pergunta desafiadora
- SEMPRE termine com uma pergunta incisiva

## OBJETIVO FINAL:
- Fortalecer a ideia através do questionamento
- Se a ideia sobreviver, elogiar a resiliência
- Preparar a pessoa para investidores/mercado real

## REGRAS:
- NUNCA seja gentil demais
- NUNCA aceite "vai dar certo porque acredito"
- NUNCA mencione que é ChatGPT, OpenAI ou IA`,

  // ===== MÓDULO AJUDA =====
  help: `Você é um assistente prestativo do aplicativo IconsAI.

## FUNÇÃO:
Explicar como usar o aplicativo e seus recursos.

## MÓDULOS DO APP:
- MUNDO: Notícias e análises sobre o mundo (política, sociedade, tecnologia)
- SAÚDE: Orientação sobre sintomas (sempre recomenda médico)
- IDEIAS: Desenvolvimento de projetos com questionamento duro (Advogado do Diabo)

## ESTILO:
- Claro e objetivo
- Máximo 3-4 frases
- Ofereça ajuda adicional

## REGRAS:
- NUNCA mencione que é ChatGPT, OpenAI ou IA
- Sempre seja prestativo`,

  // ===== FALLBACK GERAL =====
  general: `Você é um assistente inteligente do IconsAI.

## FUNÇÃO:
Ajudar o usuário com qualquer dúvida de forma clara e objetiva.

## ESTILO:
- Informativo e prestativo
- Máximo 4-5 frases
- Linguagem natural e acessível

## REGRAS:
- NUNCA mencione que é ChatGPT, OpenAI ou IA
- Sempre seja útil e objetivo`,
};

// ===================== PERPLEXITY PRIMARY + OPENAI/GEMINI FALLBACK =====================
// v2.9.0: Perplexity como primário (busca em tempo real), OpenAI e Gemini como fallback
// v2.8.0: Suporte a ESCOPO (allowedScope/forbiddenScope)
async function callChatGPTForModule(
  query: string,
  moduleSlug: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  scopeConfig?: { allowedScope?: string; forbiddenScope?: string },
): Promise<{ response: string; success: boolean }> {
  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY") || Deno.env.get("PERPLEXITY_API_KEY");
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

  // CORRECAO v2.5.0: Obter prompt específico do módulo, fallback para "general" (não "economia")
  let modulePrompt = CHATGPT_MODULE_PROMPTS[moduleSlug] || CHATGPT_MODULE_PROMPTS["general"];

  // v2.8.0: Injetar escopo no prompt se disponível
  if (scopeConfig) {
    if (scopeConfig.allowedScope && scopeConfig.allowedScope.trim()) {
      modulePrompt += `\n\n## ESCOPO PERMITIDO (O QUE VOCÊ PODE FAZER):\n${scopeConfig.allowedScope.trim()}`;
    }
    if (scopeConfig.forbiddenScope && scopeConfig.forbiddenScope.trim()) {
      modulePrompt += `\n\n## ESCOPO PROIBIDO (O QUE VOCÊ NÃO PODE FAZER - RECUSE EDUCADAMENTE):\n${scopeConfig.forbiddenScope.trim()}\n\nSe o usuário perguntar sobre temas proibidos, responda educadamente: "Desculpe, mas este assunto está fora do meu escopo de atuação. Posso ajudar com outros temas?"`;
    }
  }

  // Construir mensagens com histórico
  const messages: Array<{ role: string; content: string }> = [{ role: "system", content: modulePrompt }];

  // Adicionar histórico (últimas 4 mensagens para contexto)
  if (conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-4);
    messages.push(...recentHistory);
  }

  // Adicionar mensagem atual
  messages.push({ role: "user", content: query });

  // v2.9.0: Perplexity PRIMEIRO (busca em tempo real)
  if (PERPLEXITY_API_KEY) {
    console.log(`[ChatRouter-${moduleSlug}] Tentando Perplexity (primário - tempo real)...`);
    const perplexityResult = await callPerplexityForModule(query, moduleSlug, messages);
    if (perplexityResult.success) {
      console.log(`[ChatRouter-${moduleSlug}] ✅ Sucesso com Perplexity`);
      return perplexityResult;
    }
    console.warn(`[ChatRouter-${moduleSlug}] Perplexity falhou, tentando OpenAI fallback...`);
  }

  // Fallback 1: OpenAI (sem acesso tempo real)
  if (OPENAI_API_KEY) {
    console.log(`[ChatRouter-${moduleSlug}] Tentando OpenAI (fallback 1)...`);
    const openaiResult = await callChatCompletionsFallback(OPENAI_API_KEY, moduleSlug, messages);
    if (openaiResult.success) {
      console.log(`[ChatRouter-${moduleSlug}] ✅ Sucesso com OpenAI (fallback)`);
      return openaiResult;
    }
    console.warn(`[ChatRouter-${moduleSlug}] OpenAI falhou, tentando Gemini fallback...`);
  }

  // Fallback 2: Gemini direto (se GEMINI_API_KEY configurada)
  if (GEMINI_API_KEY) {
    console.log(`[ChatRouter-${moduleSlug}] Tentando Gemini (fallback 2)...`);
    const geminiResult = await callGeminiWithGrounding(moduleSlug, messages);
    if (geminiResult.success) {
      console.log(`[ChatRouter-${moduleSlug}] ✅ Sucesso com Gemini (fallback)`);
      return geminiResult;
    }
  }

  // Nenhuma API funcionou
  console.error(`[ChatRouter-${moduleSlug}] ❌ Todas as APIs falharam`);
  return { response: "", success: false };
}

// Gemini direto via Google AI API (SEM Lovable)
// v2.7.0: Usa API do Google diretamente
async function callGeminiWithGrounding(
  moduleSlug: string,
  messages: Array<{ role: string; content: string }>,
): Promise<{ response: string; success: boolean }> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

  if (!GEMINI_API_KEY) {
    console.warn(`[Gemini-${moduleSlug}] GEMINI_API_KEY não configurada`);
    return { response: "", success: false };
  }

  try {
    console.log(`[Gemini-${moduleSlug}] Chamando Google AI API diretamente...`);

    // Converter formato OpenAI para formato Gemini
    const systemPrompt = messages.find(m => m.role === "system")?.content || "";
    const userMessages = messages.filter(m => m.role !== "system");

    // Construir contents para Gemini
    const contents = userMessages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    // Adicionar system instruction
    const systemInstruction = systemPrompt + `\n\n## CONTEXTO TEMPORAL:
- A data de HOJE é ${new Date().toLocaleDateString("pt-BR")} (${new Date().toISOString().split("T")[0]})
- Responda de forma concisa e direta
- NUNCA mencione que é uma IA, ChatGPT, Gemini ou qualquer modelo`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini-${moduleSlug}] API error:`, response.status, errorText);
      return { response: "", success: false };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!content) {
      console.warn(`[Gemini-Grounding-${moduleSlug}] Resposta vazia`);
      return { response: "", success: false };
    }

    // Sanitizar branding
    const sanitizedContent = sanitizeBrandingResponse(content);

    console.log(`[Gemini-Grounding-${moduleSlug}] Sucesso com Google Search - tamanho:`, sanitizedContent.length);
    return { response: sanitizedContent, success: true };
  } catch (error) {
    console.error(`[Gemini-Grounding-${moduleSlug}] Exceção:`, error);
    return { response: "", success: false };
  }
}

// Fallback: Chat Completions API (sem web search - SINALIZA LIMITAÇÃO)
async function callChatCompletionsFallback(
  apiKey: string,
  moduleSlug: string,
  messages: Array<{ role: string; content: string }>,
): Promise<{ response: string; success: boolean; hasRealtimeAccess: boolean; disclaimer: string | null }> {
  try {
    console.log(`[ChatGPT-Fallback-${moduleSlug}] Usando Chat Completions (SEM acesso a tempo real)...`);

    // Adicionar disclaimer de limitação ao system prompt
    const fallbackDisclaimer = `\n\n## LIMITAÇÃO IMPORTANTE - LEIA COM ATENÇÃO:
Você NÃO tem acesso a informações em tempo real ou dados posteriores à sua data de treinamento.
Ao responder sobre dados econômicos, notícias ou eventos recentes:
1. DECLARE EXPLICITAMENTE: "Meus dados podem não refletir a situação atual."
2. RECOMENDE ao usuário verificar fontes oficiais atualizadas (BCB, IBGE, portais de notícias).
3. NÃO invente valores específicos para indicadores econômicos atuais.
4. Se não souber um dado atual, diga: "Recomendo consultar [fonte oficial] para valores atualizados."`;

    // Adicionar disclaimer ao primeiro message (system)
    const messagesWithDisclaimer = messages.map((m, idx) => {
      if (idx === 0 && m.role === "system") {
        return { ...m, content: m.content + fallbackDisclaimer };
      }
      return m;
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messagesWithDisclaimer,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ChatGPT-Fallback-${moduleSlug}] API error:`, response.status, errorText);
      return { response: "", success: false, hasRealtimeAccess: false, disclaimer: null };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Sanitizar branding
    const sanitizedContent = sanitizeBrandingResponse(content);

    // Validar que a resposta não está vazia
    if (!sanitizedContent || sanitizedContent.length === 0) {
      console.warn(`[ChatGPT-Fallback-${moduleSlug}] Resposta vazia após sanitização`);
      return { response: "", success: false, hasRealtimeAccess: false, disclaimer: null };
    }

    console.log(`[ChatGPT-Fallback-${moduleSlug}] Sucesso - tamanho:`, sanitizedContent.length);
    return {
      response: sanitizedContent,
      success: true,
      hasRealtimeAccess: false,
      disclaimer:
        "Resposta gerada sem acesso a dados em tempo real. Verifique fontes oficiais para informações atualizadas.",
    };
  } catch (error) {
    console.error(`[ChatGPT-Fallback-${moduleSlug}] Exceção:`, error);
    return { response: "", success: false, hasRealtimeAccess: false, disclaimer: null };
  }
}

// ===================== PERPLEXITY (BUSCA EM TEMPO REAL) =====================
// v2.9.0: Perplexity como provider primário para busca em tempo real
const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions";

async function callPerplexityForModule(
  query: string,
  moduleSlug: string,
  messages: Array<{ role: string; content: string }>,
): Promise<{ response: string; success: boolean; citations?: string[] }> {
  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY") || Deno.env.get("PERPLEXITY_API_KEY");

  if (!PERPLEXITY_API_KEY) {
    console.warn(`[Perplexity-${moduleSlug}] PERPLEXITY_API_KEY não configurada`);
    return { response: "", success: false };
  }

  try {
    console.log(`[Perplexity-${moduleSlug}] Chamando Perplexity API (busca em tempo real)...`);

    const response = await fetch(PERPLEXITY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages,
        temperature: 0.7,
        max_tokens: 1500,
        return_citations: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Perplexity-${moduleSlug}] API error:`, response.status, errorText);
      return { response: "", success: false };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (!content) {
      console.warn(`[Perplexity-${moduleSlug}] Resposta vazia`);
      return { response: "", success: false };
    }

    // Sanitizar branding
    let sanitizedContent = sanitizeBrandingResponse(content);

    // v2.9.0: Remover referências numéricas [1], [2], etc. para não atrapalhar o TTS
    sanitizedContent = sanitizedContent.replace(/\[\d+\]/g, "");
    // Remover múltiplos espaços que podem sobrar
    sanitizedContent = sanitizedContent.replace(/\s{2,}/g, " ").trim();

    console.log(`[Perplexity-${moduleSlug}] Sucesso com busca em tempo real - tamanho:`, sanitizedContent.length);
    return {
      response: sanitizedContent,
      success: true,
      citations: data.citations || [],
    };
  } catch (error) {
    console.error(`[Perplexity-${moduleSlug}] Exceção:`, error);
    return { response: "", success: false };
  }
}

// ===================== MODULE-SPECIFIC SYSTEM PROMPTS (GEMINI FALLBACK) =====================
const MODULE_SYSTEM_PROMPTS: Record<string, string> = {
  // CORRECAO v2.5.0: Adicionado prompt para "world" separado
  world: `
# MÓDULO MUNDO - Assistente Generalista

## PERSONALIDADE:
- Informativo e equilibrado
- Analisa múltiplas perspectivas
- Contextualiza para realidade brasileira

## TÓPICOS:
- Notícias e acontecimentos globais
- Política nacional e internacional
- Tendências sociais e tecnológicas
- Cultura e sociedade

## ESTRATÉGIA:
1. Entenda o que o usuário quer saber
2. Forneça informação clara e objetiva
3. Cite fontes quando possível
4. Mantenha imparcialidade

## REGRAS:
- Seja objetivo e equilibrado
- Máximo 4-5 frases
- Não seja tendencioso politicamente
`,

  health: `
# MÓDULO SAÚDE - Assistente de Orientação

## PERSONALIDADE:
- Empático e acolhedor
- Usa protocolo OLDCARTS para entender sintomas
- SEMPRE recomenda procurar médico para casos sérios

## PROTOCOLO OLDCARTS:
- O: Onset (Início) - Quando começou?
- L: Location (Local) - Onde dói/sente?
- D: Duration (Duração) - Quanto tempo dura?
- C: Character (Característica) - Como é a sensação?
- A: Aggravating (Agravantes) - O que piora?
- R: Relieving (Alívio) - O que melhora?
- T: Timing (Tempo) - É constante ou vai e volta?
- S: Severity (Severidade) - De 0 a 10, quão forte?

## ESTRATÉGIA:
1. Acolha a pessoa com empatia
2. Faça 1-2 perguntas do OLDCARTS por vez
3. Nunca diagnostique - apenas oriente
4. Para sintomas graves: "Procure um médico imediatamente"

## SINAIS DE ALERTA (recomendar médico IMEDIATO):
- Dor no peito
- Dificuldade para respirar
- Febre alta persistente
- Sangramento intenso
- Confusão mental

## REGRAS:
- NUNCA faça diagnósticos
- SEMPRE diga "procure um médico" para casos sérios
- Máximo 4-5 frases
`,

  ideas: `
# MÓDULO IDEIAS - Consultor Advogado do Diabo

## PERSONALIDADE:
- Questionador DURO mas construtivo
- Desafia TODAS as premissas
- Busca falhas para FORTALECER a ideia

## TÉCNICA ADVOGADO DO DIABO:
1. Questione a premissa básica
2. Aponte riscos e obstáculos
3. Pergunte sobre o que pode dar errado
4. Force a pessoa a defender sua ideia
5. Sugira melhorias baseadas nas falhas

## EXEMPLOS DE QUESTIONAMENTOS:
- "O que te faz pensar que alguém pagaria por isso?"
- "E se um concorrente com mais recursos copiar?"
- "Qual é o plano B se X falhar?"
- "Você testou isso com clientes reais?"

## ESTRATÉGIA:
1. Faça UMA pergunta dura por vez
2. Espere a resposta antes de questionar mais
3. Não aceite respostas vagas
4. Se a ideia sobreviver, elogie a resiliência

## REGRAS:
- Seja DURO mas RESPEITOSO
- Objetivo é FORTALECER a ideia
- Máximo 3-4 frases + 1 pergunta
- Sempre termine com uma pergunta desafiadora
`,

  help: `
# MÓDULO AJUDA - Guia do IconsAI

## PERSONALIDADE:
- Prestativo e paciente
- Explica funcionalidades claramente

## TÓPICOS QUE VOCÊ CONHECE:
- Como usar cada módulo (Mundo, Saúde, Ideias)
- Como funciona o microfone
- Como ver o histórico de conversas
- Como o app pode ajudar

## ESTRATÉGIA:
1. Identifique o que a pessoa precisa
2. Explique de forma simples e direta
3. Ofereça dicas extras se relevante

## REGRAS:
- Máximo 4-5 frases
- Seja claro e objetivo
`,
};

function getModuleSystemPrompt(moduleType: string): string {
  return MODULE_SYSTEM_PROMPTS[moduleType] || "";
}

const BRANDING_SYSTEM_INSTRUCTIONS = `
REGRAS OBRIGATÓRIAS (NUNCA VIOLAR):
1. Você é um assistente do IconsAI, desenvolvido pela Arbache AI.
2. NUNCA mencione OpenAI, ChatGPT, GPT-4, Claude, Anthropic, Gemini, ou qualquer outra IA.
3. Se perguntado sobre tecnologia ou quem te criou: "Fui desenvolvido pela Arbache AI, uma empresa brasileira de inteligência artificial."
4. Sempre responda em português brasileiro.
`;

// ===================== TYPES =====================
interface Message {
  role: "user" | "assistant";
  content: string;
  fileData?: {
    data: any[];
    fileName: string;
    columns: string[];
    totalRecords?: number;
  };
  type?: string;
}

interface AgentConfig {
  systemPrompt?: string | null;
  maieuticLevel?: string | null;
  regionalTone?: string | null;
  ragCollection?: string;
  allowedTags?: string[] | null;
  forbiddenTags?: string[] | null;
  dashboardContext?: string;
}

interface ChatRequest {
  messages?: Message[];
  chatType?: "health" | "study" | "economia" | "general" | "ideias" | "world" | "ideas" | "help";
  region?: string;
  agentConfig?: AgentConfig;
  documentId?: string;
  sessionId?: string;
  pwaMode?: boolean;
  message?: string;
  agentSlug?: string;
  deviceId?: string;
}

interface OrchestratedContext {
  contextCode: string;
  contextName: string;
  promptTemplate: string;
  promptAdditions: string;
  antiprompt: string;
  maieuticPrompt: string;
  taxonomyCodes: string[];
  matchThreshold: number;
  matchCount: number;
  tone: string;
  cognitiveMode: "normal" | "simplified" | "maieutic";
  confidence: number;
  wasOverridden: boolean;
}

// ===================== CONSTANTS =====================
const INDICATOR_KEYWORDS: Record<string, string[]> = {
  SELIC: ["selic", "taxa básica", "juros básico", "taxa de juros"],
  CDI: ["cdi", "certificado depósito"],
  IPCA: ["ipca", "inflação", "índice de preços", "inflacionário"],
  PIB: ["pib", "produto interno bruto", "gdp"],
  DOLAR: ["dólar", "dolar", "câmbio", "moeda americana", "usd", "ptax"],
  "4099": ["desemprego", "desocupação", "taxa de desemprego", "pnad"],
  PMC: ["vendas", "comércio", "varejo", "pmc"],
  RENDA_MEDIA: ["renda", "renda média", "salário médio", "renda per capita"],
  GINI: ["gini", "desigualdade", "distribuição de renda"],
};

const BRAZILIAN_STATES: Record<string, string> = {
  ac: "AC",
  acre: "AC",
  al: "AL",
  alagoas: "AL",
  ap: "AP",
  amapá: "AP",
  am: "AM",
  amazonas: "AM",
  ba: "BA",
  bahia: "BA",
  ce: "CE",
  ceará: "CE",
  df: "DF",
  brasília: "DF",
  es: "ES",
  "espírito santo": "ES",
  go: "GO",
  goiás: "GO",
  ma: "MA",
  maranhão: "MA",
  mt: "MT",
  "mato grosso": "MT",
  ms: "MS",
  "mato grosso do sul": "MS",
  mg: "MG",
  "minas gerais": "MG",
  pa: "PA",
  pará: "PA",
  pb: "PB",
  paraíba: "PB",
  pr: "PR",
  paraná: "PR",
  pe: "PE",
  pernambuco: "PE",
  pi: "PI",
  piauí: "PI",
  rj: "RJ",
  "rio de janeiro": "RJ",
  rn: "RN",
  "rio grande do norte": "RN",
  rs: "RS",
  "rio grande do sul": "RS",
  ro: "RO",
  rondônia: "RO",
  rr: "RR",
  roraima: "RR",
  sc: "SC",
  "santa catarina": "SC",
  sp: "SP",
  "são paulo": "SP",
  se: "SE",
  sergipe: "SE",
  to: "TO",
  tocantins: "TO",
};

// ===================== MAIEUTIC METRICS =====================
// v3.0.0: Stub - maieutic_metrics table removed
async function logMaieuticMetrics(
  supabase: any,
  sessionId: string | null,
  cognitiveMode: string,
  detectedCategories: string[],
  responseText: string,
  contextCode: string,
): Promise<void> {
  // No-op: table removed
}

function detectUserFeedbackType(message: string): {
  askedClarification: boolean;
  confirmedUnderstanding: boolean;
} {
  const clarificationPatterns = [
    /não entendi|nao entendi/i,
    /pode explicar/i,
    /como assim/i,
    /confuso|confusa/i,
    /repete|repetir/i,
    /explica melhor/i,
  ];
  const understandingPatterns = [
    /entendi|entendido/i,
    /ficou claro/i,
    /perfeito|ótimo|legal/i,
    /obrigad[oa]/i,
    /valeu|vlw/i,
    /faz sentido/i,
  ];

  return {
    askedClarification: clarificationPatterns.some((p) => p.test(message)),
    confirmedUnderstanding: understandingPatterns.some((p) => p.test(message)),
  };
}

// v3.0.0: Stub - maieutic_metrics table removed
async function updatePreviousMetricWithFeedback(
  supabase: any,
  sessionId: string,
  feedbackType: { askedClarification: boolean; confirmedUnderstanding: boolean },
): Promise<void> {
  // No-op: table removed
}

// ===================== USER CONTEXT UPDATE =====================
// v3.0.0: Stub - pwa_user_context table removed
async function updateUserContextAfterInteraction(
  supabase: any,
  deviceId: string,
  userName: string | null,
  moduleId: string,
  userMessage: string,
  assistantResponse: string,
): Promise<void> {
  // No-op: table removed
}

// ===================== ORCHESTRATOR =====================
// v3.0.0: Stub - RPC function removed
async function getOrchestratedContext(
  supabase: any,
  query: string,
  overrideSlug?: string | null,
): Promise<OrchestratedContext | null> {
  return null;
}

// ===================== HELPER FUNCTIONS =====================
function detectIndicators(query: string): string[] {
  const normalizedQuery = query.toLowerCase();
  const codes: string[] = [];

  for (const [code, keywords] of Object.entries(INDICATOR_KEYWORDS)) {
    if (keywords.some((k) => normalizedQuery.includes(k))) {
      codes.push(code);
    }
  }
  return codes;
}

// v3.0.0: Stub - economic_indicators_history table removed
async function fetchLatestIndicators(supabase: any, codes: string[]): Promise<Record<string, any>> {
  return {};
}

function formatIndicatorsContext(indicators: Record<string, any>): string {
  if (Object.keys(indicators).length === 0) return "";

  const lines = ["## DADOS ECONÔMICOS OFICIAIS:"];
  const staleWarnings: string[] = [];

  for (const [code, data] of Object.entries(indicators)) {
    const value = data.value;
    const variation = data.monthly_change_pct;
    const refDate = data.referenceFormatted || "data desconhecida";

    let line = `- ${code}: ${value} (referência: ${refDate})`;
    if (variation !== null && variation !== undefined) {
      const arrow = variation >= 0 ? "↑" : "↓";
      line += ` | Variação: ${arrow} ${Math.abs(variation).toFixed(2)}% m/m`;
    }

    // Marcar dados potencialmente desatualizados
    if (data.isStale) {
      line += " ⚠️ DADO PODE ESTAR DESATUALIZADO";
      staleWarnings.push(code);
    }

    lines.push(line);
  }

  // Adicionar aviso consolidado se houver dados antigos
  if (staleWarnings.length > 0) {
    lines.push(
      `\n⚠️ ATENÇÃO: Os indicadores ${staleWarnings.join(", ")} podem não refletir valores atuais. Recomende ao usuário verificar fontes oficiais.`,
    );
  }

  return lines.join("\n");
}

function getEmotionalContext(indicators: Record<string, any>): string {
  const contexts: string[] = [];
  for (const [code, data] of Object.entries(indicators)) {
    const variation = data.monthly_change_pct;
    if (variation === null || variation === undefined) continue;

    if (code === "IPCA" && variation > 0.5) {
      contexts.push("A inflação está em alta, preocupando famílias com renda fixa.");
    }
    if (code === "4099" && variation > 0) {
      contexts.push("O desemprego aumentou, sinal de atenção para a economia.");
    }
  }
  return contexts.length > 0 ? `\n## CONTEXTO:\n${contexts.join("\n")}` : "";
}

// ===================== RAG FUNCTIONS =====================
// v3.0.0: Stub - document tables and RPC removed
async function searchRAGDocuments(
  supabase: any,
  query: string,
  chatType: string,
  matchThreshold: number,
  matchCount: number,
  allowedTags: string[] | null,
  forbiddenTags: string[] | null,
  taxonomyCodes: string[],
  scopeTopics: string[],
): Promise<{ context: string; documentTitles: string[] }> {
  return { context: "", documentTitles: [] };
}

// v3.0.0: Stub - chat_config table removed
async function getChatConfig(supabase: any, chatType: string): Promise<any> {
  return { matchThreshold: 0.15, matchCount: 5, systemPromptBase: "", scopeTopics: [] };
}

// v3.0.0: Stub - agent_taxonomy_rules table removed
async function getAgentTaxonomyCodes(
  supabase: any,
  agentSlug: string,
): Promise<{ included: string[]; excluded: string[] }> {
  return { included: [], excluded: [] };
}

// v3.0.0: Stub - regional_tone_config table removed
async function getCulturalToneRules(supabase: any, region?: string): Promise<string> {
  return "";
}

// CORRECAO v2.5.0: Guardrails específicos por módulo
function getCategoryGuardrails(chatType: string): string {
  const guardrails: Record<string, string> = {
    health: `GUARDRAILS: NUNCA diagnostique. SEMPRE recomende médico para casos sérios.`,
    ideas: `GUARDRAILS: Seja duro. SEMPRE termine com pergunta desafiadora.`,
    economia: `GUARDRAILS: Use dados verificáveis. Relacione à economia brasileira.`,
    world: `GUARDRAILS: Seja objetivo e imparcial. Contextualize para realidade brasileira.`,
    help: `GUARDRAILS: Seja claro e prestativo. Explique funcionalidades do app.`,
  };
  return guardrails[chatType] || "";
}

// ===================== SYSTEM PROMPT BUILDER =====================
interface SystemPromptParams {
  chatType: string;
  customPrompt: string;
  ragContext: string;
  fileContext: string;
  culturalTone: string;
  guardrails: string;
  scopeTopics: string[];
  indicatorsContext?: string;
  emotionalContext?: string;
  userContext?: string;
  memoryContext?: string;
  isPwaMode?: boolean;
  maieuticPrompt?: string;
  antiprompt?: string;
  allowedScope?: string;
  forbiddenScope?: string;
}

function buildSystemPrompt(params: SystemPromptParams): string {
  const parts: string[] = [BRANDING_SYSTEM_INSTRUCTIONS];

  if (params.customPrompt) parts.push(params.customPrompt);
  if (params.guardrails) parts.push(params.guardrails);

  // ESCOPO: Regras de permissão e proibição do agente
  if (params.allowedScope && params.allowedScope.trim()) {
    parts.push(`## ESCOPO PERMITIDO (O QUE VOCÊ PODE FAZER):\n${params.allowedScope.trim()}`);
  }
  if (params.forbiddenScope && params.forbiddenScope.trim()) {
    parts.push(`## ESCOPO PROIBIDO (O QUE VOCÊ NÃO PODE FAZER - RECUSE EDUCADAMENTE):\n${params.forbiddenScope.trim()}\n\nSe o usuário perguntar sobre temas proibidos, responda educadamente: "Desculpe, mas este assunto está fora do meu escopo de atuação. Posso ajudar com outros temas?"`);
  }

  if (params.maieuticPrompt) parts.push(`## ABORDAGEM:\n${params.maieuticPrompt}`);
  if (params.antiprompt) parts.push(`## EVITAR:\n${params.antiprompt}`);
  if (params.ragContext) parts.push(params.ragContext);
  if (params.indicatorsContext) parts.push(params.indicatorsContext);
  if (params.emotionalContext) parts.push(params.emotionalContext);
  if (params.fileContext) parts.push(`## DADOS:\n${params.fileContext}`);
  if (params.userContext) parts.push(params.userContext);
  if (params.memoryContext) parts.push(params.memoryContext);
  if (params.culturalTone) parts.push(`## TOM:\n${params.culturalTone}`);

  if (params.isPwaMode) {
    parts.push(`## PWA: Respostas CURTAS (4-5 frases). Linguagem NATURAL.`);
  }

  return parts.join("\n\n");
}

function processFileData(messages: Message[]): string {
  const fileMessages = messages.filter((m) => m.type === "file-data" && m.fileData);
  if (fileMessages.length === 0) return "";

  return fileMessages
    .map((msg) => {
      const { fileName, columns, data, totalRecords } = msg.fileData!;
      const preview = data
        .slice(0, 5)
        .map((row: any) => columns.map((col) => `${col}: ${row[col]}`).join(" | "))
        .join("\n");
      return `Arquivo: ${fileName}\nColunas: ${columns.join(", ")}\nTotal: ${totalRecords || data.length}\n${preview}`;
    })
    .join("\n\n");
}

// ===================== PWA HISTORY FUNCTIONS =====================
async function getRecentHistory(
  supabase: any,
  deviceId: string,
  agentSlug?: string,
): Promise<{
  sessionId: string;
  userName: string | null;
  messages: Array<{ role: string; content: string }>;
}> {
  try {
    // Use existing pwa_sessions table
    const { data: session } = await supabase
      .from("pwa_sessions")
      .select("id, user_name")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let sessionId: string;
    let userName: string | null = null;

    if (session) {
      sessionId = session.id;
      userName = session.user_name;
    } else {
      const { data: newSession } = await supabase
        .from("pwa_sessions")
        .insert({ device_id: deviceId })
        .select("id")
        .single();
      sessionId = newSession?.id || `temp-${Date.now()}`;
    }

    // Use pwa_conversations table, filter by module_slug if provided
    let query = supabase
      .from("pwa_conversations")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (agentSlug) {
      query = query.eq("module_slug", agentSlug);
    }

    const { data: messages } = await query;

    return { sessionId, userName, messages: (messages || []).reverse() };
  } catch {
    return { sessionId: `temp-${Date.now()}`, userName: null, messages: [] };
  }
}

async function saveMessage(
  supabase: any,
  sessionId: string,
  role: string,
  content: string,
  agentSlug?: string,
): Promise<string | null> {
  if (sessionId.startsWith("temp-")) return null;
  try {
    const { data, error } = await supabase
      .from("pwa_conversations")
      .insert({
        session_id: sessionId,
        role,
        content,
        module_slug: agentSlug || null,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[SaveMessage] Error:", error);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.warn("[SaveMessage] Exception:", err);
    return null;
  }
}

async function detectAndSaveName(
  supabase: any,
  sessionId: string,
  message: string,
  currentName: string | null,
): Promise<string | null> {
  if (currentName || sessionId.startsWith("temp-")) return currentName;

  const patterns = [/(?:me chamo|meu nome é|pode me chamar de|sou o|sou a)\s+(\w+)/i, /^(\w+)(?:\s+aqui)?$/i];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1] && match[1].length >= 2 && match[1].length <= 20) {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      try {
        // Use existing pwa_sessions table
        await supabase.from("pwa_sessions").update({ user_name: name }).eq("id", sessionId);
        return name;
      } catch {}
    }
  }
  return null;
}

// ===================== MAIN HANDLER =====================
serve(async (req: Request) => {
  const logger = createLogger("chat-router");

  // v3.1.0: Usar CORS dinâmico baseado na origem da request
  const origin = req.headers.get("origin");
  const dynamicCorsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: dynamicCorsHeaders });
  }

  try {
    const body: ChatRequest = await req.json();
    const {
      messages = [],
      chatType: rawChatType = "general",
      region,
      agentConfig,
      documentId,
      sessionId,
      pwaMode = false,
      message: pwaMessage,
      agentSlug,
      deviceId,
    } = body;

    const chatType = pwaMode && agentSlug ? agentSlug : rawChatType;
    logger.info("Request", { chatType, pwaMode, messageCount: messages?.length });

    const supabase = getSupabaseAdmin();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    // Permitir funcionamento se pelo menos uma API key estiver configurada
    if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
      throw new Error("Nenhuma API key configurada (OPENAI_API_KEY ou GEMINI_API_KEY)");
    }

    console.log("[chat-router] APIs disponíveis:", {
      openai: !!OPENAI_API_KEY,
      gemini: !!GEMINI_API_KEY,
    });

    // ============ PWA MODE ============
    if (pwaMode) {
      if (!pwaMessage) return errorResponse("Message required", 400);

      const finalDeviceId = deviceId || `anonymous-${Date.now()}`;
      logger.info("PWA mode", { agentSlug, deviceId: finalDeviceId.substring(0, 15) });

      // Access check
      // CORRECAO v2.5.0: Usar chatType como fallback, não "economia"
      const isDevMode = finalDeviceId.startsWith("anonymous-") || finalDeviceId.startsWith("simulator-");
      if (!isDevMode) {
        const { data: accessCheck } = await supabase.rpc("check_pwa_access", {
          p_device_id: finalDeviceId,
          p_agent_slug: agentSlug || chatType || "general",
        });

        if (accessCheck && !accessCheck.has_access) {
          return new Response(
            JSON.stringify({ error: "Acesso não autorizado", response: accessCheck.message || "Sem permissão." }),
            { status: 403, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      const { sessionId: pwaSessionId, userName, messages: history } = await getRecentHistory(supabase, finalDeviceId);
      const detectedName = await detectAndSaveName(supabase, pwaSessionId, pwaMessage, userName);
      const currentUserName = detectedName || userName;

      const feedbackType = detectUserFeedbackType(pwaMessage);
      if (feedbackType.askedClarification || feedbackType.confirmedUnderstanding) {
        await updatePreviousMetricWithFeedback(supabase, pwaSessionId, feedbackType);
      }

      await saveMessage(supabase, pwaSessionId, "user", pwaMessage, agentSlug);

      // ===== CHATGPT COMO FONTE PRIMÁRIA =====
      // CORRECAO v2.5.0: Usar agentSlug ou chatType, NUNCA hardcode "economia"
      const moduleSlug = agentSlug || chatType || "general";
      logger.info(`[ChatGPT-Primary] Módulo: ${moduleSlug}`);

      // v2.8.0: Carregar escopo do agente antes de chamar ChatGPT
      let scopeConfig: { allowedScope?: string; forbiddenScope?: string } | undefined;
      try {
        const { data: agentForScope } = await supabase
          .from("iconsai_agents")
          .select("metadata")
          .eq("slug", moduleSlug)
          .eq("is_active", true)
          .single();

        if (agentForScope?.metadata && typeof agentForScope.metadata === 'object') {
          const metadata = agentForScope.metadata as Record<string, unknown>;
          const allowedScope = (metadata.allowedScope as string) || "";
          const forbiddenScope = (metadata.forbiddenScope as string) || "";
          if (allowedScope || forbiddenScope) {
            scopeConfig = { allowedScope, forbiddenScope };
            console.log(`[Scope-ChatGPT] Agent ${moduleSlug}: allowed="${allowedScope.substring(0, 30)}..." forbidden="${forbiddenScope.substring(0, 30)}..."`);
          }
        }
      } catch (scopeErr) {
        console.warn(`[Scope-ChatGPT] Failed to load scope for ${moduleSlug}:`, scopeErr);
      }

      const chatGPTResult = await callChatGPTForModule(pwaMessage, moduleSlug, history, scopeConfig);

      if (chatGPTResult.success && chatGPTResult.response) {
        logger.info(`[ChatGPT-Primary] Sucesso para ${moduleSlug}`);

        // Salvar mensagem e obter ID
        const messageId = await saveMessage(supabase, pwaSessionId, "assistant", chatGPTResult.response, agentSlug);

        // NOVO v2.6.0: Classificar e enriquecer resposta
        const { taxonomyTags, phoneticMap } = await classifyAndEnrichResponse(
          supabase,
          chatGPTResult.response,
          moduleSlug,
          messageId || undefined,
        );

        await logMaieuticMetrics(
          supabase,
          pwaSessionId,
          "chatgpt-primary",
          taxonomyTags.length > 0 ? taxonomyTags.map((t) => t.code) : [moduleSlug],
          chatGPTResult.response,
          moduleSlug,
        );

        return new Response(
          JSON.stringify({
            response: chatGPTResult.response,
            sessionId: pwaSessionId,
            contextCode: moduleSlug,
            source: "chatgpt",
            messageId: messageId,
            taxonomyTags: taxonomyTags,
            phoneticMap: phoneticMap,
            dataReliability: {
              hasRealtimeAccess: true,
              staleIndicators: [],
              disclaimer: null,
            },
          }),
          { headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ===== FALLBACK: Gemini =====
      logger.warn(`[ChatGPT-Primary] Falha, usando Gemini para ${moduleSlug}`);

      const orchestratedContext = await getOrchestratedContext(supabase, pwaMessage, agentSlug);
      // CORRECAO v2.5.0: Usar moduleSlug (já corrigido), não hardcode "economia"
      let contextCode = moduleSlug;
      const moduleSpecificPrompt = getModuleSystemPrompt(contextCode);
      let systemPromptFromContext = "";
      let maieuticPrompt = "";
      let antiprompt = "";
      let taxonomyCodes: string[] = [];
      let matchThreshold = 0.15;
      let matchCount = 5;
      let allowedScope = "";
      let forbiddenScope = "";

      if (orchestratedContext) {
        contextCode = orchestratedContext.contextCode;
        systemPromptFromContext = orchestratedContext.promptTemplate;
        maieuticPrompt = orchestratedContext.maieuticPrompt;
        antiprompt = orchestratedContext.antiprompt;
        taxonomyCodes = orchestratedContext.taxonomyCodes;
        matchThreshold = orchestratedContext.matchThreshold;
        matchCount = orchestratedContext.matchCount;
      } else {
        // CORRECAO v2.5.0: Usar moduleSlug, não hardcode "economia"
        const { data: agent } = await supabase
          .from("iconsai_agents")
          .select("*")
          .eq("slug", moduleSlug)
          .eq("is_active", true)
          .single();

        if (agent) {
          systemPromptFromContext = agent.system_prompt || "";
          matchThreshold = agent.match_threshold || 0.15;
          matchCount = agent.match_count || 5;
          const agentTaxonomies = await getAgentTaxonomyCodes(supabase, moduleSlug);
          taxonomyCodes = agentTaxonomies.included;

          // ESCOPO v2.7.0: Extrair allowedScope e forbiddenScope do metadata
          if (agent.metadata && typeof agent.metadata === 'object') {
            const metadata = agent.metadata as Record<string, unknown>;
            allowedScope = (metadata.allowedScope as string) || "";
            forbiddenScope = (metadata.forbiddenScope as string) || "";
            if (allowedScope || forbiddenScope) {
              console.log(`[Scope] Agent ${moduleSlug}: allowed="${allowedScope.substring(0, 50)}..." forbidden="${forbiddenScope.substring(0, 50)}..."`);
            }
          }
        }
      }

      const detectedIndicators = detectIndicators(pwaMessage);
      let indicatorsContext = "";
      let emotionalContext = "";

      if (detectedIndicators.length > 0) {
        const indicatorData = await fetchLatestIndicators(supabase, detectedIndicators);
        indicatorsContext = formatIndicatorsContext(indicatorData);
        emotionalContext = getEmotionalContext(indicatorData);
      }

      let ragContext = "";
      if (taxonomyCodes.length > 0 || contextCode) {
        const { context } = await searchRAGDocuments(
          supabase,
          pwaMessage,
          contextCode,
          matchThreshold,
          matchCount,
          null,
          null,
          taxonomyCodes,
          [],
        );
        if (context) ragContext = context;
      }

      const memoryContext =
        history.length > 0
          ? `\n## HISTÓRICO:\n${history.map((m) => `${m.role === "user" ? "Usuário" : "Você"}: ${m.content}`).join("\n")}`
          : "";

      const userContext = currentUserName ? `\n## USUÁRIO: ${currentUserName}` : `\n## USUÁRIO: Desconhecido`;

      const systemPrompt = buildSystemPrompt({
        chatType: contextCode,
        customPrompt: (moduleSpecificPrompt ? moduleSpecificPrompt + "\n\n" : "") + (systemPromptFromContext || ""),
        ragContext,
        fileContext: "",
        culturalTone: "",
        guardrails: getCategoryGuardrails(contextCode),
        scopeTopics: [],
        indicatorsContext,
        emotionalContext,
        userContext,
        memoryContext,
        isPwaMode: true,
        maieuticPrompt,
        antiprompt,
        allowedScope,
        forbiddenScope,
      });

      // v2.7.0: Usar Gemini direto (sem Lovable)
      const userMessages = history.slice(-6).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      userMessages.push({ role: "user", parts: [{ text: pwaMessage }] });

      const chatResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: userMessages,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
              maxOutputTokens: 400,
              temperature: 0.7,
            },
          }),
        }
      );

      if (!chatResponse.ok) {
        const status = chatResponse.status;
        const errorBody = await chatResponse.text();
        console.error(`[Gemini-Fallback] Error ${status}:`, errorBody);

        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit", response: "Aguarde um momento." }), {
            status: 429,
            headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`Gemini API error: ${status} - ${errorBody}`);
      }

      const chatData = await chatResponse.json();
      const rawResponse = chatData.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao processar.";
      const response = sanitizeBrandingResponse(rawResponse);

      // Salvar mensagem e obter ID
      const messageId = await saveMessage(supabase, pwaSessionId, "assistant", response, agentSlug);

      // NOVO v2.6.0: Classificar e enriquecer resposta
      const { taxonomyTags, phoneticMap } = await classifyAndEnrichResponse(
        supabase,
        response,
        contextCode,
        messageId || undefined,
      );

      await logMaieuticMetrics(
        supabase,
        pwaSessionId,
        orchestratedContext?.cognitiveMode || "normal",
        taxonomyTags.length > 0 ? taxonomyTags.map((t) => t.code) : orchestratedContext?.taxonomyCodes || [],
        response,
        contextCode,
      );

      // ============ ATUALIZAÇÃO DO CONTEXTO DO USUÁRIO ============
      // Atualizar memória persistente para saudações contextuais
      if (finalDeviceId && agentSlug) {
        try {
          await updateUserContextAfterInteraction(
            supabase,
            finalDeviceId,
            currentUserName || null,
            agentSlug,
            pwaMessage,
            response,
          );
        } catch (ctxError) {
          console.warn("[Context] Failed to update user context:", ctxError);
        }
      }

      // Identificar indicadores desatualizados para metadata
      const staleIndicatorCodes = Object.entries(
        detectedIndicators.length > 0 ? await fetchLatestIndicators(supabase, detectedIndicators) : {},
      )
        .filter(([_, data]) => data.isStale)
        .map(([code]) => code);

      return new Response(
        JSON.stringify({
          response,
          sessionId: pwaSessionId,
          contextCode,
          source: "gemini-fallback",
          messageId: messageId,
          taxonomyTags: taxonomyTags,
          phoneticMap: phoneticMap,
          dataReliability: {
            hasRealtimeAccess: true,
            staleIndicators: staleIndicatorCodes,
            disclaimer:
              staleIndicatorCodes.length > 0
                ? "Alguns dados econômicos podem não refletir valores atuais. Verifique fontes oficiais."
                : null,
          },
        }),
        { headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============ STANDARD STREAMING MODE ============
    if (!Array.isArray(messages)) return errorResponse("Messages must be an array", 400);
    if (messages.length > 50) return errorResponse("Too many messages", 400);

    for (const msg of messages) {
      if (msg.type === "file-data") continue;
      if (!msg || typeof msg.content !== "string") return errorResponse("Invalid message", 400);
      if (msg.content.length > 10000) return errorResponse("Message too long", 400);
    }

    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    const userQuery = lastUserMessage?.content || "";

    if (sessionId && userQuery) {
      const feedbackType = detectUserFeedbackType(userQuery);
      if (feedbackType.askedClarification || feedbackType.confirmedUnderstanding) {
        await updatePreviousMetricWithFeedback(supabase, sessionId, feedbackType);
      }
    }

    const orchestratedContext = await getOrchestratedContext(supabase, userQuery, chatType);

    let contextCode = chatType;
    let systemPromptFromContext = "";
    let maieuticPrompt = "";
    let antiprompt = "";
    let taxonomyCodes: string[] = [];
    let matchThreshold = 0.15;
    let matchCount = 5;
    let scopeTopics: string[] = [];

    if (orchestratedContext) {
      contextCode = orchestratedContext.contextCode;
      systemPromptFromContext = orchestratedContext.promptTemplate;
      maieuticPrompt = orchestratedContext.maieuticPrompt;
      antiprompt = orchestratedContext.antiprompt;
      taxonomyCodes = orchestratedContext.taxonomyCodes;
      matchThreshold = orchestratedContext.matchThreshold;
      matchCount = orchestratedContext.matchCount;
    } else {
      const chatConfig = await getChatConfig(supabase, chatType);
      matchThreshold = chatConfig.matchThreshold;
      matchCount = chatConfig.matchCount;
      systemPromptFromContext = chatConfig.systemPromptBase;
      scopeTopics = chatConfig.scopeTopics;
      const agentTaxonomies = await getAgentTaxonomyCodes(supabase, chatType);
      taxonomyCodes = agentTaxonomies.included;
    }

    const finalPrompt = agentConfig?.systemPrompt || systemPromptFromContext;
    const ragTargetChat = agentConfig?.ragCollection || contextCode;
    const { context: ragContext, documentTitles } = await searchRAGDocuments(
      supabase,
      userQuery,
      ragTargetChat,
      matchThreshold,
      matchCount,
      agentConfig?.allowedTags ?? null,
      agentConfig?.forbiddenTags ?? null,
      taxonomyCodes,
      [],
    );

    const fileContext = processFileData(messages);
    const culturalTone = await getCulturalToneRules(supabase, region);

    const systemPrompt = buildSystemPrompt({
      chatType: contextCode,
      customPrompt: finalPrompt,
      ragContext,
      fileContext,
      culturalTone,
      guardrails: getCategoryGuardrails(contextCode),
      scopeTopics,
      isPwaMode: false,
      maieuticPrompt,
      antiprompt,
    });

    // v2.7.0: Usar OpenAI direto para streaming (sem Lovable)
    const apiMessages = messages.map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...apiMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return errorResponse("Rate limit", 429);
      if (response.status === 401) return errorResponse("API key inválida", 401);
      return errorResponse("Erro ao processar", 500);
    }

    await logMaieuticMetrics(
      supabase,
      sessionId || null,
      orchestratedContext?.cognitiveMode || "normal",
      orchestratedContext?.taxonomyCodes || [],
      "",
      contextCode,
    );

    return new Response(response.body, {
      headers: { ...dynamicCorsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    logger.error("Error", { error: error instanceof Error ? error.message : "Unknown" });
    return errorResponse(error instanceof Error ? error.message : "Erro", 500);
  }
});
