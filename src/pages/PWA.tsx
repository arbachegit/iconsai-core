import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, Play, Pause, HelpCircle, X, Download, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppState = "idle" | "recording" | "processing" | "ready";
type VADPhase = "warmup" | "listening" | "countdown";

// Configuração VAD
const SILENCE_THRESHOLD = 15;
const WARMUP_SECONDS = 5;
const COUNTDOWN_SECONDS = 5;
const VAD_CHECK_INTERVAL = 100;

export default function PWA() {
  const [state, setState] = useState<AppState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  
  // Estados VAD
  const [vadPhase, setVadPhase] = useState<VADPhase>("warmup");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [warmupCountdown, setWarmupCountdown] = useState<number | null>(null);
  
  // Refs existentes
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Refs VAD
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warmupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpokenRef = useRef<boolean>(false);
  const silenceStartTimeRef = useRef<number | null>(null);
  const vadPhaseRef = useRef<VADPhase>("warmup");

  // Sync vadPhase to ref for interval callbacks
  useEffect(() => {
    vadPhaseRef.current = vadPhase;
  }, [vadPhase]);

  // Carregar ou criar deviceId persistente
  useEffect(() => {
    let id = localStorage.getItem('pwa-device-id');
    if (!id) {
      id = `device-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('pwa-device-id', id);
    }
    setDeviceId(id);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, []);

  // Cleanup audioUrl separately
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Função de limpeza geral
  const cleanupAll = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (warmupIntervalRef.current) {
      clearInterval(warmupIntervalRef.current);
      warmupIntervalRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  // Detectar iOS e mostrar prompt de instalação
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isPWA = (window.navigator as any).standalone === true;
    
    if (isIOS && !isStandalone && !isPWA) {
      const dismissed = localStorage.getItem('ios-prompt-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowIOSPrompt(true), 2000);
      }
    }
  }, []);

  const dismissIOSPrompt = () => {
    setShowIOSPrompt(false);
    localStorage.setItem('ios-prompt-dismissed', 'true');
  };

  // Vibrar se disponível
  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  // Verificar atividade de voz usando Web Audio API
  const checkVoiceActivity = useCallback((): boolean => {
    if (!analyserRef.current) return false;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    
    return average > SILENCE_THRESHOLD;
  }, []);

  // Função para parar gravação e processar
  const stopRecordingAndProcess = useCallback(() => {
    console.log("[VAD] Parando gravação e processando...");
    
    // Limpar todos os timers
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (warmupIntervalRef.current) {
      clearInterval(warmupIntervalRef.current);
      warmupIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      
      // Fechar AudioContext
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
      }
      
      vibrate([50, 50, 50]);
      setState("processing");
    }
    
    // Reset estados VAD
    setCountdown(null);
    setWarmupCountdown(null);
    setVadPhase("warmup");
    vadPhaseRef.current = "warmup";
    hasSpokenRef.current = false;
    silenceStartTimeRef.current = null;
  }, []);

  // Iniciar countdown de silêncio
  const startSilenceCountdown = useCallback(() => {
    console.log("[VAD] Iniciando countdown de silêncio...");
    setVadPhase("countdown");
    vadPhaseRef.current = "countdown";
    setCountdown(COUNTDOWN_SECONDS);
    
    let currentCount = COUNTDOWN_SECONDS;
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    countdownIntervalRef.current = setInterval(() => {
      currentCount -= 1;
      setCountdown(currentCount);
      
      if (currentCount <= 0) {
        console.log("[VAD] Countdown terminou - processando");
        stopRecordingAndProcess();
      }
    }, 1000);
  }, [stopRecordingAndProcess]);

  // Cancelar countdown e voltar a ouvir
  const cancelCountdown = useCallback(() => {
    console.log("[VAD] Cancelando countdown - pessoa voltou a falar");
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    setVadPhase("listening");
    vadPhaseRef.current = "listening";
    silenceStartTimeRef.current = null;
  }, []);

  // Processar áudio: STT → Agent → TTS
  const processAudio = useCallback(async () => {
    try {
      if (audioChunksRef.current.length === 0) {
        toast.error("Nenhum áudio capturado. Tente gravar por mais tempo.");
        setState("idle");
        return;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      if (audioBlob.size < 1000) {
        toast.error("Áudio muito curto. Fale por mais tempo.");
        setState("idle");
        return;
      }

      console.log("[PWA] Audio blob size:", audioBlob.size, "bytes");
      
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result as string;
          const base64Data = base64Audio.split(',')[1] || '';
          
          if (!base64Data || base64Data.length < 100) {
            toast.error("Áudio muito curto. Fale por mais tempo.");
            setState("idle");
            return;
          }
          
          console.log("[PWA] Base64 length:", base64Data.length);
        
          // 1. STT - Transcrever áudio
          console.log("[PWA] Enviando para STT...");
          const { data: sttData, error: sttError } = await supabase.functions.invoke('voice-to-text', {
            body: { audio: base64Audio }
          });
          
          if (sttError || !sttData?.text) {
            throw new Error(sttError?.message || "Erro na transcrição");
          }
          
          console.log("[PWA] Transcrição:", sttData.text);
          
          // 2. Agent - Enviar para o agente de economia com deviceId para memória
          console.log("[PWA] Enviando para agente...");
          const { data: agentData, error: agentError } = await supabase.functions.invoke('chat-pwa', {
            body: {
              message: sttData.text,
              agentSlug: 'economia',
              deviceId: deviceId,
            }
          });
          
          if (agentError) {
            throw new Error(agentError.message || "Erro no agente");
          }
          
          const responseText = agentData?.response || "Desculpe, não consegui processar sua pergunta.";
          console.log("[PWA] Resposta do agente:", responseText);
          
          // 3. TTS - Converter resposta em áudio
          console.log("[PWA] Enviando para TTS...");
          const { data: ttsData, error: ttsError } = await supabase.functions.invoke('text-to-speech', {
            body: { 
              text: responseText,
              agentSlug: 'economia'
            }
          });
          
          if (ttsError) {
            throw new Error(ttsError.message || "Erro ao gerar áudio");
          }
          
          if (!ttsData?.audio) {
            throw new Error("Nenhum áudio retornado");
          }
          
          // Converter base64 para blob e criar URL
          const audioBytes = atob(ttsData.audio);
          const audioArray = new Uint8Array(audioBytes.length);
          for (let i = 0; i < audioBytes.length; i++) {
            audioArray[i] = audioBytes.charCodeAt(i);
          }
          const responseBlob = new Blob([audioArray], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(responseBlob);
          
          // Limpar URL anterior se existir
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }
          
          setAudioUrl(url);
          setState("ready");
          
          // Auto-play
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play().catch(e => console.log("Autoplay blocked:", e));
            }
          }, 100);
          
        } catch (error) {
          console.error("[PWA] Erro no processamento:", error);
          toast.error(error instanceof Error ? error.message : "Erro ao processar");
          setState("idle");
        }
      };
      
      reader.onerror = () => {
        toast.error("Erro ao ler o áudio gravado");
        setState("idle");
      };
      
    } catch (error) {
      console.error("[PWA] Erro:", error);
      toast.error(error instanceof Error ? error.message : "Erro desconhecido");
      setState("idle");
    }
  }, [audioUrl, deviceId]);

  // Iniciar monitoramento VAD (após warm-up)
  const startVADMonitoring = useCallback(() => {
    console.log("[VAD] Iniciando monitoramento de voz...");
    
    vadIntervalRef.current = setInterval(() => {
      const isSpeaking = checkVoiceActivity();
      const currentPhase = vadPhaseRef.current;
      
      if (isSpeaking) {
        // Pessoa está falando
        hasSpokenRef.current = true;
        
        if (currentPhase === "countdown") {
          // Estava em countdown, cancelar
          cancelCountdown();
        } else if (currentPhase === "warmup") {
          // Estava em warmup, transicionar para listening
          console.log("[VAD] Pessoa começou a falar - saindo do warmup");
          if (warmupIntervalRef.current) {
            clearInterval(warmupIntervalRef.current);
            warmupIntervalRef.current = null;
          }
          setWarmupCountdown(null);
          setVadPhase("listening");
          vadPhaseRef.current = "listening";
        }
        
        silenceStartTimeRef.current = null;
        
      } else {
        // Silêncio detectado
        
        // Só iniciar countdown se já falou antes E está em listening
        if (hasSpokenRef.current && currentPhase === "listening") {
          if (silenceStartTimeRef.current === null) {
            silenceStartTimeRef.current = Date.now();
          } else {
            const silenceDuration = Date.now() - silenceStartTimeRef.current;
            
            // Após 500ms de silêncio contínuo, iniciar countdown
            if (silenceDuration >= 500) {
              startSilenceCountdown();
            }
          }
        }
      }
    }, VAD_CHECK_INTERVAL);
  }, [checkVoiceActivity, cancelCountdown, startSilenceCountdown]);

  // Iniciar fase de warm-up
  const startWarmupPhase = useCallback(() => {
    console.log("[VAD] Iniciando fase de warm-up (5 segundos)...");
    setVadPhase("warmup");
    vadPhaseRef.current = "warmup";
    setWarmupCountdown(WARMUP_SECONDS);
    hasSpokenRef.current = false;
    
    let currentCount = WARMUP_SECONDS;
    
    warmupIntervalRef.current = setInterval(() => {
      currentCount -= 1;
      setWarmupCountdown(currentCount);
      
      if (currentCount <= 0) {
        console.log("[VAD] Warm-up terminou");
        if (warmupIntervalRef.current) {
          clearInterval(warmupIntervalRef.current);
          warmupIntervalRef.current = null;
        }
        setWarmupCountdown(null);
        
        // Se não falou nada durante o warm-up, processar mesmo assim
        if (!hasSpokenRef.current) {
          console.log("[VAD] Ninguém falou durante warm-up - processando");
          stopRecordingAndProcess();
        } else {
          // Transicionar para listening normal
          setVadPhase("listening");
          vadPhaseRef.current = "listening";
        }
      }
    }, 1000);
    
    // Iniciar monitoramento VAD em paralelo
    startVADMonitoring();
  }, [startVADMonitoring, stopRecordingAndProcess]);

  // Iniciar gravação
  const startRecording = async () => {
    try {
      console.log("[PWA] Iniciando gravação...");
      
      // Limpar estado anterior
      cleanupAll();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;
      
      // Configurar Web Audio API para VAD
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        processAudio();
      };
      
      mediaRecorder.start(100);
      setState("recording");
      vibrate(50);
      
      // Iniciar fase de warm-up
      startWarmupPhase();
      
    } catch (error) {
      console.error("Erro ao acessar microfone:", error);
      toast.error("Não consegui acessar o microfone. Por favor, permita o acesso.");
      cleanupAll();
    }
  };

  // Parar gravação manualmente
  const stopRecording = () => {
    stopRecordingAndProcess();
  };

  // Funções do player
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Download do áudio
  const downloadAudio = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `economista-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Áudio baixado!");
  };

  // Compartilhar áudio
  const shareAudio = async () => {
    if (!audioUrl) return;
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const file = new File([blob], 'economista-resposta.mp3', { type: 'audio/mpeg' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Economista - Resposta',
          text: 'Ouça essa explicação sobre economia!',
          files: [file]
        });
      } else if (navigator.share) {
        await navigator.share({
          title: 'Economista - Assistente de Voz',
          text: 'Conheça o Economista, assistente de voz sobre economia!',
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copiado!");
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error("Erro ao compartilhar");
      }
    }
  };

  // Handlers do áudio
  const handleAudioPlay = () => setIsPlaying(true);
  const handleAudioPause = () => setIsPlaying(false);
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Texto do estado
  const getStateText = () => {
    switch (state) {
      case "idle": return "Toque para falar";
      case "recording": 
        if (vadPhase === "warmup") return "Pode falar...";
        if (vadPhase === "listening") return "Ouvindo...";
        return "";
      case "processing": return "Entendendo sua pergunta...";
      case "ready": return "Resposta pronta";
    }
  };

  // Handler do botão principal
  const handleMainButton = () => {
    if (state === "idle" || state === "ready") {
      startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
  };

  // Determinar cor do botão
  const getButtonStyle = () => {
    if (state === "recording") {
      if (vadPhase === "warmup") {
        return "bg-blue-500 scale-110 animate-pulse shadow-lg shadow-blue-500/50";
      }
      if (vadPhase === "listening") {
        return "bg-green-500 scale-110 shadow-lg shadow-green-500/50";
      }
      return "bg-orange-500 scale-110 shadow-lg shadow-orange-500/50";
    }
    if (state === "processing") {
      return "bg-gray-600 cursor-not-allowed";
    }
    return "bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Áudio element (hidden) */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={handleAudioPlay}
          onPause={handleAudioPause}
          onEnded={handleAudioEnded}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
        />
      )}

      {/* Logo/Título */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <span className="text-4xl">📊</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Economista</h1>
        <p className="text-gray-400 text-sm">{getStateText()}</p>
      </div>

      {/* Botão principal com indicador VAD */}
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={handleMainButton}
          disabled={state === "processing"}
          className={`
            w-32 h-32 rounded-full flex items-center justify-center
            transition-all duration-300 ease-out
            ${getButtonStyle()}
          `}
          aria-label={state === "recording" ? "Parar gravação" : "Iniciar gravação"}
        >
          {state === "processing" ? (
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          ) : state === "recording" ? (
            <Square className="w-10 h-10 text-white fill-white" />
          ) : (
            <Mic className="w-12 h-12 text-white" />
          )}
        </button>
        
        {/* Indicador VAD abaixo do botão */}
        {state === "recording" && (
          <div className="flex flex-col items-center gap-2 text-center min-h-[60px]">
            {vadPhase === "warmup" && (
              <>
                <span className="text-4xl font-bold text-blue-400">{warmupCountdown}</span>
                <span className="text-blue-300 text-sm">Pode falar...</span>
              </>
            )}
            {vadPhase === "listening" && (
              <>
                <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-300 text-sm">Ouvindo...</span>
              </>
            )}
            {vadPhase === "countdown" && (
              <>
                <span className="text-4xl font-bold text-orange-400">{countdown}</span>
                <span className="text-orange-300 text-sm">Silêncio detectado</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Espaçamento extra quando gravando */}
      <div className={`transition-all duration-300 ${state === "recording" ? "h-4" : "h-16"}`} />

      {/* Player de áudio */}
      {audioUrl && state === "ready" && (
        <div className="w-full max-w-sm bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 space-y-4">
          {/* Play/Pause + Progress */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors flex-shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white fill-white" />
              ) : (
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              )}
            </button>
            
            {/* Progress bar */}
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-100"
                style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' }}
              />
            </div>
            
            <span className="text-gray-400 text-xs font-mono w-10 text-right">
              {formatTime(progress)}
            </span>
          </div>
          
          {/* Velocidade */}
          <div className="flex justify-center gap-2">
            {[0.5, 1, 1.5, 2].map(rate => (
              <button
                key={rate}
                onClick={() => changeSpeed(rate)}
                className={`
                  px-3 py-1 rounded-full text-sm font-medium transition-all
                  ${playbackRate === rate 
                    ? "bg-blue-500 text-white" 
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }
                `}
              >
                {rate}x
              </button>
            ))}
          </div>
          
          {/* Botões de download e compartilhar */}
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={downloadAudio}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Baixar
            </button>
            <button
              onClick={shareAudio}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm"
            >
              <Share2 className="w-4 h-4" />
              Compartilhar
            </button>
          </div>
        </div>
      )}

      {/* Banner iOS */}
      {showIOSPrompt && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-800 border-t border-gray-700 safe-area-bottom">
          <div className="flex items-start gap-3 max-w-sm mx-auto">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📊</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">Instale o Economista</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Toque em <span className="inline-block">⎙</span> e depois em "Adicionar à Tela de Início"
              </p>
            </div>
            <button onClick={dismissIOSPrompt} className="text-gray-500 hover:text-gray-400 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Botão de ajuda */}
      <button
        onClick={() => toast.info("Toque no botão do microfone para fazer uma pergunta sobre economia. Eu vou responder por voz!")}
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
        aria-label="Ajuda"
      >
        <HelpCircle className="w-6 h-6 text-gray-400" />
      </button>
    </div>
  );
}
