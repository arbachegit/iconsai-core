import { useState, useEffect, useCallback, useRef } from "react";
import { streamChat, extractSuggestions, removeSuggestionsFromText } from "@/lib/chat-stream";
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

export function useChatKnowYOU() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([
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
  
  const audioPlayerRef = useRef<AudioStreamPlayer>(new AudioStreamPlayer());
  const { toast } = useToast();
  const { settings } = useAdminSettings();
  const { createSession, updateSession } = useChatAnalytics();

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

    // Create analytics session
    createSession({ session_id: sessionId, user_name: null }).catch(console.error);
  }, [sessionId, createSession]);

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
            onDelta: (chunk) => updateAssistantMessage(chunk),
            onDone: async () => {
            const extractedSuggestions = extractSuggestions(fullResponse);
            if (extractedSuggestions.length > 0) {
              setSuggestions(extractedSuggestions);
            }

            const cleanedResponse = removeSuggestionsFromText(fullResponse);

            // Gerar áudio da resposta (somente se habilitado)
            if (settings?.chat_audio_enabled) {
              setIsGeneratingAudio(true);
              try {
                const audioUrl = await generateAudioUrl(cleanedResponse);
                
                setMessages((prev) => {
                  const updated = prev.map((m, i) =>
                    i === prev.length - 1
                      ? { ...m, content: cleanedResponse, audioUrl }
                      : m
                  );
                  saveHistory(updated);
                  return updated;
                });

                // Auto-play do áudio se habilitado
                if (settings?.auto_play_audio) {
                  const messageIndex = messages.length;
                  setCurrentlyPlayingIndex(messageIndex);
                  await audioPlayerRef.current.playAudioFromUrl(audioUrl);
                  setCurrentlyPlayingIndex(null);
                }

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

        // Common post-processing for both paths
        const extractedSuggestions = extractSuggestions(fullResponse);
        if (extractedSuggestions.length > 0) {
          setSuggestions(extractedSuggestions);
        }

        const cleanedResponse = removeSuggestionsFromText(fullResponse);

        // Gerar áudio da resposta (somente se habilitado)
        if (settings?.chat_audio_enabled) {
          setIsGeneratingAudio(true);
          try {
            const audioUrl = await generateAudioUrl(cleanedResponse);
            
            setMessages((prev) => {
              const updated = prev.map((m, i) =>
                i === prev.length - 1
                  ? { ...m, content: cleanedResponse, audioUrl }
                  : m
              );
              saveHistory(updated);
              return updated;
            });

            // Auto-play do áudio se habilitado
            if (settings?.auto_play_audio) {
              const messageIndex = messages.length;
              setCurrentlyPlayingIndex(messageIndex);
              await audioPlayerRef.current.playAudioFromUrl(audioUrl);
              setCurrentlyPlayingIndex(null);
            }

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
    [messages, isLoading, toast, saveHistory, settings, sessionId, updateSession, attachedDocumentId, analyzeSentiment]
  );

  const clearHistory = useCallback(() => {
    audioPlayerRef.current.stop();
    setMessages([]);
    setCurrentlyPlayingIndex(null);
    setSuggestions([
      "O que é telemedicina?",
      "Como prevenir doenças crônicas?",
      "Tendências em saúde digital",
    ]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const playAudio = useCallback(async (messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message?.audioUrl) return;

    try {
      audioPlayerRef.current.stop();
      setCurrentlyPlayingIndex(messageIndex);
      await audioPlayerRef.current.playAudioFromUrl(message.audioUrl);
      setCurrentlyPlayingIndex(null);
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      toast({
        title: "Erro",
        description: "Não foi possível reproduzir o áudio",
        variant: "destructive",
      });
      setCurrentlyPlayingIndex(null);
    }
  }, [messages, toast]);

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
        const { data, error } = await import("@/integrations/supabase/client").then(
          (m) => m.supabase.functions.invoke("generate-image", {
            body: { prompt },
          })
        );

        if (error) throw error;

        if (!data?.imageUrl) {
          throw new Error("Nenhuma imagem foi gerada");
        }

        // Adicionar mensagem do assistente com a imagem
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
          title: "Erro ao gerar imagem",
          description: error.message || "Não foi possível gerar a imagem. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingImage(false);
      }
    },
    [messages, isGeneratingImage, toast, saveHistory]
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
    suggestions,
    currentSentiment,
    activeDisclaimer,
    attachedDocumentId,
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
