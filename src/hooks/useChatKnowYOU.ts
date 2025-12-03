import { useState, useEffect, useCallback, useRef } from "react";
import { streamChat, extractNextSteps, removeNextStepsFromText } from "@/lib/chat-stream";
import { AudioStreamPlayer, generateAudioUrl } from "@/lib/audio-player";
import { useToast } from "@/hooks/use-toast";
import { useAdminSettings } from "./useAdminSettings";
import { useChatAnalytics } from "./useChatAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";


interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  audioUrl?: string;
  imageUrl?: string;
}

const STORAGE_KEY = "knowyou_chat_history";
const PREFS_STORAGE_KEY = "knowyou_chat_preferences";

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

export function useChatKnowYOU() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<number | null>(null);
  const [nextSteps, setNextSteps] = useState<string[]>([
    "O que é telemedicina?",
    "Como prevenir doenças crônicas?",
    "Tendências em saúde digital",
  ]);
  const [currentSentiment, setCurrentSentiment] = useState<{
    label: "positive" | "negative" | "neutral";
    score: number;
  } | null>(null);
  const [sessionId] = useState(() => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timestamp = Date.now();
    return `chat_${dateStr}_${timestamp}`;
  });
  const [activeDisclaimer, setActiveDisclaimer] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [attachedDocumentId, setAttachedDocumentId] = useState<string | null>(null);
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
  const { settings } = useAdminSettings();
  const { createSession, updateSession } = useChatAnalytics();
  const [audioProgress, setAudioProgress] = useState<{
    currentTime: number;
    duration: number;
  }>({ currentTime: 0, duration: 0 });

  // Configurar callback de progresso do áudio
  useEffect(() => {
    audioPlayerRef.current.setOnProgress((currentTime, duration) => {
      setAudioProgress({ currentTime, duration });
    });
  }, []);

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
          .eq('chat_type', 'health')
          .single();
        
        if (data) {
          setUserPreferences({
            responseStyle: data.response_style as UserPreferences['responseStyle'],
            interactionCount: data.total_interactions,
            intentConfirmed: data.intent_confirmed,
          });
        }
      } catch (error) {
        // Ignorar erro se não existir registro
        console.log("No preferences found, using defaults");
      }
    };
    loadPreferences();

    // Create analytics session
    createSession({ session_id: sessionId, user_name: null }).catch(console.error);
  }, [sessionId, createSession]);

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
          chat_type: 'health',
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
        chat_type: 'health',
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
        label: data.sentiment_label as "positive" | "negative" | "neutral",
        score: parseFloat(data.sentiment_score),
      };

      setCurrentSentiment(sentiment);

      // Verificar se precisa enviar alerta
      if (
        settings?.alert_enabled &&
        sentiment.label === "negative" &&
        sentiment.score < (settings.alert_threshold || 0.3) &&
        settings.alert_email
      ) {
        // Enviar alerta
        await supabase.functions.invoke("sentiment-alert", {
          body: {
            session_id: sessionId,
            sentiment_label: sentiment.label,
            sentiment_score: sentiment.score,
            last_messages: currentMessages.slice(-3).map((m) => ({ role: m.role, content: m.content })),
            alert_email: settings.alert_email,
          },
        });
      }

      return sentiment;
    } catch (error) {
      console.error("Erro ao analisar sentimento:", error);
      return null;
    }
  }, [sessionId, settings]);

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

      // Detectar preferência de estilo na resposta do usuário
      detectAndSaveStylePreference(input);
      
      // Atualizar contador de interações
      updateInteractionCount();

      // Análise de sentimento em tempo real
      await analyzeSentiment(input, newMessages);

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
                ? { ...m, content: removeNextStepsFromText(assistantContent) }
                : m
            );
          }
          return [
            ...prev,
            {
              role: "assistant",
              content: removeNextStepsFromText(assistantContent),
              timestamp: new Date(),
            },
          ];
        });
      };

      try {
        // Use chat-unified if document is attached
        if (attachedDocumentId) {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-unified`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
                chatType: "health",
                documentId: attachedDocumentId,
                sessionId: sessionId,
                userPreferences: {
                  responseStyle: userPreferences.responseStyle,
                  interactionCount: userPreferences.interactionCount,
                  isNewUser: userPreferences.interactionCount < 3,
                },
              }),
            }
          );

          if (!response.ok || !response.body) {
            throw new Error("Failed to start stream");
          }

          const reader = response.body.getReader();
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
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) updateAssistantMessage(content);
              } catch {
                textBuffer = line + "\n" + textBuffer;
                break;
              }
            }
          }

          // Clear attached document after sending
          setAttachedDocumentId(null);
        } else {
          // Use regular chat endpoint
          await streamChat({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            sessionId: sessionId,
            userPreferences: {
              responseStyle: userPreferences.responseStyle,
              interactionCount: userPreferences.interactionCount,
              isNewUser: userPreferences.interactionCount < 3,
            },
            previousTopics: topicTracking.previousTopics,
            topicStreak: topicTracking.topicStreak,
            onDelta: (chunk) => updateAssistantMessage(chunk),
            onDone: async () => {
            // Debug: verificar conteúdo antes da extração
            console.log('[useChatKnowYOU] Full response before extraction:', fullResponse.slice(-500));
            console.log('[useChatKnowYOU] Contains PRÓXIMOS_PASSOS:', fullResponse.includes('PRÓXIMOS_PASSOS'));
            
            // Extrair próximos passos (antes das sugestões)
            const extractedNextSteps = extractNextSteps(fullResponse);
            console.log('[useChatKnowYOU] Extracted nextSteps:', extractedNextSteps);
            if (extractedNextSteps.length > 0) {
              setNextSteps(extractedNextSteps);
            } else {
              setNextSteps([]);
            }

            // Remove nextSteps from response
            const cleanedResponse = removeNextStepsFromText(fullResponse);

            // Update topic tracking
            const topicWords = input.toLowerCase()
              .replace(/[?!.,]/g, "")
              .split(" ")
              .filter((w: string) => w.length > 3 && !["o que", "como", "qual", "quais", "onde", "quando", "porque", "para", "sobre", "este", "esta", "isso", "aqui"].includes(w))
              .slice(0, 3);
            const extractedTopic = topicWords.join(" ") || "geral";
            
            setTopicTracking(prev => {
              const newTopics = [...prev.previousTopics, extractedTopic].slice(-10);
              return {
                previousTopics: newTopics,
                topicStreak: prev.topicStreak + 1,
                currentTopic: extractedTopic,
              };
            });

            // Gerar áudio da resposta (somente se habilitado)
            if (settings?.chat_audio_enabled) {
              setIsGeneratingAudio(true);
              try {
                const audioUrl = await generateAudioUrl(cleanedResponse, "health");
                
                setMessages((prev) => {
                  const updated = prev.map((m, i) =>
                    i === prev.length - 1
                      ? { ...m, content: cleanedResponse, audioUrl }
                      : m
                  );
                  saveHistory(updated);
                  return updated;
                });

                // Update analytics with audio play
                updateSession({
                  session_id: sessionId,
                  updates: { audio_plays: messages.filter(m => m.audioUrl).length + 1 },
                }).catch(console.error);
              } catch (error) {
                console.error("Erro ao gerar áudio:", error);
                setMessages((prev) => {
                  const updated = prev.map((m, i) =>
                    i === prev.length - 1
                      ? { ...m, content: cleanedResponse }
                      : m
                  );
                  saveHistory(updated);
                  return updated;
                });
              } finally {
                setIsGeneratingAudio(false);
              }
            } else {
              // No audio - just save the message
              setMessages((prev) => {
                const updated = prev.map((m, i) =>
                  i === prev.length - 1
                    ? { ...m, content: cleanedResponse }
                    : m
                );
                saveHistory(updated);
                return updated;
              });
            }

            // Update analytics with message count
            updateSession({
              session_id: sessionId,
              updates: { message_count: messages.length + 2 },
            }).catch(console.error);

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
        }
      } catch (error) {
        console.error("Error in chat:", error);
        toast({
          title: "Erro",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    },
    [messages, isLoading, toast, saveHistory, settings, sessionId, updateSession, attachedDocumentId, analyzeSentiment]
  );

  const clearHistory = useCallback(() => {
    audioPlayerRef.current.stop();
    setMessages([]);
    setCurrentlyPlayingIndex(null);
    setNextSteps([
      "O que é telemedicina?",
      "Como prevenir doenças crônicas?",
      "Tendências em saúde digital",
    ]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const playAudio = useCallback(async (messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message) return;

    let audioUrlToPlay = message.audioUrl;

    // Se não tem audioUrl OU é uma blob URL (que pode ter expirado), regenerar
    if (!audioUrlToPlay || audioUrlToPlay.startsWith('blob:')) {
      try {
        setIsGeneratingAudio(true);
        const generatedUrl = await generateAudioUrl(message.content, "health");
        
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
      audioPlayerRef.current.stop();
      setCurrentlyPlayingIndex(messageIndex);
      await audioPlayerRef.current.playAudioFromUrl(audioUrlToPlay);
      setCurrentlyPlayingIndex(null);
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
      if (!prompt.trim() || isGeneratingImage) return;

      setIsGeneratingImage(true);

      try {
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: { prompt },
        });

        if (error) throw error;

        // Tratamento de guardrail vindo da Edge Function (status 200)
        if (data?.error === "guardrail_violation") {
          const rejectedTerm = data.rejected_term || prompt;

          const guardrailMessage: Message = {
            role: "assistant",
            content:
              `Sou especializado em auxiliar profissionais de saúde. ` +
              `Não posso criar imagens sobre "${rejectedTerm}", mas posso gerar ilustrações sobre saúde, medicina, anatomia e bem-estar. Como posso ajudá-lo?`,
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
          content: `Aqui está a imagem sobre: ${prompt}`,
          timestamp: new Date(),
          imageUrl: data.imageUrl,
        };

        const updatedMessages = [...messages, imageMessage];
        setMessages(updatedMessages);
        saveHistory(updatedMessages);

        toast({
          title: "Imagem gerada",
          description: "A imagem foi criada com sucesso!",
        });
      } catch (error: any) {
        console.error("Erro ao gerar imagem:", error);
        toast({
          title: t("chat.imageRejected"),
          description: error.message || t("chat.imageGenerationError"),
          variant: "destructive",
        });
      } finally {
        setIsGeneratingImage(false);
      }
    },
    [messages, isGeneratingImage, toast, saveHistory, t]
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

  const attachDocument = useCallback((documentId: string, documentName: string) => {
    setAttachedDocumentId(documentId);
    setActiveDisclaimer({
      title: t('documentAttach.disclaimerTitle'),
      message: t('documentAttach.disclaimerMessage', { documentName }),
    });
    toast({
      title: t('documentAttach.attached'),
      description: t('documentAttach.attachedDesc', { documentName }),
    });
  }, [toast, t]);

  const detachDocument = useCallback(() => {
    setAttachedDocumentId(null);
    setActiveDisclaimer(null);
    toast({
      title: t('documentAttach.removed'),
      description: t('documentAttach.removedDesc'),
    });
  }, [toast, t]);

  return {
    messages,
    isLoading,
    isGeneratingAudio,
    isGeneratingImage,
    currentlyPlayingIndex,
    nextSteps,
    currentSentiment,
    activeDisclaimer,
    attachedDocumentId,
    audioProgress,
    sendMessage,
    clearHistory,
    playAudio,
    stopAudio,
    generateImage,
    transcribeAudio,
    attachDocument,
    detachDocument,
  };
}
