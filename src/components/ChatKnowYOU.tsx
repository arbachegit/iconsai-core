import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatKnowYOU } from "@/hooks/useChatKnowYOU";
import { Send, Loader2, Play, Pause, Square, Download, Mic, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import HospitalMap from "@/components/HospitalMap";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { VoiceMessagePlayer } from "@/components/VoiceMessagePlayer";
import { cn } from "@/lib/utils";
import { debugLog } from "@/lib/environment";

interface ChatKnowYOUProps {
  variant?: "embedded" | "modal";
  chatHook?: ReturnType<typeof useChatKnowYOU>;
}

export function ChatKnowYOU({ variant = "embedded", chatHook: externalHook }: ChatKnowYOUProps) {
  // Embedded = health chat, Modal = company chat
  const internalHook = useChatKnowYOU({ chatType: variant === "embedded" ? "health" : "company" });
  const chatHook = externalHook || internalHook;
  
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
    sendVoiceMessage,
    clearHistory,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    downloadAudio,
    changePlaybackRate,
    generateImage,
  } = chatHook;
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);
  
  const {
    isListening,
    isSupported: isSpeechSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const {
    isRecording,
    recordingDuration,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    isSupported: isRecorderSupported,
  } = useVoiceRecorder();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (messages.length > 0 && messages.length !== prevMessagesLength.current) {
      debugLog.effect("ChatKnowYOU", "Messages changed, scrolling into view", {
        prevLength: prevMessagesLength.current,
        newLength: messages.length,
        variant,
        windowScrollY: window.scrollY
      });
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      prevMessagesLength.current = messages.length;
      
      // Log scroll position after scrollIntoView
      setTimeout(() => {
        debugLog.scroll("After scrollIntoView in chat", {
          windowScrollY: window.scrollY,
          variant
        });
      }, 500);
    }
  }, [messages, variant]);

  // Update input with voice transcript - show interim transcript while listening
  useEffect(() => {
    if (isListening && interimTranscript) {
      // Show interim transcript in real-time while listening
      setInput(prev => {
        const baseText = prev.replace(interimTranscript, '').trim();
        return baseText ? `${baseText} ${interimTranscript}` : interimTranscript;
      });
    } else if (transcript && !isListening) {
      // Finalize with full transcript when listening stops
      setInput(prev => {
        const cleaned = prev.replace(interimTranscript, '').trim();
        return cleaned ? `${cleaned} ${transcript}`.trim() : transcript.trim();
      });
      resetTranscript();
    }
  }, [transcript, isListening, interimTranscript, resetTranscript]);

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

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleSendVoiceMessage = async () => {
    if (audioBlob) {
      await sendVoiceMessage(audioBlob);
      stopRecording();
    }
  };

  const handleCancelRecording = () => {
    cancelRecording();
  };

  const [imagePrompt, setImagePrompt] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);

  const handleGenerateImage = async () => {
    console.log("🎨 [Desenhar] handleGenerateImage chamado", { 
      promptLength: imagePrompt.trim().length,
      prompt: imagePrompt,
      isGeneratingImage 
    });
    
    if (imagePrompt.trim()) {
      console.log("🎨 [Desenhar] Chamando generateImage do hook...");
      try {
        await generateImage(imagePrompt);
        console.log("🎨 [Desenhar] generateImage concluído com sucesso");
        setImagePrompt("");
        setShowImageDialog(false);
      } catch (error) {
        console.error("🎨 [Desenhar] Erro ao gerar imagem:", error);
      }
    } else {
      console.warn("🎨 [Desenhar] Prompt vazio, não gerando imagem");
    }
  };

  const containerClass = variant === "modal"
    ? "h-full flex flex-col bg-transparent" 
    : "w-full max-w-4xl mx-auto bg-card/50 backdrop-blur-sm rounded-2xl border border-primary/20 shadow-xl overflow-hidden";

  const showHeader = variant === "embedded";

  return (
    <div className={containerClass}>
      {showHeader && (
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
      )}

      {/* Messages Area */}
      <ScrollArea className={`${variant === "modal" ? "h-full" : "h-[500px]"} p-6`} ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-primary-foreground">K</span>
            </div>
            <h4 className="text-xl font-semibold mb-2">
              {variant === "modal" ? "Olá! Sou o KnowYOU" : "Olá! Sou o KnowYOU Health"}
            </h4>
            <p className="text-muted-foreground max-w-md">
              {variant === "modal" 
                ? "Estou aqui para conversar sobre a KnowRISK, Arquitetura Cognitiva e o conteúdo desta landing page. Como posso ajudá-lo?"
                : "Seu assistente especializado em saúde e Hospital Moinhos de Vento. Como posso ajudá-lo hoje?"
              }
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
                   
                   {/* Voice message player for user messages */}
                   {msg.role === "user" && msg.voiceMessageUrl && (
                     <div className="mt-2">
                       <VoiceMessagePlayer
                         audioUrl={msg.voiceMessageUrl}
                         duration={msg.voiceMessageDuration}
                       />
                     </div>
                   )}
                   
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

                  {msg.role === "assistant" && msg.showMap && msg.coordinates && msg.hospitalName && (
                    <div className="mt-3">
                      <HospitalMap
                        latitude={msg.coordinates.lat}
                        longitude={msg.coordinates.lng}
                        hospitalName={msg.hospitalName}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
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

      {/* Suggestions - only for embedded health chat */}
      {variant === "embedded" && suggestions.length > 0 && !isLoading && (
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
        {/* Voice Recording UI */}
        {isRecording ? (
          <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-primary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-medium">Gravando...</span>
                <span className="text-sm text-muted-foreground">
                  {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
            
            {/* Animated waveform */}
            <div className="flex items-center justify-center gap-1 h-16">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 60}%`,
                    animationDelay: `${i * 50}ms`,
                    animationDuration: `${500 + Math.random() * 500}ms`,
                  }}
                />
              ))}
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelRecording}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSendVoiceMessage}
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                Enviar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex-1 space-y-3">
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder={isListening ? "Ouvindo..." : variant === "modal" ? "Digite ou fale algo do conteúdo do APP ou a respeito do knowyou..." : "Digite ou fale sua mensagem sobre saúde..."}
                  className={cn(
                    "min-h-[60px] resize-none pr-24",
                    isListening && "border-primary ring-2 ring-primary/20"
                  )}
                  disabled={isLoading}
                />
                <div className="absolute right-2 top-2 flex gap-1">
                  {/* Voice transcription button */}
                  {isSpeechSupported && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleVoiceToggle}
                      className={cn(
                        "h-8 w-8 transition-colors",
                        isListening && "text-green-500 animate-pulse"
                      )}
                      disabled={isLoading}
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Draw medical image button - only for embedded health chat */}
              {variant === "embedded" && (
                <Button
                  type="button"
                  variant="default"
                  size="default"
                  onClick={() => {
                    console.log("🎨 [Botão Desenhar] Clicado", { 
                      isLoading, 
                      isGeneratingImage,
                      showImageDialog 
                    });
                    setShowImageDialog(true);
                  }}
                  disabled={isLoading || isGeneratingImage}
                  className="w-full mt-3 bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 transition-opacity shadow-lg shadow-primary/30 font-semibold text-base py-6"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Gerando imagem...
                    </>
                  ) : (
                    <>
                      <span className="text-xl mr-2">🩺</span>
                      Desenhar Imagem Médica
                    </>
                  )}
                </Button>
              )}
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
        )}
        
        {/* Typing indicator */}
        {input.trim() && !isLoading && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground animate-fade-in">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Digitando...</span>
          </div>
        )}
      </form>

      {/* Medical Image Dialog - only for embedded */}
      {variant === "embedded" && (
        <Dialog 
          open={showImageDialog} 
          onOpenChange={(open) => {
            console.log("🎨 [Dialog] Estado alterado:", open);
            setShowImageDialog(open);
          }}
        >
          <DialogContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Desenhar Imagem Médica</h3>
                <p className="text-sm text-muted-foreground">
                  Descreva a imagem médica que você deseja gerar (anatomia, procedimento, equipamento, etc.)
                </p>
              </div>
              <Textarea
                value={imagePrompt}
                onChange={(e) => {
                  console.log("🎨 [Textarea] Prompt alterado:", e.target.value);
                  setImagePrompt(e.target.value);
                }}
                placeholder="Ex: anatomia do coração humano, equipamento de ressonância magnética, célula cancerígena..."
                className="min-h-[100px]"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log("🎨 [Botão Cancelar] Clicado");
                    setShowImageDialog(false);
                    setImagePrompt("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    console.log("🎨 [Botão Gerar] Clicado", { 
                      promptLength: imagePrompt.trim().length,
                      disabled: !imagePrompt.trim() || isGeneratingImage 
                    });
                    handleGenerateImage();
                  }}
                  disabled={!imagePrompt.trim() || isGeneratingImage}
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    "Gerar Imagem"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
