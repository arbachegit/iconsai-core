type Message = { role: "user" | "assistant"; content: string };

interface UserPreferences {
  responseStyle: 'detailed' | 'concise' | 'not_set';
  interactionCount: number;
  isNewUser: boolean;
}

interface StreamChatOptions {
  messages: Message[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError?: (error: Error) => void;
  sessionId?: string;
  userPreferences?: UserPreferences;
  previousTopics?: string[];
  topicStreak?: number;
}

export async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
  sessionId,
  userPreferences,
  previousTopics = [],
  topicStreak = 0,
}: StreamChatOptions) {
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, sessionId, userPreferences, previousTopics, topicStreak }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        throw new Error("Limite de uso excedido. Tente novamente em instantes.");
      }
      if (resp.status === 402) {
        throw new Error("Créditos insuficientes no workspace Lovable.");
      }
      throw new Error("Falha ao iniciar conversa com o assistente");
    }

    if (!resp.body) {
      throw new Error("Resposta sem conteúdo");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Flush buffer final
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          // Ignora fragmentos parciais
        }
      }
    }

    onDone();
  } catch (error) {
    console.error("Erro no streaming:", error);
    if (onError) {
      onError(error instanceof Error ? error : new Error("Erro desconhecido"));
    }
  }
}

export function extractNextSteps(text: string): string[] {
  // Regex para capturar arrays JSON mesmo com quebras de linha
  const match = text.match(/PRÓXIMOS_PASSOS:\s*(\[[\s\S]*?\])/);
  if (match) {
    try {
      // Limpar possíveis quebras de linha dentro do JSON
      const cleanJson = match[1].replace(/\n/g, ' ').replace(/\s+/g, ' ');
      const parsed = JSON.parse(cleanJson);
      
      // Validar que é array de strings
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }
  return [];
}

export function removeNextStepsFromText(text: string): string {
  // Remover formato estruturado: PRÓXIMOS_PASSOS: [...]
  let cleaned = text.replace(/\n*PRÓXIMOS_PASSOS:\s*\[[\s\S]*?\]\s*/g, "");
  
  // Remover formato markdown: 🎯 Próximos passos para aprofundar: [...]
  cleaned = cleaned.replace(/\n*🎯\s*Próximos passos[^:]*:\s*\[[\s\S]*?\]\s*/gi, "");
  
  // Remover variação sem emoji com lista
  cleaned = cleaned.replace(/\n*Próximos passos para aprofundar:\s*\[[\s\S]*?\]\s*/gi, "");
  
  // Remover formato markdown com lista de itens em bold/asteriscos
  cleaned = cleaned.replace(/\n*🎯\s*Próximos passos[^:]*:[\s\S]*?(?=\n\n|\n(?=[A-Z])|$)/gi, "");
  
  // Remover SUGESTÕES se ainda aparecer
  cleaned = cleaned.replace(/\n*SUGESTÕES:\s*\[.*?\]\s*$/g, "");
  
  return cleaned.trim();
}
