import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatKnowYOU } from "@/hooks/useChatKnowYOU";
import { Send, Loader2, ImagePlus, Mic, Square, X } from "lucide-react";
import { AudioControls } from "./AudioControls";
import { useToast } from "@/hooks/use-toast";
import { MarkdownContent } from "./MarkdownContent";
import { TypingIndicator } from "./TypingIndicator";
import knowriskLogo from "@/assets/knowrisk-logo-circular.png";
import { useTranslation } from "react-i18next";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { DocumentAttachButton } from "./DocumentAttachButton";
import { CopyButton } from "./CopyButton";
import { FloatingAudioPlayer } from "./FloatingAudioPlayer";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/useGeolocation";

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
  const { t } = useTranslation();
  const { toast } = useToast();
  const { location, requestLocation } = useGeolocation();
  const { 
    messages, 
    isLoading, 
    isGeneratingAudio,
    isGeneratingImage,
    currentlyPlayingIndex,
    suggestions,
    currentSentiment,
    activeDisclaimer,
    attachedDocumentId,
    sendMessage, 
    clearHistory,
    playAudio,
    stopAudio,
    generateImage,
    transcribeAudio,
    attachDocument,
    detachDocument,
  } = useChatKnowYOU();
  const [input, setInput] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing'>('idle');
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
  const [audioVisibility, setAudioVisibility] = useState<{[key: number]: boolean}>({});
  const audioMessageRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  // IntersectionObserver para detectar quando mensagem de áudio sai do viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute('data-audio-index'));
          if (!isNaN(idx)) {
            setAudioVisibility(prev => ({ ...prev, [idx]: entry.isIntersecting }));
          }
        });
      },
      { threshold: 0.1 }
    );

    Object.entries(audioMessageRefs.current).forEach(([idx, el]) => {
      if (el) {
        el.setAttribute('data-audio-index', idx);
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [messages]);

  // Mostrar FloatingPlayer quando áudio tocando E não visível
  useEffect(() => {
    if (currentlyPlayingIndex !== null && !audioVisibility[currentlyPlayingIndex]) {
      setShowFloatingPlayer(true);
    } else {
      setShowFloatingPlayer(false);
    }
  }, [currentlyPlayingIndex, audioVisibility]);

  // Rotação de sugestões a cada 10 segundos (filtrar tags >80%)
  useEffect(() => {
    const rotateSuggestions = () => {
      const sourceList = isImageMode ? IMAGE_SUGGESTIONS : HEALTH_SUGGESTIONS;
      // Filtrar sugestões com confidence < 80% (se houver metadata)
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

  const handleAudioPlay = (index: number) => {
    playAudio(index);
  };

  const handleAudioStop = () => {
    stopAudio();
  };

  const handleDownloadAudio = (audioUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `knowyou-saude-${index}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        
        let silenceTimeout: NodeJS.Timeout | null = null;
        const SILENCE_TIMEOUT = 5000; // 5 segundos

        recognition.onstart = () => {
          setIsRecording(true);
          setIsTranscribing(true);
          setVoiceStatus('listening');
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

        recognition.onspeechend = () => {
          // Não encerrar imediatamente - aguardar 5 segundos de silêncio
          silenceTimeout = setTimeout(() => {
            recognition.stop();
          }, SILENCE_TIMEOUT);
        };

        recognition.onspeechstart = () => {
          // Cancelar timeout se fala reiniciar
          if (silenceTimeout) clearTimeout(silenceTimeout);
          setVoiceStatus('listening');
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (silenceTimeout) clearTimeout(silenceTimeout);
          setIsRecording(false);
          setIsTranscribing(false);
          setVoiceStatus('idle');
          
          // Fallback para gravação com Whisper se Web Speech API falhar
          toast({
            title: t('chat.speechNotAvailable'),
            description: t('chat.speechFallback'),
          });
          startRecordingWithWhisper();
        };

        recognition.onend = () => {
          if (silenceTimeout) clearTimeout(silenceTimeout);
          setIsRecording(false);
          setIsTranscribing(false);
          setVoiceStatus('idle');
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
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());
        
        // Transcribe audio using Whisper API
        setIsTranscribing(true);
        setVoiceStatus('processing');
        try {
          const transcribedText = await transcribeAudio(audioBlob);
          // MODO ANEXO: não sobrescrever texto existente
          setInput(prev => prev + (prev ? ' ' : '') + transcribedText);
        } catch (error) {
          console.error('Error transcribing audio:', error);
          toast({
            title: t('chat.transcriptionError'),
            description: t('chat.transcriptionRetry'),
            variant: "destructive",
          });
        } finally {
          setIsTranscribing(false);
          setVoiceStatus('idle');
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTyping(input.length > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm rounded-lg border-2 border-primary/40 shadow-[0_0_15px_rgba(139,92,246,0.2),0_0_30px_rgba(139,92,246,0.1)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-primary/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={knowriskLogo} alt="KnowRisk Logo" className="w-10 h-10" />
            
            {/* Online indicator with sequential waves */}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse z-10" />
              <div className="absolute w-5 h-5 rounded-full bg-green-500/30 animate-ping animation-delay-0" />
              <div className="absolute w-5 h-5 rounded-full bg-green-500/20 animate-ping animation-delay-150" />
              <div className="absolute w-5 h-5 rounded-full bg-green-500/10 animate-ping animation-delay-300" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-gradient">{t('chat.healthTitle')}</h2>
        </div>
        <div className="flex items-center gap-2">
          <SentimentIndicator sentiment={currentSentiment} />
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="text-xs"
          >
            {t('chat.clear')}
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea 
        className="h-[500px] p-6 border-2 border-[hsl(var(--chat-container-border))] bg-[hsl(var(--chat-container-bg))] shadow-[inset_0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_3px_rgba(0,0,0,0.3)]"
        style={{
          transform: 'translateZ(-10px)',
          backfaceVisibility: 'hidden'
        }}
        ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-primary-foreground">K</span>
            </div>
            <h4 className="text-xl font-semibold mb-2">{t('chat.greeting')}</h4>
            <p className="text-muted-foreground max-w-md">
              {t('chat.greetingDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Disclaimer when document is attached */}
            {activeDisclaimer && (
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="flex items-center justify-between">
                  {t('documentAttach.disclaimerTitle')}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={detachDocument}
                    className="h-6 w-6 p-0"
                    title={t('documentAttach.removeButton')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </AlertTitle>
                <AlertDescription>
                  {activeDisclaimer.message}
                </AlertDescription>
              </Alert>
            )}
            
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                ref={(el) => {
                  if (msg.role === "assistant" && msg.audioUrl) {
                    audioMessageRefs.current[idx] = el;
                  }
                }}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-[hsl(var(--chat-message-user-bg))] text-primary-foreground"
                      : "bg-[hsl(var(--chat-message-ai-bg))] text-foreground"
                  }`}
                >
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt={t('chat.generatingImage')}
                      className="max-w-full rounded-lg mb-2"
                    />
                  )}
                  <div className="flex items-start gap-2">
                    <MarkdownContent content={msg.content} className="text-sm leading-relaxed flex-1" />
                    {msg.role === "assistant" && <CopyButton content={msg.content} />}
                  </div>
                  
                  <span className="text-xs opacity-70 block mt-2">
                    {msg.timestamp.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  
                  {msg.role === "assistant" && msg.audioUrl && (
                    <AudioControls
                      audioUrl={msg.audioUrl}
                      isPlaying={currentlyPlayingIndex === idx}
                      currentTime={audioStates[idx]?.currentTime}
                      duration={audioStates[idx]?.duration}
                      timestamp={msg.timestamp}
                      location={location || undefined}
                      messageContent={msg.content}
                      onPlay={() => handleAudioPlay(idx)}
                      onStop={handleAudioStop}
                      onDownload={() => handleDownloadAudio(msg.audioUrl!, idx)}
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
        )}
      </ScrollArea>

      {/* Suggestions com slider */}
      {displayedSuggestions.length > 0 && !isLoading && (
        <div className="px-6 py-4 bg-muted/50 border-t border-border/50">
          {/* Disclaimer when document attached */}
          {activeDisclaimer && (
            <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-500">
                    {activeDisclaimer.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeDisclaimer.message}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-xs font-medium text-muted-foreground mb-2">
            💡 {isImageMode ? t('chat.imageSuggestions') : t('chat.suggestions')}
          </p>
          <div className="flex flex-wrap gap-2 suggestions-slider">
            {displayedSuggestions.map((suggestion, idx) => {
              const isNew = suggestion.startsWith('🆕 NOVO:') || suggestion.toLowerCase().includes('novo:');
              return (
                <Button
                  key={`${suggestion}-${idx}`}
                  variant={isNew ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={cn(
                    "text-xs hover:bg-primary hover:text-primary-foreground transition-colors",
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

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-6 border-t border-border/50 shadow-[0_-2px_12px_rgba(0,0,0,0.2)]">
        {/* Indicador de voz ativo */}
        {isRecording && (
          <div className="flex items-center gap-2 text-xs text-amber-500 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {voiceStatus === 'listening' ? t('chat.listening') : t('chat.processing')}
          </div>
        )}
        
        {isTyping && (
          <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            {t('chat.typing')}
          </div>
        )}
          <div className="flex gap-2 items-end">
            <DocumentAttachButton 
              onAttach={attachDocument}
              disabled={isLoading || isGeneratingAudio || isGeneratingImage}
            />
            <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={
              isTranscribing ? t('chat.transcribing') :
              isImageMode ? t('chat.placeholderImage') : 
              t('chat.placeholderHealth')
            }
            onFocus={(e) => {
              if (isImageMode) {
                e.target.placeholder = t('chat.imageLimitHealth');
              }
            }}
            onBlur={(e) => {
              if (isImageMode) {
                e.target.placeholder = t('chat.placeholderImage');
              }
            }}
            className="min-h-[60px] resize-none flex-1 border-2 border-cyan-400/60 shadow-[inset_0_3px_10px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(0,0,0,0.25),0_0_15px_rgba(34,211,238,0.3)]"
            style={{
              transform: 'translateZ(-8px)',
              backfaceVisibility: 'hidden'
            }}
            disabled={isLoading || isTranscribing}
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
              title="Desenhar"
              className="shadow-[0_3px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.3)] transition-shadow"
            >
              <ImagePlus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Pressione Enter para enviar • Shift+Enter para nova linha
        </p>
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
