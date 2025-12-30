import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  // KNOWYOU
  // ============================================
  "KnowYOU": "nôu iú",
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

// Função para normalizar texto com pronúncias fonéticas
function normalizeTextForTTS(text: string, phoneticMap: Record<string, string>): string {
  let normalizedText = text;
  
  // Ordenar por tamanho (maior primeiro) para evitar substituições parciais
  const sortedTerms = Object.keys(phoneticMap).sort((a, b) => b.length - a.length);
  
  for (const term of sortedTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    normalizedText = normalizedText.replace(regex, phoneticMap[term]);
  }
  
  return normalizedText;
}

// ============================================
// HUMANIZAÇÃO DO TEXTO PARA FALA NATURAL
// ============================================

function humanizeTextForSpeech(text: string): string {
  let result = text;
  
  // 1. Adicionar micro-pausas após vírgulas (respiração natural)
  result = result.replace(/,\s*/g, ', ... ');
  
  // 2. Pausas mais longas após pontos
  result = result.replace(/\.\s+/g, '. ... ');
  
  // 3. Adicionar hesitações naturais no início de algumas frases
  const hesitations = ['Bom, ', 'Então, ', 'Olha, ', 'Veja, ', 'Ah, '];
  const sentences = result.split('. ... ');
  
  if (sentences.length > 2) {
    // Adicionar hesitação em uma frase do meio (não a primeira nem última)
    const midIndex = Math.floor(sentences.length / 2);
    const randomHesitation = hesitations[Math.floor(Math.random() * hesitations.length)];
    
    // Só adiciona se a frase não começar já com hesitação
    if (sentences[midIndex] && !hesitations.some(h => sentences[midIndex].startsWith(h.trim()))) {
      sentences[midIndex] = randomHesitation + sentences[midIndex].charAt(0).toLowerCase() + sentences[midIndex].slice(1);
    }
  }
  
  result = sentences.join('. ... ');
  
  // 4. Para textos longos (>200 chars), adicionar uma "respiração profunda"
  if (text.length > 200) {
    const midPoint = Math.floor(result.length / 2);
    const insertPoint = result.indexOf('. ... ', midPoint);
    if (insertPoint > 0) {
      // Inserir pausa mais longa que simula respiração profunda
      result = result.slice(0, insertPoint + 1) + ' ... ... ' + result.slice(insertPoint + 7);
    }
  }
  
  // 5. Adicionar interjeições empáticas ocasionais
  result = result.replace(/Infelizmente/g, 'Infelizmente, ... puxa vida,');
  result = result.replace(/Boa notícia/g, 'Boa notícia! ... Que bom,');
  result = result.replace(/preocupante/gi, '... preocupante, né');
  
  return result;
}


// OpenAI TTS voices
const OPENAI_VOICES = ["alloy", "onyx", "nova", "shimmer", "echo", "fable"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, chatType, agentSlug, voice = "fernando" } = await req.json();
    
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
    
    // 1. Carregar mapa fonético base (já inclui economia e todas as categorias)
    let phoneticMap = { ...DEFAULT_PHONETIC_MAP };
    
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
    
    // 5. NORMALIZAR NÚMEROS PRIMEIRO (antes do mapa fonético)
    let normalizedText = normalizeNumbers(sanitizedText);
    
    // 6. Aplicar mapa fonético
    normalizedText = normalizeTextForTTS(normalizedText, phoneticMap);
    
    // 7. HUMANIZAR COM PAUSAS E RESPIRAÇÃO
    normalizedText = humanizeTextForSpeech(normalizedText);

    console.log("Texto original:", sanitizedText.substring(0, 100));
    console.log("Após humanização:", normalizedText.substring(0, 150));
    console.log("Voice selecionada:", voice);

    // Check if using OpenAI voice or ElevenLabs (fernando)
    const isOpenAIVoice = OPENAI_VOICES.includes(voice);
    
    if (isOpenAIVoice) {
      // Use OpenAI TTS
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) {
        throw new Error("OpenAI API Key não configurada");
      }

      console.log("Usando OpenAI TTS com voz:", voice);
      
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: normalizedText,
          voice: voice,
          response_format: "mp3",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro OpenAI TTS:", response.status, errorText);
        throw new Error(`Falha ao gerar áudio OpenAI: ${response.status}`);
      }

      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Transfer-Encoding": "chunked",
        },
      });
    } else {
      // Use ElevenLabs (default - fernando)
      const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
      const VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID_FERNANDO");

      if (!ELEVENLABS_API_KEY || !VOICE_ID) {
        throw new Error("Credenciais ElevenLabs não configuradas");
      }

      console.log("Usando ElevenLabs TTS com voice_id:", VOICE_ID);

      // Gerar áudio com ElevenLabs usando modelo Turbo v2.5 para baixa latência
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: normalizedText,
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.30,
              similarity_boost: 0.65,
              style: 0.45,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro ElevenLabs:", response.status, errorText);
        throw new Error(`Falha ao gerar áudio: ${response.status}`);
      }

      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Transfer-Encoding": "chunked",
        },
      });
    }
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
