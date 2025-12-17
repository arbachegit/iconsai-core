import { useState, useEffect, useRef, useCallback, memo } from "react";
import { 
  Bot, Send, Loader2, Sparkles, Paperclip, X, Volume2, Mic, Square, 
  ImagePlus, StopCircle, BarChart3, ArrowUp 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useChat, ChatType } from "@/hooks/useChat";
import { MarkdownContent } from "@/components/MarkdownContent";
import { DataVisualization } from "@/components/chat/DataVisualization";
import FileProcessor from "@/components/chat/FileProcessor";
import { TypingIndicator } from "@/components/TypingIndicator";
import ContextualSuggestions from "@/components/ContextualSuggestions";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Image and Chart modes
  const [isImageMode, setIsImageMode] = useState(false);
  const [isChartMode, setIsChartMode] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);

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
    isGeneratingImage,
    suggestions,
    sendMessage,
    clearHistory,
    playAudio,
    stopAudio,
    currentlyPlayingIndex,
    transcribeAudio,
    generateImage,
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

  const capabilities = agent?.capabilities || {};

  // Toggle functions for image and chart modes
  const toggleImageMode = useCallback(() => {
    if (!capabilities.drawing) return;
    setIsImageMode(prev => !prev);
    setIsChartMode(false);
    setInput("");
  }, [capabilities.drawing]);

  const toggleChartMode = useCallback(() => {
    if (!capabilities.charts) return;
    setIsChartMode(prev => !prev);
    setIsImageMode(false);
    setInput("");
  }, [capabilities.charts]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Parar gravação ao enviar
    if (isRecording) {
      stopRecording();
    }
    
    if (!input.trim() || isLoading || !agent) return;
    
    if (isImageMode && capabilities.drawing) {
      generateImage(input);
      setInput("");
      setIsImageMode(false);
    } else {
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
    }
  }, [input, isLoading, sendMessage, agent, isImageMode, capabilities.drawing, generateImage, isRecording]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleFileProcessed = useCallback((data: any[], fileName: string, columns: string[]) => {
    if (!agent) return;
    
    const numericCols = columns.filter(col => 
      data.some(row => !isNaN(Number(row[col])))
    );
    
    sendMessage(
      `Arquivo enviado: ${fileName} com ${data.length} registros e ${columns.length} colunas. Colunas numéricas: ${numericCols.join(", ")}. Por favor, analise os dados.`,
      { 
        fileData: { data, fileName, columns },
        agentConfig: {
          systemPrompt: agent.system_prompt,
          maieuticLevel: agent.maieutic_level,
          regionalTone: agent.regional_tone,
          ragCollection: agent.rag_collection,
          allowedTags: agent.allowed_tags,
          forbiddenTags: agent.forbidden_tags,
        }
      }
    );
    setIsFileDialogOpen(false);
  }, [sendMessage, agent]);

  // Voice recording functions
  const recordingStartTimeRef = useRef<number>(0);
  const MIN_RECORDING_DURATION = 1000;

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
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

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

        if (audioChunksRef.current.length === 0) {
          console.error('No audio data collected');
          setIsRecording(false);
          setVoiceStatus('idle');
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        if (audioBlob.size < 1000) {
          console.error('Audio too short:', audioBlob.size, 'bytes');
          setIsRecording(false);
          setVoiceStatus('idle');
          return;
        }

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

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

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
                
                {/* Imagem gerada */}
                {msg.imageUrl && (
                  <div className="mt-2">
                    <img 
                      src={msg.imageUrl} 
                      alt="Imagem gerada" 
                      className="max-w-full rounded-lg shadow-md"
                    />
                  </div>
                )}
                
                {/* Audio controls */}
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

      {/* Contextual Suggestions - estilo ChatStudy */}
      <ContextualSuggestions
        suggestions={suggestions}
        isLoading={isLoading}
        onSuggestionClick={handleSuggestionClick}
      />

      {/* Input Area - Design ChatStudy */}
      <form onSubmit={handleSubmit} className="pb-2 px-4">
        {/* Indicador de voz ativo */}
        {isRecording && (
          <div className="flex items-center gap-2 text-xs mb-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              voiceStatus === 'waiting' ? 'bg-amber-500' : 
              voiceStatus === 'processing' ? 'bg-blue-500' : 'bg-red-500'
            )} />
            <span className={voiceStatus === 'waiting' ? 'text-amber-500' : 'text-muted-foreground'}>
              {voiceStatus === 'listening' && "Ouvindo..."}
              {voiceStatus === 'waiting' && `Silêncio detectado (${waitingCountdown}s)`}
              {voiceStatus === 'processing' && "Processando..."}
            </span>
          </div>
        )}
        
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isTranscribing ? "Transcrevendo..." : 
              isImageMode ? "Descreva a imagem que deseja criar..." : 
              isChartMode ? "Descreva os dados para gerar um gráfico..." : 
              t("chat.placeholder", "Digite sua mensagem...")
            }
            className="min-h-[44px] resize-none w-full pb-12 pr-12 border-2 border-primary/40 shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]"
            disabled={isLoading || isTranscribing}
          />
          
          {/* Botões à esquerda - dentro do textarea */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            {/* Mic button */}
            {capabilities.voice && (
              <Button 
                type="button" 
                size="icon" 
                variant="ghost"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={cn(
                  "h-8 w-8",
                  isRecording && "text-red-500 bg-red-500/10"
                )}
              >
                {isTranscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isRecording ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            )}
            
            {/* Image button */}
            {capabilities.drawing && (
              <Button 
                type="button" 
                size="icon" 
                variant={isImageMode ? "default" : "ghost"}
                onClick={toggleImageMode}
                disabled={isGeneratingImage}
                title="Gerar Imagem"
                className="h-8 w-8"
              >
                <ImagePlus className="w-4 h-4" />
              </Button>
            )}
            
            {/* Chart button */}
            {capabilities.charts && (
              <Button 
                type="button" 
                size="icon" 
                variant={isChartMode ? "default" : "ghost"}
                onClick={toggleChartMode}
                title="Modo Gráfico"
                className="h-8 w-8"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            )}
            
            {/* File upload button */}
            {capabilities.file_upload && (
              <Button 
                type="button" 
                size="icon" 
                variant="ghost"
                onClick={() => setIsFileDialogOpen(true)}
                title="Enviar Arquivo"
                className="h-8 w-8"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* Botão de enviar - direita */}
          <Button 
            type="submit" 
            size="icon"
            disabled={!input.trim() || isLoading || isRecording}
            className="absolute bottom-2 right-2 rounded-full h-8 w-8"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-1 text-center">
          Enter para enviar • Shift+Enter para nova linha
        </p>
      </form>

      {/* File Upload Dialog */}
      <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Arquivo</DialogTitle>
          </DialogHeader>
          <FileProcessor onDataLoaded={handleFileProcessed} />
        </DialogContent>
      </Dialog>
    </div>
  );
});
