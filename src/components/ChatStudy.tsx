import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStudy } from "@/hooks/useChatStudy";
import { Send, Loader2, ImagePlus, Mic, Square } from "lucide-react";
import { AudioControls } from "./AudioControls";
import { useToast } from "@/hooks/use-toast";
import knowriskLogo from "@/assets/knowrisk-logo-circular.png";

// Sugestões de estudo sobre KnowRisk/KnowYOU/ACC
const STUDY_SUGGESTIONS = [
  "O que é a KnowRisk?",
  "Como funciona o ACC?",
  "O que é o KnowYOU?",
  "Quais seções tem o site?",
  "O que é a Era Generativa?",
  "Onde está a seção sobre Watson?",
  "O que fala na seção de Exclusão Digital?",
  "Como comunicar bem com IA?",
  "Qual a história da IA apresentada?",
  "O que é Tech Sem Propósito?",
  "Onde fala sobre HAL 9000?",
  "O que é a Nova Era da IA?",
];

// Sugestões para modo de imagem
const IMAGE_SUGGESTIONS = [
  "Logo da KnowRisk moderno",
  "Ilustração do ACC",
  "Arquitetura cognitiva visual",
  "Sistema conversacional de IA",
  "Interface de chat futurista",
  "Rede neural de comunicação",
];

export default function ChatStudy() {
  const { toast } = useToast();
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
    transcribeAudio,
  } = useChatStudy();
  
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [displayedSuggestions, setDisplayedSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioStates, setAudioStates] = useState<{[key: number]: { isPlaying: boolean; currentTime: number; duration: number }}>({});

  // Rotação de sugestões a cada 10 segundos
  useEffect(() => {
    const rotateSuggestions = () => {
      const sourceList = isImageMode ? IMAGE_SUGGESTIONS : STUDY_SUGGESTIONS;
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
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        audioChunksRef.current = [];
        
        // Transcribe audio using Whisper API
        setIsTranscribing(true);
        try {
          const transcribedText = await transcribeAudio(audioBlob);
          setInput(transcribedText);
        } catch (error) {
          console.error("Error transcribing audio:", error);
          toast({
            title: "Erro na transcrição",
            description: "Não foi possível transcrever o áudio. Tente novamente.",
            variant: "destructive",
          });
        } finally {
          setIsTranscribing(false);
        }
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

  // Listen for global stop audio event
  useEffect(() => {
    const handleStopAll = () => stopAudio();
    window.addEventListener('stopAllAudio', handleStopAll);
    return () => window.removeEventListener('stopAllAudio', handleStopAll);
  }, [stopAudio]);

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const handleAudioPlay = (index: number) => {
    playAudio(index);
  };

  const handleAudioStop = () => {
    stopAudio();
  };

  const handleDownloadAudio = (audioUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `knowyou-audio-${index}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm rounded-lg border-2 border-primary/40 shadow-[0_0_15px_rgba(139,92,246,0.2),0_0_30px_rgba(139,92,246,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-primary/30">
        <div className="flex items-center gap-3">
          <img src={knowriskLogo} alt="KnowRisk Logo" className="w-10 h-10" />
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gradient">Assistente de IA para ajudar a estudar</h2>
            {currentSentiment && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/30">
                <span className="text-2xl">
                  {currentSentiment.label === "positive" ? "😊" : 
                   currentSentiment.label === "negative" ? "😟" : "😐"}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {(currentSentiment.score * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          className="text-xs"
        >
          Limpar
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea 
        className="flex-1 p-4 border-2 border-t-black/40 border-l-black/40 border-r-white/10 border-b-white/10 bg-background/30 rounded-lg m-2 shadow-[inset_0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_3px_rgba(0,0,0,0.3)]" 
        style={{
          transform: 'translateZ(-10px)',
          backfaceVisibility: 'hidden'
        }}
        ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.imageUrl && (
                  <img
                    src={message.imageUrl}
                    alt="Generated"
                    className="mt-2 rounded-lg max-w-full"
                  />
                )}

                {message.role === "assistant" && message.audioUrl && (
                  <AudioControls
                    audioUrl={message.audioUrl}
                    isPlaying={currentlyPlayingIndex === index}
                    onPlay={() => handleAudioPlay(index)}
                    onStop={handleAudioStop}
                    onDownload={() => handleDownloadAudio(message.audioUrl!, index)}
                  />
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Suggestions */}
      {displayedSuggestions.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto">
            {displayedSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs whitespace-nowrap"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t-2 border-primary/30 bg-muted/30 rounded-b-lg shadow-[0_-2px_12px_rgba(0,0,0,0.2)]">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isTranscribing ? "Transcrevendo..." :
              isImageMode ? "Descreva a imagem educativa que deseja gerar..." : 
              "Digite sua pergunta sobre KnowRisk, KnowYOU ou ACC..."
            }
            onFocus={(e) => {
              if (isImageMode) {
                e.target.placeholder = "Desenhos limitados a IA e KnowRISK";
              }
            }}
            onBlur={(e) => {
              if (isImageMode) {
                e.target.placeholder = "Descreva a imagem educativa que deseja gerar...";
              }
            }}
            className="min-h-[60px] flex-1 resize-none border-2 border-t-black/40 border-l-black/40 border-r-white/10 border-b-white/10 focus:border-primary/50 shadow-[inset_0_3px_10px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(0,0,0,0.25)]"
            style={{
              transform: 'translateZ(-8px)',
              backfaceVisibility: 'hidden'
            }}
            disabled={isTranscribing}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={isRecording ? stopRecording : startRecording}
              className={`shadow-[0_3px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.3)] transition-shadow ${isRecording ? "text-red-500" : ""}`}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="shadow-[0_3px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.3)] transition-shadow"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              type="button"
              size="icon"
              variant={isImageMode ? "default" : "ghost"}
              onClick={toggleImageMode}
              disabled={isGeneratingImage}
              className="shadow-[0_3px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.3)] transition-shadow"
            >
              <ImagePlus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
