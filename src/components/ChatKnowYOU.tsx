import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatKnowYOU } from "@/hooks/useChatKnowYOU";
import { Send, Loader2, Play, Pause, Square, Download, ImagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export default function ChatKnowYOU() {
  const { 
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
    sendMessage, 
    clearHistory,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    downloadAudio,
    changePlaybackRate,
    generateImage,
  } = useChatKnowYOU();
  const [input, setInput] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  const handleGenerateImage = () => {
    if (imagePrompt.trim()) {
      generateImage(imagePrompt);
      setImagePrompt("");
      setIsImageDialogOpen(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-card/50 backdrop-blur-sm rounded-2xl border border-primary/20 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-primary p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-background/20 flex items-center justify-center backdrop-blur-sm">
            <span className="text-2xl font-bold text-primary-foreground">K</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-primary-foreground">KnowYOU</h3>
            <p className="text-sm text-primary-foreground/80">Assistente de IA em Saúde</p>
          </div>
        </div>
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
                  {msg.imageUrl && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <img
                          src={msg.imageUrl}
                          alt="Imagem gerada"
                          className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <img
                          src={msg.imageUrl}
                          alt="Imagem gerada"
                          className="w-full h-auto rounded-lg"
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <span className="text-xs opacity-70 block mt-2">
                    {msg.timestamp.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  
                  {msg.role === "assistant" && msg.audioUrl && (
                    <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                      {/* Control Buttons */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              if (currentlyPlayingIndex === idx) {
                                if (isAudioPaused) {
                                  resumeAudio();
                                } else {
                                  pauseAudio();
                                }
                              } else {
                                playAudio(idx);
                              }
                            }}
                          >
                            {currentlyPlayingIndex === idx && !isAudioPaused ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={stopAudio}
                            disabled={currentlyPlayingIndex !== idx}
                          >
                            <Square className="w-3 h-3" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => downloadAudio(idx)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Playback Speed Controls */}
                        <div className="flex items-center gap-1">
                          {[0.5, 1, 1.5, 2].map((rate) => (
                            <Button
                              key={rate}
                              variant={playbackRate === rate ? "default" : "ghost"}
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => changePlaybackRate(rate)}
                            >
                              {rate}x
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {currentlyPlayingIndex === idx && (
                        <div className="space-y-1">
                          <Progress value={audioProgress} className="h-1.5" />
                          <div className="flex items-center justify-between text-xs opacity-70">
                            <span>{formatTime((audioDuration * audioProgress) / 100)}</span>
                            <span>{formatTime(audioDuration)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(isLoading || isGeneratingAudio || isGeneratingImage) && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">
                    {isGeneratingImage ? "Gerando imagem..." : isGeneratingAudio ? "Gerando áudio..." : "Pensando..."}
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
          <div className="flex-1 space-y-3">
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
            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingImage}
                  className="w-full"
                >
                  <ImagePlus className="w-4 h-4 mr-2" />
                  Gerar Imagem Educativa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Gerar Imagem sobre Saúde</h3>
                    <p className="text-sm text-muted-foreground">
                      Descreva o tema de saúde que você gostaria de visualizar em uma imagem educativa.
                    </p>
                  </div>
                  <Textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Ex: Anatomia do coração humano, processo de cicatrização, etc."
                    className="min-h-[100px]"
                  />
                  <Button
                    onClick={handleGenerateImage}
                    disabled={!imagePrompt.trim() || isGeneratingImage}
                    className="w-full"
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-4 h-4 mr-2" />
                        Gerar Imagem
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-[60px] w-[60px] rounded-xl flex-shrink-0"
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
