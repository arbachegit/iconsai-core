import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, Play, Pause, HelpCircle, X, Download, Share2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppState = "idle" | "recording" | "processing" | "ready";

// VAD Configuration
const SILENCE_THRESHOLD = 15;
const INITIAL_WAIT_MS = 10000;
const SILENCE_WAIT_MS = 5000;
const COUNTDOWN_SECONDS = 5;
const VAD_CHECK_INTERVAL = 100;

interface Indicator {
  code: string;
  name: string;
  value: number | null;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
}

export default function PWA() {
  // UI States only
  const [state, setState] = useState<AppState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [countdownDisplay, setCountdownDisplay] = useState<number | null>(null);
  const [statusText, setStatusText] = useState("Toque para perguntar");
  const [indicators, setIndicators] = useState<Indicator[]>([
    { code: 'DOLAR', name: 'Dólar', value: null, unit: 'R$' },
    { code: 'SELIC', name: 'Selic', value: null, unit: '% a.a.' },
    { code: 'IPCA', name: 'IPCA', value: null, unit: '%' },
  ]);
  const [loadingIndicators, setLoadingIndicators] = useState(true);
  
  // Media Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Timer Refs
  const vadIntervalRef = useRef<number | null>(null);
  const initialWaitTimeoutRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  
  // Control Refs (CRITICAL: use refs for internal logic, not state)
  const hasEverSpokenRef = useRef(false);
  const isCurrentlySpeakingRef = useRef(false);
  const silenceStartedRef = useRef(false);
  const countdownActiveRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isRecordingRef = useRef(false);

  // Fetch indicators
  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        setLoadingIndicators(true);
        const { data, error } = await supabase
          .from('indicator_values')
          .select(`value, reference_date, indicator_id, economic_indicators!inner(code, name, unit)`)
          .order('reference_date', { ascending: false })
          .limit(100);
        
        if (error) throw error;
        
        const latestValues: Record<string, { value: number; prevValue?: number }> = {};
        data?.forEach((item: any) => {
          const code = item.economic_indicators?.code;
          if (!code || !['DOLAR', 'SELIC', 'IPCA'].includes(code)) return;
          if (!latestValues[code]) latestValues[code] = { value: item.value };
          else if (!latestValues[code].prevValue) latestValues[code].prevValue = item.value;
        });
        
        setIndicators(prev => prev.map(ind => {
          const latest = latestValues[ind.code];
          if (!latest) return ind;
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (latest.prevValue !== undefined) {
            if (latest.value > latest.prevValue) trend = 'up';
            else if (latest.value < latest.prevValue) trend = 'down';
          }
          return { ...ind, value: latest.value, trend };
        }));
      } catch (error) {
        console.error('Error fetching indicators:', error);
      } finally {
        setLoadingIndicators(false);
      }
    };
    
    fetchIndicators();
    const interval = setInterval(fetchIndicators, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Device ID
  useEffect(() => {
    let id = localStorage.getItem('pwa-device-id');
    if (!id) {
      id = `device-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('pwa-device-id', id);
    }
    setDeviceId(id);
  }, []);

  // iOS prompt
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isPWA = (window.navigator as any).standalone === true;
    if (isIOS && !isStandalone && !isPWA && !localStorage.getItem('ios-prompt-dismissed')) {
      setTimeout(() => setShowIOSPrompt(true), 2000);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllTimers();
      cleanupMediaResources();
    };
  }, []);

  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [audioUrl]);

  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  // Separate cleanup functions
  const cleanupAllTimers = () => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (initialWaitTimeoutRef.current) {
      clearTimeout(initialWaitTimeoutRef.current);
      initialWaitTimeoutRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const cleanupMediaResources = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  };

  const resetControlFlags = () => {
    hasEverSpokenRef.current = false;
    isCurrentlySpeakingRef.current = false;
    silenceStartedRef.current = false;
    countdownActiveRef.current = false;
    setCountdownDisplay(null);
  };

  const cleanupAll = () => {
    console.log("[PWA] Full cleanup");
    cleanupAllTimers();
    cleanupMediaResources();
    resetControlFlags();
    isRecordingRef.current = false;
  };

  const checkVoiceActivity = (): boolean => {
    if (!analyserRef.current) return false;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    return average > SILENCE_THRESHOLD;
  };

  const stopMediaRecorder = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("[PWA] Error stopping media recorder:", e);
      }
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const playTTSResponse = async (text: string) => {
    try {
      const ttsResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, agentSlug: 'economia' }),
        }
      );
      
      if (!ttsResponse.ok) throw new Error("TTS failed");
      
      const ttsBlob = await ttsResponse.blob();
      const url = URL.createObjectURL(ttsBlob);
      
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      setState("ready");
      setStatusText("Resposta pronta");
      
      setTimeout(() => {
        if (audioRef.current) audioRef.current.play().catch(() => {});
      }, 100);
    } catch (error) {
      console.error("[PWA] TTS error:", error);
      toast.error("Erro ao gerar áudio.");
      setState("idle");
      setStatusText("Toque para perguntar");
    }
  };

  // Process audio - with protection against multiple calls
  const processAudio = async () => {
    if (isProcessingRef.current) {
      console.log("[PWA] Already processing, skipping");
      return;
    }
    
    isProcessingRef.current = true;
    console.log("[PWA] Processing audio...");
    
    try {
      if (audioChunksRef.current.length === 0) {
        toast.error("Nenhum áudio capturado.");
        setState("idle");
        setStatusText("Toque para perguntar");
        return;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      if (audioBlob.size < 1000) {
        toast.error("Áudio muito curto.");
        setState("idle");
        setStatusText("Toque para perguntar");
        return;
      }

      setState("processing");
      setStatusText("Processando...");

      const base64Audio = await blobToBase64(audioBlob);
      
      // 1. STT
      console.log("[PWA] STT...");
      const { data: sttData, error: sttError } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });
      
      if (sttError || !sttData?.text) {
        throw new Error("Erro na transcrição");
      }
      
      const transcription = sttData.text.trim();
      console.log("[PWA] Transcription:", transcription);
      
      // Check if transcription is too short
      if (transcription.length < 3) {
        await playTTSResponse("Desculpe, não consegui entender o que você disse. Pode repetir de forma mais clara, por favor?");
        return;
      }
      
      // 2. Agent
      console.log("[PWA] Agent...");
      const { data: agentData, error: agentError } = await supabase.functions.invoke('chat-pwa', {
        body: { message: transcription, agentSlug: 'economia', deviceId }
      });
      
      if (agentError) throw new Error("Erro no agente");
      
      const responseText = agentData?.response || "Desculpe, não consegui processar sua pergunta.";
      console.log("[PWA] Response:", responseText);
      
      // 3. TTS
      await playTTSResponse(responseText);
      
    } catch (error) {
      console.error("[PWA] Error:", error);
      toast.error("Erro ao processar. Tente novamente.");
      setState("idle");
      setStatusText("Toque para perguntar");
    } finally {
      isProcessingRef.current = false;
    }
  };

  const sendDidNotHearMessage = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    console.log("[PWA] Did not hear - sending apology");
    
    // IMPORTANT: Stop media recorder FIRST, then cleanup
    stopMediaRecorder();
    cleanupAllTimers();
    cleanupMediaResources();
    isRecordingRef.current = false;
    
    setState("processing");
    setStatusText("Processando...");
    
    try {
      await playTTSResponse("Desculpe, não consegui ouvir você. Pode falar um pouco mais alto ou mais perto do microfone, por favor?");
    } finally {
      isProcessingRef.current = false;
      resetControlFlags();
    }
  };

  const stopAndProcess = () => {
    if (!isRecordingRef.current) return;
    
    console.log("[PWA] Stop and process");
    
    const shouldProcess = hasEverSpokenRef.current;
    
    // Clean timers first
    cleanupAllTimers();
    
    // Stop media recorder (will trigger onstop)
    stopMediaRecorder();
    
    // Cleanup resources
    cleanupMediaResources();
    
    isRecordingRef.current = false;
    vibrate([50, 50, 50]);
    
    if (shouldProcess) {
      setState("processing");
      setStatusText("Processando...");
    }
    
    resetControlFlags();
  };

  const startVisibleCountdown = () => {
    if (countdownActiveRef.current) return;
    
    console.log("[PWA] Starting visible countdown");
    countdownActiveRef.current = true;
    setCountdownDisplay(COUNTDOWN_SECONDS);
    setStatusText("Enviando em...");
    
    let count = COUNTDOWN_SECONDS;
    
    countdownIntervalRef.current = window.setInterval(() => {
      count -= 1;
      setCountdownDisplay(count);
      
      if (count <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        countdownActiveRef.current = false;
        stopAndProcess();
      }
    }, 1000);
  };

  const startSilenceTimer = () => {
    if (silenceTimeoutRef.current || countdownActiveRef.current) return;
    
    console.log("[PWA] Starting silence timer");
    silenceStartedRef.current = true;
    
    silenceTimeoutRef.current = window.setTimeout(() => {
      silenceTimeoutRef.current = null;
      if (isRecordingRef.current && hasEverSpokenRef.current) {
        startVisibleCountdown();
      }
    }, SILENCE_WAIT_MS);
  };

  const cancelSilenceTimers = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    silenceStartedRef.current = false;
    countdownActiveRef.current = false;
    setCountdownDisplay(null);
    setStatusText("Ouvindo...");
  };

  const startRecording = async () => {
    if (isRecordingRef.current || isProcessingRef.current) {
      console.log("[PWA] Already recording or processing");
      return;
    }
    
    try {
      console.log("[PWA] Starting recording...");
      
      // Full cleanup first
      cleanupAll();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      streamRef.current = stream;
      
      // Setup VAD
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        console.log("[PWA] MediaRecorder stopped, hasSpoken:", hasEverSpokenRef.current);
        if (hasEverSpokenRef.current && !isProcessingRef.current) {
          processAudio();
        }
      };
      
      mediaRecorder.start(100);
      isRecordingRef.current = true;
      setState("recording");
      setStatusText("Pode falar...");
      vibrate(50);
      
      // Phase 1: Initial wait (10 seconds)
      console.log("[PWA] Starting initial wait (10s)");
      initialWaitTimeoutRef.current = window.setTimeout(() => {
        initialWaitTimeoutRef.current = null;
        if (isRecordingRef.current && !hasEverSpokenRef.current) {
          sendDidNotHearMessage();
        }
      }, INITIAL_WAIT_MS);
      
      // VAD monitoring - use REFS not state for internal logic
      vadIntervalRef.current = window.setInterval(() => {
        if (!isRecordingRef.current) return;
        
        const isSpeaking = checkVoiceActivity();
        
        if (isSpeaking) {
          isCurrentlySpeakingRef.current = true;
          
          if (!hasEverSpokenRef.current) {
            console.log("[PWA] First speech detected");
            hasEverSpokenRef.current = true;
            
            if (initialWaitTimeoutRef.current) {
              clearTimeout(initialWaitTimeoutRef.current);
              initialWaitTimeoutRef.current = null;
            }
            setStatusText("Ouvindo...");
          }
          
          // Cancel any silence timers - use REFS not state
          if (silenceStartedRef.current || countdownActiveRef.current) {
            cancelSilenceTimers();
          }
          
        } else {
          // Silence
          if (hasEverSpokenRef.current && isCurrentlySpeakingRef.current) {
            isCurrentlySpeakingRef.current = false;
            
            if (!silenceStartedRef.current && !countdownActiveRef.current) {
              startSilenceTimer();
            }
          }
        }
      }, VAD_CHECK_INTERVAL);
      
    } catch (error) {
      console.error("[PWA] Error:", error);
      toast.error("Não consegui acessar o microfone.");
      cleanupAll();
      setState("idle");
      setStatusText("Toque para perguntar");
    }
  };

  const stopRecording = () => {
    if (!isRecordingRef.current) return;
    
    if (hasEverSpokenRef.current) {
      stopAndProcess();
    } else {
      cleanupAll();
      stopMediaRecorder();
      setState("idle");
      setStatusText("Toque para perguntar");
    }
  };

  // UI Functions
  const dismissIOSPrompt = () => {
    setShowIOSPrompt(false);
    localStorage.setItem('ios-prompt-dismissed', 'true');
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
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
        await navigator.share({ title: 'Economista', files: [file] });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copiado!");
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') toast.error("Erro ao compartilhar");
    }
  };

  const handleAudioPlay = () => setIsPlaying(true);
  const handleAudioPause = () => setIsPlaying(false);
  const handleAudioEnded = () => { setIsPlaying(false); setProgress(0); };
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;

  const handleMainButton = () => {
    if (state === "idle" || state === "ready") startRecording();
    else if (state === "recording") stopRecording();
  };

  const getButtonStyle = () => {
    if (state === "recording") {
      if (countdownDisplay !== null) return "bg-orange-500 scale-110 shadow-lg shadow-orange-500/50";
      return "bg-red-500 scale-110 animate-pulse shadow-lg shadow-red-500/50";
    }
    if (state === "processing") return "bg-muted cursor-not-allowed";
    return "bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-lg shadow-primary/30";
  };

  const formatIndicatorValue = (ind: Indicator) => {
    if (ind.value === null) return '--';
    if (ind.code === 'DOLAR') return `R$ ${ind.value.toFixed(2)}`;
    return `${ind.value.toFixed(2)}${ind.unit}`;
  };

  const TrendIcon = ({ trend }: { trend?: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
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

      {/* Indicators */}
      <div className="absolute top-4 left-4 right-4">
        <div className="flex justify-center gap-2">
          {indicators.map(ind => (
            <div key={ind.code} className="bg-card/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{ind.name}</span>
                <div className="flex items-center gap-1 text-sm font-semibold">
                  {loadingIndicators ? '...' : <>{formatIndicatorValue(ind)} <TrendIcon trend={ind.trend} /></>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span className="text-4xl">📊</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Economista</h1>
        <p className="text-muted-foreground text-sm mt-1">{statusText}</p>
      </div>

      {/* Main button */}
      <div className="relative flex flex-col items-center">
        <button
          onClick={handleMainButton}
          disabled={state === "processing"}
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${getButtonStyle()}`}
        >
          {state === "processing" ? (
            <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
          ) : state === "recording" ? (
            <Square className="w-10 h-10 text-white fill-white" />
          ) : (
            <Mic className="w-12 h-12 text-primary-foreground" />
          )}
        </button>
        
        {/* Visible countdown */}
        {state === "recording" && countdownDisplay !== null && (
          <div className="absolute -bottom-16 flex flex-col items-center">
            <span className="text-4xl font-bold text-orange-500">{countdownDisplay}</span>
            <span className="text-sm text-muted-foreground">Enviando...</span>
          </div>
        )}
        
        {/* Recording indicator (no countdown) */}
        {state === "recording" && countdownDisplay === null && (
          <div className="absolute -bottom-10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">Gravando</span>
          </div>
        )}
      </div>

      <div className="h-24" />

      {/* Player */}
      {audioUrl && state === "ready" && (
        <div className="w-full max-w-sm bg-card rounded-2xl p-4 shadow-lg border border-border">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors">
              {isPlaying ? <Pause className="w-5 h-5 text-primary-foreground" /> : <Play className="w-5 h-5 text-primary-foreground ml-0.5" />}
            </button>
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: duration > 0 ? `${(progress/duration)*100}%` : '0%' }} />
              </div>
            </div>
            <span className="text-sm text-muted-foreground font-mono w-12 text-right">{formatTime(progress)}</span>
          </div>
          
          <div className="flex justify-center gap-2 mb-4">
            {[0.5, 1, 1.5, 2].map(rate => (
              <button key={rate} onClick={() => changeSpeed(rate)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${playbackRate === rate ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {rate}x
              </button>
            ))}
          </div>
          
          <div className="flex justify-center gap-4">
            <button onClick={downloadAudio} className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm">
              <Download className="w-4 h-4" /> Baixar
            </button>
            <button onClick={shareAudio} className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm">
              <Share2 className="w-4 h-4" /> Compartilhar
            </button>
          </div>
        </div>
      )}

      {/* iOS banner */}
      {showIOSPrompt && (
        <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-4 animate-in slide-in-from-bottom">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📊</div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Instale o Economista</p>
              <p className="text-sm text-muted-foreground">Toque em <Share2 className="w-4 h-4 inline" /> e "Adicionar à Tela de Início"</p>
            </div>
            <button onClick={dismissIOSPrompt} className="p-2 hover:bg-muted rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      <button onClick={() => toast.info("Toque no microfone para perguntar sobre economia!")} className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
        <HelpCircle className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
}
