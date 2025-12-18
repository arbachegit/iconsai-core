import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Interface para mensagens
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Mapeamento de palavras-chave para códigos de indicadores
const INDICATOR_KEYWORDS: Record<string, string[]> = {
  'DOLAR': ['dólar', 'dolar', 'câmbio', 'moeda americana', 'usd', 'ptax', 'cotação do dólar'],
  'SELIC': ['selic', 'taxa básica', 'juros básico', 'taxa de juros', 'juros do banco central'],
  'IPCA': ['ipca', 'inflação', 'índice de preços', 'inflação oficial'],
  'PIB': ['pib', 'produto interno bruto', 'crescimento econômico'],
  'RENDA_MEDIA': ['renda', 'renda média', 'salário médio', 'renda per capita'],
  '4099': ['desemprego', 'taxa de desemprego', 'desocupação'],
  'GINI': ['gini', 'desigualdade', 'distribuição de renda'],
  'PMC': ['vendas', 'comércio', 'varejo', 'pmc'],
  'CDI': ['cdi', 'certificado de depósito'],
};

// Detecta quais indicadores foram mencionados na mensagem
function detectIndicators(message: string): string[] {
  const messageLower = message.toLowerCase();
  const detected: string[] = [];
  
  for (const [code, keywords] of Object.entries(INDICATOR_KEYWORDS)) {
    if (keywords.some(kw => messageLower.includes(kw))) {
      detected.push(code);
    }
  }
  
  return detected;
}

// Busca os valores mais recentes dos indicadores no banco
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
      
      if (!indicator) {
        console.log(`[chat-pwa] Indicador não encontrado: ${code}`);
        continue;
      }
      
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
      console.error(`[chat-pwa] Erro ao buscar indicador ${code}:`, err);
    }
  }
  
  return results;
}

// Formata os indicadores para injetar no contexto do LLM
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

// Gera contexto emocional baseado nos indicadores para orientar o tom do LLM
function getEmotionalContext(
  indicators: Record<string, { value: number; date: string; unit: string; name: string }>
): string {
  const contexts: string[] = [];
  
  for (const [code, data] of Object.entries(indicators)) {
    switch (code) {
      case 'IPCA':
        if (data.value > 6) {
          contexts.push('A inflação está ALTA - demonstre preocupação e empatia, reconheça que está difícil');
        } else if (data.value < 4) {
          contexts.push('A inflação está controlada - seja positivo e animado, celebre a boa notícia');
        } else {
          contexts.push('A inflação está em nível moderado - seja equilibrado');
        }
        break;
      
      case 'SELIC':
        if (data.value > 12) {
          contexts.push('Juros ALTOS - reconheça que empréstimos estão caros, demonstre compreensão');
        } else if (data.value < 8) {
          contexts.push('Juros baixos - seja otimista sobre crédito e investimentos');
        }
        break;
      
      case 'DOLAR':
        if (data.value > 5.5) {
          contexts.push('Dólar CARO - mostre empatia com quem quer viajar, importar ou tem dívidas em dólar');
        } else if (data.value < 5) {
          contexts.push('Dólar em bom patamar - seja positivo sobre importações e viagens');
        }
        break;
      
      case '4099': // Desemprego
        if (data.value > 8) {
          contexts.push('Desemprego ALTO - seja MUITO empático e solidário, reconheça que afeta famílias inteiras');
        } else if (data.value < 7) {
          contexts.push('Desemprego em queda - celebre a boa notícia, seja animado');
        }
        break;
      
      case 'GINI':
        if (data.value > 0.5) {
          contexts.push('Desigualdade ALTA - demonstre preocupação social');
        }
        break;
      
      case 'PMC':
        if (data.value > 105) {
          contexts.push('Comércio aquecido - seja otimista sobre a economia');
        } else if (data.value < 95) {
          contexts.push('Comércio em baixa - demonstre compreensão sobre momento difícil');
        }
        break;
    }
  }
  
  if (contexts.length > 0) {
    return `\n\n## CONTEXTO EMOCIONAL (ajuste seu tom!):\n${contexts.join('\n')}`;
  }
  
  return '';
}

// Buscar ou criar sessão e histórico recente
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
      console.error('[chat-pwa] Erro ao criar sessão:', insertError);
      // Retornar sessão vazia se falhar
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

// Salvar mensagem no histórico
async function saveMessage(
  supabase: any,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  audioUrl?: string
) {
  // Não salvar se for sessão temporária
  if (sessionId.startsWith('temp-')) return;
  
  await supabase.from('pwa_messages').insert({
    session_id: sessionId,
    role,
    content,
    audio_url: audioUrl
  });
  
  // Atualizar última interação da sessão
  await supabase
    .from('pwa_sessions')
    .update({ 
      last_interaction: new Date().toISOString(),
      total_messages: supabase.rpc ? undefined : undefined // Incrementar via trigger seria ideal
    })
    .eq('id', sessionId);
}

// Detectar e salvar nome do usuário
async function detectAndSaveName(
  supabase: any,
  sessionId: string,
  message: string,
  currentName: string | null
): Promise<string | null> {
  // Se já tem nome, retornar
  if (currentName) return currentName;
  
  // Não processar se for sessão temporária
  if (sessionId.startsWith('temp-')) return null;
  
  // Padrões para detectar nome
  const patterns = [
    /(?:me chamo|meu nome é|pode me chamar de|sou o|sou a)\s+([A-Za-zÀ-ÿ]+)/i,
    /^([A-Za-zÀ-ÿ]{2,15})$/i // Se responder só com um nome (2-15 letras)
  ];
  
  for (const pattern of patterns) {
    const match = message.trim().match(pattern);
    if (match) {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      
      // Salvar nome na sessão
      await supabase
        .from('pwa_sessions')
        .update({ user_name: name })
        .eq('id', sessionId);
      
      console.log(`[chat-pwa] Nome detectado e salvo: ${name}`);
      return name;
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, agentSlug = "economia", deviceId } = await req.json();

    if (!message) {
      throw new Error("Mensagem é obrigatória");
    }

    // Gerar deviceId se não fornecido
    const finalDeviceId = deviceId || `anonymous-${Date.now()}`;

    console.log(`[chat-pwa] Mensagem: "${message.substring(0, 50)}..."`);
    console.log(`[chat-pwa] Agente: ${agentSlug}, Device: ${finalDeviceId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar histórico e contexto de memória
    const { sessionId, userName, messages: history } = await getRecentHistory(
      supabase, 
      finalDeviceId
    );
    
    console.log(`[chat-pwa] Sessão: ${sessionId}, Usuário: ${userName || 'desconhecido'}, Histórico: ${history.length} msgs`);
    
    // 2. Detectar se usuário disse o nome
    const detectedName = await detectAndSaveName(supabase, sessionId, message, userName);
    const currentUserName = detectedName || userName;
    
    // 3. Salvar mensagem do usuário
    await saveMessage(supabase, sessionId, 'user', message);

    // 4. Buscar configurações do agente
    const { data: agent, error: agentError } = await supabase
      .from("chat_agents")
      .select("*")
      .eq("slug", agentSlug)
      .eq("is_active", true)
      .single();

    if (agentError || !agent) {
      console.error("[chat-pwa] Agente não encontrado:", agentSlug, agentError);
      throw new Error("Agente não encontrado ou inativo");
    }

    console.log(`[chat-pwa] Agente carregado: ${agent.name}`);

    // 5. Detectar indicadores mencionados e buscar valores atuais
    const detectedIndicators = detectIndicators(message);
    console.log("[chat-pwa] Indicadores detectados:", detectedIndicators);

    let indicatorsContext = '';
    let emotionalContext = '';
    if (detectedIndicators.length > 0) {
      const indicatorData = await fetchLatestIndicators(supabase, detectedIndicators);
      indicatorsContext = formatIndicatorsContext(indicatorData);
      emotionalContext = getEmotionalContext(indicatorData);
      console.log("[chat-pwa] Dados encontrados:", Object.keys(indicatorData));
      console.log("[chat-pwa] Contexto emocional:", emotionalContext ? 'ativo' : 'neutro');
    }

    // 6. Buscar contexto RAG (se configurado)
    let ragContext = "";
    
    if (agent.rag_collection) {
      try {
        const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: message,
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
              ragContext = docs.map((d: any) => d.content).join("\n\n---\n\n");
              console.log(`[chat-pwa] RAG encontrou ${docs.length} documentos`);
            }
          }
        }
      } catch (ragError) {
        console.error("[chat-pwa] Erro no RAG (continuando sem contexto):", ragError);
      }
    }

    // 7. Construir contexto de memória
    const memoryContext = history.length > 0 
      ? `\n\n## HISTÓRICO DA CONVERSA (últimas ${history.length} mensagens):\n${history.map(m => `${m.role === 'user' ? 'Usuário' : 'Você'}: ${m.content}`).join('\n')}`
      : '';
    
    const userContext = currentUserName
      ? `\n\n## SOBRE O USUÁRIO:\n- Nome: ${currentUserName}\n- Use o nome dele ocasionalmente para criar conexão pessoal`
      : `\n\n## SOBRE O USUÁRIO:\n- Ainda não sabemos o nome\n- Se apropriado e natural, pergunte: "A propósito, como posso te chamar?"`;

    // 8. Construir prompt do sistema com indicadores, RAG e memória
    const systemPrompt = `${agent.system_prompt || "Você é um assistente prestativo."}

${indicatorsContext}

${emotionalContext}

${ragContext ? `
## CONTEXTO DOS DOCUMENTOS (use para responder):
${ragContext}
` : ""}

${userContext}

${memoryContext}

## INSTRUÇÕES FINAIS:
- Se o usuário já perguntou algo similar antes, mencione: "Como conversamos antes..."
- Varie suas respostas, não repita frases iguais
- Seja natural e amigável
- Respostas CURTAS (máximo 4-5 frases para áudio)
- SEMPRE cite a fonte e data quando mencionar dados econômicos
`;

    // 9. Chamar Lovable AI Gateway
    console.log("[chat-pwa] Chamando Lovable AI Gateway...");
    
    // Preparar mensagens com histórico
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];
    
    const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: chatMessages,
        max_tokens: 400,
        temperature: 0.8, // Um pouco mais criativo para variar respostas
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error("[chat-pwa] Erro Lovable AI:", chatResponse.status, errorText);
      
      if (chatResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Muitas requisições. Tente novamente em alguns segundos.",
            response: "Desculpe, estou recebendo muitas perguntas. Por favor, aguarde um momento e tente novamente."
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (chatResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Créditos insuficientes.",
            response: "Desculpe, o serviço está temporariamente indisponível. Por favor, tente mais tarde."
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Erro ao processar: ${chatResponse.status}`);
    }

    const chatData = await chatResponse.json();
    const response = chatData.choices?.[0]?.message?.content || 
                     agent.rejection_message || 
                     "Desculpe, não consegui processar sua pergunta.";

    console.log(`[chat-pwa] Resposta gerada: "${response.substring(0, 100)}..."`);

    // 10. Salvar resposta do assistente
    await saveMessage(supabase, sessionId, 'assistant', response);

    return new Response(
      JSON.stringify({ response, sessionId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[chat-pwa] Erro:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        response: "Desculpe, ocorreu um erro. Por favor, tente novamente."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
