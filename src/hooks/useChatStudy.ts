import { useState, useEffect, useCallback, useRef } from "react";
import { extractNextSteps, removeNextStepsFromText } from "@/lib/chat-stream";
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

interface UserPreferences {
  responseStyle: 'detailed' | 'concise' | 'not_set';
  interactionCount: number;
  intentConfirmed: boolean;
}

interface TopicTracking {
  previousTopics: string[];
  topicStreak: number;
  currentTopic: string;
}

export function useChatStudy() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<number | null>(null);
  const [nextSteps, setNextSteps] = useState<string[]>([
    "O que é a KnowRisk?",
    "Como funciona o ACC?",
    "O que é o KnowYOU?",
  ]);
  const [currentSentiment, setCurrentSentiment] = useState<{
    label: "positive" | "negative" | "neutral";
    score: number;
  } | null>(null);
  const [sessionId] = useState(() => `study_${new Date().toISOString().split('T')[0]}_${Date.now()}`);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    responseStyle: 'not_set',
    interactionCount: 0,
    intentConfirmed: false,
  });
  const [topicTracking, setTopicTracking] = useState<TopicTracking>({
    previousTopics: [],
    topicStreak: 0,
    currentTopic: '',
  });
  
  const audioPlayerRef = useRef<AudioStreamPlayer>(new AudioStreamPlayer());
  const { toast } = useToast();

  // Carregar histórico e preferências
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

    // Carregar preferências do banco de dados
    const loadPreferences = async () => {
      try {
        const { data } = await supabase
          .from('user_chat_preferences')
          .select('*')
          .eq('session_id', sessionId)
          .eq('chat_type', 'study')
          .single();
        
        if (data) {
          setUserPreferences({
            responseStyle: data.response_style as UserPreferences['responseStyle'],
            interactionCount: data.total_interactions,
            intentConfirmed: data.intent_confirmed,
          });
        }
      } catch (error) {
        console.log("No preferences found, using defaults");
      }
    };
    loadPreferences();
  }, [sessionId]);

  // Salvar histórico no localStorage
  const saveHistory = useCallback((msgs: Message[]) => {
    try {
      // Limpar blob URLs antes de salvar (elas expiram após reload)
      const messagesForStorage = msgs.map(m => ({
        ...m,
        audioUrl: m.audioUrl && !m.audioUrl.startsWith('blob:') ? m.audioUrl : undefined,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messagesForStorage));
    } catch (error) {
      console.error("Erro ao salvar histórico:", error);
    }
  }, []);

  // Detectar e salvar preferência de estilo baseado na resposta do usuário
  const detectAndSaveStylePreference = useCallback(async (userResponse: string) => {
    const lowerResponse = userResponse.toLowerCase();
    let detectedStyle: 'detailed' | 'concise' | null = null;
    
    if (lowerResponse.includes('detalhad') || lowerResponse.includes('complet') || 
        lowerResponse.includes('aprofund') || lowerResponse.includes('explique mais') ||
        lowerResponse.includes('mais informaç')) {
      detectedStyle = 'detailed';
    } else if (lowerResponse.includes('resumo') || lowerResponse.includes('direto') || 
               lowerResponse.includes('concis') || lowerResponse.includes('breve') ||
               lowerResponse.includes('objetivo') || lowerResponse.includes('curto')) {
      detectedStyle = 'concise';
    }
    
    if (detectedStyle && userPreferences.responseStyle === 'not_set') {
      try {
        await supabase.from('user_chat_preferences').upsert({
          session_id: sessionId,
          chat_type: 'study',
          response_style: detectedStyle,
          response_style_confidence: 0.8,
          total_interactions: userPreferences.interactionCount,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_id,chat_type' });
        
        setUserPreferences(prev => ({ ...prev, responseStyle: detectedStyle! }));
        console.log(`Style preference detected and saved: ${detectedStyle}`);
      } catch (error) {
        console.error("Error saving style preference:", error);
      }
    }
  }, [sessionId, userPreferences]);

  // Atualizar contador de interações
  const updateInteractionCount = useCallback(async () => {
    const newCount = userPreferences.interactionCount + 1;
    try {
      await supabase.from('user_chat_preferences').upsert({
        session_id: sessionId,
        chat_type: 'study',
        total_interactions: newCount,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id,chat_type' });
      
      setUserPreferences(prev => ({ ...prev, interactionCount: newCount }));
    } catch (error) {
      console.error("Error updating interaction count:", error);
    }
  }, [sessionId, userPreferences.interactionCount]);

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
      }, { onConflict: 'session_id' });

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

      // Detectar preferência de estilo na resposta do usuário
      detectAndSaveStylePreference(input);
      
      // Atualizar contador de interações
      updateInteractionCount();

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
            sessionId: sessionId,
            userPreferences: {
              responseStyle: userPreferences.responseStyle,
              interactionCount: userPreferences.interactionCount,
              isNewUser: userPreferences.interactionCount < 3,
            },
            previousTopics: topicTracking.previousTopics,
            topicStreak: topicTracking.topicStreak,
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

        // Debug: verificar conteúdo antes da extração
        console.log('[useChatStudy] Full response before extraction:', assistantContent.slice(-500));
        console.log('[useChatStudy] Contains PRÓXIMOS_PASSOS:', assistantContent.includes('PRÓXIMOS_PASSOS'));
        
        // Extrair próximos passos
        const extractedNextSteps = extractNextSteps(assistantContent);
        console.log('[useChatStudy] Extracted nextSteps:', extractedNextSteps);
        if (extractedNextSteps.length > 0) {
          setNextSteps(extractedNextSteps);
        }
        
        // Limpar texto removendo PRÓXIMOS_PASSOS e SUGESTÕES
        assistantContent = removeNextStepsFromText(assistantContent);

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


        // Update topic tracking - extract topic from the user's question
        const topicWords = input.toLowerCase()
          .replace(/[?!.,]/g, "")
          .split(" ")
          .filter((w: string) => w.length > 3 && !["o que", "como", "qual", "quais", "onde", "quando", "porque", "para", "sobre", "este", "esta", "isso", "aqui"].includes(w))
          .slice(0, 3);
        const extractedTopic = topicWords.join(" ") || "geral";
        
        setTopicTracking(prev => {
          const newTopics = [...prev.previousTopics, extractedTopic].slice(-10); // Keep last 10 topics
          return {
            previousTopics: newTopics,
            topicStreak: prev.topicStreak + 1,
            currentTopic: extractedTopic,
          };
        });

        // Analyze sentiment
        analyzeSentiment(input, finalUpdated);

        // Gerar áudio para a resposta
        try {
          setIsGeneratingAudio(true);
          const audioUrl = await generateAudioUrl(assistantContent, "study");
          
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
    setNextSteps(["O que é a KnowRisk?", "Como funciona o ACC?", "O que é o KnowYOU?"]);
    localStorage.removeItem(STORAGE_KEY);
    toast({
      title: "Histórico limpo",
      description: "Todas as mensagens foram removidas.",
    });
  }, [toast]);

  const playAudio = useCallback(async (messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message) return;

    let audioUrlToPlay = message.audioUrl;

    // Se não tem audioUrl OU é uma blob URL (que pode ter expirado), regenerar
    if (!audioUrlToPlay || audioUrlToPlay.startsWith('blob:')) {
      try {
        setIsGeneratingAudio(true);
        const generatedUrl = await generateAudioUrl(message.content, "study");
        
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[messageIndex]) {
            updated[messageIndex] = { ...updated[messageIndex], audioUrl: generatedUrl };
          }
          saveHistory(updated);
          return updated;
        });
        
        audioUrlToPlay = generatedUrl;
      } catch (error) {
        console.error("Erro ao gerar áudio sob demanda:", error);
        toast({
          title: "Erro",
          description: "Não foi possível gerar o áudio.",
          variant: "destructive",
        });
        return;
      } finally {
        setIsGeneratingAudio(false);
      }
    }

    // Reproduzir o áudio
    try {
      setCurrentlyPlayingIndex(messageIndex);
      await audioPlayerRef.current.playAudioFromUrl(audioUrlToPlay);
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      // Se falhou mesmo após regenerar, limpar URL e permitir nova tentativa
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[messageIndex]) {
          updated[messageIndex] = { ...updated[messageIndex], audioUrl: undefined };
        }
        return updated;
      });
      toast({
        title: "Erro",
        description: "Não foi possível reproduzir o áudio. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCurrentlyPlayingIndex(null);
    }
  }, [messages, saveHistory, toast]);

  const stopAudio = useCallback(() => {
    try {
      audioPlayerRef.current.stop();
    } catch (e) {
      console.error('Error stopping audio:', e);
    }
    setCurrentlyPlayingIndex(null);
  }, []);

  const generateImage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;

      setIsGeneratingImage(true);

      try {
        const { data, error } = await supabase.functions.invoke("generate-image-study", {
          body: { prompt: prompt.trim() },
        });

        if (error) throw error;

        // Tratamento de guardrail vindo da Edge Function (status 200)
        if (data?.error === "guardrail_violation") {
          const rejectedTerm = data.rejected_term || prompt;

          const guardrailMessage: Message = {
            role: "assistant",
            content:
              `Sou especializado em ajudar a estudar sobre a KnowRISK, KnowYOU, ACC e o conteúdo deste website. ` +
              `Não posso ajudar com "${rejectedTerm}", mas posso responder sobre esses tópicos. Como posso ajudá-lo?`,
            timestamp: new Date(),
          };

          const updatedMessages = [...messages, guardrailMessage];
          setMessages(updatedMessages);
          saveHistory(updatedMessages);

          setIsGeneratingImage(false);
          return;
        }

        if (!data?.imageUrl) {
          throw new Error("Nenhuma imagem foi gerada");
        }

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
    nextSteps,
    currentSentiment,
    sendMessage,
    clearHistory,
    playAudio,
    stopAudio,
    generateImage,
    transcribeAudio,
  };
}
