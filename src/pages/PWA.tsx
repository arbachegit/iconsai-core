import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, Play, Pause, HelpCircle, X, Download, Share2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppState = "idle" | "recording" | "processing" | "ready";

// VAD Configuration
const SILENCE_THRESHOLD = 15;
const INITIAL_WAIT_MS = 10000;      // 10 seconds initial wait
const SILENCE_WAIT_MS = 5000;       // 5 seconds invisible silence
const COUNTDOWN_SECONDS = 5;        // 5 seconds visible countdown
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
  
  // VAD states
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusText, setStatusText] = useState("Toque para perguntar");
  
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
  const initialWaitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Speech state refs
  const hasEverSpokenRef = useRef(false);
  const isCurrentlySpeakingRef = useRef(false);
  const silenceStartedRef = useRef(false);

  // Fetch real-time indicators
  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        setLoadingIndicators(true);
        
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
        
        const latestValues: Record<string, { value: number; prevValue?: number }> = {};
        
        data?.forEach((item: any) => {
          const code = item.economic_indicators?.code;
          if (!code) return;
          
          if (!['DOLAR', 'SELIC', 'IPCA'].includes(code)) return;
          
          if (!latestValues[code]) {
            latestValues[code] = { value: item.value };
          } else if (!latestValues[code].prevValue) {
            latestValues[code].prevValue = item.value;
          }
        });
        
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

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupAll();
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // iOS prompt
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
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  // Cleanup all
  const cleanupAll = useCallback(() => {
    console.log("[VAD] Cleaning up...");
    
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    
    setCountdown(null);
    hasEverSpokenRef.current = false;
    isCurrentlySpeakingRef.current = false;
    silenceStartedRef.current = false;
  }, []);

  // Check voice activity
  const checkVoiceActivity = useCallback(() => {
    if (!analyserRef.current) return false;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    return average > SILENCE_THRESHOLD;
  }, []);

  // Send "didn't hear" message
  const sendDidNotHearMessage = useCallback(async () => {
    console.log("[VAD] Didn't hear anything - sending apology");
    cleanupAll();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    
    setState("processing");
    setStatusText("Processando...");
    
    try {
      const apologyText = "Desculpe, não consegui ouvir você. Pode falar um pouco mais alto ou mais perto do microfone, por favor?";
      
      const ttsResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: apologyText, agentSlug: 'economia' }),
        }
      );
      
      if (!ttsResponse.ok) {
        toast.error("Não consegui ouvir. Tente novamente.");
        setState("idle");
        setStatusText("Toque para perguntar");
        return;
      }
      
      const ttsBlob = await ttsResponse.blob();
      const url = URL.createObjectURL(ttsBlob);
      
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      setState("ready");
      setStatusText("Resposta pronta");
      
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log("Autoplay blocked:", e));
        }
      }, 100);
      
    } catch (error) {
      console.error("[VAD] Error generating apology:", error);
      toast.error("Não consegui ouvir. Tente novamente.");
      setState("idle");
      setStatusText("Toque para perguntar");
    }
  }, [audioUrl, cleanupAll]);

  // Stop and process
  const stopAndProcess = useCallback(() => {
    console.log("[VAD] Stopping and processing...");
    cleanupAll();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      vibrate([50, 50, 50]);
      setState("processing");
      setStatusText("Processando...");
    }
  }, [cleanupAll]);

  // Start visible countdown
  const startVisibleCountdown = useCallback(() => {
    console.log("[VAD] Starting visible countdown (5 seconds)");
    setCountdown(COUNTDOWN_SECONDS);
    setStatusText("Enviando em...");
    
    let count = COUNTDOWN_SECONDS;
    
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      
      if (count <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        stopAndProcess();
      }
    }, 1000);
  }, [stopAndProcess]);

  // Start invisible silence timer
  const startSilenceTimer = useCallback(() => {
    if (silenceTimeoutRef.current) return;
    
    console.log("[VAD] Starting silence timer (5s invisible)");
    silenceStartedRef.current = true;
    
    silenceTimeoutRef.current = setTimeout(() => {
      console.log("[VAD] 5s invisible silence passed - starting countdown");
      silenceTimeoutRef.current = null;
      startVisibleCountdown();
    }, SILENCE_WAIT_MS);
  }, [startVisibleCountdown]);

  // Cancel silence timers
  const cancelSilenceTimers = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    silenceStartedRef.current = false;
    setStatusText("Ouvindo...");
  }, []);

  // Start recording
  const startRecording = async () => {
    try {
      console.log("[PWA] Starting recording...");
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
        if (hasEverSpokenRef.current) {
          processAudio();
        }
      };
      
      mediaRecorder.start(100);
      setState("recording");
      setStatusText("Pode falar...");
      vibrate(50);
      
      // Reset flags
      hasEverSpokenRef.current = false;
      isCurrentlySpeakingRef.current = false;
      silenceStartedRef.current = false;
      
      // PHASE 1: Initial wait timer (10 seconds)
      console.log("[VAD] Starting initial wait (10 seconds)");
      initialWaitTimeoutRef.current = setTimeout(() => {
        console.log("[VAD] 10 seconds passed");
        initialWaitTimeoutRef.current = null;
        
        if (!hasEverSpokenRef.current) {
          sendDidNotHearMessage();
        }
      }, INITIAL_WAIT_MS);
      
      // Continuous VAD monitoring
      vadIntervalRef.current = setInterval(() => {
        const isSpeaking = checkVoiceActivity();
        
        if (isSpeaking) {
          isCurrentlySpeakingRef.current = true;
          
          if (!hasEverSpokenRef.current) {
            console.log("[VAD] Person started speaking - canceling initial timer");
            hasEverSpokenRef.current = true;
            
            if (initialWaitTimeoutRef.current) {
              clearTimeout(initialWaitTimeoutRef.current);
              initialWaitTimeoutRef.current = null;
            }
            
            setStatusText("Ouvindo...");
          }
          
          // Cancel silence timers if speaking again
          if (silenceStartedRef.current || countdown !== null) {
            console.log("[VAD] Speaking again - canceling silence timers");
            cancelSilenceTimers();
          }
          
        } else {
          // Silence detected
          if (hasEverSpokenRef.current && isCurrentlySpeakingRef.current) {
            // Transition from speaking → silence
            isCurrentlySpeakingRef.current = false;
            
            if (!silenceStartedRef.current && !countdownIntervalRef.current) {
              startSilenceTimer();
            }
          }
        }
      }, VAD_CHECK_INTERVAL);
      
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Não consegui acessar o microfone.");
      cleanupAll();
      setState("idle");
      setStatusText("Toque para perguntar");
    }
  };

  const stopRecording = () => {
    if (hasEverSpokenRef.current) {
      stopAndProcess();
    } else {
      cleanupAll();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setState("idle");
      setStatusText("Toque para perguntar");
    }
  };

  // Process audio
  const processAudio = async () => {
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

      console.log("[PWA] Audio size:", audioBlob.size);
      
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result as string;
          
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
          
          // Check if transcription makes sense (minimum characters)
          if (transcription.length < 3) {
            const apologyText = "Desculpe, não consegui entender o que você disse. Pode repetir de forma mais clara, por favor?";
            
            const ttsResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ text: apologyText, agentSlug: 'economia' }),
              }
            );
            
            if (ttsResponse.ok) {
              const ttsBlob = await ttsResponse.blob();
              const url = URL.createObjectURL(ttsBlob);
              
              if (audioUrl) URL.revokeObjectURL(audioUrl);
              setAudioUrl(url);
              setState("ready");
              setStatusText("Resposta pronta");
              
              setTimeout(() => {
                if (audioRef.current) audioRef.current.play().catch(() => {});
              }, 100);
            }
            return;
          }
          
          // 2. Agent
          console.log("[PWA] Agent...");
          const { data: agentData, error: agentError } = await supabase.functions.invoke('chat-pwa', {
            body: { message: transcription, agentSlug: 'economia', deviceId }
          });
          
          if (agentError) throw new Error("Erro no agente");
          
          const responseText = agentData?.response || "Desculpe, não consegui processar sua pergunta. Pode tentar novamente?";
          console.log("[PWA] Response:", responseText);
          
          // 3. TTS
          console.log("[PWA] TTS...");
          const ttsResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ text: responseText, agentSlug: 'economia' }),
            }
          );
          
          if (!ttsResponse.ok) throw new Error("Erro no TTS");
          
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
          console.error("[PWA] Error:", error);
          toast.error("Erro ao processar. Tente novamente.");
          setState("idle");
          setStatusText("Toque para perguntar");
        }
      };
      
    } catch (error) {
      console.error("[PWA] Error:", error);
      setState("idle");
      setStatusText("Toque para perguntar");
    }
  };

  // Player functions
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
      if (countdown !== null) return "bg-orange-500 scale-110 shadow-lg shadow-orange-500/50";
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
        {state === "recording" && countdown !== null && (
          <div className="absolute -bottom-16 flex flex-col items-center">
            <span className="text-4xl font-bold text-orange-500">{countdown}</span>
            <span className="text-sm text-muted-foreground">Enviando...</span>
          </div>
        )}
        
        {/* Recording indicator (no countdown) */}
        {state === "recording" && countdown === null && (
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
