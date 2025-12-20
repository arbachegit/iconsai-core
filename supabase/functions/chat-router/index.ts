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
  messages: Message[];
  chatType?: "health" | "study" | "economia" | "general";
  region?: string;
  agentConfig?: AgentConfig;
  documentId?: string;
  sessionId?: string;
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
}: {
  chatType: string;
  customPrompt?: string;
  ragContext: string;
  fileContext: string;
  culturalTone: string;
  guardrails: string;
  scopeTopics: string[];
}): string {
  const topicsContext = scopeTopics.length > 0 
    ? `\nTópicos do escopo: ${scopeTopics.join(", ")}`
    : "";

  return `Você é um assistente de IA especializado em fornecer informações precisas e relevantes.

${customPrompt ? `## CONFIGURAÇÕES DO AGENTE:\n${customPrompt}\n` : ""}

**Contexto Principal:** ${chatType.toUpperCase()}
${topicsContext}

**Diretrizes de Segurança:**
${guardrails}

${culturalTone}

${getAdaptiveResponseProtocol()}

${ragContext}

${fileContext}

${getSuggestionProtocol()}`;
}

// ===================== MAIN HANDLER =====================
serve(async (req) => {
  const logger = createLogger("chat-router");
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json() as ChatRequest;
    const { messages, chatType = "health", region, agentConfig, documentId, sessionId } = body;

    logger.info("Request received", { 
      chatType, 
      messageCount: messages?.length,
      hasAgentConfig: !!agentConfig,
      hasDocumentId: !!documentId 
    });

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = getSupabaseAdmin();

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
    });

    // Prepare messages for API
    const apiMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Call Lovable AI Gateway
    logger.info("Calling AI Gateway");
    
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
