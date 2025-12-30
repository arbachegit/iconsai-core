import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, Play, Pause, HelpCircle, X, Download, Share2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import knowriskLogo from "@/assets/knowrisk-pwa-logo.png";

type AppState = "idle" | "recording" | "processing" | "ready";

// ==========================================
// CONFIGURAÇÃO DE TEMPOS (VERIFICADOS)
// ==========================================
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
  // ==========================================
  // ESTADOS DE UI (apenas para renderização)
  // ==========================================
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
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loadingIndicators, setLoadingIndicators] = useState(true);
  
  // ==========================================
  // REFS DE MÍDIA
  // ==========================================
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // ==========================================
  // REFS DE TIMERS
  // ==========================================
  const vadIntervalRef = useRef<number | null>(null);
  const initialWaitTimeoutRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  
  // ==========================================
  // REFS DE CONTROLE (CRÍTICO: usar refs, não state)
  // ==========================================
  const hasEverSpokenRef = useRef(false);
  const isCurrentlySpeakingRef = useRef(false);
  const silenceStartedRef = useRef(false);
  const countdownActiveRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const shouldProcessOnStopRef = useRef(false);
  const isStoppingRef = useRef(false);

  // ==========================================
  // EFEITOS DE INICIALIZAÇÃO
  // ==========================================
  
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
        
        const latestValues: Record<string, { value: number; name: string; unit: string; prevValue?: number }> = {};
        
        data?.forEach((item: any) => {
          const code = item.economic_indicators?.code;
          const name = item.economic_indicators?.name;
          const unit = item.economic_indicators?.unit;
          if (!code || !['DOLAR', 'SELIC', 'IPCA'].includes(code)) return;
          
          if (!latestValues[code]) {
            latestValues[code] = { value: item.value, name, unit };
          } else if (!latestValues[code].prevValue) {
            latestValues[code].prevValue = item.value;
          }
        });
        
        const validIndicators: Indicator[] = [];
        ['DOLAR', 'SELIC', 'IPCA'].forEach(code => {
          const latest = latestValues[code];
          if (latest && latest.value !== null && latest.value !== undefined) {
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (latest.prevValue !== undefined) {
              if (latest.value > latest.prevValue) trend = 'up';
              else if (latest.value < latest.prevValue) trend = 'down';
            }
            validIndicators.push({
              code,
              name: code === 'DOLAR' ? 'Dólar' : code === 'SELIC' ? 'Selic' : 'IPCA',
              value: latest.value,
              unit: code === 'DOLAR' ? 'R$' : code === 'SELIC' ? '% a.a.' : '%',
              trend
            });
          }
        });
        
        setIndicators(validIndicators);
      } catch (error) {
        console.error('[PWA] Error fetching indicators:', error);
        setIndicators([]);
      } finally {
        setLoadingIndicators(false);
      }
    };
    
    fetchIndicators();
    const interval = window.setInterval(fetchIndicators, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const initDeviceId = async () => {
      // Use consistent device fingerprint - check for session device first (set by PWARegister)
      let id = localStorage.getItem('pwa-session-device');
      if (!id) {
        // Fallback: try to get from device-fingerprint module
        const { getDeviceFingerprint } = await import('@/lib/device-fingerprint');
        id = getDeviceFingerprint();
        localStorage.setItem('pwa-session-device', id);
      }
      setDeviceId(id);
    };
    initDeviceId();
  }, []);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isPWA = (window.navigator as any).standalone === true;
    if (isIOS && !isStandalone && !isPWA && !localStorage.getItem('ios-prompt-dismissed')) {
      window.setTimeout(() => setShowIOSPrompt(true), 2000);
    }
  }, []);

  useEffect(() => {
    return () => {
      console.log("[PWA] Component unmounting - full cleanup");
      fullCleanup();
    };
  }, []);

  useEffect(() => {
    return () => { 
      if (audioUrl) URL.revokeObjectURL(audioUrl); 
    };
  }, [audioUrl]);

  // ==========================================
  // FUNÇÕES UTILITÁRIAS
  // ==========================================
  
  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // ==========================================
  // FUNÇÕES DE CLEANUP
  // ==========================================
  
  const clearAllTimers = useCallback(() => {
    console.log("[PWA] Clearing all timers");
    
    if (vadIntervalRef.current !== null) {
      window.clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (initialWaitTimeoutRef.current !== null) {
      window.clearTimeout(initialWaitTimeoutRef.current);
      initialWaitTimeoutRef.current = null;
    }
    if (silenceTimeoutRef.current !== null) {
      window.clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const releaseMediaResources = useCallback(() => {
    console.log("[PWA] Releasing media resources");
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  const resetAllFlags = useCallback(() => {
    console.log("[PWA] Resetting all flags");
    hasEverSpokenRef.current = false;
    isCurrentlySpeakingRef.current = false;
    silenceStartedRef.current = false;
    countdownActiveRef.current = false;
    shouldProcessOnStopRef.current = false;
    isStoppingRef.current = false;
    setCountdownDisplay(null);
  }, []);

  const fullCleanup = useCallback(() => {
    console.log("[PWA] ===== FULL CLEANUP =====");
    clearAllTimers();
    releaseMediaResources();
    resetAllFlags();
    isRecordingRef.current = false;
  }, [clearAllTimers, releaseMediaResources, resetAllFlags]);

  // ==========================================
  // FUNÇÕES DE ÁUDIO/TTS
  // ==========================================
  
  const goToIdle = useCallback(() => {
    console.log("[PWA] Going to idle state");
    setState("idle");
    setStatusText("Toque para perguntar");
    isProcessingRef.current = false;
  }, []);

  const playTTSResponse = useCallback(async (text: string): Promise<boolean> => {
    try {
      console.log("[PWA] Playing TTS response");
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
      
      if (!ttsResponse.ok) {
        console.error("[PWA] TTS response not ok:", ttsResponse.status);
        return false;
      }
      
      const ttsBlob = await ttsResponse.blob();
      const url = URL.createObjectURL(ttsBlob);
      
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      setState("ready");
      setStatusText("Resposta pronta");
      
      window.setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(e => {
            console.log("[PWA] Autoplay blocked:", e);
          });
        }
      }, 150);
      
      return true;
    } catch (error) {
      console.error("[PWA] TTS error:", error);
      return false;
    }
  }, [audioUrl]);

  const processRecordedAudio = useCallback(async () => {
    if (isProcessingRef.current) {
      console.log("[PWA] Already processing, skipping");
      return;
    }
    
    isProcessingRef.current = true;
    console.log("[PWA] ===== PROCESSING RECORDED AUDIO =====");
    
    setState("processing");
    setStatusText("Processando...");
    
    try {
      if (audioChunksRef.current.length === 0) {
        console.log("[PWA] No audio chunks");
        toast.error("Nenhum áudio capturado.");
        goToIdle();
        return;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log("[PWA] Audio blob size:", audioBlob.size);
      
      if (audioBlob.size < 1000) {
        console.log("[PWA] Audio too short");
        toast.error("Áudio muito curto.");
        goToIdle();
        return;
      }

      const base64Audio = await blobToBase64(audioBlob);
      
      console.log("[PWA] Calling STT...");
      const { data: sttData, error: sttError } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });
      
      if (sttError || !sttData?.text) {
        console.error("[PWA] STT error:", sttError);
        const success = await playTTSResponse("Desculpe, não consegui processar sua pergunta. Pode tentar novamente?");
        if (!success) goToIdle();
        return;
      }
      
      const transcription = sttData.text.trim();
      console.log("[PWA] Transcription:", transcription);
      
      if (transcription.length < 3) {
        console.log("[PWA] Transcription too short");
        const success = await playTTSResponse("Desculpe, não consegui entender o que você disse. Pode repetir de forma mais clara, por favor?");
        if (!success) goToIdle();
        return;
      }
      
      console.log("[PWA] Calling agent...");
      const { data: agentData, error: agentError } = await supabase.functions.invoke('chat-router', {
        body: { 
          pwaMode: true,
          message: transcription, 
          agentSlug: 'economia', 
          deviceId 
        }
      });
      
      if (agentError) {
        console.error("[PWA] Agent error:", agentError);
        const success = await playTTSResponse("Desculpe, não consegui processar sua pergunta. Pode tentar novamente?");
        if (!success) goToIdle();
        return;
      }
      
      const responseText = agentData?.response || "Desculpe, não consegui processar sua pergunta.";
      console.log("[PWA] Agent response length:", responseText.length);
      
      const success = await playTTSResponse(responseText);
      if (!success) {
        toast.error("Erro ao gerar áudio.");
        goToIdle();
      }
      
    } catch (error) {
      console.error("[PWA] Processing error:", error);
      toast.error("Erro ao processar. Tente novamente.");
      goToIdle();
    } finally {
      isProcessingRef.current = false;
    }
  }, [deviceId, goToIdle, playTTSResponse]);

  // ==========================================
  // HANDLERS DE MENSAGENS ESPECIAIS
  // ==========================================
  
  const handleDidNotHear = useCallback(async () => {
    if (isProcessingRef.current || isStoppingRef.current) {
      console.log("[PWA] Already processing/stopping, skipping didNotHear");
      return;
    }
    
    console.log("[PWA] ===== DID NOT HEAR =====");
    
    isProcessingRef.current = true;
    isStoppingRef.current = true;
    shouldProcessOnStopRef.current = false;
    isRecordingRef.current = false;
    
    clearAllTimers();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.log("[PWA] Error stopping recorder:", e);
      }
    }
    
    releaseMediaResources();
    
    setState("processing");
    setStatusText("Processando...");
    
    try {
      const success = await playTTSResponse("Desculpe, não consegui ouvir você. Pode falar um pouco mais alto ou mais perto do microfone, por favor?");
      if (!success) {
        toast.error("Não consegui ouvir. Tente novamente.");
        goToIdle();
      }
    } finally {
      isProcessingRef.current = false;
      resetAllFlags();
    }
  }, [clearAllTimers, releaseMediaResources, playTTSResponse, goToIdle, resetAllFlags]);

  // ==========================================
  // FUNÇÕES DE CONTROLE VAD
  // ==========================================
  
  const checkVoiceActivity = useCallback((): boolean => {
    if (!analyserRef.current) return false;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    return average > SILENCE_THRESHOLD;
  }, []);

  const cancelAllSilenceTimers = useCallback(() => {
    console.log("[PWA] Canceling silence timers");
    
    if (silenceTimeoutRef.current !== null) {
      window.clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    silenceStartedRef.current = false;
    countdownActiveRef.current = false;
    setCountdownDisplay(null);
    
    if (isRecordingRef.current && hasEverSpokenRef.current) {
      setStatusText("Ouvindo...");
    }
  }, []);

  const finalizeAndProcess = useCallback(() => {
    if (!isRecordingRef.current || isStoppingRef.current) {
      console.log("[PWA] Not recording or already stopping, skipping finalize");
      return;
    }
    
    console.log("[PWA] ===== FINALIZE AND PROCESS =====");
    
    isStoppingRef.current = true;
    shouldProcessOnStopRef.current = hasEverSpokenRef.current;
    console.log("[PWA] shouldProcessOnStop set to:", shouldProcessOnStopRef.current);
    
    isRecordingRef.current = false;
    
    clearAllTimers();
    vibrate([50, 50, 50]);
    
    if (shouldProcessOnStopRef.current) {
      setState("processing");
      setStatusText("Processando...");
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("[PWA] Error stopping recorder:", e);
        releaseMediaResources();
        if (shouldProcessOnStopRef.current && !isProcessingRef.current) {
          processRecordedAudio();
        } else {
          resetAllFlags();
          goToIdle();
        }
      }
    } else {
      releaseMediaResources();
      if (shouldProcessOnStopRef.current && !isProcessingRef.current) {
        processRecordedAudio();
      } else {
        resetAllFlags();
        goToIdle();
      }
    }
  }, [clearAllTimers, releaseMediaResources, processRecordedAudio, resetAllFlags, goToIdle]);

  const startVisibleCountdown = useCallback(() => {
    if (countdownActiveRef.current || !isRecordingRef.current || isStoppingRef.current) {
      console.log("[PWA] Countdown skipped - already active, not recording, or stopping");
      return;
    }
    
    console.log("[PWA] Starting visible countdown (5s)");
    countdownActiveRef.current = true;
    
    let count = COUNTDOWN_SECONDS;
    setCountdownDisplay(count);
    setStatusText("Enviando em...");
    
    countdownIntervalRef.current = window.setInterval(() => {
      count -= 1;
      console.log("[PWA] Countdown:", count);
      setCountdownDisplay(count);
      
      if (count <= 0) {
        if (countdownIntervalRef.current !== null) {
          window.clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        countdownActiveRef.current = false;
        setCountdownDisplay(null);
        
        finalizeAndProcess();
      }
    }, 1000);
  }, [finalizeAndProcess]);

  const startInvisibleSilenceTimer = useCallback(() => {
    if (silenceTimeoutRef.current !== null || countdownActiveRef.current || !isRecordingRef.current || isStoppingRef.current) {
      return;
    }
    
    console.log("[PWA] Starting invisible silence timer (5s)");
    silenceStartedRef.current = true;
    
    silenceTimeoutRef.current = window.setTimeout(() => {
      silenceTimeoutRef.current = null;
      
      if (isRecordingRef.current && hasEverSpokenRef.current && !countdownActiveRef.current && !isStoppingRef.current) {
        startVisibleCountdown();
      }
    }, SILENCE_WAIT_MS);
  }, [startVisibleCountdown]);

  // ==========================================
  // FUNÇÕES DE GRAVAÇÃO
  // ==========================================
  
  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || isProcessingRef.current || isStoppingRef.current) {
      console.log("[PWA] Already recording, processing, or stopping - skipping");
      return;
    }
    
    console.log("[PWA] ========== STARTING RECORDING ==========");
    
    fullCleanup();
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      streamRef.current = stream;
      
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
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log("[PWA] MediaRecorder onstop - shouldProcess:", shouldProcessOnStopRef.current);
        
        releaseMediaResources();
        
        const shouldProcess = shouldProcessOnStopRef.current;
        
        resetAllFlags();
        
        if (shouldProcess && !isProcessingRef.current) {
          console.log("[PWA] onstop: Starting audio processing");
          processRecordedAudio();
        } else {
          console.log("[PWA] onstop: Not processing (shouldProcess:", shouldProcess, ", isProcessing:", isProcessingRef.current, ")");
        }
      };
      
      mediaRecorder.start(100);
      isRecordingRef.current = true;
      setState("recording");
      setStatusText("Pode falar...");
      vibrate(50);
      
      console.log("[PWA] Recording started - Phase 1: Initial wait (10s)");
      
      initialWaitTimeoutRef.current = window.setTimeout(() => {
        initialWaitTimeoutRef.current = null;
        console.log("[PWA] Initial wait timeout fired - hasSpoken:", hasEverSpokenRef.current, ", isRecording:", isRecordingRef.current);
        
        if (isRecordingRef.current && !hasEverSpokenRef.current && !isStoppingRef.current) {
          handleDidNotHear();
        }
      }, INITIAL_WAIT_MS);
      
      vadIntervalRef.current = window.setInterval(() => {
        if (!isRecordingRef.current || isStoppingRef.current) {
          return;
        }
        
        const isSpeaking = checkVoiceActivity();
        
        if (isSpeaking) {
          isCurrentlySpeakingRef.current = true;
          
          if (!hasEverSpokenRef.current) {
            console.log("[PWA] First speech detected!");
            hasEverSpokenRef.current = true;
            
            if (initialWaitTimeoutRef.current !== null) {
              window.clearTimeout(initialWaitTimeoutRef.current);
              initialWaitTimeoutRef.current = null;
            }
            
            setStatusText("Ouvindo...");
          }
          
          if (silenceStartedRef.current || countdownActiveRef.current) {
            console.log("[PWA] Speech detected during silence/countdown - canceling");
            cancelAllSilenceTimers();
          }
          
        } else {
          if (hasEverSpokenRef.current && isCurrentlySpeakingRef.current) {
            console.log("[PWA] Silence detected after speech");
            isCurrentlySpeakingRef.current = false;
            
            if (!silenceStartedRef.current && !countdownActiveRef.current && !isStoppingRef.current) {
              startInvisibleSilenceTimer();
            }
          }
        }
      }, VAD_CHECK_INTERVAL);
      
    } catch (error) {
      console.error("[PWA] Error starting recording:", error);
      toast.error("Não consegui acessar o microfone.");
      fullCleanup();
      goToIdle();
    }
  }, [fullCleanup, releaseMediaResources, resetAllFlags, processRecordedAudio, handleDidNotHear, checkVoiceActivity, cancelAllSilenceTimers, startInvisibleSilenceTimer, goToIdle]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current || isStoppingRef.current) {
      console.log("[PWA] Not recording or already stopping, nothing to stop");
      return;
    }
    
    console.log("[PWA] Manual stop requested - hasSpoken:", hasEverSpokenRef.current);
    
    if (hasEverSpokenRef.current) {
      finalizeAndProcess();
    } else {
      isStoppingRef.current = true;
      shouldProcessOnStopRef.current = false;
      isRecordingRef.current = false;
      
      clearAllTimers();
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.log("[PWA] Error stopping recorder:", e);
        }
      }
      
      releaseMediaResources();
      resetAllFlags();
      goToIdle();
    }
  }, [finalizeAndProcess, clearAllTimers, releaseMediaResources, resetAllFlags, goToIdle]);

  // ==========================================
  // FUNÇÕES DE UI
  // ==========================================
  
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
      if ((error as Error).name !== 'AbortError') {
        toast.error("Erro ao compartilhar");
      }
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

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      if (countdownDisplay !== null) {
        return "bg-orange-500 scale-110 shadow-lg shadow-orange-500/50";
      }
      return "bg-red-500 scale-110 animate-pulse shadow-lg shadow-red-500/50";
    }
    if (state === "processing") {
      return "bg-muted cursor-not-allowed";
    }
    return "bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-lg shadow-primary/30";
  };

  const formatIndicatorValue = (ind: Indicator) => {
    if (ind.value === null) return '--';
    if (ind.code === 'DOLAR') return `R$ ${ind.value.toFixed(2)}`;
    return `${ind.value.toFixed(2)}${ind.unit}`;
  };

  const TrendIcon = ({ trend, code }: { trend?: 'up' | 'down' | 'stable'; code: string }) => {
    if (code === 'DOLAR') {
      if (trend === 'up') return <TrendingUp className="w-3 h-3 text-yellow-500" />;
      if (trend === 'down') return <TrendingDown className="w-3 h-3 text-yellow-500" />;
    } else {
      if (trend === 'up') return <TrendingUp className="w-3 h-3 text-red-500" />;
      if (trend === 'down') return <TrendingDown className="w-3 h-3 text-green-500" />;
    }
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  // ==========================================
  // RENDER
  // ==========================================
  
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">

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

      {/* Logo - canto superior esquerdo */}
      <div className="absolute top-4 left-4 z-10">
        <img 
          src={knowriskLogo} 
          alt="KnowRisk" 
          className="w-12 h-12 rounded-full shadow-md"
        />
      </div>

      {/* Indicadores - só mostra se tiver dados válidos */}
      {!loadingIndicators && indicators.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex gap-3">
            {indicators.map(ind => (
              <div 
                key={ind.code} 
                className="bg-card/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50 shadow-sm"
              >
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{ind.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-foreground">{formatIndicatorValue(ind)}</span>
                    <TrendIcon trend={ind.trend} code={ind.code} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logo e título central */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 shadow-lg">
          <img src={knowriskLogo} alt="KnowRisk" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">KnowRisk</h1>
        <p className="text-muted-foreground text-sm">{statusText}</p>
      </div>

      {/* Botão principal */}
      <div className="relative mb-8">
        <button
          onClick={handleMainButton}
          disabled={state === "processing"}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${getButtonStyle()}`}
        >
          {state === "processing" ? (
            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
          ) : state === "recording" ? (
            <Square className="w-8 h-8 text-white fill-white" />
          ) : (
            <Mic className="w-10 h-10 text-primary-foreground" />
          )}
        </button>
        
        {/* Countdown visível */}
        {state === "recording" && countdownDisplay !== null && (
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <span className="text-3xl font-bold text-orange-500">{countdownDisplay}</span>
            <span className="text-xs text-muted-foreground">Enviando...</span>
          </div>
        )}
        
        {/* Indicador de gravação */}
        {state === "recording" && countdownDisplay === null && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Gravando</span>
          </div>
        )}
      </div>

      <div className="h-8" />

      {/* Player de áudio */}
      {audioUrl && state === "ready" && (
        <div className="w-full max-w-sm bg-card rounded-2xl p-4 border border-border shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors">
              {isPlaying ? (
                <Pause className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
              )}
            </button>
            <div className="flex-1">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-100"
                  style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' }} 
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground min-w-[40px] text-right">
              {formatTime(progress)}
            </span>
          </div>
          
          <div className="flex justify-center gap-2 mb-4">
            {[0.5, 1, 1.5, 2].map(rate => (
              <button 
                key={rate} 
                onClick={() => changeSpeed(rate)} 
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  playbackRate === rate 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <button onClick={downloadAudio} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-sm font-medium text-foreground">
              <Download className="w-4 h-4" /> Baixar
            </button>
            <button onClick={shareAudio} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-sm font-medium text-foreground">
              <Share2 className="w-4 h-4" /> Compartilhar
            </button>
          </div>
        </div>
      )}

      {/* Banner iOS */}
      {showIOSPrompt && (
        <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <img src={knowriskLogo} alt="KnowRisk" className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Instale o KnowRisk</p>
              <p className="text-sm text-muted-foreground">
                Toque em <Share2 className="w-3 h-3 inline" /> e "Adicionar à Tela de Início"
              </p>
            </div>
            <button onClick={dismissIOSPrompt} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Botão de ajuda */}
      <button 
        onClick={() => toast.info("Toque no microfone para perguntar sobre economia!")} 
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
      >
        <HelpCircle className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
}
