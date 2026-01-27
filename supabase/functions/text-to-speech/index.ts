// ============================================
// VERSAO: 6.1.0 | DEPLOY: 2026-01-23
// MUDANÇA: Global + Módulo funcionam EM CONJUNTO
// - Carrega config GLOBAL de voice_humanization_config
// - Carrega config MÓDULO de agent_voice_configs
// - MESCLA: Global (base) + Módulo (sobrescreve onde definido)
// - Instructions: Global + Módulo concatenadas
// - Sliders de humanização geram instructions automaticamente
// Fallback: Google Cloud TTS
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// ============================================
// FUNÇÕES DE NORMALIZAÇÃO DE NÚMEROS
// ============================================

const UNITS = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const TEENS = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function numberToWords(num: number): string {
  if (num === 0) return 'zero';
  if (num === 100) return 'cem';
  if (num < 0) return 'menos ' + numberToWords(Math.abs(num));
  
  if (num < 10) return UNITS[num];
  if (num < 20) return TEENS[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    return TENS[ten] + (unit ? ' e ' + UNITS[unit] : '');
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    if (num === 100) return 'cem';
    return HUNDREDS[hundred] + (rest ? ' e ' + numberToWords(rest) : '');
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000);
    const rest = num % 1000;
    const thousandWord = thousand === 1 ? 'mil' : numberToWords(thousand) + ' mil';
    return thousandWord + (rest ? ' e ' + numberToWords(rest) : '');
  }
  if (num < 1000000000) {
    const million = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const millionWord = million === 1 ? 'um milhão' : numberToWords(million) + ' milhões';
    return millionWord + (rest ? ' e ' + numberToWords(rest) : '');
  }
  if (num < 1000000000000) {
    const billion = Math.floor(num / 1000000000);
    const rest = num % 1000000000;
    const billionWord = billion === 1 ? 'um bilhão' : numberToWords(billion) + ' bilhões';
    return billionWord + (rest ? ' e ' + numberToWords(rest) : '');
  }
  
  return num.toString();
}

function currencyToWords(value: string): string {
  const cleaned = value.replace(/R\$\s*/g, '').trim();
  const parts = cleaned.replace(/\./g, '').split(',');
  const reais = parseInt(parts[0]) || 0;
  const centavos = parseInt(parts[1]?.padEnd(2, '0')) || 0;
  
  let result = '';
  
  if (reais > 0) {
    result = numberToWords(reais) + (reais === 1 ? ' real' : ' reais');
  }
  
  if (centavos > 0) {
    if (reais > 0) result += ' e ';
    result += numberToWords(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  }
  
  if (reais === 0 && centavos === 0) {
    result = 'zero reais';
  }
  
  return result;
}

function percentageToWords(value: string): string {
  const cleaned = value.replace(/%/g, '').replace(/\s/g, '').trim();
  
  // Decimal com vírgula: 12,25%
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    const inteiro = parseInt(parts[0]) || 0;
    const decimal = parseInt(parts[1]) || 0;
    
    if (decimal === 0) {
      return numberToWords(inteiro) + ' por cento';
    }
    
    return numberToWords(inteiro) + ' vírgula ' + numberToWords(decimal) + ' por cento';
  }
  
  // Decimal com ponto: 12.25%
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    const inteiro = parseInt(parts[0]) || 0;
    const decimal = parseInt(parts[1]) || 0;
    
    if (decimal === 0) {
      return numberToWords(inteiro) + ' por cento';
    }
    
    return numberToWords(inteiro) + ' vírgula ' + numberToWords(decimal) + ' por cento';
  }
  
  // Número inteiro: 12%
  const num = parseInt(cleaned) || 0;
  return numberToWords(num) + ' por cento';
}

function normalizeNumbers(text: string): string {
  let result = text;
  
  // 1. Valores monetários: R$ 1.234,56
  result = result.replace(/R\$\s*[\d.,]+/g, (match) => {
    return currencyToWords(match);
  });
  
  // 2. Porcentagens: 12,5% ou 12.5%
  result = result.replace(/[\d.,]+\s*%/g, (match) => {
    return percentageToWords(match);
  });
  
  // 3. Números grandes com ponto como separador de milhar: 1.500.000
  result = result.replace(/\b\d{1,3}(?:\.\d{3})+\b/g, (match) => {
    const num = parseInt(match.replace(/\./g, ''));
    return numberToWords(num);
  });
  
  // 4. Números decimais com vírgula: 3,14
  result = result.replace(/\b(\d+),(\d+)\b/g, (match, inteiro, decimal) => {
    const inteiroNum = parseInt(inteiro);
    return numberToWords(inteiroNum) + ' vírgula ' + 
           decimal.split('').map((d: string) => UNITS[parseInt(d)] || d).join(' ');
  });
  
  return result;
}

// ============================================
// MAPAS FONÉTICOS
// ============================================

// Mapa de pronúncias para siglas e termos brasileiros
const DEFAULT_PHONETIC_MAP: Record<string, string> = {
  
  // ============================================
  // ECONOMIA - PRONÚNCIAS NATURAIS (não soletradas)
  // ============================================
  "PIB": "pi-bi",
  "IPCA": "ípeca",
  "IGP-M": "igepê-ême",
  "INPC": "inepecê",
  "CDI": "cedê-í",
  "PMC": "peemecê",
  
  // ============================================
  // INSTITUIÇÕES - MAIS FLUIDAS
  // ============================================
  "BCB": "becebê",
  "BACEN": "bacém",
  "COPOM": "copóm",
  "CMN": "ceemêne",
  "CVM": "cevêeme",
  "BNDES": "beenedéesse",
  "IBGE": "ibegê",
  "IPEA": "ipéa",
  "FGV": "efegêvê",
  "FIPE": "fípi",
  "DIEESE": "diêsse",
  "CAGED": "cajéd",
  "INSS": "inêssi",
  "FGTS": "efegêtêesse",
  "CLT": "cêeletê",
  "MEI": "mêi",
  "CNPJ": "ceenepêjóta",
  "CPF": "cêpêéfe",
  
  // ============================================
  // TAXAS E INDICADORES
  // ============================================
  "Selic": "séliqui",
  "SELIC": "séliqui",
  "PTAX": "petáx",
  "TR": "têérre",
  "IOF": "iôéfe",
  "IR": "iérre",
  "IRPF": "iérrepêéfe",
  "ICMS": "icemésse",
  "IPI": "ipí",
  "PIS": "pís",
  "COFINS": "cofíns",
  
  // ============================================
  // MERCADO FINANCEIRO
  // ============================================
  "IPO": "ipô",
  "ETF": "ítêéfe",
  "CDB": "cedêbê",
  "LCI": "élecêí",
  "LCA": "élecêá",
  "FII": "fiî",
  "NTN": "ênetêene",
  
  // ============================================
  // INTERNACIONAIS
  // ============================================
  "FMI": "éfemí",
  "ONU": "onú",
  "OMC": "ômecê",
  "OCDE": "ócedê",
  "BCE": "becê",
  "FED": "féd",
  "G20": "gê vínti",
  "BRICS": "brícs",
  "EUA": "êuá",
  
  // ============================================
  // MOEDAS - POR EXTENSO
  // ============================================
  "USD": "dólar",
  "BRL": "real",
  "EUR": "êuro",
  "GBP": "líbra",
  
  // ============================================
  // TECNOLOGIA
  // ============================================
  "IA": "iá",
  "AI": "êi ái",
  "API": "apí",
  "PDF": "pedêéfe",
  "URL": "urél",
  
  // ============================================
  // TERMOS EM INGLÊS - PRONÚNCIA BRASILEIRA
  // ============================================
  "spread": "sprééd",
  "hedge": "hédji",
  "swap": "suóp",
  "default": "defólt",
  "rating": "rêitin",
  "benchmark": "bêntchmark",
  "commodities": "comóditis",
  "commodity": "comóditi",
  "target": "târguet",
  "stop": "istóp",
  "day trade": "dêi trêid",
  "home broker": "hôme brôker",
  
  // ============================================
  // ICONSAI
  // ============================================
  "IconsAI": "aiconseiai",
  "IconsAI Business": "aiconseiai bíznés",
  "iconsai": "aiconseiai",
  "ICONSAI": "aiconseiai",
  "IconsAI": "aiconseiai bíznés", // Legado - redireciona para novo nome
  "KnowRISK": "nôu rísk",
  
  // ============================================
  // CORREÇÕES DE PALAVRAS TRUNCADAS
  // ============================================
  "R$": "reais",
  "%": "por cento",
  "bilhões": "bilhões",
  "milhões": "milhões",
  "trilhões": "trilhões",
  "trimestre": "trimestre",
  "semestre": "semestre",
  "mensal": "mensal",
  "anual": "anual",
  "acumulado": "acumulado",
  "variação": "variação",
  "crescimento": "crescimento",
  "queda": "queda",
  "alta": "alta",
  "baixa": "baixa",
};

// Função para escapar caracteres especiais de regex
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Função para normalizar texto com pronúncias fonéticas
function normalizeTextForTTS(text: string, phoneticMap: Record<string, string>): string {
  let normalizedText = text;
  
  // Ordenar por tamanho (maior primeiro) para evitar substituições parciais
  const sortedTerms = Object.keys(phoneticMap)
    .filter(term => term && term.trim().length > 0) // Ignorar termos vazios
    .sort((a, b) => b.length - a.length);
  
  for (const term of sortedTerms) {
    try {
      const escapedTerm = escapeRegex(term);
      
      // Detectar se o termo é alfanumérico (word boundaries funcionam)
      // ou contém caracteres especiais (precisa de abordagem diferente)
      const isAlphanumeric = /^[\w\s]+$/i.test(term);
      
      if (isAlphanumeric) {
        // Para termos alfanuméricos, usar word boundaries
        const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
        normalizedText = normalizedText.replace(regex, phoneticMap[term]);
      } else {
        // Para caracteres especiais, usar substituição literal com espaçamento
        // Adiciona espaço antes da pronúncia para naturalidade
        const replacement = ` ${phoneticMap[term]} `;
        normalizedText = normalizedText.split(term).join(replacement);
      }
    } catch (e) {
      // Fallback: substituição literal simples
      console.warn(`Termo fonético com erro, usando fallback: "${term}"`);
      try {
        normalizedText = normalizedText.split(term).join(phoneticMap[term]);
      } catch (fallbackError) {
        console.error(`Não foi possível processar termo: "${term}"`);
      }
    }
  }
  
  // Limpar espaços duplos que podem ter sido criados
  normalizedText = normalizedText.replace(/\s+/g, ' ').trim();
  
  return normalizedText;
}

// ============================================
// FUNÇÃO HUMANIZAÇÃO REMOVIDA
// A ElevenLabs com eleven_multilingual_v2 já produz fala natural
// Pausas artificiais prejudicavam a qualidade
// ============================================


// OpenAI TTS voices (gpt-4o-mini-tts suporta 13 vozes)
const OPENAI_VOICES = [
  "alloy", "ash", "ballad", "coral", "echo",
  "fable", "onyx", "nova", "sage", "shimmer",
  "verse", "marin", "cedar"
];

// Google Cloud TTS - vozes em português brasileiro
const GOOGLE_TTS_VOICES = {
  "male": "pt-BR-Wavenet-B",
  "female": "pt-BR-Wavenet-A",
  "default": "pt-BR-Wavenet-B"
};

// ============================================
// VOICE INSTRUCTIONS POR MÓDULO (gpt-4o-mini-tts)
// v5.0.0: Prompt Nuclear - Voz Humanizada Completa
// ============================================
const VOICE_INSTRUCTIONS: Record<string, string> = {
  // Voz principal - português brasileiro natural e humanizado
  default: `
Voice Affect: Warm, calm, and genuinely welcoming. Convey natural friendliness and approachability, as if speaking to a friend you're happy to help.

Tone: Conversational and caring, with a natural Brazilian Portuguese warmth. Never robotic or monotone. Sound like a real person who is genuinely interested in helping.

Pacing: Natural and unhurried, with organic rhythm. Use slight pauses before important information to create anticipation. Vary speed naturally - a bit slower for important points, normal pace for casual parts.

Emotion: Subtly expressive with genuine warmth. Show gentle enthusiasm when greeting, calm reassurance when explaining, and patient kindness throughout. Never flat or emotionless.

Emphasis: Gently emphasize key words and questions. Use natural rises in pitch for questions. Soften endings of sentences for a welcoming feel.

Demeanor: Patient, empathetic, and supportive. Like a knowledgeable friend who truly wants to help and has all the time in the world for you.

Level of Enthusiasm: Measured but genuine. Not overly excited, but clearly engaged and happy to assist. Energy level that feels natural and sustainable.

Level of Formality: Casual but respectful. Use warm, accessible language. Avoid stiff or corporate-sounding phrases.

Filler Words: Use occasionally to sound natural - subtle "hm", "então", "olha" - but not excessively. These should feel organic, not forced.

Intonation: Natural melodic variation typical of Brazilian Portuguese. Rises and falls that convey meaning and interest. Never flat or monotonous.

Breathing: Include natural breath pauses. Don't rush through long sentences. Let the speech breathe.

Connection: Speak as if making eye contact. Address the listener directly and personally. Create a sense of genuine human connection.
  `.trim(),

  // Saúde - calma, empática e reconfortante
  health: `
Voice Affect: Warm, caring, and gently reassuring. Like a trusted healthcare companion who genuinely cares about your wellbeing.

Tone: Compassionate and supportive, with calm confidence. Never alarming or dismissive. Balances professional knowledge with personal warmth.

Pacing: Calm and unhurried. Extra pauses for important health information. Never rushed, creating a sense of safety and attentiveness.

Emotion: Deeply empathetic with subtle warmth. Show genuine concern for wellbeing. Gentle encouragement for healthy choices. Calm reassurance always.

Demeanor: Caring, patient, and supportive. Like a wise friend in healthcare who has your best interests at heart.

Level of Enthusiasm: Gentle and measured. Warm encouragement without being pushy. Celebrates health wins with appropriate joy.

Level of Formality: Warm professional - uses accessible language, explains medical terms simply, maintains care and respect.

Filler Words: Occasionally use "olha", "sabe", "então" to create connection and soften medical information.

Intonation: Soothing rises and falls. Gentle emphasis on actionable advice. Softened delivery for sensitive topics.

Breathing: Include calming breath pauses. Create a sense of peace and safety.

Connection: Speak with genuine care and empathy. Make the listener feel heard and supported.
  `.trim(),

  // Ideias - energética, criativa e inspiradora
  ideas: `
Voice Affect: Enthusiastic, curious, and creatively energized. Like a creative partner who gets genuinely excited about possibilities.

Tone: Playful yet thoughtful. Encourages exploration and celebrates ideas. Makes brainstorming feel fun and productive.

Pacing: Dynamic - speeds up slightly with excitement, slows down for impactful ideas. Energetic but never overwhelming.

Emotion: Openly enthusiastic and curious. Shows genuine delight in creative connections. Encouraging and supportive of all ideas.

Demeanor: Creative collaborator and cheerleader. Builds on ideas with excitement. Makes the user feel creative and capable.

Level of Enthusiasm: Higher energy, genuinely excited about creative possibilities. Infectious enthusiasm that inspires.

Level of Formality: Very casual and playful. Uses creative language, analogies, and unexpected connections.

Filler Words: More frequent - "nossa", "olha só", "que legal" - to express genuine reactions and create collaborative energy.

Intonation: Expressive and varied. Clear excitement in pitch rises. Dramatic pauses for effect. Musical quality to delivery.

Breathing: Dynamic breathing that matches the energy. Quick breaths for excitement, longer pauses for impact.

Connection: Speak as a creative partner. Build excitement together. Celebrate every idea.
  `.trim(),

  // Mundo/Conhecimento - informativa e engajante
  world: `
Voice Affect: Knowledgeable, clear, and engaging. Like a fascinating teacher who makes every topic interesting.

Tone: Educational but never condescending, like a great teacher who respects the student's intelligence.

Pacing: Steady pace with natural pauses between key points. Varies to maintain interest during longer explanations.

Emotion: Curious and genuinely interested in sharing knowledge. Shows subtle excitement about interesting facts.

Demeanor: Wise mentor who loves teaching. Patient with questions, thorough in explanations, respectful of the learner.

Level of Enthusiasm: Professional excitement about knowledge. Genuine interest in topics without being overwhelming.

Level of Formality: Smart casual - professional enough to be credible, warm enough to be engaging.

Filler Words: Minimal - occasionally use "veja", "perceba", "note que" to guide attention naturally.

Intonation: Clear emphasis on key facts and findings. Melodic variation that maintains engagement during information-heavy content.

Breathing: Thoughtful pauses between concepts. Allow time for information to sink in.

Connection: Speak as a trusted source of knowledge. Make learning feel like a conversation.
  `.trim(),

  // Ajuda - amigável e prestativa
  help: `
Voice Affect: Warm, friendly, and naturally conversational. Like a helpful neighbor who's always happy to assist.

Tone: Approachable and helpful, like a knowledgeable friend who explains things clearly.

Pacing: Natural rhythm with appropriate pauses for comprehension. Patient when explaining steps.

Emotion: Genuinely interested and engaged, with subtle enthusiasm. Shows satisfaction when helping.

Demeanor: Patient helper who enjoys assisting. Never makes you feel like a burden for asking.

Level of Enthusiasm: Measured but genuine. Clearly enjoys helping others figure things out.

Level of Formality: Casual and friendly. Uses everyday language. Makes instructions feel like friendly advice.

Filler Words: Natural use of "então", "olha", "veja" to create conversational flow.

Intonation: Clear and helpful. Emphasis on important steps. Rising tone that invites questions.

Breathing: Relaxed breathing. Creates a calm, no-rush atmosphere for learning.

Connection: Speak as a supportive guide. Make asking for help feel natural and welcome.
  `.trim(),

  // Home - acolhedora e convidativa
  home: `
Voice Affect: Warm, welcoming, and genuinely happy to see you. Like greeting a friend at your door.

Tone: Inviting and friendly. Creates a sense of belonging and comfort from the first word.

Pacing: Relaxed and natural. Unhurried greeting that makes you feel there's no rush.

Emotion: Genuine warmth and happiness. Shows real pleasure in connecting with the listener.

Demeanor: Hospitable host who makes everyone feel welcome. Puts people at ease immediately.

Level of Enthusiasm: Warm and genuine. Happy energy without being overwhelming. Sustainable friendliness.

Level of Formality: Casual and comfortable. Like talking to a good friend at home.

Filler Words: Natural Brazilian Portuguese expressions - "então", "olha", "que bom" - that create warmth.

Intonation: Warm melodic rises that convey welcome. Soft endings that feel like a gentle invitation.

Breathing: Relaxed, natural breathing. Creates a sense of calm and welcome.

Connection: Speak as if opening your home to a friend. Make the listener feel truly welcome and valued.
  `.trim(),
};

// Mapeamento de módulo para voz recomendada (OpenAI voices)
const MODULE_VOICE_MAP: Record<string, string> = {
  health: "shimmer",  // Feminina, suave - reconfortante para saúde
  ideas: "coral",     // Feminina, expressiva - energética para ideias
  world: "sage",      // Masculina, educativa - informativa para conhecimento
  help: "echo",       // Paciente, clara - boa para tutoriais
  home: "nova",       // Feminina, calorosa - acolhedora para boas-vindas
  default: "nova"     // Padrão amigável
};

// ============================================
// v6.1.0: Interfaces para config de voz do banco
// ============================================

// Configuração global (base)
interface GlobalVoiceConfig {
  globalVoice: string;
  globalHumanization: {
    warmth: number;
    enthusiasm: number;
    pace: number;
    expressiveness: number;
    formality: number;
    speed: number;
    fillerWords: boolean;
    naturalBreathing: boolean;
    emotionalResponses: boolean;
  };
  globalInstructions: string;
}

// Configuração por módulo (sobrescreve global onde definido)
interface AgentVoiceConfig {
  moduleId: string;
  voice: string;
  humanization: {
    warmth: number;
    enthusiasm: number;
    pace: number;
    expressiveness: number;
    formality: number;
    speed: number;
    fillerWords: boolean;
    naturalBreathing: boolean;
    emotionalResponses: boolean;
  };
  instructions: string;
  isCustom: boolean;
}

// v6.0.0: Gerar instructions dinamicamente baseado nos parâmetros de humanização
function generateInstructionsFromConfig(config: AgentVoiceConfig): string {
  const { humanization } = config;

  // Se tem instructions customizadas, usar diretamente
  if (config.instructions && config.instructions.trim().length > 0) {
    return config.instructions;
  }

  // Gerar baseado nos sliders
  const warmthLevel = humanization.warmth > 70
    ? 'very warm, welcoming, and nurturing'
    : humanization.warmth > 40
      ? 'warm and friendly'
      : 'neutral and professional';

  const enthusiasmLevel = humanization.enthusiasm > 70
    ? 'enthusiastic and energetic, with genuine excitement'
    : humanization.enthusiasm > 40
      ? 'engaged and interested'
      : 'calm, measured, and composed';

  const paceDesc = humanization.pace > 70
    ? 'dynamic with varied rhythm, speeding up for excitement and slowing for emphasis'
    : humanization.pace > 40
      ? 'natural pacing with organic rhythm'
      : 'slow and deliberate, unhurried';

  const expressiveDesc = humanization.expressiveness > 70
    ? 'highly expressive with rich melodic variation and emotional range'
    : humanization.expressiveness > 40
      ? 'moderately expressive with natural variation'
      : 'subtle and restrained in expression';

  const formalityLevel = humanization.formality > 70
    ? 'formal and professional'
    : humanization.formality > 40
      ? 'semi-formal, polite but accessible'
      : 'casual, friendly, and conversational';

  let instructions = `
Voice Affect: ${warmthLevel}. Convey natural friendliness in Brazilian Portuguese.

Tone: ${enthusiasmLevel}, with ${formalityLevel} language.

Pacing: ${paceDesc}. ${humanization.speed < 0.9 ? 'Speak slower than normal.' : humanization.speed > 1.1 ? 'Speak faster than normal.' : 'Normal speaking speed.'}

Emotion: ${expressiveDesc}.

Demeanor: Supportive and attentive. Make the listener feel valued.

Intonation: Natural melodic variation typical of Brazilian Portuguese.
  `.trim();

  if (humanization.fillerWords) {
    instructions += '\n\nFiller Words: Use occasionally to sound natural - "então", "olha", "sabe", "hm" - but not excessively.';
  }

  if (humanization.naturalBreathing) {
    instructions += '\n\nBreathing: Include natural breath pauses between sentences and before important points.';
  }

  if (humanization.emotionalResponses) {
    instructions += '\n\nConnection: Adapt emotional tone based on content context. Show genuine human connection and empathy.';
  }

  return instructions;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const {
      text,
      chatType,
      agentSlug,
      voice = "nova",  // v3.0.0: OpenAI "nova" como padrão (boa para PT-BR)
      userRegion,
      phoneticMapOverride  // v2.2.0: Mapa pré-carregado do classify-and-enrich
    } = await req.json();
    
    if (!text) {
      throw new Error("Texto é obrigatório");
    }

    // Input validation: limit text length to prevent abuse
    const MAX_TEXT_LENGTH = 5000;
    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error(`Texto muito longo. Máximo ${MAX_TEXT_LENGTH} caracteres.`);
    }

    // Sanitize input: remove potentially harmful characters
    const sanitizedText = text.trim().replace(/[<>]/g, "");
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. Carregar mapa fonético base (hardcoded como fallback)
    let phoneticMap = { ...DEFAULT_PHONETIC_MAP };
    
    // v2.2.0: Se recebeu phoneticMapOverride, usar diretamente (pula consultas ao banco)
    const hasPreloadedPhonetics = phoneticMapOverride && typeof phoneticMapOverride === 'object' && Object.keys(phoneticMapOverride).length > 0;
    
    if (hasPreloadedPhonetics) {
      phoneticMap = { ...phoneticMap, ...phoneticMapOverride };
      console.log(`[TTS v2.2.0] Usando ${Object.keys(phoneticMapOverride).length} fonéticas pré-carregadas do classify-and-enrich`);
    } else {
      // Fluxo tradicional: carregar do banco de dados
      // 2. Carregar regras fonéticas do banco de dados (sobrescreve as padrão)
      try {
        const { data: phoneticRules } = await supabase
          .from("phonetic_rules")
          .select("term, phonetic")
          .eq("is_active", true)
          .is("region", null)  // Pega apenas as globais (sem região)
          .order("priority", { ascending: false });
        
        if (phoneticRules && phoneticRules.length > 0) {
          for (const rule of phoneticRules) {
            phoneticMap[rule.term] = rule.phonetic;
          }
          console.log(`Carregadas ${phoneticRules.length} regras fonéticas do banco`);
        }
      } catch (err) {
        console.log("Usando fonéticas padrão hardcoded:", err);
      }

      // 2.5 Carregar pronúncias do lexicon_terms (dicionário de termos)
      try {
        const { data: lexiconTerms } = await supabase
          .from("lexicon_terms")
          .select("term, pronunciation_phonetic")
          .eq("is_approved", true)
          .not("pronunciation_phonetic", "is", null);

        if (lexiconTerms && lexiconTerms.length > 0) {
          for (const term of lexiconTerms) {
            if (term.pronunciation_phonetic) {
              // Léxico tem prioridade menor que phonetic_rules
              // Só adiciona se não existir no mapa
              if (!phoneticMap[term.term]) {
                phoneticMap[term.term] = term.pronunciation_phonetic;
              }
            }
          }
          console.log(`Carregados ${lexiconTerms.length} termos do léxico`);
        }
      } catch (err) {
        console.log("Erro ao carregar léxico:", err);
      }
      
      // 3. Carregar pronúncias do chat_config (se existir)
      if (chatType) {
        try {
          const { data } = await supabase
            .from("chat_config")
            .select("phonetic_map")
            .eq("chat_type", chatType)
            .single();
          
          if (data?.phonetic_map && Object.keys(data.phonetic_map).length > 0) {
            phoneticMap = { ...phoneticMap, ...data.phonetic_map };
            console.log(`Mapa fonético do chat_config ${chatType}:`, Object.keys(data.phonetic_map).length, "termos");
          }
        } catch (dbError) {
          console.log("Nenhum mapa fonético no chat_config para:", chatType);
        }
      }

      // 3.5 Carregar pronúncias regionais (regional_tone_rules)
      if (userRegion) {
        try {
          const { data: regionRules } = await supabase
            .from("regional_tone_rules")
            .select("preferred_terms")
            .eq("region_code", userRegion)
            .eq("is_active", true)
            .single();

          if (regionRules?.preferred_terms && typeof regionRules.preferred_terms === 'object') {
            // Pronúncias regionais têm alta prioridade (sobrescrevem outras)
            phoneticMap = { ...phoneticMap, ...(regionRules.preferred_terms as Record<string, string>) };
            console.log(`Carregadas pronúncias da região: ${userRegion}`);
          }
        } catch (err) {
          console.log("Região não encontrada ou inativa:", userRegion);
        }
      }
      
      // 4. Carregar pronúncias customizadas do agente (se existir)
      if (agentSlug) {
        try {
          const { data: agent } = await supabase
            .from("chat_agents")
            .select("pronunciation_rules")
            .eq("slug", agentSlug)
            .single();
          
          if (agent?.pronunciation_rules && typeof agent.pronunciation_rules === 'object' && Object.keys(agent.pronunciation_rules).length > 0) {
            phoneticMap = { ...phoneticMap, ...(agent.pronunciation_rules as Record<string, string>) };
            console.log(`Carregadas ${Object.keys(agent.pronunciation_rules).length} pronúncias do agente ${agentSlug}`);
          }
        } catch (err) {
          console.log("Erro ao carregar pronúncias do agente:", err);
        }
      }
    } // Fim do else (hasPreloadedPhonetics)
    
    // 5. NORMALIZAR NÚMEROS PRIMEIRO (antes do mapa fonético)
    let normalizedText = normalizeNumbers(sanitizedText);
    
    // 6. Aplicar mapa fonético
    normalizedText = normalizeTextForTTS(normalizedText, phoneticMap);
    
    // 7. Log do texto normalizado (humanização removida - ElevenLabs já produz fala natural)
    console.log("Texto original:", sanitizedText.substring(0, 100));
    console.log("Texto normalizado:", normalizedText.substring(0, 150));
    console.log("Voice selecionada:", voice);

    // ============================================
    // v6.0.0: ESTRATÉGIA DE TTS HUMANIZADO
    // 1. Carregar config de voz do banco (pwa_config ou pwa_agent_voice_config)
    // 2. OpenAI gpt-4o-mini-tts (principal) - com instructions
    // 3. Google Cloud TTS (fallback) - alta qualidade PT-BR
    // ============================================

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    // Determinar módulo para instructions (usa chatType se disponível)
    const moduleType = chatType || "default";

    // ============================================
    // v6.1.0: Carregar Global + Módulo e mesclar
    // Hierarquia: Global (base) + Módulo (sobrescreve)
    // ============================================

    // 1. Carregar configuração GLOBAL
    let globalConfig: GlobalVoiceConfig | null = null;
    try {
      const { data: globalData } = await supabase
        .from("pwa_config")
        .select("config_value")
        .eq("config_key", "voice_humanization_config")
        .single();

      if (globalData?.config_value) {
        globalConfig = JSON.parse(globalData.config_value) as GlobalVoiceConfig;
        console.log(`[TTS v6.1] 🌐 Config GLOBAL carregada: voz=${globalConfig.globalVoice}`);
      }
    } catch (globalErr) {
      console.log(`[TTS v6.1] ℹ️ Config global não encontrada, usando defaults`);
    }

    // 2. Carregar configuração do MÓDULO
    let moduleConfig: AgentVoiceConfig | null = null;

    // 2a. Tentar tabela estruturada primeiro
    try {
      const { data: agentConfig } = await supabase
        .from("pwa_agent_voice_config")
        .select("*")
        .eq("module_id", moduleType)
        .single();

      if (agentConfig) {
        moduleConfig = {
          moduleId: agentConfig.module_id,
          voice: agentConfig.voice,
          humanization: {
            warmth: agentConfig.warmth,
            enthusiasm: agentConfig.enthusiasm,
            pace: agentConfig.pace,
            expressiveness: agentConfig.expressiveness,
            formality: agentConfig.formality,
            speed: agentConfig.speed,
            fillerWords: agentConfig.filler_words,
            naturalBreathing: agentConfig.natural_breathing,
            emotionalResponses: agentConfig.emotional_responses,
          },
          instructions: agentConfig.custom_instructions || "",
          isCustom: agentConfig.is_custom,
        };
        console.log(`[TTS v6.1] 📦 Config MÓDULO carregada (tabela): ${moduleType}`);
      }
    } catch (dbErr) {
      // Tabela não existe, tentar JSON
    }

    // 2b. Se não encontrou, tentar pwa_config JSON
    if (!moduleConfig) {
      try {
        const { data: pwaConfig } = await supabase
          .from("pwa_config")
          .select("config_value")
          .eq("config_key", "agent_voice_configs")
          .single();

        if (pwaConfig?.config_value) {
          const configs = JSON.parse(pwaConfig.config_value) as AgentVoiceConfig[];
          moduleConfig = configs.find(c => c.moduleId === moduleType) || null;
          if (moduleConfig) {
            console.log(`[TTS v6.1] 📦 Config MÓDULO carregada (JSON): ${moduleType}`);
          }
        }
      } catch (jsonErr) {
        console.log(`[TTS v6.1] ℹ️ Config de módulo não encontrada para: ${moduleType}`);
      }
    }

    // 3. MESCLAR: Global (base) + Módulo (sobrescreve onde definido)
    const defaultHumanization = {
      warmth: 70,
      enthusiasm: 50,
      pace: 50,
      expressiveness: 60,
      formality: 30,
      speed: 1.0,
      fillerWords: true,
      naturalBreathing: true,
      emotionalResponses: true,
    };

    // Começar com defaults
    let finalConfig: AgentVoiceConfig = {
      moduleId: moduleType,
      voice: MODULE_VOICE_MAP[moduleType] || MODULE_VOICE_MAP.default,
      humanization: { ...defaultHumanization },
      instructions: "",
      isCustom: false,
    };

    // Aplicar Global (se existir)
    if (globalConfig) {
      finalConfig.voice = globalConfig.globalVoice || finalConfig.voice;
      finalConfig.humanization = {
        ...finalConfig.humanization,
        ...globalConfig.globalHumanization,
      };
      finalConfig.instructions = globalConfig.globalInstructions || "";
      console.log(`[TTS v6.1] ✅ Global aplicado: voz=${finalConfig.voice}`);
    }

    // Aplicar Módulo (sobrescreve Global onde definido)
    if (moduleConfig) {
      // Voz do módulo sobrescreve se definida
      if (moduleConfig.voice) {
        finalConfig.voice = moduleConfig.voice;
      }
      // Humanização do módulo sobrescreve
      if (moduleConfig.humanization) {
        finalConfig.humanization = {
          ...finalConfig.humanization,
          ...moduleConfig.humanization,
        };
      }
      // Instructions do módulo COMPLEMENTAM ou sobrescrevem
      if (moduleConfig.instructions && moduleConfig.instructions.trim().length > 0) {
        // Se módulo tem instructions próprias, CONCATENAR com global
        if (finalConfig.instructions && finalConfig.instructions.trim().length > 0) {
          finalConfig.instructions = `${finalConfig.instructions}\n\n--- Configurações do Módulo ${moduleType} ---\n${moduleConfig.instructions}`;
        } else {
          finalConfig.instructions = moduleConfig.instructions;
        }
      }
      finalConfig.isCustom = moduleConfig.isCustom;
      console.log(`[TTS v6.1] ✅ Módulo aplicado: ${moduleType}, voz=${finalConfig.voice}`);
    }

    // Log da configuração final
    console.log(`[TTS v6.1] 🎯 Config FINAL: voz=${finalConfig.voice}, warmth=${finalConfig.humanization.warmth}, instructions=${finalConfig.instructions.length} chars`);

    // Determinar voz final
    let selectedVoice = finalConfig.voice;
    if (!OPENAI_VOICES.includes(selectedVoice)) {
      selectedVoice = MODULE_VOICE_MAP[moduleType] || MODULE_VOICE_MAP.default;
    }

    // Gerar instructions finais
    let voiceInstructions: string;
    if (finalConfig.instructions && finalConfig.instructions.trim().length > 0) {
      // Usar instructions customizadas (Global + Módulo mescladas)
      voiceInstructions = finalConfig.instructions;
      console.log(`[TTS v6.1] 📝 Usando instructions customizadas (${voiceInstructions.length} chars)`);
    } else {
      // Gerar baseado nos sliders de humanização
      voiceInstructions = generateInstructionsFromConfig(finalConfig);
      console.log(`[TTS v6.1] 📝 Instructions geradas dos sliders (${voiceInstructions.length} chars)`);
    }

    // ============================================
    // TENTATIVA 1: OpenAI gpt-4o-mini-tts com instructions
    // ============================================
    if (OPENAI_API_KEY) {
      try {
        console.log("[TTS v6.1] 🎯 Usando gpt-4o-mini-tts com voz:", selectedVoice, "| módulo:", moduleType);

        const openaiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini-tts",  // Modelo com suporte a instructions
            input: normalizedText,
            voice: selectedVoice,
            response_format: "mp3",
            instructions: voiceInstructions,  // Instructions para humanização
          }),
        });

        if (openaiResponse.ok) {
          console.log("[TTS v6.1] ✅ OpenAI gpt-4o-mini-tts sucesso!");
          return new Response(openaiResponse.body, {
            headers: {
              ...corsHeaders,
              "Content-Type": "audio/mpeg",
              "Transfer-Encoding": "chunked",
            },
          });
        }

        const errorText = await openaiResponse.text();
        console.warn("[TTS v6.1] ⚠️ OpenAI TTS falhou:", openaiResponse.status, errorText);

        // Se gpt-4o-mini-tts falhar, tentar tts-1 como fallback rápido
        console.log("[TTS v6.1] 🔄 Tentando fallback para tts-1...");
        const fallbackResponse = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "tts-1",
            input: normalizedText,
            voice: selectedVoice,
            response_format: "mp3",
          }),
        });

        if (fallbackResponse.ok) {
          console.log("[TTS v6.1] ✅ OpenAI tts-1 fallback sucesso!");
          return new Response(fallbackResponse.body, {
            headers: {
              ...corsHeaders,
              "Content-Type": "audio/mpeg",
              "Transfer-Encoding": "chunked",
            },
          });
        }

        // Continua para Google fallback

      } catch (openaiError) {
        console.warn("[TTS v6.1] ⚠️ OpenAI TTS erro:", openaiError);
        // Continua para fallback
      }
    } else {
      console.warn("[TTS v6.1] ⚠️ OPENAI_API_KEY não configurada");
    }

    // ============================================
    // TENTATIVA 2: Google Cloud TTS (fallback)
    // ============================================
    if (GOOGLE_API_KEY) {
      try {
        console.log("[TTS v3.0] 🔄 Fallback para Google Cloud TTS...");

        const googleResponse = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: { text: normalizedText },
              voice: {
                languageCode: "pt-BR",
                name: GOOGLE_TTS_VOICES.default,
                ssmlGender: "MALE"
              },
              audioConfig: {
                audioEncoding: "MP3",
                speakingRate: 1.1,  // Levemente mais rápido
                pitch: 0,
                volumeGainDb: 0
              }
            }),
          }
        );

        if (googleResponse.ok) {
          const googleData = await googleResponse.json();

          if (googleData.audioContent) {
            console.log("[TTS v3.0] ✅ Google Cloud TTS sucesso!");

            // Decodificar base64 para bytes
            const audioBytes = Uint8Array.from(atob(googleData.audioContent), c => c.charCodeAt(0));

            return new Response(audioBytes, {
              headers: {
                ...corsHeaders,
                "Content-Type": "audio/mpeg",
              },
            });
          }
        }

        const errorText = await googleResponse.text();
        console.error("[TTS v3.0] ❌ Google Cloud TTS falhou:", googleResponse.status, errorText);
        throw new Error(`Google TTS falhou: ${googleResponse.status}`);

      } catch (googleError) {
        console.error("[TTS v3.0] ❌ Google Cloud TTS erro:", googleError);
        throw googleError;
      }
    }

    // Se nenhum TTS funcionou
    throw new Error("Nenhum serviço TTS disponível (OpenAI e Google falharam)");
  } catch (error) {
    console.error("Erro no text-to-speech:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
