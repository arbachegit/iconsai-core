// ============================================
// VERSAO: 3.0.0 | DEPLOY: 2026-01-22
// MUDANÇA: OpenAI TTS como principal, Google TTS fallback
// ElevenLabs removido (401 errors)
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


// OpenAI TTS voices
const OPENAI_VOICES = ["alloy", "onyx", "nova", "shimmer", "echo", "fable"];

// Google Cloud TTS - vozes em português brasileiro
const GOOGLE_TTS_VOICES = {
  "male": "pt-BR-Wavenet-B",
  "female": "pt-BR-Wavenet-A",
  "default": "pt-BR-Wavenet-B"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    // v3.0.0: ESTRATÉGIA DE TTS
    // 1. OpenAI TTS (principal) - rápido e confiável
    // 2. Google Cloud TTS (fallback) - alta qualidade PT-BR
    // ============================================

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY"); // Mesma key funciona para TTS

    // Determinar voz OpenAI (padrão: nova)
    const openaiVoice = OPENAI_VOICES.includes(voice) ? voice : "nova";

    // ============================================
    // TENTATIVA 1: OpenAI TTS
    // ============================================
    if (OPENAI_API_KEY) {
      try {
        console.log("[TTS v3.0] 🎯 Tentando OpenAI TTS com voz:", openaiVoice);

        const openaiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "tts-1",
            input: normalizedText,
            voice: openaiVoice,
            response_format: "mp3",
          }),
        });

        if (openaiResponse.ok) {
          console.log("[TTS v3.0] ✅ OpenAI TTS sucesso!");
          return new Response(openaiResponse.body, {
            headers: {
              ...corsHeaders,
              "Content-Type": "audio/mpeg",
              "Transfer-Encoding": "chunked",
            },
          });
        }

        const errorText = await openaiResponse.text();
        console.warn("[TTS v3.0] ⚠️ OpenAI TTS falhou:", openaiResponse.status, errorText);
        // Continua para fallback

      } catch (openaiError) {
        console.warn("[TTS v3.0] ⚠️ OpenAI TTS erro:", openaiError);
        // Continua para fallback
      }
    } else {
      console.warn("[TTS v3.0] ⚠️ OPENAI_API_KEY não configurada");
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
