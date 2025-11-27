import { useState, useEffect, useCallback, useRef } from "react";
import { extractSuggestions, removeSuggestionsFromText } from "@/lib/chat-stream";
import { AudioStreamPlayer, generateAudioUrl } from "@/lib/audio-player";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  audioUrl?: string;
  imageUrl?: string;
}

const STORAGE_KEY = "knowyou_study_chat_history";
const CHAT_FUNCTION = "chat-study";

export function useChatStudy() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([
    "O que é a KnowRisk?",
    "Como funciona o ACC?",
    "O que é o KnowYOU?",
  ]);
  const [currentSentiment, setCurrentSentiment] = useState<{
    label: "positive" | "negative" | "neutral";
    score: number;
  } | null>(null);
  const [sessionId] = useState(() => `study_${new Date().toISOString().split('T')[0]}_${Date.now()}`);
  
  const audioPlayerRef = useRef<AudioStreamPlayer>(new AudioStreamPlayer());
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

  const analyzeSentiment = useCallback(async (text: string, currentMessages: Message[]) => {
    try {
      const { data, error } = await supabase.functions.invoke("analyze-sentiment", {
        body: { text },
      });

      if (error) throw error;

      const sentiment = {
        label: data.sentiment_label,
        score: data.sentiment_score,
      };

      setCurrentSentiment(sentiment);

      // Save to database with sentiment
      await saveConversationToDatabase(currentMessages, sentiment);

      // Trigger alert if negative sentiment
      if (sentiment.label === "negative" && sentiment.score < 0.3) {
        await supabase.functions.invoke("sentiment-alert", {
          body: {
            message: text,
            sentiment: sentiment.label,
            score: sentiment.score,
            chat_type: "study",
          },
        });
      }
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
    }
  }, []);

  const saveConversationToDatabase = useCallback(async (msgs: Message[], sentiment: any) => {
    try {
      const title = msgs.find(m => m.role === "user")?.content?.substring(0, 50) || 'Nova conversa de estudo';
      
      const { error } = await supabase.from("conversation_history").upsert({
        session_id: sessionId,
        title: `Estudo - ${title}`,
        messages: msgs as any,
        sentiment_label: sentiment?.label,
        sentiment_score: sentiment?.score,
        chat_type: "study",
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  }, [sessionId]);

  const sendMessage = useCallback(
    async (input: string) => {
      if (!input.trim()) return;

      const userMessage: Message = {
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      saveHistory(updatedMessages);
      setIsLoading(true);

      let assistantContent = "";
      let newSuggestions: string[] = [];

      try {
        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-study`;

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!resp.ok || !resp.body) {
          throw new Error("Falha ao iniciar conversa");
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
              if (content) {
                assistantContent += content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];

                  if (lastMessage?.role === "assistant") {
                    lastMessage.content = assistantContent;
                  } else {
                    newMessages.push({
                      role: "assistant",
                      content: assistantContent,
                      timestamp: new Date(),
                    });
                  }
                  return newMessages;
                });
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Extrair sugestões
        const extracted = extractSuggestions(assistantContent);
        if (extracted.length > 0) {
          newSuggestions = extracted;
          assistantContent = removeSuggestionsFromText(assistantContent);
        }

        const finalMessages = updatedMessages.map((m, i) =>
          i === updatedMessages.length
            ? m
            : m
        );
        
        const assistantMessage: Message = {
          role: "assistant",
          content: assistantContent,
          timestamp: new Date(),
        };

        const finalUpdated = [...updatedMessages, assistantMessage];
        setMessages(finalUpdated);
        saveHistory(finalUpdated);

        if (newSuggestions.length > 0) {
          setSuggestions(newSuggestions);
        }

        // Analyze sentiment
        analyzeSentiment(input, finalUpdated);

        // Gerar áudio para a resposta
        try {
          setIsGeneratingAudio(true);
          const audioUrl = await generateAudioUrl(assistantContent);
          
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg?.role === "assistant") {
              lastMsg.audioUrl = audioUrl;
            }
            return updated;
          });
        } catch (audioError) {
          console.error("Erro ao gerar áudio:", audioError);
        } finally {
          setIsGeneratingAudio(false);
        }

      } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        toast({
          title: "Erro",
          description: "Não foi possível enviar a mensagem. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, saveHistory, toast, analyzeSentiment]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setSuggestions(["O que é a KnowRisk?", "Como funciona o ACC?", "O que é o KnowYOU?"]);
    localStorage.removeItem(STORAGE_KEY);
    toast({
      title: "Histórico limpo",
      description: "Todas as mensagens foram removidas.",
    });
  }, [toast]);

  const playAudio = useCallback(async (messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message?.audioUrl) return;

    try {
      setCurrentlyPlayingIndex(messageIndex);
      await audioPlayerRef.current.playAudioFromUrl(message.audioUrl);
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      toast({
        title: "Erro",
        description: "Não foi possível reproduzir o áudio.",
        variant: "destructive",
      });
    } finally {
      setCurrentlyPlayingIndex(null);
    }
  }, [messages, toast]);

  const stopAudio = useCallback(() => {
    audioPlayerRef.current.stop();
    setCurrentlyPlayingIndex(null);
  }, []);

  const generateImage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;

      setIsGeneratingImage(true);

      try {
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: { prompt: prompt.trim() },
        });

        if (error) throw error;

        const imageMessage: Message = {
          role: "assistant",
          content: `Imagem gerada: "${prompt}"`,
          timestamp: new Date(),
          imageUrl: data.imageUrl,
        };

        const updatedMessages = [...messages, imageMessage];
        setMessages(updatedMessages);
        saveHistory(updatedMessages);

        toast({
          title: "Imagem gerada",
          description: "A imagem foi criada com sucesso.",
        });
      } catch (error) {
        console.error("Erro ao gerar imagem:", error);
        toast({
          title: "Erro",
          description: "Não foi possível gerar a imagem. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingImage(false);
      }
    },
    [messages, saveHistory, toast]
  );

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      // Call voice-to-text edge function
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (error) throw error;
      return data.text || '';
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }, []);

  return {
    messages,
    isLoading,
    isGeneratingAudio,
    isGeneratingImage,
    currentlyPlayingIndex,
    suggestions,
    currentSentiment,
    sendMessage,
    clearHistory,
    playAudio,
    stopAudio,
    generateImage,
    transcribeAudio,
  };
}
