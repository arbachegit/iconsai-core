import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatKnowYOU } from "@/hooks/useChatKnowYOU";
import { Loader2, ImagePlus, Mic, Square, X, ArrowUp, Target, GitBranch } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChartTypeSelector, ChartType } from "./ChartTypeSelector";
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
import { CarouselRow } from "./CarouselRow";

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
  const { t } = useTranslation();
  const { toast } = useToast();
  const { location, requestLocation } = useGeolocation();
  const {
    messages,
    isLoading,
    isGeneratingAudio,
    isGeneratingImage,
    currentlyPlayingIndex,
    nextSteps,
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
  const [isImageMode, setIsImageMode] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState<ChartType | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'waiting' | 'processing'>('idle');
  const [waitingCountdown, setWaitingCountdown] = useState(5);
  const [badgesCollapsed, setBadgesCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prefixTextRef = useRef<string>("");
  const mountTimeRef = useRef(Date.now());
  const previousMessagesLength = useRef(messages.length);
  const INIT_PERIOD = 1000;
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

  // IntersectionObserver estável
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
    
    const observeElements = () => {
      Object.entries(audioMessageRefs.current).forEach(([idx, el]) => {
        if (el) {
          el.setAttribute('data-audio-index', idx);
          observer.observe(el);
        }
      });
    };
    
    observeElements();
    
    // MutationObserver simples
    let mutationThrottleId: number | null = null;
    const mutationObserver = new MutationObserver(() => {
      if (mutationThrottleId) return;
      mutationThrottleId = window.setTimeout(() => {
        mutationThrottleId = null;
        observeElements();
      }, 2000);
    });
    
    const container = document.querySelector('[data-radix-scroll-area-viewport]');
    if (container) {
      mutationObserver.observe(container, { childList: true, subtree: true });
    }
    
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      if (mutationThrottleId) clearTimeout(mutationThrottleId);
    };
  }, []);

  // Mostrar FloatingPlayer quando áudio tocando E não visível
  useEffect(() => {
    if (currentlyPlayingIndex !== null && !audioVisibility[currentlyPlayingIndex]) {
      setShowFloatingPlayer(true);
    } else {
      setShowFloatingPlayer(false);
    }
  }, [currentlyPlayingIndex, audioVisibility]);
  
  // Cleanup completo no unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

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

  // Auto-scroll to latest message
  useEffect(() => {
    const timeSinceMount = Date.now() - mountTimeRef.current;
    if (timeSinceMount < INIT_PERIOD) {
      previousMessagesLength.current = messages.length;
      return;
    }
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
    
    if (isRecording) {
      stopRecording();
    }
    
    if (input.trim() && !isLoading) {
      setBadgesCollapsed(false);
      
      if (isImageMode) {
        generateImage(input);
        setInput("");
        setIsImageMode(false);
      } else {
        const messageToSend = selectedChartType 
          ? `[PREFERÊNCIA: Gráfico de ${selectedChartType}] ${input}`
          : input;
        sendMessage(messageToSend);
        setInput("");
        setSelectedChartType(null);
      }
      setTimeout(scrollToBottom, 100);
    }
  };
  
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (!badgesCollapsed && input.length === 0 && e.key.length === 1) {
      setBadgesCollapsed(true);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isImageMode) {
      generateImage(suggestion);
    } else {
      sendMessage(suggestion);
    }
    setTimeout(scrollToBottom, 100);
  };

  const toggleImageMode = () => {
    setIsImageMode(!isImageMode);
    setInput("");
  };
  
  const startRecording = async () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = true;
        let silenceTimeout: NodeJS.Timeout | null = null;
        const SILENCE_TIMEOUT = 5000;

        recognition.onstart = () => {
          prefixTextRef.current = input;
          setIsRecording(true);
          setIsTranscribing(true);
          setVoiceStatus('listening');
        };
        recognition.onresult = (event: any) => {
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            fullTranscript += result[0].transcript;
            if (result.isFinal) {
              fullTranscript += ' ';
            }
          }
          const prefix = prefixTextRef.current;
          const separator = prefix && !prefix.endsWith(' ') ? ' ' : '';
          setInput(prefix + separator + fullTranscript.trim());
        };
        recognition.onspeechend = () => {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
          setVoiceStatus('waiting');
          setWaitingCountdown(5);
          countdownIntervalRef.current = setInterval(() => {
            setWaitingCountdown(prev => {
              if (prev <= 1) {
                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          silenceTimeoutRef.current = setTimeout(() => {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            recognition.stop();
          }, SILENCE_TIMEOUT);
        };
        recognition.onspeechstart = () => {
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setVoiceStatus('listening');
          setWaitingCountdown(5);
        };
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
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
          toast({
            title: t('chat.speechNotAvailable'),
            description: t('chat.speechFallback')
          });
          startRecordingWithWhisper();
        };
        recognition.onend = () => {
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          prefixTextRef.current = "";
          setIsRecording(false);
          setIsTranscribing(false);
          setVoiceStatus('idle');
        };
        mediaRecorderRef.current = recognition as any;
        recognition.start();
      } else {
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
      prefixTextRef.current = input;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

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
          if (!silenceStart) {
            silenceStart = Date.now();
            setVoiceStatus('waiting');
          } else if (Date.now() - silenceStart > 5000) {
            mediaRecorder.stop();
            cancelAnimationFrame(animationFrameId);
            return;
          }
          const elapsed = Math.floor((Date.now() - silenceStart) / 1000);
          setWaitingCountdown(Math.max(0, 5 - elapsed));
        } else {
          silenceStart = null;
          setVoiceStatus('listening');
          setWaitingCountdown(5);
        }
        
        animationFrameId = requestAnimationFrame(checkSilence);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        cancelAnimationFrame(animationFrameId);
        audioContext.close();
        
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        audioChunksRef.current = [];
        setIsRecording(false);
        setVoiceStatus('processing');
        setIsTranscribing(true);

        try {
          const transcribedText = await transcribeAudio(audioBlob);
          if (transcribedText) {
            const prefix = prefixTextRef.current;
            const separator = prefix && !prefix.endsWith(' ') ? ' ' : '';
            setInput(prefix + separator + transcribedText);
          }
        } catch (error) {
          console.error("Erro na transcrição:", error);
          toast({
            title: t('chat.transcriptionError'),
            description: t('chat.tryAgain'),
            variant: "destructive",
          });
        } finally {
          prefixTextRef.current = "";
          setIsTranscribing(false);
          setVoiceStatus('idle');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setVoiceStatus('listening');
      checkSilence();
    } catch (error) {
      console.error("Erro ao iniciar gravação com Whisper:", error);
      toast({
        title: t('chat.micError'),
        description: t('chat.micPermissions'),
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current instanceof MediaRecorder) {
        mediaRecorderRef.current.stop();
      } else {
        (mediaRecorderRef.current as any).stop();
      }
    }
    setIsRecording(false);
    setVoiceStatus('idle');
  };

  useEffect(() => {
    const handleStopAllAudio = () => {
      stopAudio();
    };
    window.addEventListener('stopAllAudio', handleStopAllAudio);
    return () => {
      window.removeEventListener('stopAllAudio', handleStopAllAudio);
    };
  }, [stopAudio]);

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

  const handleDownloadAudio = async (audioUrl: string, index: number) => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio-${index}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar áudio:', error);
    }
  };

  const handleDownloadImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imagem-${index}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
    }
  };

  return (
    <div className="chat-container flex flex-col h-[750px] bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <img src={knowriskLogo} alt="KnowRisk" className="w-10 h-10 rounded-full" />
          <div>
            <span className="font-semibold text-sm text-foreground">{t('chat.health.title')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SentimentIndicator sentiment={currentSentiment} />
          <Button variant="ghost" size="sm" onClick={clearHistory} className="text-xs text-muted-foreground hover:text-foreground">
            {t('chat.clearHistory')}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-3">
        <div className="space-y-4">
          {/* Disclaimer para primeira interação - posição TOP */}
          {activeDisclaimer && messages.length === 0 && (
            <Alert variant="destructive" className="mb-4 bg-destructive/10 border-destructive/30">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('chat.health.disclaimer.title')}</AlertTitle>
              <AlertDescription className="text-xs">
                {t('chat.health.disclaimer.message')}
              </AlertDescription>
            </Alert>
          )}
          
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                ref={(el) => {
                  if (message.role === 'assistant' && message.audioUrl) {
                    audioMessageRefs.current[index] = el;
                  }
                }}
                className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}
              >
                {/* Imagem gerada */}
                {message.imageUrl && (
                  <div className="mb-3">
                    <img 
                      src={message.imageUrl} 
                      alt="Generated" 
                      className="rounded-lg max-w-full h-auto"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadImage(message.imageUrl!, index)}
                      className="mt-2 text-xs"
                    >
                      {t('chat.downloadImage')}
                    </Button>
                  </div>
                )}
                
                {/* Conteúdo da mensagem */}
                <div className="text-sm leading-relaxed">
                  {message.role === 'assistant' ? (
                    <MarkdownContent content={message.content} />
                  ) : (
                    message.content
                  )}
                </div>
                
                {/* Controles de áudio e cópia */}
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-2">
                    <AudioControls
                      isPlaying={currentlyPlayingIndex === index}
                      isGeneratingAudio={isGeneratingAudio && currentlyPlayingIndex === index}
                      audioUrl={message.audioUrl}
                      onPlay={() => handleAudioPlay(index)}
                      onStop={handleAudioStop}
                      onDownload={message.audioUrl ? () => handleDownloadAudio(message.audioUrl!, index) : undefined}
                      currentTime={currentlyPlayingIndex === index ? audioProgress.currentTime : 0}
                      duration={currentlyPlayingIndex === index ? audioProgress.duration : 0}
                      messageContent={message.content}
                    />
                    <CopyButton content={message.content} />
                  </div>
                )}
                
                {/* Timestamp */}
                <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                  {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {/* Indicador de digitação */}
          {isLoading && <TypingIndicator />}
          
          {/* Indicador de geração de imagem */}
          {isGeneratingImage && (
            <div className="flex justify-start">
              <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">{t('chat.generatingImage')}</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-border/50 bg-muted/30">
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              handleInputKeyDown(e);
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={isImageMode ? t('chat.health.imagePlaceholder') : t('chat.health.placeholder')}
            className="w-full min-h-[60px] pr-32 pl-28 resize-none bg-background/50 border-border/50 focus:border-primary/50 rounded-xl"
            disabled={isLoading || isGeneratingImage}
          />
          
          {/* Ícones à esquerda - alinhados na base */}
          <div className="absolute bottom-2 left-2 flex items-end gap-1">
            {/* Botão de microfone */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "ghost"}
                    size="icon"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isLoading || isGeneratingImage}
                    className={cn(
                      "h-8 w-8 rounded-full",
                      isRecording && "animate-pulse"
                    )}
                  >
                    {isRecording ? (
                      <Square className="w-4 h-4" />
                    ) : isTranscribing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">
                    {isRecording 
                      ? voiceStatus === 'waiting' 
                        ? `${t('chat.waitingContinue')} (${waitingCountdown}s)` 
                        : t('chat.recording')
                      : isTranscribing 
                        ? t('chat.transcribing')
                        : t('chat.startRecording')
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Botão de modo imagem */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isImageMode ? "default" : "ghost"}
                    size="icon"
                    onClick={toggleImageMode}
                    disabled={isLoading || isGeneratingImage}
                    className="h-8 w-8 rounded-full"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{isImageMode ? t('chat.exitImageMode') : t('chat.imageMode')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Seletor de tipo de gráfico */}
            <ChartTypeSelector
              selectedType={selectedChartType}
              onSelectType={setSelectedChartType}
            />
          </div>

          {/* Ícones à direita */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            {/* Botão de anexar documento */}
            <DocumentAttachButton
              onAttach={attachDocument}
            />
            
            {/* Botão de enviar */}
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading || isGeneratingImage}
              className="h-8 w-8 rounded-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Próximos Passos - MANTIDO */}
      {nextSteps && nextSteps.length > 0 && !isLoading && !badgesCollapsed && (
        <div className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border-t border-cyan-400/60">
          <div className="flex items-center gap-2 mb-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-medium text-cyan-300">{t('chat.nextSteps')}</span>
          </div>
          <CarouselRow>
            {nextSteps.map((step, idx) => {
              const isDiagram = step.toLowerCase() === "diagrama";
              return (
                <Button
                  key={`next-${idx}`}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isDiagram) {
                      sendMessage("Crie um diagrama Mermaid visual resumindo tudo o que conversamos até agora. Inclua os principais pontos, conceitos e conexões entre os temas discutidos.");
                    } else {
                      sendMessage(step);
                    }
                  }}
                  className={`next-step-badge text-[11px] h-7 px-3 rounded-full shrink-0 ${
                    isDiagram 
                      ? "bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 border-violet-400/60 text-violet-200 hover:from-violet-400 hover:to-fuchsia-400 hover:text-white hover:border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                      : "border-cyan-400/60 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-cyan-950 hover:border-cyan-500 hover:scale-105 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {isDiagram ? (
                    <GitBranch className="w-3 h-3 mr-1" />
                  ) : (
                    <Target className="w-3 h-3 mr-1" />
                  )}
                  {step}
                </Button>
              );
            })}
          </CarouselRow>
        </div>
      )}
      
      {/* Floating Audio Player */}
      <FloatingAudioPlayer 
        isVisible={showFloatingPlayer && currentlyPlayingIndex !== null} 
        currentTime={audioProgress.currentTime} 
        duration={audioProgress.duration} 
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
