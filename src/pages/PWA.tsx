import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, Play, Pause, HelpCircle, Share, X, Download, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppState = "idle" | "recording" | "processing" | "ready";

export default function PWA() {
  const [state, setState] = useState<AppState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [audioUrl]);

  // Detectar iOS e mostrar prompt de instalação
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isPWA = (window.navigator as any).standalone === true;
    
    // Mostrar prompt apenas se for iOS e NÃO estiver instalado
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

  // Função para iniciar contador de 5 segundos
  const startCountdown = () => {
    setCountdown(5);
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          // Tempo esgotou - parar gravação e processar
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          stopRecordingInternal();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Função interna para parar gravação (sem limpar countdown - já limpo no interval)
  const stopRecordingInternal = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      vibrate([50, 50, 50]);
      setState("processing");
    }
  };

  // Iniciar gravação
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;
      
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
        // Limpar countdown
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        setCountdown(null);
        processAudio();
      };
      
      mediaRecorder.start(100);
      setState("recording");
      vibrate(50);
      
      // INICIAR CONTADOR DE 5 SEGUNDOS
      startCountdown();
      
    } catch (error) {
      console.error("Erro ao acessar microfone:", error);
      toast.error("Não consegui acessar o microfone. Por favor, permita o acesso.");
    }
  };

  // Parar gravação manualmente
  const stopRecording = () => {
    // Limpar countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      setCountdown(null);
    }
    
    if (mediaRecorderRef.current && state === "recording") {
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.requestData();
      }
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      vibrate([50, 50, 50]);
      setState("processing");
    }
  };

  // Processar áudio: STT → Agent → TTS
  const processAudio = async () => {
    try {
      // Check if we have audio data
      if (audioChunksRef.current.length === 0) {
        throw new Error("Nenhum áudio capturado. Tente gravar por mais tempo.");
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      if (audioBlob.size === 0) {
        throw new Error("Áudio vazio. Tente gravar novamente.");
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
              deviceId: deviceId, // Passa deviceId para memória de conversas
            }
          });
          
          if (agentError) {
            throw new Error(agentError.message || "Erro no agente");
          }
          
          const responseText = agentData?.response || "Desculpe, não consegui processar sua pergunta.";
          console.log("[PWA] Resposta do agente:", responseText);
          
          // 3. TTS - Gerar áudio da resposta
          console.log("[PWA] Gerando áudio...");
          const ttsResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ 
                text: responseText,
                chatType: 'economia',
                agentSlug: 'economia'
              }),
            }
          );
          
          if (!ttsResponse.ok) {
            throw new Error("Erro ao gerar áudio");
          }
          
          const ttsBlob = await ttsResponse.blob();
          const url = URL.createObjectURL(ttsBlob);
          
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }
          
          setAudioUrl(url);
          setState("ready");
          
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play().catch(() => {
                toast.info("Toque em play para ouvir a resposta");
              });
            }
          }, 100);
          
        } catch (error) {
          console.error("[PWA] Erro no processamento:", error);
          toast.error(error instanceof Error ? error.message : "Erro ao processar áudio");
          setState("idle");
        }
      };
      
    } catch (error) {
      console.error("[PWA] Erro:", error);
      toast.error(error instanceof Error ? error.message : "Desculpe, ocorreu um erro.");
      setState("idle");
    }
  };

  // Controle do player
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
      // Converter blob URL para blob
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
        // Fallback sem arquivo
        await navigator.share({
          title: 'Economista - Assistente de Voz',
          text: 'Conheça o Economista, assistente de voz sobre economia!',
          url: window.location.href
        });
      } else {
        // Copiar link
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
      case "recording": return "Gravando... toque para parar";
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 relative">
      {/* Áudio element (hidden) */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={handleAudioPlay}
          onPause={handleAudioPause}
          onEnded={handleAudioEnded}
          onTimeUpdate={handleTimeUpdate}
        />
      )}

      {/* Logo/Título */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <span className="text-3xl">📊</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Economista</h1>
        <p className="text-gray-400 text-sm">{getStateText()}</p>
      </div>

      {/* Botão principal com contador */}
      <div className="relative">
        <button
          onClick={handleMainButton}
          disabled={state === "processing"}
          className={`
            w-32 h-32 rounded-full flex items-center justify-center
            transition-all duration-300 transform
            ${state === "recording" 
              ? "bg-red-500 scale-110 animate-pulse shadow-lg shadow-red-500/50" 
              : state === "processing"
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30"
            }
          `}
          aria-label={state === "recording" ? "Parar gravação" : "Iniciar gravação"}
        >
          {state === "processing" ? (
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          ) : state === "recording" ? (
            <Square className="w-12 h-12 text-white" />
          ) : (
            <Mic className="w-12 h-12 text-white" />
          )}
        </button>
        
        {/* CONTADOR DE 5 SEGUNDOS */}
        {countdown !== null && (
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="text-4xl font-bold text-white">{countdown}</div>
            <div className="text-xs text-gray-400">segundos</div>
          </div>
        )}
      </div>

      {/* Espaçamento extra quando contador está visível */}
      <div className={countdown !== null ? "h-16" : "h-0"} />

      {/* Player de áudio */}
      {audioUrl && state === "ready" && (
        <div className="mt-12 w-full max-w-xs bg-gray-900 rounded-2xl p-4">
          {/* Play/Pause + Progress */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors"
              aria-label={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>
            
            {/* Progress bar */}
            <div className="flex-1">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-100"
                  style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' }}
                />
              </div>
            </div>
            
            <span className="text-gray-400 text-sm w-10 text-right">
              {formatTime(progress)}
            </span>
          </div>
          
          {/* Velocidade */}
          <div className="flex justify-center gap-2 mt-4">
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
          
          {/* BOTÕES DE DOWNLOAD E COMPARTILHAR */}
          <div className="flex justify-center gap-3 mt-4 pt-4 border-t border-gray-800">
            <button
              onClick={downloadAudio}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 text-gray-300" />
              <span className="text-sm text-gray-300">Baixar</span>
            </button>
            
            <button
              onClick={shareAudio}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4 text-gray-300" />
              <span className="text-sm text-gray-300">Compartilhar</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner iOS - Adicionar à Tela de Início */}
      {showIOSPrompt && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-700 animate-slide-up z-50">
          <div className="flex items-center gap-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">📊</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Instale o Economista</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Toque em <Share className="inline w-4 h-4 mx-1" /> e depois em "Adicionar à Tela de Início"
              </p>
            </div>
            <button
              onClick={dismissIOSPrompt}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 text-gray-400" />
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
        <HelpCircle className="w-5 h-5 text-gray-400" />
      </button>
    </div>
  );
}