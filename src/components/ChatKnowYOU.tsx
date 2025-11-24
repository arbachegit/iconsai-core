import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatKnowYOU } from "@/hooks/useChatKnowYOU";
import { Send, Trash2, Loader2, Volume2, VolumeX } from "lucide-react";

export default function ChatKnowYOU() {
  const { 
    messages, 
    isLoading, 
    isGeneratingAudio,
    currentlyPlayingIndex,
    suggestions, 
    sendMessage, 
    clearHistory,
    playAudio,
    stopAudio,
  } = useChatKnowYOU();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-card/50 backdrop-blur-sm rounded-2xl border border-primary/20 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-primary p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-background/20 flex items-center justify-center backdrop-blur-sm">
            <span className="text-2xl font-bold text-primary-foreground">K</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-primary-foreground">KnowYOU</h3>
            <p className="text-sm text-primary-foreground/80">Assistente de IA em Saúde</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearHistory}
          className="text-primary-foreground hover:bg-background/20"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages Area */}
      <ScrollArea className="h-[500px] p-6" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-primary-foreground">K</span>
            </div>
            <h4 className="text-xl font-semibold mb-2">Olá! Sou o KnowYOU</h4>
            <p className="text-muted-foreground max-w-md">
              Seu assistente especializado em saúde. Como posso ajudá-lo hoje?
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs opacity-70">
                      {msg.timestamp.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {msg.role === "assistant" && msg.audioUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => currentlyPlayingIndex === idx ? stopAudio() : playAudio(idx)}
                      >
                        {currentlyPlayingIndex === idx ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(isLoading || isGeneratingAudio) && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">
                    {isGeneratingAudio ? "Gerando áudio..." : "Pensando..."}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Suggestions */}
      {suggestions.length > 0 && !isLoading && (
        <div className="px-6 py-4 bg-muted/50 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2">💡 Sugestões:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-6 border-t border-border/50">
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Digite sua mensagem sobre saúde..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-[60px] w-[60px] rounded-xl"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Pressione Enter para enviar • Shift+Enter para nova linha
        </p>
      </form>
    </div>
  );
}
