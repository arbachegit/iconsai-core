import { useState, useEffect, useCallback, useRef } from "react";
import { streamChat, extractSuggestions, removeSuggestionsFromText } from "@/lib/chat-stream";
import { AudioStreamPlayer, generateAudioUrl } from "@/lib/audio-player";
import { useToast } from "@/hooks/use-toast";
import { useAdminSettings } from "./useAdminSettings";
import { useChatAnalytics } from "./useChatAnalytics";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  audioUrl?: string;
  imageUrl?: string;
  showMap?: boolean;
  coordinates?: { lat: number; lng: number };
  hospitalName?: string;
  voiceMessageUrl?: string;
  voiceMessageDuration?: number;
}

const STORAGE_KEY = "knowyou_chat_history";

export function useChatKnowYOU() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<number | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [suggestions, setSuggestions] = useState<string[]>([
    "O que é telemedicina?",
    "Como prevenir doenças crônicas?",
    "Tendências em saúde digital",
  ]);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random()}`);
  
  const audioPlayerRef = useRef<AudioStreamPlayer>(new AudioStreamPlayer());
  const { toast } = useToast();
  const { settings } = useAdminSettings();
  const { createSession, updateSession } = useChatAnalytics();

  // Configure progress callback
  useEffect(() => {
    audioPlayerRef.current.setProgressCallback((progress, duration) => {
      setAudioProgress(progress);
      setAudioDuration(duration);
    });
  }, []);

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
          onDone: async () => {
            const extractedSuggestions = extractSuggestions(fullResponse);
            if (extractedSuggestions.length > 0) {
              setSuggestions(extractedSuggestions);
            }

            const cleanedResponse = removeSuggestionsFromText(fullResponse);

            // Detect Hospital Moinhos de Vento mentions
            const hospitalRegex = /hospital\s+moinhos\s+de\s+vento/i;
            const mentionsHospital = hospitalRegex.test(cleanedResponse) || hospitalRegex.test(input);

            // Gerar áudio da resposta (somente se habilitado)
            if (settings?.chat_audio_enabled) {
              setIsGeneratingAudio(true);
              try {
                const audioUrl = await generateAudioUrl(cleanedResponse);
                
                setMessages((prev) => {
                  const updated = prev.map((m, i) =>
                    i === prev.length - 1
                      ? { 
                          ...m, 
                          content: cleanedResponse, 
                          audioUrl,
                          showMap: mentionsHospital,
                          coordinates: mentionsHospital ? { lat: -30.025806, lng: -51.195306 } : undefined,
                          hospitalName: mentionsHospital ? "Hospital Moinhos de Vento" : undefined,
                        }
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
                      ? { 
                          ...m, 
                          content: cleanedResponse,
                          showMap: mentionsHospital,
                          coordinates: mentionsHospital ? { lat: -30.025806, lng: -51.195306 } : undefined,
                          hospitalName: mentionsHospital ? "Hospital Moinhos de Vento" : undefined,
                        }
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
                    ? { 
                        ...m, 
                        content: cleanedResponse,
                        showMap: mentionsHospital,
                        coordinates: mentionsHospital ? { lat: -30.025806, lng: -51.195306 } : undefined,
                        hospitalName: mentionsHospital ? "Hospital Moinhos de Vento" : undefined,
                      }
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

  const pauseAudio = useCallback(async () => {
    await audioPlayerRef.current.pause();
    setIsAudioPaused(true);
  }, []);

  const resumeAudio = useCallback(async () => {
    await audioPlayerRef.current.resume();
    setIsAudioPaused(false);
  }, []);

  const stopAudio = useCallback(() => {
    audioPlayerRef.current.stop();
    setCurrentlyPlayingIndex(null);
    setIsAudioPaused(false);
  }, []);

  const downloadAudio = useCallback((messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message?.audioUrl) return;

    const link = document.createElement('a');
    link.href = message.audioUrl;
    link.download = `knowyou-audio-${messageIndex + 1}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [messages]);

  const changePlaybackRate = useCallback((rate: number) => {
    audioPlayerRef.current.setPlaybackRate(rate);
    setPlaybackRate(rate);
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

  const sendVoiceMessage = useCallback(
    async (audioBlob: Blob) => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        
        // Generate unique filename
        const fileName = `voice-${Date.now()}.webm`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('voice-messages')
          .upload(fileName, audioBlob, {
            contentType: 'audio/webm;codecs=opus',
            cacheControl: '3600',
          });

        if (uploadError) {
          console.error('Erro ao fazer upload da mensagem de voz:', uploadError);
          toast({
            title: "Erro ao enviar mensagem de voz",
            description: "Não foi possível fazer upload do áudio.",
            variant: "destructive",
          });
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('voice-messages')
          .getPublicUrl(fileName);

        // Calculate duration (approximate based on blob size)
        const estimatedDuration = Math.round(audioBlob.size / 16000); // Rough estimate

        // Create user message with voice
        const userMessage: Message = {
          role: "user",
          content: "[Mensagem de voz]",
          timestamp: new Date(),
          voiceMessageUrl: publicUrl,
          voiceMessageDuration: estimatedDuration,
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        saveHistory(updatedMessages);

        // Send text indication to AI
        await sendMessage("[Usuário enviou uma mensagem de voz - responda de forma contextual]");
        
      } catch (error) {
        console.error('Erro ao processar mensagem de voz:', error);
        toast({
          title: "Erro",
          description: "Não foi possível processar a mensagem de voz.",
          variant: "destructive",
        });
      }
    },
    [messages, toast, saveHistory, sendMessage]
  );

  const saveConversation = useCallback(async () => {
    if (messages.length === 0) return;

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Generate title from first user message
      const firstUserMessage = messages.find(m => m.role === "user");
      const title = firstUserMessage 
        ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
        : "Nova conversa";

      // Convert messages to plain JSON
      const messagesJson = messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        audioUrl: m.audioUrl,
        imageUrl: m.imageUrl,
        showMap: m.showMap,
        coordinates: m.coordinates,
        hospitalName: m.hospitalName,
        voiceMessageUrl: m.voiceMessageUrl,
        voiceMessageDuration: m.voiceMessageDuration,
      }));

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("conversation_history")
        .select("id")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (existing) {
        // Update existing conversation
        await supabase
          .from("conversation_history")
          .update({
            messages: messagesJson as any,
            updated_at: new Date().toISOString(),
          })
          .eq("session_id", sessionId);
      } else {
        // Insert new conversation
        await supabase
          .from("conversation_history")
          .insert({
            session_id: sessionId,
            title,
            messages: messagesJson as any,
          });
      }

      toast({
        title: "Conversa salva",
        description: "A conversa foi salva com sucesso no histórico.",
      });
    } catch (error) {
      console.error("Erro ao salvar conversa:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a conversa.",
        variant: "destructive",
      });
    }
  }, [messages, sessionId, toast]);

  const loadConversation = useCallback((newSessionId: string, conversationMessages: any[]) => {
    audioPlayerRef.current.stop();
    setCurrentlyPlayingIndex(null);
    
    const loadedMessages = conversationMessages.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
    
    setMessages(loadedMessages);
    saveHistory(loadedMessages);
  }, [saveHistory]);

  // Auto-save conversation periodically
  useEffect(() => {
    if (messages.length > 0) {
      const autoSave = setTimeout(() => {
        saveConversation();
      }, 5000); // Auto-save after 5 seconds of inactivity

      return () => clearTimeout(autoSave);
    }
  }, [messages, saveConversation]);

  return {
    messages,
    isLoading,
    isGeneratingAudio,
    isGeneratingImage,
    currentlyPlayingIndex,
    isAudioPaused,
    audioProgress,
    audioDuration,
    playbackRate,
    suggestions,
    sessionId,
    sendMessage,
    sendVoiceMessage,
    clearHistory,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    downloadAudio,
    changePlaybackRate,
    generateImage,
    saveConversation,
    loadConversation,
  };
}
