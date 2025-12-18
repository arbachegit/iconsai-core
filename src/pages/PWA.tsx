import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, Play, Pause, HelpCircle, Share, X, Download, Share2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppState = "idle" | "recording" | "processing" | "ready";

// VAD Configuration
const SILENCE_THRESHOLD = 15;
const WARMUP_MS = 5000;
const SILENCE_TIMEOUT_MS = 5000;
const VAD_CHECK_INTERVAL = 100;

interface Indicator {
  code: string;
  name: string;
  value: number | null;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
}

export default function PWA() {
  const [state, setState] = useState<AppState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  
  // Real-time indicators
  const [indicators, setIndicators] = useState<Indicator[]>([
    { code: 'DOLAR', name: 'Dólar', value: null, unit: 'R$' },
    { code: 'SELIC', name: 'Selic', value: null, unit: '% a.a.' },
    { code: 'IPCA', name: 'IPCA', value: null, unit: '%' },
  ]);
  const [loadingIndicators, setLoadingIndicators] = useState(true);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // VAD refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warmupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpokenRef = useRef(false);
  const isListeningRef = useRef(false);

  // Fetch real-time indicators
  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        setLoadingIndicators(true);
        
        // Query with JOIN to get indicator code from economic_indicators
        const { data, error } = await supabase
          .from('indicator_values')
          .select(`
            value,
            reference_date,
            indicator_id,
            economic_indicators!inner(code, name, unit)
          `)
          .order('reference_date', { ascending: false })
          .limit(100);
        
        if (error) throw error;
        
        // Group by code and get latest values
        const latestValues: Record<string, { value: number; prevValue?: number }> = {};
        
        data?.forEach((item: any) => {
          const code = item.economic_indicators?.code;
          if (!code) return;
          
          // Only process our target indicators
          if (!['DOLAR', 'SELIC', 'IPCA'].includes(code)) return;
          
          if (!latestValues[code]) {
            latestValues[code] = { value: item.value };
          } else if (!latestValues[code].prevValue) {
            latestValues[code].prevValue = item.value;
          }
        });
        
        // Update state with values and trends
        setIndicators(prev => prev.map(ind => {
          const latest = latestValues[ind.code];
          if (latest) {
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (latest.prevValue !== undefined) {
              if (latest.value > latest.prevValue) trend = 'up';
              else if (latest.value < latest.prevValue) trend = 'down';
            }
            return { ...ind, value: latest.value, trend };
          }
          return ind;
        }));
        
      } catch (error) {
        console.error('Error fetching indicators:', error);
      } finally {
        setLoadingIndicators(false);
      }
    };
    
    fetchIndicators();
    
    // Update every 5 minutes
    const interval = setInterval(fetchIndicators, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Load or create persistent deviceId
  useEffect(() => {
    let id = localStorage.getItem('pwa-device-id');
    if (!id) {
      id = `device-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('pwa-device-id', id);
    }
    setDeviceId(id);
  }, []);

  // Cleanup function
  const cleanupAll = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (warmupTimeoutRef.current) {
      clearTimeout(warmupTimeoutRef.current);
      warmupTimeoutRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAll();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [cleanupAll, audioUrl]);

  // Detect iOS and show install prompt
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

  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  // Check voice activity
  const checkVoiceActivity = useCallback(() => {
    if (!analyserRef.current) return false;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    
    return average > SILENCE_THRESHOLD;
  }, []);

  // Stop recording and process
  const stopRecordingAndProcess = useCallback(() => {
    console.log("[VAD] Stopping recording and processing...");
    
    cleanupAll();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      vibrate([50, 50, 50]);
      setState("processing");
    }
    
    hasSpokenRef.current = false;
    isListeningRef.current = false;
  }, [cleanupAll]);

  // Start silence timer
  const startSilenceTimer = useCallback(() => {
    if (silenceTimeoutRef.current) return;
    
    silenceTimeoutRef.current = setTimeout(() => {
      console.log("[VAD] Silence timeout - processing");
      stopRecordingAndProcess();
    }, SILENCE_TIMEOUT_MS);
  }, [stopRecordingAndProcess]);

  // Reset silence timer
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  // VAD monitoring
  const startVADMonitoring = useCallback(() => {
    console.log("[VAD] Starting monitoring...");
    
    vadIntervalRef.current = setInterval(() => {
      const isSpeaking = checkVoiceActivity();
      
      if (isSpeaking) {
        hasSpokenRef.current = true;
        resetSilenceTimer();
      } else {
        // Only start silence timer if user has spoken and we're listening
        if (hasSpokenRef.current && isListeningRef.current) {
          startSilenceTimer();
        }
      }
    }, VAD_CHECK_INTERVAL);
  }, [checkVoiceActivity, resetSilenceTimer, startSilenceTimer]);

  // Start recording
  const startRecording = async () => {
    try {
      console.log("[PWA] Starting recording...");
      cleanupAll();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;
      
      // Setup Web Audio API for VAD
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
      hasSpokenRef.current = false;
      isListeningRef.current = false;
      vibrate(50);
      
      // Warmup period - wait before detecting silence
      warmupTimeoutRef.current = setTimeout(() => {
        console.log("[VAD] Warmup complete");
        isListeningRef.current = true;
        
        // If no speech during warmup, give more time
        if (!hasSpokenRef.current) {
          silenceTimeoutRef.current = setTimeout(() => {
            if (!hasSpokenRef.current) {
              stopRecordingAndProcess();
            }
          }, 3000);
        }
      }, WARMUP_MS);
      
      // Start VAD monitoring in parallel
      startVADMonitoring();
      
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Não consegui acessar o microfone. Por favor, permita o acesso.");
      cleanupAll();
    }
  };

  const stopRecording = () => {
    stopRecordingAndProcess();
  };

  // Process audio: STT → Agent → TTS
  const processAudio = async () => {
    try {
      if (audioChunksRef.current.length === 0) {
        toast.error("Nenhum áudio capturado. Tente novamente.");
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
        
          // 1. STT
          console.log("[PWA] Sending to STT...");
          const { data: sttData, error: sttError } = await supabase.functions.invoke('voice-to-text', {
            body: { audio: base64Audio }
          });
          
          if (sttError || !sttData?.text) {
            throw new Error(sttError?.message || "Erro na transcrição");
          }
          
          console.log("[PWA] Transcription:", sttData.text);
          
          // 2. Agent
          console.log("[PWA] Sending to agent...");
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
          console.log("[PWA] Response:", responseText);
          
          // 3. TTS
          console.log("[PWA] Generating audio...");
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
          console.error("[PWA] Processing error:", error);
          toast.error(error instanceof Error ? error.message : "Erro ao processar áudio");
          setState("idle");
        }
      };
      
      reader.onerror = () => {
        toast.error("Erro ao ler o áudio");
        setState("idle");
      };
      
    } catch (error) {
      console.error("[PWA] Error:", error);
      toast.error(error instanceof Error ? error.message : "Erro desconhecido");
      setState("idle");
    }
  };

  // Player controls
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
          title: 'Economista',
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStateText = () => {
    switch (state) {
      case "idle": return "Toque para perguntar";
      case "recording": return "Pode falar...";
      case "processing": return "Processando...";
      case "ready": return "Resposta pronta";
    }
  };

  const handleMainButton = () => {
    if (state === "idle" || state === "ready") {
      startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
  };

  const getButtonStyle = () => {
    if (state === "recording") {
      return "bg-red-500 scale-110 animate-pulse shadow-lg shadow-red-500/50";
    }
    if (state === "processing") {
      return "bg-gray-600 cursor-not-allowed";
    }
    return "bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30";
  };

  const formatIndicatorValue = (indicator: Indicator) => {
    if (indicator.value === null) return '--';
    
    if (indicator.code === 'DOLAR') {
      return `R$ ${indicator.value.toFixed(2)}`;
    }
    return `${indicator.value.toFixed(2)}${indicator.unit}`;
  };

  const TrendIcon = ({ trend }: { trend?: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-red-400" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-green-400" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 relative">
      {/* Audio element */}
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

      {/* Real-time indicators */}
      <div className="absolute top-4 left-4 right-4">
        <div className="flex justify-center gap-3">
          {indicators.map(indicator => (
            <div 
              key={indicator.code}
              className="bg-gray-900/80 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[80px]"
            >
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                  {indicator.name}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  {loadingIndicators ? (
                    <span className="text-xs text-gray-400">...</span>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-white">
                        {formatIndicatorValue(indicator)}
                      </span>
                      <TrendIcon trend={indicator.trend} />
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logo/Title */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <span className="text-3xl">📊</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Economista</h1>
        <p className="text-gray-400 text-sm">{getStateText()}</p>
      </div>

      {/* Main button - Simple, no countdown */}
      <div className="relative">
        <button
          onClick={handleMainButton}
          disabled={state === "processing"}
          className={`
            w-32 h-32 rounded-full flex items-center justify-center
            transition-all duration-300 transform
            ${getButtonStyle()}
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
        
        {/* Simple recording indicator */}
        {state === "recording" && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Gravando</span>
          </div>
        )}
      </div>

      {/* Spacing */}
      <div className="h-8" />

      {/* Audio player */}
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
          
          {/* Speed controls */}
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
          
          {/* Download and Share buttons */}
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

      {/* iOS Banner */}
      {showIOSPrompt && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-700 animate-slide-up z-50">
          <div className="flex items-center gap-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">📊</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Instale o Economista</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Toque em <Share className="inline w-4 h-4 mx-1" /> e "Adicionar à Tela de Início"
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

      {/* Help button */}
      <button
        onClick={() => toast.info("Toque no microfone para perguntar sobre economia!")}
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
        aria-label="Ajuda"
      >
        <HelpCircle className="w-5 h-5 text-gray-400" />
      </button>
    </div>
  );
}
