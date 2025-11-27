import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatKnowYOU } from "@/hooks/useChatKnowYOU";
import { Send, Loader2, Volume2, VolumeX, ImagePlus, Mic, Square } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

// 30 sugestões de saúde para rotação
const HEALTH_SUGGESTIONS = [
  "O que é telemedicina?",
  "Como prevenir doenças cardíacas?",
  "Quais especialidades o Hospital Moinhos de Vento oferece?",
  "Como funciona a robótica cirúrgica?",
  "O que são doenças crônicas?",
  "Como manter uma alimentação saudável?",
  "Quais exames preventivos fazer anualmente?",
  "O que é diabetes tipo 2?",
  "Como controlar a pressão arterial?",
  "O que faz um cardiologista?",
  "Como prevenir o câncer?",
  "O que é saúde mental?",
  "Como funciona a fisioterapia?",
  "Quais sintomas indicam AVC?",
  "O que é medicina preventiva?",
  "Como melhorar a qualidade do sono?",
  "O que são exames de imagem?",
  "Como funciona a vacinação?",
  "O que é obesidade mórbida?",
  "Como tratar ansiedade?",
  "O que faz um endocrinologista?",
  "Como prevenir osteoporose?",
  "O que é check-up médico?",
  "Como funciona a nutrição clínica?",
  "Quais benefícios da atividade física?",
  "O que é colesterol alto?",
  "Como identificar depressão?",
  "O que são doenças autoimunes?",
  "Como funciona o transplante de órgãos?",
  "Qual a importância da hidratação?"
];

// Sugestões específicas para modo de geração de imagem
const IMAGE_SUGGESTIONS = [
  "Anatomia do coração humano",
  "Sistema respiratório",
  "Processo de cicatrização",
  "Estrutura de um neurônio",
  "Aparelho digestivo",
  "Sistema circulatório",
  "Esqueleto humano",
  "Sistema nervoso central"
];

const SentimentIndicator = ({ sentiment }: { sentiment: { label: string; score: number } | null }) => {
  if (!sentiment) return null;
  
  const emoji = {
    positive: "😊",
    neutral: "😐",
    negative: "😟",
  };
  const color = {
    positive: "text-green-500",
    neutral: "text-yellow-500",
    negative: "text-red-500",
  };
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-background/50 backdrop-blur-sm ${color[sentiment.label as keyof typeof color]}`}>
      <span className="text-lg">{emoji[sentiment.label as keyof typeof emoji]}</span>
      <span className="text-xs font-medium">{(sentiment.score * 100).toFixed(0)}%</span>
    </div>
  );
};

export default function ChatKnowYOU() {
  const { 
    messages, 
    isLoading, 
    isGeneratingAudio,
    isGeneratingImage,
    currentlyPlayingIndex,
    suggestions,
    currentSentiment,
    sendMessage, 
    clearHistory,
    playAudio,
    stopAudio,
    generateImage,
  } = useChatKnowYOU();
  const [input, setInput] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [displayedSuggestions, setDisplayedSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Rotação de sugestões a cada 10 segundos
  useEffect(() => {
    const rotateSuggestions = () => {
      const sourceList = isImageMode ? IMAGE_SUGGESTIONS : HEALTH_SUGGESTIONS;
      const shuffled = [...sourceList].sort(() => Math.random() - 0.5);
      setDisplayedSuggestions(shuffled.slice(0, 4));
    };
    
    rotateSuggestions();
    const interval = setInterval(rotateSuggestions, 10000);
    return () => clearInterval(interval);
  }, [isImageMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      if (isImageMode) {
        generateImage(input);
        setInput("");
        setIsImageMode(false);
      } else {
        sendMessage(input);
        setInput("");
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isImageMode) {
      generateImage(suggestion);
    } else {
      sendMessage(suggestion);
    }
  };

  const toggleImageMode = () => {
    setIsImageMode(!isImageMode);
    setInput("");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // TODO: Send to Whisper API for transcription
        // For now, just show a placeholder message
        setInput("[Áudio gravado - transcrição pendente]");
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTyping(input.length > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-card/50 backdrop-blur-sm rounded-2xl border-2 border-primary/30 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(139,92,246,0.1),0_0_80px_rgba(139,92,246,0.15)] overflow-hidden transform hover:translate-y-[-2px] transition-all duration-300 relative before:absolute before:inset-0 before:rounded-2xl before:p-[2px] before:bg-gradient-to-br before:from-primary/30 before:via-secondary/30 before:to-accent/30 before:-z-10 before:blur-sm">
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
        <SentimentIndicator sentiment={currentSentiment} />
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

      {/* Suggestions com slider */}
      {displayedSuggestions.length > 0 && !isLoading && (
        <div className="px-6 py-4 bg-muted/50 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            💡 {isImageMode ? "Sugestões de Imagens:" : "Sugestões:"}
          </p>
          <div className="flex flex-wrap gap-2 suggestions-slider">
            {displayedSuggestions.map((suggestion, idx) => (
              <Button
                key={`${suggestion}-${idx}`}
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
        {isTyping && (
          <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            Digitando...
          </div>
        )}
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
              placeholder={isImageMode ? "Criar imagem da área de saúde..." : "Digite sua mensagem sobre saúde..."}
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleImageMode}
              disabled={isGeneratingImage}
              className={`w-full transition-all ${
                isImageMode 
                  ? "bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground hover:opacity-90" 
                  : ""
              }`}
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              {isImageMode ? "Modo Texto" : "Gerar Imagem Educativa"}
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={isRecording ? stopRecording : startRecording}
              className={`h-[60px] w-[60px] rounded-xl flex-shrink-0 ${isRecording ? 'bg-destructive text-destructive-foreground' : ''}`}
            >
              {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-[60px] w-[60px] rounded-xl flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Pressione Enter para enviar • Shift+Enter para nova linha
        </p>
      </form>
    </div>
  );
}
