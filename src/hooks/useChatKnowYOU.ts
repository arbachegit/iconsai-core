import { useState, useEffect, useCallback } from "react";
import { streamChat, extractSuggestions, removeSuggestionsFromText } from "@/lib/chat-stream";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const STORAGE_KEY = "knowyou_chat_history";

export function useChatKnowYOU() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "O que é telemedicina?",
    "Como prevenir doenças crônicas?",
    "Tendências em saúde digital",
  ]);
  const { toast } = useToast();

  // Carregar histórico do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(
          parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        );
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  }, []);

  // Salvar histórico no localStorage
  const saveHistory = useCallback((msgs: Message[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
    } catch (error) {
      console.error("Erro ao salvar histórico:", error);
    }
  }, []);

  const sendMessage = useCallback(
    async (input: string) => {
      if (!input.trim() || isLoading) return;

      const userMsg: Message = {
        role: "user",
        content: input,
        timestamp: new Date(),
      };

      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      saveHistory(newMessages);
      setIsLoading(true);

      let assistantContent = "";
      let fullResponse = "";

      const updateAssistantMessage = (nextChunk: string) => {
        assistantContent += nextChunk;
        fullResponse = assistantContent;

        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1
                ? { ...m, content: removeSuggestionsFromText(assistantContent) }
                : m
            );
          }
          return [
            ...prev,
            {
              role: "assistant",
              content: removeSuggestionsFromText(assistantContent),
              timestamp: new Date(),
            },
          ];
        });
      };

      try {
        await streamChat({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          onDelta: (chunk) => updateAssistantMessage(chunk),
          onDone: () => {
            const extractedSuggestions = extractSuggestions(fullResponse);
            if (extractedSuggestions.length > 0) {
              setSuggestions(extractedSuggestions);
            }

            setMessages((prev) => {
              const updated = prev.map((m, i) =>
                i === prev.length - 1
                  ? { ...m, content: removeSuggestionsFromText(fullResponse) }
                  : m
              );
              saveHistory(updated);
              return updated;
            });

            setIsLoading(false);
          },
          onError: (error) => {
            toast({
              title: "Erro",
              description: error.message,
              variant: "destructive",
            });
            setIsLoading(false);
          },
        });
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        toast({
          title: "Erro",
          description: "Não foi possível enviar a mensagem. Tente novamente.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    },
    [messages, isLoading, toast, saveHistory]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setSuggestions([
      "O que é telemedicina?",
      "Como prevenir doenças crônicas?",
      "Tendências em saúde digital",
    ]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    messages,
    isLoading,
    suggestions,
    sendMessage,
    clearHistory,
  };
}
