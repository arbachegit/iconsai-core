import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStudy } from "@/hooks/useChatStudy";
import { Send, Loader2, ImagePlus, Mic, Square } from "lucide-react";
import { AudioControls } from "./AudioControls";
import { useToast } from "@/hooks/use-toast";
import { MarkdownContent } from "./MarkdownContent";
import { TypingIndicator } from "./TypingIndicator";
import knowriskLogo from "@/assets/knowrisk-logo-circular.png";
import { useTranslation } from "react-i18next";
import { CopyButton } from "./CopyButton";
import { FloatingAudioPlayer } from "./FloatingAudioPlayer";
import { cn } from "@/lib/utils";

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
  const { t } = useTranslation();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioStates, setAudioStates] = useState<{[key: number]: { isPlaying: boolean; currentTime: number; duration: number }}>({});
  const mountTimeRef = useRef(Date.now());
  const previousMessagesLength = useRef(messages.length);
  const INIT_PERIOD = 1000; // 1 segundo de período de inicialização
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(false);
  const audioMessageRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

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

  // Auto-scroll to latest message - only for NEW messages, not initial load
  useEffect(() => {
    // Ignorar scrolls durante o período de inicialização (1 segundo)
    const timeSinceMount = Date.now() - mountTimeRef.current;
    if (timeSinceMount < INIT_PERIOD) {
      previousMessagesLength.current = messages.length;
      return; // Skip scroll during initialization
    }
    
    // Only scroll if messages actually increased (new message sent)
    if (messages.length > previousMessagesLength.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    
    previousMessagesLength.current = messages.length;
  }, [messages, isLoading, INIT_PERIOD]);

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
      // Tentar usar Web Speech API para transcrição em tempo real
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsRecording(true);
          setIsTranscribing(true);
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = input;

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          setInput(finalTranscript + interimTranscript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          setIsTranscribing(false);
          
          // Fallback para gravação com Whisper se Web Speech API falhar
          toast({
            title: t('chat.speechNotAvailable'),
            description: t('chat.speechFallback'),
          });
          startRecordingWithWhisper();
        };

        recognition.onend = () => {
          setIsRecording(false);
          setIsTranscribing(false);
        };

        mediaRecorderRef.current = recognition as any;
        recognition.start();
      } else {
        // Fallback: usar gravação com Whisper
        startRecordingWithWhisper();
      }
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      toast({
        title: t('chat.micError'),
        description: t('chat.micPermissions'),
        variant: "destructive",
      });
    }
  };

  const startRecordingWithWhisper = async () => {
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
            title: t('chat.transcriptionError'),
            description: t('chat.transcriptionRetry'),
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
      toast({
        title: t('chat.micError'),
        description: t('chat.micPermissions'),
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Check if it's Web Speech API or MediaRecorder
      if (mediaRecorderRef.current.stop) {
        mediaRecorderRef.current.stop();
      }
      if ((mediaRecorderRef.current as any).abort) {
        (mediaRecorderRef.current as any).abort();
      }
      setIsRecording(false);
      setIsTranscribing(false);
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
          <div className="relative">
            <img src={knowriskLogo} alt="KnowRisk Logo" className="w-10 h-10" />
            
            {/* Online indicator with sequential waves */}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-md shadow-green-500/50 border border-green-400" />
              <div 
                className="absolute w-3.5 h-3.5 rounded-full border border-green-400/50 animate-ping" 
                style={{ animationDuration: '1.5s', animationDelay: '0s' }} 
              />
              <div 
                className="absolute w-4.5 h-4.5 rounded-full border border-green-400/40 animate-ping" 
                style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} 
              />
              <div 
                className="absolute w-5 h-5 rounded-full border border-green-400/30 animate-ping" 
                style={{ animationDuration: '1.5s', animationDelay: '0.6s' }} 
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gradient">{t('chat.studyTitle')}</h2>
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
          {t('chat.clear')}
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea 
        className="flex-1 p-4 border-2 border-[hsl(var(--chat-container-border))] bg-[hsl(var(--chat-container-bg))] rounded-lg m-2 shadow-[inset_0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_3px_rgba(0,0,0,0.3)]" 
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
              ref={(el) => {
                if (message.role === "assistant" && message.audioUrl) {
                  audioMessageRefs.current[index] = el;
                }
              }}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-[hsl(var(--chat-message-user-bg))] text-primary-foreground"
                    : "bg-[hsl(var(--chat-message-ai-bg))] text-foreground"
                }`}
              >
                <div className="flex items-start gap-2">
                  <MarkdownContent content={message.content} className="text-sm flex-1" />
                  {message.role === "assistant" && <CopyButton content={message.content} />}
                </div>
                
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
          
          {(isLoading || isGeneratingAudio || isGeneratingImage) && (
            <div className="flex justify-start">
              <TypingIndicator />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Suggestions with optional disclaimer */}
      {displayedSuggestions.length > 0 && (
        <div className="px-4 pb-2 space-y-2">
          {/* Show disclaimer if provided by backend */}
          <div className="flex gap-2 overflow-x-auto">
            {displayedSuggestions.map((suggestion, index) => {
              const isNew = suggestion.startsWith('🆕 NOVO:') || suggestion.toLowerCase().includes('novo:');
              return (
                <Button
                  key={index}
                  variant={isNew ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={cn(
                    "text-xs whitespace-nowrap",
                    isNew && "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-none animate-pulse shadow-lg"
                  )}
                >
                  {suggestion.replace('🆕 NOVO:', '').trim()}
                </Button>
              );
            })}
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
              isTranscribing ? t('chat.transcribing') :
              isImageMode ? t('chat.placeholderImageStudy') : 
              t('chat.placeholderStudy')
            }
            onFocus={(e) => {
              if (isImageMode) {
                e.target.placeholder = t('chat.imageLimitStudy');
              }
            }}
            onBlur={(e) => {
              if (isImageMode) {
                e.target.placeholder = t('chat.placeholderImageStudy');
              }
            }}
            className="min-h-[60px] flex-1 resize-none border-2 border-cyan-400/60 focus:border-primary/50 shadow-[inset_0_3px_10px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(0,0,0,0.25),0_0_15px_rgba(34,211,238,0.3)]"
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
      
      {/* Floating Audio Player */}
      <FloatingAudioPlayer
        isVisible={showFloatingPlayer && currentlyPlayingIndex !== null}
        currentTime={audioStates[currentlyPlayingIndex ?? -1]?.currentTime ?? 0}
        duration={audioStates[currentlyPlayingIndex ?? -1]?.duration ?? 0}
        onStop={() => {
          stopAudio();
          setShowFloatingPlayer(false);
        }}
        onClose={() => {
          stopAudio();
          setShowFloatingPlayer(false);
        }}
      />
    </div>
  );
}
