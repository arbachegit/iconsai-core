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
  // SIGLAS DE ECONOMIA - SOLETRADAS
  // ============================================
  "PIB": "pê-i-bê",
  "IPCA": "i-pê-cê-a",
  "IGP": "i-gê-pê",
  "IGP-M": "i-gê-pê ême",
  "IGP-DI": "i-gê-pê dê-i",
  "INPC": "i-ene-pê-cê",
  "IPC": "i-pê-cê",
  "CDI": "cê-dê-i",
  "PMC": "pê-ême-cê",
  "PMS": "pê-ême-esse",
  "PEA": "pê-é-a",
  "POF": "pê-ó-éfe",
  
  // ============================================
  // INSTITUIÇÕES BRASILEIRAS
  // ============================================
  "BCB": "bê-cê-bê",
  "BACEN": "bacên",
  "COPOM": "copôm",
  "CMN": "cê-ême-ene",
  "CVM": "cê-vê-ême",
  "BNDES": "bê-ene-dê-é-esse",
  "CEF": "cê-é-éfe",
  "BB": "bê-bê",
  "IBGE": "i-bê-gê-é",
  "IPEA": "i-pê-é-a",
  "FGV": "éfe-gê-vê",
  "FIPE": "fípe",
  "DIEESE": "di-ésse",
  "CAGED": "cagéd",
  "RAIS": "ráis",
  "INSS": "i-ene-esse-esse",
  "FGTS": "éfe-gê-tê-esse",
  "CLT": "cê-éle-tê",
  "MEI": "mêi",
  "CNPJ": "cê-ene-pê-jóta",
  "CPF": "cê-pê-éfe",
  "RG": "érre-gê",
  
  // ============================================
  // INDICADORES E TAXAS
  // ============================================
  "Selic": "sélique",
  "SELIC": "sélique",
  "PTAX": "pê-táx",
  "TR": "tê-érre",
  "TLP": "tê-éle-pê",
  "TJLP": "tê-jóta-éle-pê",
  "DI": "dê-i",
  "IOF": "i-ó-éfe",
  "IR": "i-érre",
  "IRPF": "i-érre-pê-éfe",
  "IRPJ": "i-érre-pê-jóta",
  "ISS": "i-esse-esse",
  "ICMS": "i-cê-ême-esse",
  "IPI": "i-pê-i",
  "PIS": "pís",
  "COFINS": "cofíns",
  "CSLL": "cê-esse-éle-éle",
  
  // ============================================
  // TERMOS DO MERCADO FINANCEIRO
  // ============================================
  "IPO": "i-pê-ó",
  "ETF": "i-tê-éfe",
  "CDB": "cê-dê-bê",
  "LCI": "éle-cê-i",
  "LCA": "éle-cê-a",
  "CRI": "cê-érre-i",
  "CRA": "cê-érre-a",
  "FII": "éfe-i-i",
  "COE": "cê-ó-é",
  "NTN": "ene-tê-ene",
  "LFT": "éle-éfe-tê",
  "LTN": "éle-tê-ene",
  "PGBL": "pê-gê-bê-éle",
  "VGBL": "vê-gê-bê-éle",
  
  // ============================================
  // ORGANIZAÇÕES INTERNACIONAIS
  // ============================================
  "FMI": "éfe-ême-i",
  "ONU": "ó-ene-u",
  "OMC": "ó-ême-cê",
  "OCDE": "ó-cê-dê-é",
  "OIT": "ó-i-tê",
  "BID": "bê-i-dê",
  "BIRD": "bírd",
  "BCE": "bê-cê-é",
  "FED": "féd",
  "G7": "gê sete",
  "G20": "gê vinte",
  "BRICS": "brícs",
  "EUA": "é-u-a",
  "USA": "u-esse-a",
  "UE": "u-é",
  
  // ============================================
  // MOEDAS
  // ============================================
  "USD": "dólar americano",
  "BRL": "real brasileiro",
  "EUR": "êuro",
  "GBP": "libra esterlina",
  "JPY": "iêne japonês",
  "CNY": "iuãn chinês",
  "ARS": "peso argentino",
  
  // ============================================
  // SIGLAS DE PESQUISAS E ÍNDICES
  // ============================================
  "PNAD": "penád",
  "PNADc": "penád contínua",
  "IBOVESPA": "ibovéspa",
  "IFIX": "i-fíx",
  "IDIV": "i-dív",
  "SMLL": "small",
  "IMAB": "i-máb",
  "IMA-B": "i-ma bê",
  "GINI": "jíni",
  "Gini": "jíni",
  
  // ============================================
  // TECNOLOGIA E IA
  // ============================================
  "IA": "i-a",
  "AI": "êi-ái",
  "RAG": "rág",
  "LLM": "éle-éle-ême",
  "GPT": "gê-pê-tê",
  "API": "a-pê-i",
  "ML": "ême-éle",
  "NLP": "ene-éle-pê",
  "CPU": "cê-pê-u",
  "GPU": "gê-pê-u",
  "SSD": "esse-esse-dê",
  "RAM": "rám",
  "ROM": "rôm",
  "USB": "u-esse-bê",
  "PDF": "pê-dê-éfe",
  "HTML": "agá-tê-ême-éle",
  "CSS": "cê-esse-esse",
  "SQL": "esse-quê-éle",
  "URL": "u-érre-éle",
  "HTTP": "agá-tê-tê-pê",
  "HTTPS": "agá-tê-tê-pê-esse",
  "WWW": "dáblio dáblio dáblio",
  
  // ============================================
  // EMPRESAS E PRODUTOS
  // ============================================
  "OpenAI": "ópen êi-ái",
  "ChatGPT": "tchét gê-pê-tê",
  "Claude": "clód",
  "Gemini": "gêmini",
  "Google": "gúgol",
  "Microsoft": "máicrosoft",
  "Apple": "épol",
  "Amazon": "amázon",
  "Meta": "méta",
  "Netflix": "nétiflix",
  "Uber": "úber",
  "Nubank": "nubânk",
  "XP": "xis-pê",
  "BTG": "bê-tê-gê",
  "Itaú": "itaú",
  "Bradesco": "bradésco",
  "Santander": "santânder",
  
  // ============================================
  // TERMOS ESPECÍFICOS KNOWYOU
  // ============================================
  "KnowYOU": "nôu iú",
  "KnowRISK": "nôu rísk",
  "ACC": "a-cê-cê",
  
  // ============================================
  // TERMOS EM INGLÊS (ECONOMIA)
  // ============================================
  "spread": "sprêd",
  "hedge": "hédge",
  "swap": "suóp",
  "default": "defôlt",
  "rating": "rêiting",
  "benchmark": "bêntchmark",
  "commodities": "comôditis",
  "commodity": "comôditi",
  "offshore": "óf-chór",
  "onshore": "ón-chór",
  "bull": "bul",
  "bear": "bér",
  "rally": "réli",
  "pullback": "pulbék",
  "breakout": "breikáut",
  "target": "tárguit",
  "stop": "stóp",
  "long": "lóng",
  "short": "chórt",
  "day trade": "dêi trêid",
  "swing trade": "suíng trêid",
  "home broker": "rôum brôuker",
  "valuation": "valiuêichon",
  "market cap": "márket kép",
  "blue chip": "blú tchíp",
  "small cap": "smól kép",
  "mid cap": "míd kép",
  "large cap": "lárdge kép",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, chatType, agentSlug } = await req.json();
    
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

    console.log("Texto original:", sanitizedText.substring(0, 100));
    console.log("Após normalização números:", normalizedText.substring(0, 100));
    console.log("Total de termos no mapa fonético:", Object.keys(phoneticMap).length);

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID_FERNANDO");

    if (!ELEVENLABS_API_KEY || !VOICE_ID) {
      throw new Error("Credenciais ElevenLabs não configuradas");
    }

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
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
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

    // Stream the audio directly back to the client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
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
