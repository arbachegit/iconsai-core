import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Bot, Send, Loader2, Sparkles, Paperclip, X, Volume2, Mic, Image as ImageIcon, StopCircle } from "lucide-react";
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

interface AgentConfig {
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
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [input, setInput] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

      setAgent(data as AgentConfig);
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
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleFileProcessed = useCallback((data: any[], fileName: string, columns: string[]) => {
    sendMessage(`Arquivo carregado: ${fileName}`, { fileData: { data, fileName, columns } });
    setShowFileUpload(false);
  }, [sendMessage]);

  const capabilities = agent?.capabilities || {};

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
                
                {/* Audio controls */}
                {msg.role === "assistant" && capabilities.voice && msg.audioUrl && (
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
                        className="h-7 text-xs"
                      >
                        <Volume2 className="h-3 w-3 mr-1" />
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
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
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
