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
const HEALTH_SUGGESTIONS = ["O que é telemedicina?", "Como prevenir doenças cardíacas?", "Quais especialidades o Hospital Moinhos de Vento oferece?", "Como funciona a robótica cirúrgica?", "O que são doenças crônicas?", "Como manter uma alimentação saudável?", "Quais exames preventivos fazer anualmente?", "O que é diabetes tipo 2?", "Como controlar a pressão arterial?", "O que faz um cardiologista?", "Como prevenir o câncer?", "O que é saúde mental?", "Como funciona a fisioterapia?", "Quais sintomas indicam AVC?", "O que é medicina preventiva?", "Como melhorar a qualidade do sono?", "O que são exames de imagem?", "Como funciona a vacinação?", "O que é obesidade mórbida?", "Como tratar ansiedade?", "O que faz um endocrinologista?", "Como prevenir osteoporose?", "O que é check-up médico?", "Como funciona a nutrição clínica?", "Quais benefícios da atividade física?", "O que é colesterol alto?", "Como identificar depressão?", "O que são doenças autoimunes?", "Como funciona o transplante de órgãos?", "Qual a importância da hidratação?"];

// Sugestões específicas para modo de geração de imagem
const IMAGE_SUGGESTIONS = ["Anatomia do coração humano", "Sistema respiratório", "Processo de cicatrização", "Estrutura de um neurônio", "Aparelho digestivo", "Sistema circulatório", "Esqueleto humano", "Sistema nervoso central"];
const SentimentIndicator = ({
  sentiment
}: {
  sentiment: {
    label: string;
    score: number;
  } | null;
}) => {
  if (!sentiment) return null;
  const emoji = {
    positive: "😊",
    neutral: "😐",
    negative: "😟"
  };
  const color = {
    positive: "text-green-500",
    neutral: "text-yellow-500",
    negative: "text-red-500"
  };
  return <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-background/50 backdrop-blur-sm ${color[sentiment.label as keyof typeof color]}`}>
      <span className="text-lg">{emoji[sentiment.label as keyof typeof emoji]}</span>
      <span className="text-xs font-medium">{(sentiment.score * 100).toFixed(0)}%</span>
    </div>;
};
export default function ChatKnowYOU() {
  const {
    t
  } = useTranslation();
  const {
    toast
  } = useToast();
  const {
    location,
    requestLocation
  } = useGeolocation();
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
    audioProgress,
    sendMessage,
    clearHistory,
    playAudio,
    stopAudio,
    generateImage,
    transcribeAudio,
    attachDocument,
    detachDocument
  } = useChatKnowYOU();
  const [input, setInput] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'waiting' | 'processing'>('idle');
  const [waitingCountdown, setWaitingCountdown] = useState(5);
  const [displayedSuggestions, setDisplayedSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<string>("");
  const prefixTextRef = useRef<string>("");
  const mountTimeRef = useRef(Date.now());
  const previousMessagesLength = useRef(messages.length);
  const INIT_PERIOD = 1000; // 1 segundo de período de inicialização
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(false);
  const [audioVisibility, setAudioVisibility] = useState<{
    [key: number]: boolean;
  }>({});
  const audioMessageRefs = useRef<{
    [key: number]: HTMLDivElement | null;
  }>({});

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  // Capturar o viewport do ScrollArea após mount
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        scrollViewportRef.current = viewport as HTMLDivElement;
      }
    }
  }, []);

  // Sync inputRef with input state
  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  // IntersectionObserver para detectar quando mensagem de áudio sai do viewport
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const idx = Number(entry.target.getAttribute('data-audio-index'));
        if (!isNaN(idx)) {
          setAudioVisibility(prev => ({
            ...prev,
            [idx]: entry.isIntersecting
          }));
        }
      });
    }, {
      threshold: 0.1
    });
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

  // Helper function to scroll to bottom
  const scrollToBottom = () => {
    if (scrollViewportRef.current) {
      requestAnimationFrame(() => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollTo({
            top: scrollViewportRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
    }
  };

  // Auto-scroll to latest message - SOLUÇÃO DEFINITIVA
  useEffect(() => {
    // Ignorar scrolls durante o período de inicialização
    const timeSinceMount = Date.now() - mountTimeRef.current;
    if (timeSinceMount < INIT_PERIOD) {
      previousMessagesLength.current = messages.length;
      return;
    }

    // Scroll quando há nova mensagem OU quando está carregando (streaming)
    const shouldScroll = messages.length > previousMessagesLength.current || isLoading;
    if (shouldScroll && scrollViewportRef.current) {
      requestAnimationFrame(() => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollTo({
            top: scrollViewportRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
    }
    previousMessagesLength.current = messages.length;
  }, [messages, isLoading]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parar gravação explicitamente ao enviar mensagem
    if (isRecording) {
      stopRecording();
    }
    
    if (input.trim() && !isLoading) {
      if (isImageMode) {
        generateImage(input);
        setInput("");
        setIsImageMode(false);
      } else {
        sendMessage(input);
        setInput("");
      }
      // Scroll imediato após enviar
      setTimeout(scrollToBottom, 100);
    }
  };
  const handleSuggestionClick = (suggestion: string) => {
    if (isImageMode) {
      generateImage(suggestion);
    } else {
      sendMessage(suggestion);
    }
    // Scroll imediato após clicar em sugestão
    setTimeout(scrollToBottom, 100);
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
        let silenceTimeout: NodeJS.Timeout | null = null;
        const SILENCE_TIMEOUT = 5000; // 5 segundos

        recognition.onstart = () => {
          prefixTextRef.current = input; // Salvar texto que existia antes
          setIsRecording(true);
          setIsTranscribing(true);
          setVoiceStatus('listening');
        };
        recognition.onresult = (event: any) => {
          let fullTranscript = '';

          // Reconstruir TODO o texto a partir de TODOS os resultados
          // NÃO usar inputRef.current aqui para evitar duplicação!
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            fullTranscript += result[0].transcript;
            if (result.isFinal) {
              fullTranscript += ' ';
            }
          }

          // Concatenar com texto que existia ANTES da gravação (modo append)
          const prefix = prefixTextRef.current;
          const separator = prefix && !prefix.endsWith(' ') ? ' ' : '';
          setInput(prefix + separator + fullTranscript.trim());
        };
        recognition.onspeechend = () => {
          // Clear any existing timers
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
          setVoiceStatus('waiting');
          setWaitingCountdown(5);

          // Countdown interval - store in ref
          countdownIntervalRef.current = setInterval(() => {
            setWaitingCountdown(prev => {
              if (prev <= 1) {
                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          // Silence timeout - store in ref
          silenceTimeoutRef.current = setTimeout(() => {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            recognition.stop();
          }, SILENCE_TIMEOUT);
        };
        recognition.onspeechstart = () => {
          // Clear BOTH timeout and interval when speech resumes
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setVoiceStatus('listening');
          setWaitingCountdown(5); // Reset countdown
        };
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          // Cleanup all timers
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setIsRecording(false);
          setIsTranscribing(false);
          setVoiceStatus('idle');

          // Fallback para gravação com Whisper se Web Speech API falhar
          toast({
            title: t('chat.speechNotAvailable'),
            description: t('chat.speechFallback')
          });
          startRecordingWithWhisper();
        };
        recognition.onend = () => {
          // Cleanup all timers
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          prefixTextRef.current = ""; // Limpar para próxima gravação
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
        variant: "destructive"
      });
    }
  };
  const startRecordingWithWhisper = async () => {
    try {
      prefixTextRef.current = input; // Salvar texto existente
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Setup AudioContext for silence detection
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 2048;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceStart: number | null = null;
      let animationFrameId: number;
      const checkSilence = () => {
        if (!isRecording) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average < 10) {
          // Silence threshold
          if (!silenceStart) {
            silenceStart = Date.now();
            setVoiceStatus('waiting');
          } else if (Date.now() - silenceStart > 5000) {
            // 5 seconds of silence - stop recording
            mediaRecorder.stop();
            cancelAnimationFrame(animationFrameId);
            return;
          }
          // Update countdown
          const elapsed = Math.floor((Date.now() - silenceStart) / 1000);
          setWaitingCountdown(Math.max(0, 5 - elapsed));
        } else {
          silenceStart = null;
          setVoiceStatus('listening');
          setWaitingCountdown(5);
        }
        animationFrameId = requestAnimationFrame(checkSilence);
      };
      mediaRecorder.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        cancelAnimationFrame(animationFrameId);
        audioContext.close();
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm'
        });
        audioChunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());

        // Transcribe audio using Whisper API
        setIsTranscribing(true);
        setVoiceStatus('processing');
        try {
          const transcribedText = await transcribeAudio(audioBlob);
          // MODO ANEXO: concatenar com texto pré-existente
          const prefix = prefixTextRef.current;
          const separator = prefix && !prefix.endsWith(' ') ? ' ' : '';
          setInput(prefix + separator + transcribedText.trim());
          prefixTextRef.current = ""; // Limpar após uso
        } catch (error) {
          console.error('Error transcribing audio:', error);
          toast({
            title: t('chat.transcriptionError'),
            description: t('chat.transcriptionRetry'),
            variant: "destructive"
          });
        } finally {
          setIsTranscribing(false);
          setVoiceStatus('idle');
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
      setVoiceStatus('listening');
      checkSilence(); // Start silence detection
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      toast({
        title: t('chat.micError'),
        description: t('chat.micPermissions'),
        variant: "destructive"
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

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleAudioPlay = (index: number) => {
    playAudio(index);
  };

  const handleAudioStop = () => {
    stopAudio();
  };

  const handleDownloadAudio = (audioUrl: string, messageIndex: number) => {
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `knowyou-saude-audio-${messageIndex}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadImage = (imageUrl: string, messageIndex: number) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `knowyou-saude-imagem-${messageIndex}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTyping(input.length > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);
  return <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm rounded-lg border-2 border-primary/40 shadow-[0_0_15px_rgba(139,92,246,0.2),0_0_30px_rgba(139,92,246,0.1)] animate-fade-in">
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
          <Button variant="ghost" size="sm" onClick={clearHistory} className="text-xs">
            {t('chat.clear')}
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="h-[500px] p-6 border-2 border-cyan-400/60 bg-[hsl(var(--chat-container-bg))] rounded-lg m-2 shadow-[inset_0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_3px_rgba(0,0,0,0.3),0_0_15px_rgba(34,211,238,0.3)]" style={{
      transform: 'translateZ(-10px)',
      backfaceVisibility: 'hidden'
    }} ref={scrollRef}>
        {messages.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-primary-foreground">K</span>
            </div>
            <h4 className="text-xl font-semibold mb-2">{t('chat.greeting')}</h4>
            <p className="text-muted-foreground max-w-md">
              {t('chat.greetingDesc')}
            </p>
          </div> : <div className="space-y-4">
            {/* Disclaimer when document is attached */}
            {activeDisclaimer && <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="flex items-center justify-between">
                  {t('documentAttach.disclaimerTitle')}
                  <Button variant="ghost" size="sm" onClick={detachDocument} className="h-6 w-6 p-0" title={t('documentAttach.removeButton')}>
                    <X className="h-3 w-3" />
                  </Button>
                </AlertTitle>
                <AlertDescription>
                  {activeDisclaimer.message}
                </AlertDescription>
              </Alert>}
            
            {messages.map((msg, idx) => <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`} ref={el => {
          if (msg.role === "assistant" && msg.audioUrl) {
            audioMessageRefs.current[idx] = el;
          }
        }}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-[hsl(var(--chat-message-user-bg))] text-primary-foreground text-right" : "bg-[hsl(var(--chat-message-ai-bg))] text-foreground text-left"}`}>
                  {msg.imageUrl && <img src={msg.imageUrl} alt={t('chat.generatingImage')} className="max-w-full rounded-lg mb-2" />}
                  <div className="flex items-start gap-2">
                    <MarkdownContent content={msg.content} className="text-sm leading-relaxed flex-1" />
                  </div>
                  
                  {msg.role === "assistant" && <AudioControls audioUrl={msg.audioUrl} imageUrl={msg.imageUrl} isPlaying={currentlyPlayingIndex === idx} currentTime={currentlyPlayingIndex === idx ? audioProgress.currentTime : 0} duration={currentlyPlayingIndex === idx ? audioProgress.duration : 0} timestamp={msg.timestamp} location={location || undefined} messageContent={msg.content} onPlay={() => handleAudioPlay(idx)} onStop={handleAudioStop} onDownload={msg.audioUrl ? () => handleDownloadAudio(msg.audioUrl!, idx) : undefined} onDownloadImage={msg.imageUrl ? () => handleDownloadImage(msg.imageUrl!, idx) : undefined} />}
                </div>
              </div>)}
              {(isLoading || isGeneratingAudio || isGeneratingImage) && <div className="flex justify-start">
                  <TypingIndicator isDrawing={isGeneratingImage} />
                </div>}
            <div ref={messagesEndRef} />
          </div>}
      </ScrollArea>

      {/* Suggestions com slider */}
      {displayedSuggestions.length > 0 && !isLoading && <div className="px-6 py-4 bg-muted/50 border-t border-border/50">
          {/* Disclaimer when document attached */}
          {activeDisclaimer && <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
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
            </div>}
          
          
          <div className="flex flex-wrap gap-2 suggestions-slider">
            {displayedSuggestions.map((suggestion, idx) => {
          const isNew = suggestion.startsWith('🆕 NOVO:') || suggestion.toLowerCase().includes('novo:');
          return <Button key={`${suggestion}-${idx}`} variant={isNew ? "default" : "outline"} size="sm" onClick={() => handleSuggestionClick(suggestion)} className={cn("text-xs rounded-full border-2 border-primary/50 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-colors", isNew && "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-none animate-pulse shadow-lg")}>
                  {suggestion.replace('🆕 NOVO:', '').trim()}
                </Button>;
        })}
          </div>
        </div>}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-6 border-t border-border/50 shadow-[0_-2px_12px_rgba(0,0,0,0.2)]">
        {/* Indicador de voz ativo */}
        {isRecording && <div className="flex items-center gap-2 text-xs mb-2">
            <div className={`w-2 h-2 rounded-full ${voiceStatus === 'waiting' ? 'bg-amber-500' : voiceStatus === 'processing' ? 'bg-blue-500' : 'bg-red-500'} animate-pulse`} />
            <span className={voiceStatus === 'waiting' ? 'text-amber-500' : 'text-muted-foreground'}>
              {voiceStatus === 'listening' && t('chat.listening')}
              {voiceStatus === 'waiting' && `${t('chat.waiting')} (${waitingCountdown}s)`}
              {voiceStatus === 'processing' && t('chat.processing')}
            </span>
          </div>}
        
        {isTyping && <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{
            animationDelay: "0ms"
          }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{
            animationDelay: "150ms"
          }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{
            animationDelay: "300ms"
          }} />
            </div>
            {t('chat.typing')}
          </div>}
          <div className="flex gap-2 items-end">
            <DocumentAttachButton onAttach={attachDocument} disabled={isLoading || isGeneratingAudio || isGeneratingImage} />
            <Textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }} placeholder={isTranscribing ? t('chat.transcribing') : isImageMode ? t('chat.placeholderImage') : t('chat.placeholderHealth')} onFocus={e => {
          if (isImageMode) {
            e.target.placeholder = t('chat.imageLimitHealth');
          }
        }} onBlur={e => {
          if (isImageMode) {
            e.target.placeholder = t('chat.placeholderImage');
          }
        }} className="min-h-[140px] resize-none flex-1 border-2 border-cyan-400/60 shadow-[inset_0_3px_10px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(0,0,0,0.25),0_0_15px_rgba(34,211,238,0.3)]" style={{
          transform: 'translateZ(-8px)',
          backfaceVisibility: 'hidden'
        }} disabled={isLoading || isTranscribing} />
          
          <div className="flex flex-col gap-2">
            <Button type="button" size="icon" variant="ghost" onClick={isRecording ? stopRecording : startRecording} className={`shadow-[0_3px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.3)] transition-shadow ${isRecording ? "text-red-500" : ""}`}>
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="shadow-[0_3px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.3)] transition-shadow">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
            
            <Button type="button" size="icon" variant={isImageMode ? "default" : "ghost"} onClick={toggleImageMode} disabled={isGeneratingImage} title="Desenhar" className="shadow-[0_3px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.3)] transition-shadow">
              <ImagePlus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Pressione Enter para enviar • Shift+Enter para nova linha
        </p>
      </form>
      
      {/* Floating Audio Player */}
      <FloatingAudioPlayer isVisible={showFloatingPlayer && currentlyPlayingIndex !== null} currentTime={audioProgress.currentTime} duration={audioProgress.duration} onStop={() => {
      stopAudio();
      setShowFloatingPlayer(false);
    }} onClose={() => {
      stopAudio();
      setShowFloatingPlayer(false);
    }} />
    </div>;
}