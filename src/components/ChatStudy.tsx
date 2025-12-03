import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStudy } from "@/hooks/useChatStudy";
import { Loader2, ImagePlus, Mic, Square, X, ArrowUp, Target } from "lucide-react";
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
import { CopyButton } from "./CopyButton";
import { FloatingAudioPlayer } from "./FloatingAudioPlayer";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useDocumentSuggestions } from "@/hooks/useDocumentSuggestions";
import { TopicDrillDown } from "./TopicDrillDown";
import { CarouselRow } from "./CarouselRow";

interface ChatStudyProps {
  onClose?: () => void;
}

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

export default function ChatStudy({ onClose }: ChatStudyProps = {}) {
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
    nextSteps,
    currentSentiment,
    sendMessage, 
    clearHistory,
    playAudio,
    stopAudio,
    generateImage,
    transcribeAudio,
  } = useChatStudy();
  
  // Hook para sugestões dinâmicas baseadas em documentos
  const {
    newDocumentBadge,
    currentTheme,
    complementarySuggestions,
    recordSuggestionClick,
    getSubtopicsForTheme,
    expandedTheme,
    setExpandedTheme,
    subtopicsCache,
  } = useDocumentSuggestions('study');
  
  // Debug: rastrear estado nextSteps
  console.log('[ChatStudy] nextSteps state:', nextSteps);
  
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState<ChartType | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'waiting' | 'processing'>('idle');
  const [waitingCountdown, setWaitingCountdown] = useState(5);
  const [displayedSuggestions, setDisplayedSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<string>("");
  const prefixTextRef = useRef<string>("");
  const [audioStates, setAudioStates] = useState<{[key: number]: { isPlaying: boolean; currentTime: number; duration: number }}>({});
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(false);
  const [audioVisibility, setAudioVisibility] = useState<{[key: number]: boolean}>({});
  const audioMessageRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, []);


  // Sync inputRef with input state
  useEffect(() => {
    inputRef.current = input;
  }, [input]);

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

  // Helper function to scroll to bottom using the sentinel element
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  // Auto-scroll to latest message - solução definitiva usando messagesEndRef
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, isLoading, isGeneratingAudio, isGeneratingImage]);

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
        // Prefix message with chart type preference if selected
        const messageToSend = selectedChartType 
          ? `[PREFERÊNCIA: Gráfico de ${selectedChartType}] ${input}`
          : input;
        sendMessage(messageToSend);
        setInput("");
        setSelectedChartType(null); // Reset after sending
      }
      // Scroll múltiplo para garantir que vá até a última mensagem
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 200);
      setTimeout(scrollToBottom, 500);
    }
  };

  const handleSuggestionClick = (suggestion: string, documentId?: string) => {
    // Registrar clique para ranking
    recordSuggestionClick(suggestion, documentId);
    
    if (isImageMode) {
      generateImage(suggestion);
    } else {
      sendMessage(suggestion);
    }
    // Scroll múltiplo após clicar em sugestão
    setTimeout(scrollToBottom, 50);
    setTimeout(scrollToBottom, 200);
    setTimeout(scrollToBottom, 500);
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
            description: t('chat.speechFallback'),
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
        variant: "destructive",
      });
    }
  };

  const startRecordingWithWhisper = async () => {
    try {
      prefixTextRef.current = input; // Salvar texto existente
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        
        if (average < 10) { // Silence threshold
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
          console.error("Error transcribing audio:", error);
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
      setVoiceStatus('listening');
      checkSilence(); // Start silence detection
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

  const handleDownloadAudio = (audioUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `knowyou-study-audio-${index}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadImage = (imageUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `knowyou-estudo-imagem-${index}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm rounded-lg border-2 border-primary/40 shadow-[0_0_15px_rgba(139,92,246,0.2),0_0_30px_rgba(139,92,246,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-primary/30">
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
            <h2 className="text-lg font-bold text-gradient">{t('chat.studyModalTitle')}</h2>
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
        
        {/* Botões lado a lado: Limpar à esquerda, Fechar à direita */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="text-xs h-8"
          >
            {t('chat.clear')}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              title={t('aiHistory.close')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
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
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
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
                </div>
                
                {message.imageUrl && (
                  <img
                    src={message.imageUrl}
                    alt="Generated"
                    className="mt-2 rounded-lg max-w-full"
                  />
                )}

                {message.role === "assistant" && (
                  <AudioControls
                    audioUrl={message.audioUrl}
                    imageUrl={message.imageUrl}
                    isPlaying={currentlyPlayingIndex === index}
                    isGeneratingAudio={isGeneratingAudio}
                    currentTime={audioStates[index]?.currentTime}
                    duration={audioStates[index]?.duration}
                    timestamp={message.timestamp}
                    location={location || undefined}
                    messageContent={message.content}
                    onPlay={() => handleAudioPlay(index)}
                    onStop={handleAudioStop}
                    onDownload={() => message.audioUrl && handleDownloadAudio(message.audioUrl, index)}
                    onDownloadImage={message.imageUrl ? () => handleDownloadImage(message.imageUrl!, index) : undefined}
                  />
                )}
              </div>
            </div>
          ))}
          
              {(isLoading || isGeneratingAudio || isGeneratingImage) && (
                <div className="flex justify-start">
                  <TypingIndicator isDrawing={isGeneratingImage} />
                </div>
              )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <TooltipProvider delayDuration={200}>
        <form onSubmit={handleSubmit} className="p-4 border-t-2 border-primary/30 bg-muted/30 rounded-b-lg shadow-[0_-2px_12px_rgba(0,0,0,0.2)]">
          {/* Indicador de voz ativo */}
          {isRecording && (
            <div className="flex items-center gap-2 text-xs mb-2">
              <div className={`w-2 h-2 rounded-full ${
                voiceStatus === 'waiting' 
                  ? 'bg-amber-500' 
                  : voiceStatus === 'processing' 
                  ? 'bg-blue-500' 
                  : 'bg-red-500'
              } animate-pulse`} />
              <span className={
                voiceStatus === 'waiting' 
                  ? 'text-amber-500' 
                  : 'text-muted-foreground'
              }>
                {voiceStatus === 'listening' && t('chat.listening')}
                {voiceStatus === 'waiting' && `${t('chat.waiting')} (${waitingCountdown}s)`}
                {voiceStatus === 'processing' && t('chat.processing')}
              </span>
            </div>
          )}
          
          {/* Container relativo para posicionar botões dentro */}
          <div className="relative">
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
              className="min-h-[80px] w-full resize-none pb-12 border-2 border-cyan-400/60 focus:border-primary/50 shadow-[inset_0_3px_10px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(0,0,0,0.25),0_0_15px_rgba(34,211,238,0.3)]"
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
            
            {/* Botões de funcionalidade - inferior esquerdo */}
            <div className="absolute bottom-2 left-2 flex gap-1 items-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`h-8 w-8 ${isRecording ? "text-red-500" : ""}`}
                  >
                    {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{isRecording ? "Parar gravação" : "Gravar áudio"}</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant={isImageMode ? "default" : "ghost"}
                    onClick={toggleImageMode}
                    disabled={isGeneratingImage}
                    className="h-8 w-8"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Gerar imagem</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <ChartTypeSelector
                    selectedType={selectedChartType}
                    onSelectType={setSelectedChartType}
                    disabled={isLoading || isImageMode}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">Tipo de gráfico</TooltipContent>
              </Tooltip>
            </div>
            
            {/* Botão Submit - inferior direito, circular */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="submit" 
                  size="icon" 
                  className="absolute bottom-2 right-2 h-8 w-8 rounded-full"
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? <Square className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{isLoading ? "Parar" : "Enviar"}</TooltipContent>
            </Tooltip>
          </div>
        </form>
      </TooltipProvider>

      {/* Próximos Passos - POSIÇÃO FIXA: Abaixo do input, Acima das sugestões */}
      {nextSteps.length > 0 && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border-t border-cyan-400/60">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-400/90 tracking-wide">Próximos passos:</span>
          </div>
          <CarouselRow>
            {nextSteps.map((step, idx) => (
              <Button
                key={`next-${idx}`}
                variant="outline"
                size="sm"
                onClick={() => sendMessage(step)}
                className="next-step-badge text-[11px] h-7 px-3 rounded-full shrink-0 
                  border-cyan-400/60 bg-cyan-500/20 text-cyan-300
                  hover:bg-cyan-500 hover:text-cyan-950 hover:border-cyan-500
                  hover:scale-105 transition-all
                  shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                🎯 {step}
              </Button>
            ))}
          </CarouselRow>
        </div>
      )}

      {/* Suggestions - DUAS LINHAS FIXAS com carrossel horizontal - POSIÇÃO: Depois de Próximos Passos */}
      {(displayedSuggestions.length > 0 || newDocumentBadge || complementarySuggestions.length > 0) && (
        <div className="px-4 py-2 bg-muted/50 border-t border-border/50 space-y-1.5">
          {/* LINHA 1: Carrossel horizontal */}
          <CarouselRow>
            {/* CENÁRIO 3: Ambos existem - mostrar NOVOS completos na Linha 1 */}
            {newDocumentBadge && newDocumentBadge.themes.length > 0 && complementarySuggestions.length > 0 && (
              newDocumentBadge.themes.map((theme, idx) => (
                <TopicDrillDown
                  key={`new-${theme}-${idx}`}
                  topic={theme}
                  isNew={true}
                  isExpanded={expandedTheme === theme}
                  onToggle={() => setExpandedTheme(expandedTheme === theme ? null : theme)}
                  onSubtopicClick={(subtopic) => {
                    recordSuggestionClick(subtopic, newDocumentBadge.documentIds[idx]);
                    sendMessage(subtopic);
                  }}
                  getSubtopics={getSubtopicsForTheme}
                  cachedSubtopics={subtopicsCache[theme]}
                />
              ))
            )}
            
            {/* CENÁRIO 1: Só novos - mostrar 1ª METADE dos novos (roxo) */}
            {newDocumentBadge && newDocumentBadge.themes.length > 0 && complementarySuggestions.length === 0 && (
              newDocumentBadge.themes.slice(0, Math.ceil(newDocumentBadge.themes.length / 2)).map((theme, idx) => (
                <TopicDrillDown
                  key={`new1-${theme}-${idx}`}
                  topic={theme}
                  isNew={true}
                  isExpanded={expandedTheme === theme}
                  onToggle={() => setExpandedTheme(expandedTheme === theme ? null : theme)}
                  onSubtopicClick={(subtopic) => {
                    recordSuggestionClick(subtopic, newDocumentBadge.documentIds[idx]);
                    sendMessage(subtopic);
                  }}
                  getSubtopics={getSubtopicsForTheme}
                  cachedSubtopics={subtopicsCache[theme]}
                />
              ))
            )}
            
            {/* CENÁRIO 2: Só antigos - mostrar 1ª METADE dos antigos (dourado) */}
            {(!newDocumentBadge || newDocumentBadge.themes.length === 0) && complementarySuggestions.length > 0 && (
              complementarySuggestions.slice(0, Math.ceil(complementarySuggestions.length / 2)).map((suggestion, idx) => (
                <TopicDrillDown
                  key={`comp1-${suggestion}-${idx}`}
                  topic={suggestion}
                  isNew={false}
                  isExpanded={expandedTheme === suggestion}
                  onToggle={() => setExpandedTheme(expandedTheme === suggestion ? null : suggestion)}
                  onSubtopicClick={(subtopic) => {
                    recordSuggestionClick(subtopic);
                    sendMessage(subtopic);
                  }}
                  getSubtopics={getSubtopicsForTheme}
                  cachedSubtopics={subtopicsCache[suggestion]}
                />
              ))
            )}
            
            {/* CENÁRIO 4: Nenhum documento - fallback 1ª metade */}
            {(!newDocumentBadge || newDocumentBadge.themes.length === 0) && complementarySuggestions.length === 0 && displayedSuggestions.slice(0, Math.ceil(displayedSuggestions.length / 2)).map((suggestion, idx) => {
              const isDataBadge = suggestion.startsWith("📊");
              const isNoDataBadge = suggestion.startsWith("📉");
              const buttonElement = (
                <Button
                  key={`disp1-${suggestion}-${idx}`}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`text-[10px] h-6 px-2 rounded-full shrink-0 transition-colors ${
                    isDataBadge 
                      ? "border-emerald-500/60 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-500 hover:text-emerald-950 hover:border-emerald-500 animate-pulse" 
                      : isNoDataBadge
                        ? "border-slate-500/60 bg-slate-600/20 text-slate-300 hover:bg-slate-500 hover:text-slate-950 hover:border-slate-500"
                        : "border border-primary/40 hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  }`}
                >
                  {suggestion}
                </Button>
              );
              return (isDataBadge || isNoDataBadge) ? (
                <Tooltip key={`tooltip1-${idx}`}>
                  <TooltipTrigger asChild>{buttonElement}</TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-center">
                    <p className="text-xs">
                      {isDataBadge 
                        ? "Clique para ver todos os dados numéricos encontrados nos documentos"
                        : "Este contexto não contém estatísticas. Clique para sugestões de como obter dados"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ) : buttonElement;
            })}
          </CarouselRow>
          
          {/* LINHA 2: Carrossel horizontal */}
          <CarouselRow>
            {/* CENÁRIO 3: Ambos existem - mostrar ANTIGOS completos na Linha 2 (dourado) */}
            {newDocumentBadge && newDocumentBadge.themes.length > 0 && complementarySuggestions.length > 0 && (
              complementarySuggestions.map((suggestion, idx) => (
                <TopicDrillDown
                  key={`comp-${suggestion}-${idx}`}
                  topic={suggestion}
                  isNew={false}
                  isExpanded={expandedTheme === suggestion}
                  onToggle={() => setExpandedTheme(expandedTheme === suggestion ? null : suggestion)}
                  onSubtopicClick={(subtopic) => {
                    recordSuggestionClick(subtopic);
                    sendMessage(subtopic);
                  }}
                  getSubtopics={getSubtopicsForTheme}
                  cachedSubtopics={subtopicsCache[suggestion]}
                />
              ))
            )}
            
            {/* CENÁRIO 1: Só novos - mostrar 2ª METADE dos novos (roxo) */}
            {newDocumentBadge && newDocumentBadge.themes.length > 0 && complementarySuggestions.length === 0 && (
              newDocumentBadge.themes.slice(Math.ceil(newDocumentBadge.themes.length / 2)).map((theme, idx) => (
                <TopicDrillDown
                  key={`new2-${theme}-${idx}`}
                  topic={theme}
                  isNew={true}
                  isExpanded={expandedTheme === theme}
                  onToggle={() => setExpandedTheme(expandedTheme === theme ? null : theme)}
                  onSubtopicClick={(subtopic) => {
                    const originalIdx = Math.ceil(newDocumentBadge.themes.length / 2) + idx;
                    recordSuggestionClick(subtopic, newDocumentBadge.documentIds[originalIdx]);
                    sendMessage(subtopic);
                  }}
                  getSubtopics={getSubtopicsForTheme}
                  cachedSubtopics={subtopicsCache[theme]}
                />
              ))
            )}
            
            {/* CENÁRIO 2: Só antigos - mostrar 2ª METADE dos antigos (dourado) */}
            {(!newDocumentBadge || newDocumentBadge.themes.length === 0) && complementarySuggestions.length > 0 && (
              complementarySuggestions.slice(Math.ceil(complementarySuggestions.length / 2)).map((suggestion, idx) => (
                <TopicDrillDown
                  key={`comp2-${suggestion}-${idx}`}
                  topic={suggestion}
                  isNew={false}
                  isExpanded={expandedTheme === suggestion}
                  onToggle={() => setExpandedTheme(expandedTheme === suggestion ? null : suggestion)}
                  onSubtopicClick={(subtopic) => {
                    recordSuggestionClick(subtopic);
                    sendMessage(subtopic);
                  }}
                  getSubtopics={getSubtopicsForTheme}
                  cachedSubtopics={subtopicsCache[suggestion]}
                />
              ))
            )}
            
            {/* CENÁRIO 4: Nenhum documento - fallback 2ª metade */}
            {(!newDocumentBadge || newDocumentBadge.themes.length === 0) && complementarySuggestions.length === 0 && displayedSuggestions.slice(Math.ceil(displayedSuggestions.length / 2)).map((suggestion, idx) => {
              const isDataBadge = suggestion.startsWith("📊");
              const isNoDataBadge = suggestion.startsWith("📉");
              const buttonElement = (
                <Button
                  key={`disp2-${suggestion}-${idx}`}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`text-[10px] h-6 px-2 rounded-full shrink-0 transition-colors ${
                    isDataBadge 
                      ? "border-emerald-500/60 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-500 hover:text-emerald-950 hover:border-emerald-500 animate-pulse" 
                      : isNoDataBadge
                        ? "border-slate-500/60 bg-slate-600/20 text-slate-300 hover:bg-slate-500 hover:text-slate-950 hover:border-slate-500"
                        : "border border-primary/40 hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  }`}
                >
                  {suggestion}
                </Button>
              );
              return (isDataBadge || isNoDataBadge) ? (
                <Tooltip key={`tooltip2-${idx}`}>
                  <TooltipTrigger asChild>{buttonElement}</TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-center">
                    <p className="text-xs">
                      {isDataBadge 
                        ? "Clique para ver todos os dados numéricos encontrados nos documentos"
                        : "Este contexto não contém estatísticas. Clique para sugestões de como obter dados"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ) : buttonElement;
            })}
          </CarouselRow>
        </div>
      )}
      
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
