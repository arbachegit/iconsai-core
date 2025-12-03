import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapa padrão como fallback
const DEFAULT_PHONETIC_MAP: Record<string, string> = {
  // Siglas de IA - soletradas
  "RAG": "érre-á-jê",
  "LLM": "éle-éle-ême",
  "SLM": "ésse-éle-ême",
  "GPT": "jê-pê-tê",
  "AI": "á-i",
  "IA": "í-á",
  "NLP": "éne-éle-pê",
  "ML": "éme-éle",
  "DL": "dê-éle",
  "API": "á-pê-í",
  "SDK": "ésse-dê-cá",
  "LLMs": "éle-éle-êmes",
  "SLMs": "ésse-éle-êmes",
  "APIs": "á-pê-ís",
  
  // Termos técnicos - pronúncia em português
  "chunks": "tchânks",
  "chunk": "tchânk",
  "embedding": "embéding",
  "embeddings": "embédings",
  "token": "tôken",
  "tokens": "tôkens",
  "prompt": "prômpt",
  "prompts": "prômpits",
  "fine-tuning": "fáin túning",
  "fine tuning": "fáin túning",
  "dataset": "déita sét",
  "datasets": "déita séts",
  "pipeline": "páip láin",
  "pipelines": "páip láins",
  "framework": "fréim uórk",
  "frameworks": "fréim uórks",
  "benchmark": "bêntch márk",
  "benchmarks": "bêntch márks",
  "chatbot": "tchét bót",
  "chatbots": "tchét bóts",
  "multimodal": "múlti módal",
  "transformer": "trans fórmer",
  "transformers": "trans fórmers",
  "vector": "vétor",
  "vectors": "vétores",
  "retrieval": "retriéval",
  "augmented": "ógmentéd",
  "generation": "djenereíchon",
  
  // Empresas e produtos
  "OpenAI": "Ópen á-i",
  "ChatGPT": "Tchét jê-pê-tê",
  "Gemini": "Jêmini",
  "Claude": "Clód",
  "Llama": "Lhâma",
  "BERT": "Bért",
  "GPT-4": "jê-pê-tê quatro",
  "GPT-5": "jê-pê-tê cinco",
  
  // Termos KnowRISK específicos
  "KnowRISK": "Nôu Rísk",
  "KnowYOU": "Nôu Iú",
  "ACC": "á-cê-cê",
};

// Função para normalizar texto com pronúncias fonéticas
function normalizeTextForTTS(text: string, phoneticMap: Record<string, string>): string {
  let normalizedText = text;
  
  // Ordenar por tamanho (maior primeiro) para evitar substituições parciais
  const sortedTerms = Object.keys(phoneticMap).sort((a, b) => b.length - a.length);
  
  for (const term of sortedTerms) {
    // Usar regex com word boundaries para substituir apenas palavras completas
    // Case insensitive para capturar variações
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
    const { text, chatType } = await req.json();
    
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
    
    // Carregar mapa fonético do banco de dados
    let phoneticMap = DEFAULT_PHONETIC_MAP;
    
    if (chatType) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data } = await supabase
          .from("chat_config")
          .select("phonetic_map")
          .eq("chat_type", chatType)
          .single();
        
        if (data?.phonetic_map && Object.keys(data.phonetic_map).length > 0) {
          phoneticMap = data.phonetic_map;
          console.log(`Usando mapa fonético do banco para ${chatType}:`, Object.keys(phoneticMap).length, "termos");
        } else {
          console.log(`Usando mapa fonético padrão (banco vazio para ${chatType})`);
        }
      } catch (dbError) {
        console.error("Erro ao carregar mapa fonético do banco, usando fallback:", dbError);
      }
    }
    
    // Normalizar texto para pronúncia correta de siglas e termos técnicos
    const normalizedText = normalizeTextForTTS(sanitizedText, phoneticMap);

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID_FERNANDO");

    if (!ELEVENLABS_API_KEY || !VOICE_ID) {
      throw new Error("Credenciais ElevenLabs não configuradas");
    }

    console.log("Texto original:", sanitizedText.substring(0, 100));
    console.log("Texto normalizado para TTS:", normalizedText.substring(0, 100));

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
