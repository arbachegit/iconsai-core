import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Bot, Send, Loader2, Sparkles, Paperclip, X, Volume2, Mic, Square, Image as ImageIcon, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useChat, ChatType } from "@/hooks/useChat";
import { MarkdownContent } from "@/components/MarkdownContent";
import { DataVisualization } from "@/components/chat/DataVisualization";
import FileProcessor from "@/components/chat/FileProcessor";
import { TypingIndicator } from "@/components/TypingIndicator";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface AgentConfigData {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar_url: string | null;
  rag_collection: string;
  system_prompt: string | null;
  greeting_message: string | null;
  rejection_message: string | null;
  capabilities: {
    voice?: boolean;
    file_upload?: boolean;
    charts?: boolean;
    drawing?: boolean;
    math?: boolean;
  } | null;
  maieutic_level: string | null;
  regional_tone: string | null;
  allowed_tags: string[] | null;
  forbidden_tags: string[] | null;
}

interface AgentChatProps {
  agentSlug: string;
  onClose?: () => void;
  className?: string;
  embedded?: boolean;
}

const DEFAULT_SUGGESTIONS: Record<string, string[]> = {
  company: [
    "O que é a KnowYOU?",
    "Quais são os serviços oferecidos?",
    "Como posso entrar em contato?",
  ],
  analyst: [
    "Analise estes dados",
    "Mostre estatísticas",
    "Gere um gráfico",
  ],
  study: [
    "Explique este conceito",
    "Resuma o documento",
    "Crie um quiz",
  ],
  health: [
    "Informações sobre sintomas",
    "Dicas de saúde",
    "Prevenção de doenças",
  ],
};

export const AgentChat = memo(function AgentChat({ 
  agentSlug, 
  onClose, 
  className = "",
  embedded = false 
}: AgentChatProps) {
  const { t } = useTranslation();
  const [agent, setAgent] = useState<AgentConfigData | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [input, setInput] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'waiting' | 'processing'>('idle');
  const [waitingCountdown, setWaitingCountdown] = useState(5);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const prefixTextRef = useRef<string>("");

  // Fetch agent config
  useEffect(() => {
    const fetchAgent = async () => {
      setIsLoadingAgent(true);
      const { data, error } = await supabase
        .from("chat_agents")
        .select("*")
        .eq("slug", agentSlug)
        .eq("is_active", true)
        .single();

      if (error) {
        console.error("Error fetching agent:", error);
        setIsLoadingAgent(false);
        return;
      }

      setAgent(data as AgentConfigData);
      setIsLoadingAgent(false);
    };

    fetchAgent();
  }, [agentSlug]);

  // Map agent slug to chat type
  const chatType: ChatType = agent?.rag_collection === "health" ? "health" : "study";

  const {
    messages,
    isLoading,
    isGeneratingAudio,
    suggestions,
    sendMessage,
    clearHistory,
    playAudio,
    stopAudio,
    currentlyPlayingIndex,
    transcribeAudio,
  } = useChat(
    {
      chatType,
      storageKey: `agent-chat-${agentSlug}`,
      sessionIdPrefix: `${agentSlug}_`,
      defaultSuggestions: DEFAULT_SUGGESTIONS[agentSlug] || [],
      imageEndpoint: "generate-image",
      guardrailMessage: agent?.rejection_message || "Desculpe, não posso ajudar com isso.",
    },
    {}
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !agent) return;
    sendMessage(input, {
      agentConfig: {
        systemPrompt: agent.system_prompt,
        maieuticLevel: agent.maieutic_level,
        regionalTone: agent.regional_tone,
        ragCollection: agent.rag_collection,
        allowedTags: agent.allowed_tags,
        forbiddenTags: agent.forbidden_tags,
      }
    });
    setInput("");
  }, [input, isLoading, sendMessage, agent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleFileProcessed = useCallback((data: any[], fileName: string, columns: string[]) => {
    if (!agent) return;
    sendMessage(`Arquivo carregado: ${fileName}`, { 
      fileData: { data, fileName, columns },
      agentConfig: {
        systemPrompt: agent.system_prompt,
        maieuticLevel: agent.maieutic_level,
        regionalTone: agent.regional_tone,
        ragCollection: agent.rag_collection,
        allowedTags: agent.allowed_tags,
        forbiddenTags: agent.forbidden_tags,
      }
    });
    setShowFileUpload(false);
  }, [sendMessage, agent]);

  const capabilities = agent?.capabilities || {};

  // Voice recording functions
  const recordingStartTimeRef = useRef<number>(0);
  const MIN_RECORDING_DURATION = 1000; // Minimum 1 second of recording

  const startRecording = async () => {
    if (!capabilities.voice) return;
    
    try {
      prefixTextRef.current = input;
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      // Use a supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      // Audio context for silence detection
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 2048;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceStart: number | null = null;
      let animationFrameId: number;
      let recordingActive = true;

      const checkSilence = () => {
        if (!recordingActive) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        // Only check silence after minimum recording duration
        const recordingDuration = Date.now() - recordingStartTimeRef.current;
        
        if (average < 10 && recordingDuration >= MIN_RECORDING_DURATION) {
          if (!silenceStart) {
            silenceStart = Date.now();
            setVoiceStatus('waiting');
          } else if (Date.now() - silenceStart > 5000) {
            recordingActive = false;
            mediaRecorder.stop();
            cancelAnimationFrame(animationFrameId);
            return;
          }
          setWaitingCountdown(Math.max(0, 5 - Math.floor((Date.now() - silenceStart) / 1000)));
        } else {
          silenceStart = null;
          setVoiceStatus('listening');
          setWaitingCountdown(5);
        }
        animationFrameId = requestAnimationFrame(checkSilence);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        recordingActive = false;
        cancelAnimationFrame(animationFrameId);
        audioContext.close();
        stream.getTracks().forEach(track => track.stop());

        // Ensure we have audio data
        if (audioChunksRef.current.length === 0) {
          console.error('No audio data collected');
          setIsRecording(false);
          setVoiceStatus('idle');
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        // Validate blob size (minimum ~1KB for valid audio)
        if (audioBlob.size < 1000) {
          console.error('Audio too short:', audioBlob.size, 'bytes');
          setIsRecording(false);
          setVoiceStatus('idle');
          return;
        }

        console.log('Audio blob size:', audioBlob.size, 'bytes, type:', audioBlob.type);

        setIsTranscribing(true);
        setVoiceStatus('processing');
        
        try {
          const transcribedText = await transcribeAudio(audioBlob);
          const prefix = prefixTextRef.current;
          const separator = prefix && !prefix.endsWith(' ') ? ' ' : '';
          setInput(prefix + separator + transcribedText.trim());
          prefixTextRef.current = "";
        } catch (error) {
          console.error('Transcription error:', error);
        } finally {
          setIsTranscribing(false);
          setVoiceStatus('idle');
          setIsRecording(false);
        }
      };

      // Start recording with timeslice to collect data every 250ms
      mediaRecorder.start(250);
      setIsRecording(true);
      setVoiceStatus('listening');
      checkSilence();
    } catch (error) {
      console.error("Mic error:", error);
      setIsRecording(false);
      setVoiceStatus('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (isLoadingAgent) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-muted-foreground">Agente não encontrado</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full min-h-0 bg-background overflow-hidden ${className}`}>
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              {agent.avatar_url ? (
                <img src={agent.avatar_url} alt={agent.name} className="h-8 w-8 rounded-full" />
              ) : (
                <Bot className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{agent.name}</h3>
              <p className="text-xs text-muted-foreground">{agent.description}</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 p-4">
        <div className="space-y-4">
          {/* Greeting */}
          {messages.length === 0 && agent.greeting_message && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-3 max-w-[85%]">
                <p className="text-sm text-foreground">{agent.greeting_message}</p>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`rounded-lg p-3 overflow-hidden ${
                  msg.type === "file-data" ? "w-[80%] max-w-[80%]" : "max-w-[80%]"
                } ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.type === "file-data" && msg.fileData ? (
                  <DataVisualization
                    data={msg.fileData.data}
                    columns={msg.fileData.columns}
                    fileName={msg.fileData.fileName}
                  />
                ) : (
                  <MarkdownContent content={msg.content} className="text-sm" />
                )}
                
                {/* Audio controls - on-demand generation */}
                {msg.role === "assistant" && capabilities.voice && (
                  <div className="mt-2 flex gap-2">
                    {currentlyPlayingIndex === idx ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={stopAudio}
                        className="h-7 text-xs"
                      >
                        <StopCircle className="h-3 w-3 mr-1" />
                        Parar
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => playAudio(idx)}
                        disabled={isGeneratingAudio}
                        className="h-7 text-xs"
                      >
                        {isGeneratingAudio ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Volume2 className="h-3 w-3 mr-1" />
                        )}
                        Ouvir
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Suggestions */}
      {suggestions.length > 0 && messages.length === 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestions.map((suggestion, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={() => {
                setInput(suggestion);
                textareaRef.current?.focus();
              }}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {suggestion}
            </Badge>
          ))}
        </div>
      )}

      {/* File Upload Modal */}
      {showFileUpload && capabilities.file_upload && (
        <div className="p-4 border-t border-border bg-card">
          <FileProcessor
            onDataLoaded={handleFileProcessed}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card">
        <div className="flex gap-2 items-end">
          {capabilities.file_upload && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          )}
          
          {/* Voice recording button */}
          {capabilities.voice && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={cn(
                "shrink-0 transition-colors",
                isRecording && "text-red-500 bg-red-500/10 animate-pulse"
              )}
            >
              {isTranscribing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isRecording ? (
                <Square className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
          )}
          
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder", "Digite sua mensagem...")}
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || isRecording}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        {/* Voice status indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {voiceStatus === 'listening' && "Ouvindo..."}
            {voiceStatus === 'waiting' && `Silêncio detectado (${waitingCountdown}s)`}
            {voiceStatus === 'processing' && "Processando..."}
          </div>
        )}
        
        {isGeneratingAudio && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Gerando áudio...
          </p>
        )}
      </form>
    </div>
  );
});
