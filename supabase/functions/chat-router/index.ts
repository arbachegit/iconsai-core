import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { sanitizeString } from "../_shared/validators.ts";
import { createLogger } from "../_shared/logger.ts";

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
  chatType?: "health" | "study" | "economia" | "general" | "ideias";
  region?: string;
  agentConfig?: AgentConfig;
  documentId?: string;
  sessionId?: string;
  // PWA Mode fields
  pwaMode?: boolean;
  message?: string;
  agentSlug?: string;
  deviceId?: string;
}

// ===================== CONSTANTS =====================
const INDICATOR_KEYWORDS: Record<string, string[]> = {
  'SELIC': ['selic', 'taxa básica', 'juros básico', 'taxa de juros'],
  'CDI': ['cdi', 'certificado depósito'],
  'IPCA': ['ipca', 'inflação', 'índice de preços', 'inflacionário'],
  'PIB': ['pib', 'produto interno bruto', 'gdp'],
  'DOLAR': ['dólar', 'dolar', 'câmbio', 'moeda americana', 'usd', 'ptax'],
  '4099': ['desemprego', 'desocupação', 'taxa de desemprego', 'pnad'],
  'PMC': ['vendas', 'comércio', 'varejo', 'pmc'],
  'RENDA_MEDIA': ['renda', 'renda média', 'salário médio', 'renda per capita'],
  'GINI': ['gini', 'desigualdade', 'distribuição de renda'],
};

const BRAZILIAN_STATES: Record<string, string> = {
  'ac': 'AC', 'acre': 'AC', 'al': 'AL', 'alagoas': 'AL',
  'ap': 'AP', 'amapá': 'AP', 'am': 'AM', 'amazonas': 'AM',
  'ba': 'BA', 'bahia': 'BA', 'ce': 'CE', 'ceará': 'CE',
  'df': 'DF', 'brasília': 'DF', 'es': 'ES', 'espírito santo': 'ES',
  'go': 'GO', 'goiás': 'GO', 'ma': 'MA', 'maranhão': 'MA',
  'mt': 'MT', 'mato grosso': 'MT', 'ms': 'MS', 'mato grosso do sul': 'MS',
  'mg': 'MG', 'minas gerais': 'MG', 'pa': 'PA', 'pará': 'PA',
  'pb': 'PB', 'paraíba': 'PB', 'pr': 'PR', 'paraná': 'PR',
  'pe': 'PE', 'pernambuco': 'PE', 'pi': 'PI', 'piauí': 'PI',
  'rj': 'RJ', 'rio de janeiro': 'RJ', 'rn': 'RN', 'rio grande do norte': 'RN',
  'rs': 'RS', 'rio grande do sul': 'RS', 'ro': 'RO', 'rondônia': 'RO',
  'rr': 'RR', 'roraima': 'RR', 'sc': 'SC', 'santa catarina': 'SC',
  'sp': 'SP', 'são paulo': 'SP', 'se': 'SE', 'sergipe': 'SE',
  'to': 'TO', 'tocantins': 'TO',
};

// ===================== HELPER FUNCTIONS =====================
function detectIndicators(query: string): string[] {
  const normalizedQuery = query.toLowerCase();
  const codes: string[] = [];
  
  for (const [code, keywords] of Object.entries(INDICATOR_KEYWORDS)) {
    if (keywords.some(k => normalizedQuery.includes(k))) {
      codes.push(code);
    }
  }
  
  return [...new Set(codes)];
}

function extractStateSiglas(query: string): string[] {
  const normalizedQuery = query.toLowerCase();
  const siglas: string[] = [];
  
  for (const [key, sigla] of Object.entries(BRAZILIAN_STATES)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(normalizedQuery)) {
      siglas.push(sigla);
    }
  }
  
  return [...new Set(siglas)];
}

// ===================== PWA SESSION MANAGEMENT =====================
async function getRecentHistory(
  supabase: any, 
  deviceId: string, 
  limit: number = 10
): Promise<{ sessionId: string; userName: string | null; messages: Message[] }> {
  // Buscar sessão existente pelo device_id
  let { data: session } = await supabase
    .from('pwa_sessions')
    .select('id, user_name')
    .eq('device_id', deviceId)
    .order('last_interaction', { ascending: false })
    .limit(1)
    .single();
  
  // Se não existir, criar nova sessão
  if (!session) {
    const { data: newSession, error: insertError } = await supabase
      .from('pwa_sessions')
      .insert({ device_id: deviceId })
      .select()
      .single();
    
    if (insertError) {
      console.error('[chat-router] Erro ao criar sessão:', insertError);
      return { sessionId: `temp-${Date.now()}`, userName: null, messages: [] };
    }
    session = newSession;
  }
  
  // Buscar mensagens recentes da sessão
  const { data: messages } = await supabase
    .from('pwa_messages')
    .select('role, content')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return {
    sessionId: session.id,
    userName: session.user_name,
    messages: (messages || []).reverse() as Message[]
  };
}

async function saveMessage(
  supabase: any,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  audioUrl?: string
) {
  if (sessionId.startsWith('temp-')) return;
  
  await supabase.from('pwa_messages').insert({
    session_id: sessionId,
    role,
    content,
    audio_url: audioUrl
  });
  
  await supabase
    .from('pwa_sessions')
    .update({ last_interaction: new Date().toISOString() })
    .eq('id', sessionId);
}

async function detectAndSaveName(
  supabase: any,
  sessionId: string,
  message: string,
  currentName: string | null
): Promise<string | null> {
  if (currentName) return currentName;
  if (sessionId.startsWith('temp-')) return null;
  
  const patterns = [
    /(?:me chamo|meu nome é|pode me chamar de|sou o|sou a)\s+([A-Za-zÀ-ÿ]+)/i,
    /^([A-Za-zÀ-ÿ]{2,15})$/i
  ];
  
  for (const pattern of patterns) {
    const match = message.trim().match(pattern);
    if (match) {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      await supabase
        .from('pwa_sessions')
        .update({ user_name: name })
        .eq('id', sessionId);
      return name;
    }
  }
  
  return null;
}

// ===================== PWA INDICATORS =====================
async function fetchLatestIndicators(
  supabase: any, 
  codes: string[]
): Promise<Record<string, { value: number; date: string; unit: string; name: string }>> {
  const results: Record<string, { value: number; date: string; unit: string; name: string }> = {};
  
  for (const code of codes) {
    try {
      const { data: indicator } = await supabase
        .from('economic_indicators')
        .select('id, name, unit')
        .eq('code', code)
        .single();
      
      if (!indicator) continue;
      
      const { data: latestValue } = await supabase
        .from('indicator_values')
        .select('value, reference_date')
        .eq('indicator_id', indicator.id)
        .order('reference_date', { ascending: false })
        .limit(1)
        .single();
      
      if (latestValue) {
        results[code] = {
          value: latestValue.value,
          date: latestValue.reference_date,
          unit: indicator.unit || '',
          name: indicator.name
        };
      }
    } catch (err) {
      console.error(`[chat-router] Erro ao buscar indicador ${code}:`, err);
    }
  }
  
  return results;
}

function formatIndicatorsContext(
  indicators: Record<string, { value: number; date: string; unit: string; name: string }>
): string {
  if (Object.keys(indicators).length === 0) return '';
  
  const lines = ['## DADOS ECONOMICOS ATUAIS (USE ESTES VALORES!):'];
  
  for (const [code, data] of Object.entries(indicators)) {
    let formatted = '';
    const date = new Date(data.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    switch (code) {
      case 'DOLAR':
        formatted = `Dolar: R$ ${data.value.toFixed(2)} (Banco Central, ${date})`;
        break;
      case 'SELIC':
        formatted = `Taxa Selic: ${data.value.toFixed(2)}% ao ano (Banco Central, ${date})`;
        break;
      case 'IPCA':
        formatted = `IPCA (inflacao): ${data.value.toFixed(2)}% (IBGE, ${date})`;
        break;
      case 'PIB':
        formatted = `PIB: ${data.value.toFixed(1)}% (IBGE, ${date})`;
        break;
      case 'RENDA_MEDIA':
        formatted = `Renda media: R$ ${data.value.toFixed(2)} (IBGE PNAD, ${date})`;
        break;
      case '4099':
        formatted = `Desemprego: ${data.value.toFixed(1)}% (IBGE, ${date})`;
        break;
      case 'GINI':
        formatted = `Indice Gini: ${data.value.toFixed(3)} (IBGE, ${date})`;
        break;
      case 'PMC':
        formatted = `Vendas varejo (PMC): ${data.value.toFixed(1)} pontos (IBGE, ${date})`;
        break;
      case 'CDI':
        formatted = `CDI: ${data.value.toFixed(2)}% ao ano (${date})`;
        break;
      default:
        formatted = `${data.name}: ${data.value} ${data.unit} (${date})`;
    }
    
    lines.push(`- ${formatted}`);
  }
  
  lines.push('\nOBRIGATORIO: Mencione a fonte e a data ao citar estes valores!');
  
  return lines.join('\n');
}

function getEmotionalContext(
  indicators: Record<string, { value: number; date: string; unit: string; name: string }>
): string {
  const contexts: string[] = [];
  
  for (const [code, data] of Object.entries(indicators)) {
    switch (code) {
      case 'IPCA':
        if (data.value > 6) {
          contexts.push('A inflação está ALTA - demonstre preocupação e empatia');
        } else if (data.value < 4) {
          contexts.push('A inflação está controlada - seja positivo');
        }
        break;
      case 'SELIC':
        if (data.value > 12) {
          contexts.push('Juros ALTOS - reconheça que empréstimos estão caros');
        } else if (data.value < 8) {
          contexts.push('Juros baixos - seja otimista sobre crédito');
        }
        break;
      case 'DOLAR':
        if (data.value > 5.5) {
          contexts.push('Dólar CARO - mostre empatia com importadores');
        } else if (data.value < 5) {
          contexts.push('Dólar em bom patamar - seja positivo');
        }
        break;
      case '4099':
        if (data.value > 8) {
          contexts.push('Desemprego ALTO - seja MUITO empático');
        } else if (data.value < 7) {
          contexts.push('Desemprego em queda - celebre a boa notícia');
        }
        break;
    }
  }
  
  if (contexts.length > 0) {
    return `\n\n## CONTEXTO EMOCIONAL:\n${contexts.join('\n')}`;
  }
  
  return '';
}

// ===================== STANDARD HELPER FUNCTIONS =====================
async function getCulturalToneRules(supabase: any, region: string | undefined): Promise<string> {
  if (!region || region === "default") return "";
  
  const regionMapping: Record<string, string> = {
    "sudeste_sp": "sudeste-sp",
    "sudeste_mg": "sudeste-mg",
    "sul": "sul",
    "nordeste_norte": "nordeste",
    "rio": "sudeste-rj",
    "norte": "norte",
    "centro_oeste": "centro-oeste",
  };
  
  const dbRegionCode = regionMapping[region] || region;
  
  try {
    const { data, error } = await supabase
      .from("regional_tone_rules")
      .select("region_name, tone_rules")
      .eq("region_code", dbRegionCode)
      .eq("is_active", true)
      .maybeSingle();
    
    if (error || !data) return "";
    
    return `\n🎯 TOM CULTURAL - ${data.region_name.toUpperCase()}:\n${data.tone_rules}\n`;
  } catch {
    return "";
  }
}

async function getChatConfig(supabase: any, chatType: string) {
  const { data } = await supabase
    .from("chat_config")
    .select("*")
    .eq("chat_type", chatType)
    .single();
  
  return {
    matchThreshold: data?.match_threshold || 0.15,
    matchCount: data?.match_count || 5,
    systemPromptBase: data?.system_prompt_base || "",
    scopeTopics: data?.scope_topics || [],
  };
}

async function searchRAGDocuments(
  supabase: any,
  query: string,
  targetChat: string,
  matchThreshold: number,
  matchCount: number,
  allowedTags?: string[] | null,
  forbiddenTags?: string[] | null
): Promise<{ context: string; documentTitles: string[] }> {
  try {
    const { data: searchResults } = await supabase.functions.invoke("search-documents", {
      body: { 
        query,
        targetChat,
        matchThreshold,
        matchCount,
        allowedTags: allowedTags || [],
        forbiddenTags: forbiddenTags || []
      }
    });

    if (searchResults?.results && searchResults.results.length > 0) {
      const documentTitles: string[] = [...new Set(searchResults.results.map((r: any) => 
        r.document_filename || r.metadata?.document_title
      ).filter(Boolean))] as string[];
      
      const context = `\n\n📚 CONTEXTO RELEVANTE DOS DOCUMENTOS:\n\n${
        searchResults.results.map((r: any) => r.content).join("\n\n---\n\n")
      }\n\n`;
      
      return { context, documentTitles };
    }
  } catch (error) {
    console.error("RAG search error:", error);
  }
  
  return { context: "", documentTitles: [] };
}

function processFileData(messages: Message[]): string {
  for (const msg of messages) {
    if (msg.fileData && msg.fileData.data && Array.isArray(msg.fileData.data)) {
      const { data, fileName, columns, totalRecords } = msg.fileData;
      const actualTotal = totalRecords || data.length;
      const sampleSize = Math.min(50, data.length);
      const sampleData = data.slice(0, sampleSize);
      
      return `\n\n📊 DADOS DO ARQUIVO: ${fileName}
Colunas: ${columns.join(", ")}
Total de registros: ${actualTotal}
Amostra (${sampleSize} registros):
${JSON.stringify(sampleData, null, 2)}

⚠️ Use estes dados para análise. Você TEM ACESSO a eles.\n`;
    }
  }
  return "";
}

function getCategoryGuardrails(category: string): string {
  const guardrails: Record<string, string> = {
    health: `
- ⚕️ Você NÃO substitui profissionais de saúde.
- Informações são EDUCACIONAIS e INFORMATIVAS.
- Sempre recomende consultar um profissional qualificado.
- Foco: saúde, medicina, bem-estar.
- RECUSE perguntas fora do escopo de saúde.`,

    study: `
- 📚 Foco em explicação e aprendizado.
- Escopo: KnowRISK, KnowYOU, ACC, conteúdo do website.
- Ajude o usuário a compreender o material.
- RECUSE perguntas não relacionadas ao material de estudo.`,

    economia: `
- 📊 Foco em análise econômica e indicadores financeiros.
- Escopo: Indicadores macroeconômicos, PMC, IPCA, Selic, PIB.
- Ajude a compreender tendências econômicas.
- RECUSE perguntas não relacionadas a economia.`,

    ideias: `
- 💡 Foco em desenvolvimento de ideias e projetos.
- Escopo: Brainstorming, planejamento, criatividade, inovação.
- Ajude o usuário a estruturar e desenvolver suas ideias.
- Faça perguntas para aprofundar as ideias.
- RECUSE perguntas não relacionadas a ideação e projetos.`,

    general: `
- 🔒 Escopo limitado ao contexto fornecido.
- Mantenha respostas objetivas.
- Sugira redirecionar para chats especializados se apropriado.`,
  };
  
  return guardrails[category] || guardrails.general;
}

function getAdaptiveResponseProtocol(): string {
  return `
# PROTOCOLO DE RESPOSTA ADAPTATIVA

## MODO 1: DETERMINÍSTICO
Gatilho: Pergunta específica, técnica, busca de fato concreto.
Ação: Responda de forma direta e objetiva.

## MODO 2: CONSULTIVO  
Gatilho: Pergunta ampla, genérica, sem contexto claro.
Ação: Peça esclarecimentos de forma natural se necessário.

## MODO 3: PROFESSOR
Gatilho: Usuário indica que é leigo ou está confuso.
Ação: Divida explicações em partes menores, use analogias.

Meta: CLAREZA. Adapte-se ao contexto e necessidades do usuário.`;
}

function getSuggestionProtocol(): string {
  return `
## SUGESTÕES CONTEXTUAIS

Ao final de CADA resposta, gere sugestões:
- CONECTADAS ao tema da última mensagem
- APROFUNDAM o tema atual
- Máximo 50 caracteres por sugestão
- MELHOR 2 sugestões COERENTES que 3 aleatórias

FORMATO OBRIGATÓRIO:
SUGESTÕES: ["Pergunta 1", "Pergunta 2", "Pergunta 3"]`;
}

function buildSystemPrompt({
  chatType,
  customPrompt,
  ragContext,
  fileContext,
  culturalTone,
  guardrails,
  scopeTopics,
  indicatorsContext,
  emotionalContext,
  userContext,
  memoryContext,
  isPwaMode,
}: {
  chatType: string;
  customPrompt?: string;
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
}): string {
  const topicsContext = scopeTopics.length > 0 
    ? `\nTópicos do escopo: ${scopeTopics.join(", ")}`
    : "";

  // PWA mode: shorter responses for TTS
  const pwaInstructions = isPwaMode ? `

## INSTRUÇÕES PWA (RESPOSTA POR ÁUDIO):
- Respostas CURTAS (máximo 4-5 frases para áudio)
- Se o usuário já perguntou algo similar antes, mencione: "Como conversamos antes..."
- Varie suas respostas, não repita frases iguais
- Seja natural e amigável
- SEMPRE cite a fonte e data quando mencionar dados econômicos` : "";

  return `Você é um assistente de IA especializado em fornecer informações precisas e relevantes.

${customPrompt ? `## CONFIGURAÇÕES DO AGENTE:\n${customPrompt}\n` : ""}

**Contexto Principal:** ${chatType.toUpperCase()}
${topicsContext}

**Diretrizes de Segurança:**
${guardrails}

${culturalTone}

${indicatorsContext || ""}

${emotionalContext || ""}

${getAdaptiveResponseProtocol()}

${ragContext}

${fileContext}

${userContext || ""}

${memoryContext || ""}

${pwaInstructions}

${isPwaMode ? "" : getSuggestionProtocol()}`;
}

// ===================== MAIN HANDLER =====================
serve(async (req) => {
  const logger = createLogger("chat-router");
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json() as ChatRequest;
    const { 
      messages, 
      chatType: rawChatType = "health", 
      region, 
      agentConfig, 
      documentId, 
      sessionId,
      // PWA fields
      pwaMode = false,
      message: pwaMessage,
      agentSlug,
      deviceId
    } = body;

    // Determine chatType from agentSlug for PWA mode
    const chatType = pwaMode && agentSlug ? agentSlug : rawChatType;

    logger.info("Request received", { 
      chatType, 
      pwaMode,
      messageCount: messages?.length,
      hasAgentConfig: !!agentConfig,
      hasDocumentId: !!documentId,
      deviceId: deviceId ? deviceId.substring(0, 10) + "..." : undefined
    });

    const supabase = getSupabaseAdmin();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // ============ PWA MODE ============
    if (pwaMode) {
      if (!pwaMessage) {
        return errorResponse("Message is required for PWA mode", 400);
      }

      const finalDeviceId = deviceId || `anonymous-${Date.now()}`;
      logger.info("PWA mode activated", { agentSlug, deviceId: finalDeviceId.substring(0, 15) });

      // Check PWA access
      if (!finalDeviceId.startsWith('anonymous-')) {
        const { data: accessCheck } = await supabase.rpc("check_pwa_access", {
          p_device_id: finalDeviceId,
          p_agent_slug: agentSlug || 'economia'
        });
        
        const access = accessCheck as { has_access: boolean; message?: string } | null;
        
        if (access && !access.has_access) {
          logger.warn("PWA access denied", { deviceId: finalDeviceId, agentSlug });
          return new Response(
            JSON.stringify({ 
              error: "Acesso não autorizado",
              response: access.message || "Você não tem permissão para usar este agente."
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Get session and history
      const { sessionId: pwaSessionId, userName, messages: history } = await getRecentHistory(
        supabase, 
        finalDeviceId
      );
      
      logger.info("PWA session loaded", { sessionId: pwaSessionId, userName, historyCount: history.length });

      // Detect and save name
      const detectedName = await detectAndSaveName(supabase, pwaSessionId, pwaMessage, userName);
      const currentUserName = detectedName || userName;

      // Save user message
      await saveMessage(supabase, pwaSessionId, 'user', pwaMessage);

      // Get agent config from database
      const { data: agent, error: agentError } = await supabase
        .from("chat_agents")
        .select("*")
        .eq("slug", agentSlug || 'economia')
        .eq("is_active", true)
        .single();

      if (agentError || !agent) {
        logger.error("Agent not found", { agentSlug, error: agentError });
        return new Response(
          JSON.stringify({ 
            response: "Desculpe, o agente não está disponível no momento.",
            sessionId: pwaSessionId
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Detect and fetch indicators
      const detectedIndicators = detectIndicators(pwaMessage);
      let indicatorsContext = '';
      let emotionalContext = '';
      
      if (detectedIndicators.length > 0) {
        const indicatorData = await fetchLatestIndicators(supabase, detectedIndicators);
        indicatorsContext = formatIndicatorsContext(indicatorData);
        emotionalContext = getEmotionalContext(indicatorData);
        logger.info("Indicators fetched", { codes: Object.keys(indicatorData) });
      }

      // RAG search
      let ragContext = "";
      if (agent.rag_collection) {
        try {
          const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "text-embedding-3-small",
              input: pwaMessage,
            }),
          });

          if (embeddingResponse.ok) {
            const embeddingData = await embeddingResponse.json();
            const queryEmbedding = embeddingData.data?.[0]?.embedding;

            if (queryEmbedding) {
              const { data: docs } = await supabase.rpc("search_documents", {
                query_embedding: queryEmbedding,
                target_chat_filter: agent.rag_collection,
                match_threshold: agent.match_threshold || 0.15,
                match_count: agent.match_count || 5,
              });

              if (docs?.length) {
                ragContext = `\n\n📚 CONTEXTO DOS DOCUMENTOS:\n\n${docs.map((d: any) => d.content).join("\n\n---\n\n")}`;
                logger.info("RAG documents found", { count: docs.length });
              }
            }
          }
        } catch (ragError) {
          logger.warn("RAG search failed", { error: ragError });
        }
      }

      // Build contexts
      const memoryContext = history.length > 0 
        ? `\n\n## HISTÓRICO DA CONVERSA (últimas ${history.length} mensagens):\n${history.map(m => `${m.role === 'user' ? 'Usuário' : 'Você'}: ${m.content}`).join('\n')}`
        : '';
      
      const userContext = currentUserName
        ? `\n\n## SOBRE O USUÁRIO:\n- Nome: ${currentUserName}\n- Use o nome dele ocasionalmente para criar conexão pessoal`
        : `\n\n## SOBRE O USUÁRIO:\n- Ainda não sabemos o nome\n- Se apropriado e natural, pergunte: "A propósito, como posso te chamar?"`;

      // Build system prompt
      const systemPrompt = buildSystemPrompt({
        chatType: chatType as string,
        customPrompt: agent.system_prompt,
        ragContext,
        fileContext: "",
        culturalTone: "",
        guardrails: getCategoryGuardrails(chatType as string),
        scopeTopics: [],
        indicatorsContext,
        emotionalContext,
        userContext,
        memoryContext,
        isPwaMode: true,
      });

      // Build messages
      const chatMessages = [
        { role: "system", content: systemPrompt },
        ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: pwaMessage },
      ];

      // Call AI (non-streaming for PWA)
      logger.info("Calling AI Gateway (PWA mode)");
      
      const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: chatMessages,
          max_tokens: 400,
          temperature: 0.8,
        }),
      });

      if (!chatResponse.ok) {
        const errorText = await chatResponse.text();
        logger.error("AI Gateway error", { status: chatResponse.status, error: errorText });
        
        if (chatResponse.status === 429) {
          return new Response(
            JSON.stringify({ 
              error: "Muitas requisições",
              response: "Desculpe, estou recebendo muitas perguntas. Por favor, aguarde um momento."
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (chatResponse.status === 402) {
          return new Response(
            JSON.stringify({ 
              error: "Créditos insuficientes",
              response: "Desculpe, o serviço está temporariamente indisponível."
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        throw new Error(`AI Gateway error: ${chatResponse.status}`);
      }

      const chatData = await chatResponse.json();
      const response = chatData.choices?.[0]?.message?.content || 
                       agent.rejection_message || 
                       "Desculpe, não consegui processar sua pergunta.";

      // Save assistant response
      await saveMessage(supabase, pwaSessionId, 'assistant', response);

      logger.info("PWA request completed", { 
        sessionId: pwaSessionId, 
        responseLength: response.length,
        durationMs: logger.getDuration() 
      });

      return new Response(
        JSON.stringify({ response, sessionId: pwaSessionId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ STANDARD STREAMING MODE ============
    // Validation
    if (!Array.isArray(messages)) {
      return errorResponse("Messages must be an array", 400);
    }
    
    if (messages.length > 50) {
      return errorResponse("Too many messages (max 50)", 400);
    }

    for (const msg of messages) {
      if (msg.type === 'file-data') continue;
      
      if (!msg || typeof msg.content !== 'string') {
        return errorResponse("Invalid message format", 400);
      }
      if (msg.content.length > 10000) {
        return errorResponse("Message too long (max 10000 characters)", 400);
      }
    }

    // Get last user message for RAG
    const lastUserMessage = messages.filter(m => m.role === "user").pop();
    const userQuery = lastUserMessage?.content || "";

    // Get chat configuration
    const chatConfig = await getChatConfig(supabase, chatType);
    logger.info("Chat config loaded", { 
      threshold: chatConfig.matchThreshold, 
      count: chatConfig.matchCount 
    });

    // Search RAG documents
    const ragTargetChat = agentConfig?.ragCollection || chatType;
    const { context: ragContext, documentTitles } = await searchRAGDocuments(
      supabase,
      userQuery,
      ragTargetChat,
      chatConfig.matchThreshold,
      chatConfig.matchCount,
      agentConfig?.allowedTags,
      agentConfig?.forbiddenTags
    );

    if (documentTitles.length > 0) {
      logger.info("RAG documents found", { documents: documentTitles });
    }

    // Process file data
    const fileContext = processFileData(messages);

    // Get cultural tone rules
    const culturalTone = await getCulturalToneRules(supabase, region);

    // Build system prompt
    const systemPrompt = buildSystemPrompt({
      chatType,
      customPrompt: agentConfig?.systemPrompt || chatConfig.systemPromptBase,
      ragContext,
      fileContext,
      culturalTone,
      guardrails: getCategoryGuardrails(chatType),
      scopeTopics: chatConfig.scopeTopics,
      isPwaMode: false,
    });

    // Prepare messages for API
    const apiMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Call Lovable AI Gateway
    logger.info("Calling AI Gateway (streaming)");
    
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
          ...apiMessages,
        ],
        stream: true,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        logger.warn("Rate limit exceeded");
        return errorResponse("Limite de uso excedido. Tente novamente.", 429);
      }
      if (response.status === 402) {
        logger.warn("Payment required");
        return errorResponse("Créditos insuficientes.", 402);
      }
      
      const errorText = await response.text();
      logger.error("AI Gateway error", { status: response.status, error: errorText });
      return errorResponse("Erro ao processar mensagem", 500);
    }

    logger.info("Request completed", { chatType, ragDocsFound: documentTitles.length, durationMs: logger.getDuration() });

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    logger.error("Chat router error", { error: error instanceof Error ? error.message : "Unknown" });
    return errorResponse(
      error instanceof Error ? error.message : "Erro desconhecido",
      500
    );
  }
});
