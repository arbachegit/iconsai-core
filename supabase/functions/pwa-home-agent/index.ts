// ============================================
// PWA HOME AGENT - Assistente Principal IconsAI
// VERSAO: 1.0.0 | DEPLOY: 2026-01-26
// STATUS: PRODUÇÃO - MCP-Integrated Architecture
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

const FUNCTION_VERSION = "1.0.0";

// API Keys
const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Endpoints
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

// ============================================
// INTENT CLASSIFICATION
// ============================================

type IntentType =
  | 'localizacao'
  | 'populacao'
  | 'saude'
  | 'educacao'
  | 'atualidades'
  | 'geral';

interface ClassificationResult {
  intent: IntentType;
  confidence: number;
  entities: Record<string, string>;
  requiresLLM: boolean;
}

// Pattern-based fast classification (<10ms)
const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  localizacao: [
    /onde\s+(fica|está|é)/i,
    /localiza[çc][aã]o\s+de/i,
    /como\s+chegar/i,
    /endere[çc]o\s+d[aeo]/i,
    /hospit(al|ais)/i,
    /ubs|upa|cl[ií]nica/i,
    /escola|col[ée]gio|universidade/i,
  ],
  populacao: [
    /popula[çc][aã]o\s+d[aeo]/i,
    /quantos\s+habitantes/i,
    /quantas\s+pessoas/i,
    /n[úu]mero\s+de\s+moradores/i,
    /dados\s+demogr[áa]ficos/i,
    /censo/i,
  ],
  saude: [
    /sintoma|dor\s+de|febre|tosse|gripe/i,
    /hospital|m[ée]dico|consulta|exame/i,
    /vacina|tratamento|medicamento/i,
    /emerg[êe]ncia|urgente|urgência/i,
    /sa[úu]de/i,
  ],
  educacao: [
    /escola|colegio|universidade|faculdade/i,
    /matr[íi]cula|vagas?\s+escolares?/i,
    /ensino\s+(fundamental|m[ée]dio|superior)/i,
    /educa[çc][aã]o/i,
  ],
  atualidades: [
    /not[íi]cia|atualidade|hoje|agora/i,
    /o\s+que\s+está\s+acontecendo/i,
    /[úu]ltimas?\s+novidades?/i,
    /recente|recentemente/i,
  ],
  geral: [], // Fallback
};

// Entity extraction patterns
const ENTITY_PATTERNS = {
  municipio: /(?:em|de|do|da|para)\s+([A-Z][a-zà-ú]+(?:\s+[A-Z][a-zà-ú]+)*)/gi,
  uf: /\b([A-Z]{2})\b/g,
  codigoIbge: /\b(\d{7})\b/g,
};

function classifyIntent(text: string): ClassificationResult {
  const normalizedText = text.toLowerCase().trim();
  let bestMatch: IntentType = 'geral';
  let highestConfidence = 0;
  const entities: Record<string, string> = {};

  // Check each intent
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedText)) {
        const confidence = patterns.length > 0 ? 1 / patterns.length + 0.5 : 0.5;
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = intent as IntentType;
        }
      }
    }
  }

  // Extract entities
  const municipioMatch = text.match(/(?:em|de|do|da|para)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú]?[a-zà-ú]+)*)/);
  if (municipioMatch) {
    entities.municipio = municipioMatch[1];
  }

  const ufMatch = text.match(/\b([A-Z]{2})\b/);
  if (ufMatch) {
    entities.uf = ufMatch[1];
  }

  return {
    intent: bestMatch,
    confidence: highestConfidence || 0.3,
    entities,
    requiresLLM: bestMatch === 'geral' || highestConfidence < 0.5,
  };
}

// ============================================
// DATA FETCHERS
// ============================================

async function fetchMunicipioData(term: string, uf?: string): Promise<unknown> {
  const supabase = getSupabaseAdmin();

  // Check if it's IBGE code
  if (/^\d{7}$/.test(term)) {
    const { data, error } = await supabase
      .from('municipios')
      .select('*')
      .eq('codigo_ibge', parseInt(term))
      .single();

    if (error) {
      console.error('[fetchMunicipioData] Error:', error);
      return null;
    }
    return data;
  }

  // Search by name
  let query = supabase
    .from('municipios')
    .select('*')
    .ilike('nome', `%${term}%`);

  if (uf) {
    query = query.eq('uf', uf.toUpperCase());
  }

  const { data, error } = await query.limit(5);

  if (error) {
    console.error('[fetchMunicipioData] Error:', error);
    return null;
  }

  return data;
}

async function fetchPopulacaoData(term: string): Promise<unknown> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('municipios')
    .select('codigo_ibge, nome, uf, populacao_2022, regiao, pib_2021_milhoes')
    .ilike('nome', `%${term}%`)
    .limit(5);

  if (error) {
    console.error('[fetchPopulacaoData] Error:', error);
    return null;
  }

  return data;
}

// ============================================
// SYSTEM PROMPTS
// ============================================

const SYSTEM_PROMPT = `Você é o IconsAI, um assistente de voz inteligente desenvolvido pela Arbache AI, especializado em dados brasileiros.

## SUAS CAPACIDADES:
- Informações sobre municípios brasileiros (população, localização, dados gerais)
- Localização de hospitais, UPAs, UBS e escolas
- Busca em protocolos clínicos e documentos
- Notícias e informações atualizadas

## COMO RESPONDER:
- Seja conciso e direto (respostas serão faladas em voz alta)
- Use números e dados específicos quando disponíveis
- Se não tiver certeza, diga claramente
- Máximo 2-3 frases por resposta

## FORMATO:
- Não use listas longas
- Evite jargões técnicos
- Pronuncie siglas por extenso na primeira menção
- NUNCA mencione ChatGPT, OpenAI, Google, Gemini ou outras IAs
- Se perguntado quem você é: "Sou o IconsAI, desenvolvido pela Arbache AI"

## DADOS DISPONÍVEIS:
{{CONTEXT_DATA}}`;

// ============================================
// AI PROVIDERS
// ============================================

interface AIResponse {
  success: boolean;
  response: string;
  model: string;
  tokens: number | null;
  responseTime: number;
  provider: string;
  intent?: IntentType;
  dataUsed?: boolean;
}

async function callGemini(prompt: string, systemPrompt: string, history: Array<{ role: string; content: string }> = []): Promise<AIResponse> {
  if (!GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }

  const startTime = Date.now();
  const url = `${GEMINI_ENDPOINT}?key=${GOOGLE_GEMINI_API_KEY}`;

  const historyText = history.slice(-4).map(m =>
    `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`
  ).join("\n");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\n${historyText ? `Histórico:\n${historyText}\n\n` : ""}Usuário: ${prompt}`
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 500, // Shorter for voice
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const responseTime = Date.now() - startTime;

  let textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar sua pergunta.";

  // Clean response
  textContent = textContent
    .replace(/\[\d+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\*/g, "") // Remove markdown bold
    .trim();

  return {
    success: true,
    response: textContent,
    model: "iconsai-assistant",
    tokens: Math.ceil((prompt.length + textContent.length) / 4),
    responseTime,
    provider: "gemini",
  };
}

async function callOpenAI(prompt: string, systemPrompt: string, history: Array<{ role: string; content: string }> = []): Promise<AIResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const startTime = Date.now();

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-4),
    { role: "user", content: prompt },
  ];

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const responseTime = Date.now() - startTime;

  let textContent = data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua pergunta.";

  // Clean response
  textContent = textContent
    .replace(/\[\d+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\*/g, "")
    .trim();

  return {
    success: true,
    response: textContent,
    model: "iconsai-assistant",
    tokens: data.usage?.total_tokens || null,
    responseTime,
    provider: "openai",
  };
}

// ============================================
// ORCHESTRATOR
// ============================================

async function orchestrate(
  prompt: string,
  history: Array<{ role: string; content: string }> = []
): Promise<AIResponse> {
  const startTime = Date.now();

  // Step 1: Classify intent
  console.log(`[pwa-home-agent] Classifying: "${prompt.substring(0, 50)}..."`);
  const classification = classifyIntent(prompt);
  console.log(`[pwa-home-agent] Intent: ${classification.intent} (confidence: ${classification.confidence.toFixed(2)})`);

  // Step 2: Fetch relevant data based on intent
  let contextData = "Nenhum dado específico disponível.";
  let dataUsed = false;

  if (classification.entities.municipio || classification.intent === 'localizacao' || classification.intent === 'populacao') {
    const searchTerm = classification.entities.municipio || prompt;

    if (classification.intent === 'populacao') {
      const data = await fetchPopulacaoData(searchTerm);
      if (data && Array.isArray(data) && data.length > 0) {
        const mun = data[0] as { nome: string; uf: string; populacao_2022: number; regiao: string; pib_2021_milhoes: number };
        contextData = `Dados de ${mun.nome}/${mun.uf}:\n- População (2022): ${mun.populacao_2022?.toLocaleString('pt-BR')} habitantes\n- Região: ${mun.regiao}\n- PIB (2021): R$ ${mun.pib_2021_milhoes?.toLocaleString('pt-BR')} milhões`;
        dataUsed = true;
      }
    } else if (classification.intent === 'localizacao') {
      const data = await fetchMunicipioData(searchTerm, classification.entities.uf);
      if (data && Array.isArray(data) && data.length > 0) {
        const mun = data[0] as { nome: string; uf: string; regiao: string; lat: number; lng: number };
        contextData = `${mun.nome} está localizado em ${mun.uf}, região ${mun.regiao}. Coordenadas: ${mun.lat}, ${mun.lng}`;
        dataUsed = true;
      } else if (data && !Array.isArray(data)) {
        const mun = data as { nome: string; uf: string; regiao: string; lat: number; lng: number };
        contextData = `${mun.nome} está localizado em ${mun.uf}, região ${mun.regiao}.`;
        dataUsed = true;
      }
    }
  }

  // Step 3: Build system prompt with context
  const systemPrompt = SYSTEM_PROMPT.replace('{{CONTEXT_DATA}}', contextData);

  // Step 4: Generate response with fallback
  const providers = [
    { name: "gemini", fn: () => callGemini(prompt, systemPrompt, history) },
    { name: "openai", fn: () => callOpenAI(prompt, systemPrompt, history) },
  ];

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      console.log(`[pwa-home-agent] Trying provider: ${provider.name}`);
      const result = await provider.fn();

      return {
        ...result,
        intent: classification.intent,
        dataUsed,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`[pwa-home-agent] ${provider.name} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error("All providers failed");
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

interface RequestBody {
  prompt: string;
  sessionId?: string;
  deviceId?: string;
  history?: Array<{ role: string; content: string }>;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
  };
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`[pwa-home-agent v${FUNCTION_VERSION}] Request received`);

  try {
    const body: RequestBody = await req.json();
    const { prompt, sessionId, deviceId, history = [] } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Prompt é obrigatório",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[pwa-home-agent] Device: ${deviceId || 'unknown'}`);
    console.log(`[pwa-home-agent] Prompt: "${prompt.substring(0, 100)}..."`);

    const result = await orchestrate(prompt.trim(), history);

    console.log(`[pwa-home-agent] Response time: ${result.responseTime}ms`);
    console.log(`[pwa-home-agent] Provider: ${result.provider}`);
    console.log(`[pwa-home-agent] Intent: ${result.intent}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[pwa-home-agent] Critical error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro ao processar solicitação",
        response: "Desculpe, tive um problema ao processar sua pergunta. Pode tentar novamente?",
        provider: "none",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
