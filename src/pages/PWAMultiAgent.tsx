import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, Play, Pause, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import knowriskLogo from "@/assets/knowrisk-pwa-logo.png";
import { PWAAuthGate } from "@/components/gates/PWAAuthGate";
import { PWABottomBar, PWAHelpModal } from "@/components/pwa";
import { getAgentConfig, AGENT_COLORS } from "@/lib/pwa-animations";

type AppState = "idle" | "recording" | "processing" | "ready";

// Configuração de tempos
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

interface PWAContentProps {
  fingerprint: string;
  pwaAccess: string[];
}

function PWAMultiAgentContent({ fingerprint, pwaAccess }: PWAContentProps) {
  // Estados de UI
  const [state, setState] = useState<AppState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [countdownDisplay, setCountdownDisplay] = useState<number | null>(null);
  const [statusText, setStatusText] = useState("Toque para perguntar");
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  
  // Agentes disponíveis
  const availableAgents = pwaAccess.length > 0 ? pwaAccess : ["economia", "health", "ideias"];
  const [selectedAgent, setSelectedAgent] = useState<string>(availableAgents[0] || "economia");
  
  // Refs de mídia
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Refs de timers
  const vadIntervalRef = useRef<number | null>(null);
  const initialWaitTimeoutRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  
  // Refs de controle
  const hasEverSpokenRef = useRef(false);
  const isCurrentlySpeakingRef = useRef(false);
  const silenceStartedRef = useRef(false);
  const countdownActiveRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const shouldProcessOnStopRef = useRef(false);
  const isStoppingRef = useRef(false);

  // Buscar indicadores (apenas para economia)
  useEffect(() => {
    if (selectedAgent !== "economia") {
      setIndicators([]);
      return;
    }

    const fetchIndicators = async () => {
      try {
        const { data, error } = await supabase
          .from("indicator_values")
          .select(`value, reference_date, indicator_id, economic_indicators!inner(code, name, unit)`)
          .order("reference_date", { ascending: false })
          .limit(100);
        
        if (error) throw error;
        
        const latestValues: Record<string, { value: number; name: string; unit: string; prevValue?: number }> = {};
        
        data?.forEach((item: any) => {
          const code = item.economic_indicators?.code;
          const name = item.economic_indicators?.name;
          const unit = item.economic_indicators?.unit;
          if (!code || !["DOLAR", "SELIC", "IPCA"].includes(code)) return;
          
          if (!latestValues[code]) {
            latestValues[code] = { value: item.value, name, unit };
          } else if (!latestValues[code].prevValue) {
            latestValues[code].prevValue = item.value;
          }
        });
        
        const validIndicators: Indicator[] = [];
        ["DOLAR", "SELIC", "IPCA"].forEach(code => {
          const latest = latestValues[code];
          if (latest && latest.value !== null && latest.value !== undefined) {
            let trend: "up" | "down" | "stable" = "stable";
            if (latest.prevValue !== undefined) {
              if (latest.value > latest.prevValue) trend = "up";
              else if (latest.value < latest.prevValue) trend = "down";
            }
            validIndicators.push({
              code,
              name: code === "DOLAR" ? "Dólar" : code === "SELIC" ? "Selic" : "IPCA",
              value: latest.value,
              unit: code === "DOLAR" ? "R$" : code === "SELIC" ? "% a.a." : "%",
              trend
            });
          }
        });
        
        setIndicators(validIndicators);
      } catch (error) {
        console.error("[PWA] Error fetching indicators:", error);
        setIndicators([]);
      }
    };
    
    fetchIndicators();
    const interval = window.setInterval(fetchIndicators, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [selectedAgent]);

  // Cleanup
  useEffect(() => {
    return () => {
      fullCleanup();
    };
  }, []);

  useEffect(() => {
    return () => { 
      if (audioUrl) URL.revokeObjectURL(audioUrl); 
    };
  }, [audioUrl]);

  // Funções utilitárias
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

  // Funções de cleanup
  const clearAllTimers = useCallback(() => {
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  const resetAllFlags = useCallback(() => {
    hasEverSpokenRef.current = false;
    isCurrentlySpeakingRef.current = false;
    silenceStartedRef.current = false;
    countdownActiveRef.current = false;
    shouldProcessOnStopRef.current = false;
    isStoppingRef.current = false;
    setCountdownDisplay(null);
  }, []);

  const fullCleanup = useCallback(() => {
    clearAllTimers();
    releaseMediaResources();
    resetAllFlags();
    isRecordingRef.current = false;
  }, [clearAllTimers, releaseMediaResources, resetAllFlags]);

  const goToIdle = useCallback(() => {
    setState("idle");
    setStatusText("Toque para perguntar");
    isProcessingRef.current = false;
  }, []);

  // Função de TTS
  const playTTSResponse = useCallback(async (text: string): Promise<boolean> => {
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
          body: JSON.stringify({ text, agentSlug: selectedAgent }),
        }
      );
      
      if (!ttsResponse.ok) return false;
      
      const ttsBlob = await ttsResponse.blob();
      const url = URL.createObjectURL(ttsBlob);
      
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      setState("ready");
      setStatusText("Resposta pronta");
      
      window.setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      }, 150);
      
      return true;
    } catch (error) {
      console.error("[PWA] TTS error:", error);
      return false;
    }
  }, [audioUrl, selectedAgent]);

  // Processar áudio
  const processRecordedAudio = useCallback(async () => {
    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setState("processing");
    setStatusText("Processando...");
    
    try {
      if (audioChunksRef.current.length === 0) {
        toast.error("Nenhum áudio capturado.");
        goToIdle();
        return;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      
      if (audioBlob.size < 1000) {
        toast.error("Áudio muito curto.");
        goToIdle();
        return;
      }

      const base64Audio = await blobToBase64(audioBlob);
      
      const { data: sttData, error: sttError } = await supabase.functions.invoke("voice-to-text", {
        body: { audio: base64Audio }
      });
      
      if (sttError || !sttData?.text) {
        await playTTSResponse("Desculpe, não consegui processar sua pergunta. Pode tentar novamente?");
        return;
      }
      
      const transcription = sttData.text.trim();
      
      if (transcription.length < 3) {
        await playTTSResponse("Desculpe, não consegui entender. Pode repetir de forma mais clara?");
        return;
      }
      
      const { data: agentData, error: agentError } = await supabase.functions.invoke("chat-router", {
        body: { 
          pwaMode: true,
          message: transcription, 
          agentSlug: selectedAgent, 
          deviceId: fingerprint 
        }
      });
      
      if (agentError) {
        await playTTSResponse("Desculpe, ocorreu um erro. Tente novamente.");
        return;
      }
      
      const responseText = agentData?.response || "Desculpe, não consegui processar sua pergunta.";
      
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
  }, [fingerprint, goToIdle, playTTSResponse, selectedAgent]);

  // VAD
  const checkVoiceActivity = useCallback((): boolean => {
    if (!analyserRef.current) return false;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    return average > SILENCE_THRESHOLD;
  }, []);

  const cancelAllSilenceTimers = useCallback(() => {
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
    if (!isRecordingRef.current || isStoppingRef.current) return;
    
    isStoppingRef.current = true;
    shouldProcessOnStopRef.current = hasEverSpokenRef.current;
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
  }, [clearAllTimers, releaseMediaResources, resetAllFlags, goToIdle, processRecordedAudio]);

  // Iniciar gravação
  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || isProcessingRef.current || state === "processing") return;
    
    fullCleanup();
    audioChunksRef.current = [];
    
    try {
      vibrate(50);
      setState("recording");
      setStatusText("Aguardando fala...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        releaseMediaResources();
        if (shouldProcessOnStopRef.current && !isProcessingRef.current) {
          processRecordedAudio();
        } else {
          resetAllFlags();
          goToIdle();
        }
      };
      
      recorder.start(100);
      isRecordingRef.current = true;
      
      // VAD
      vadIntervalRef.current = window.setInterval(() => {
        if (!isRecordingRef.current) return;
        
        const isSpeaking = checkVoiceActivity();
        
        if (isSpeaking) {
          if (!hasEverSpokenRef.current) {
            hasEverSpokenRef.current = true;
            setStatusText("Ouvindo...");
            if (initialWaitTimeoutRef.current !== null) {
              window.clearTimeout(initialWaitTimeoutRef.current);
              initialWaitTimeoutRef.current = null;
            }
          }
          isCurrentlySpeakingRef.current = true;
          if (silenceStartedRef.current || countdownActiveRef.current) {
            cancelAllSilenceTimers();
          }
        } else {
          isCurrentlySpeakingRef.current = false;
          
          if (hasEverSpokenRef.current && !silenceStartedRef.current && !countdownActiveRef.current) {
            silenceStartedRef.current = true;
            setStatusText("Silêncio detectado...");
            
            silenceTimeoutRef.current = window.setTimeout(() => {
              if (!isRecordingRef.current || isCurrentlySpeakingRef.current) return;
              
              countdownActiveRef.current = true;
              let count = COUNTDOWN_SECONDS;
              setCountdownDisplay(count);
              setStatusText(`Finalizando em ${count}...`);
              
              countdownIntervalRef.current = window.setInterval(() => {
                count--;
                if (count <= 0) {
                  if (countdownIntervalRef.current !== null) {
                    window.clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                  }
                  setCountdownDisplay(null);
                  if (isRecordingRef.current && !isStoppingRef.current) {
                    finalizeAndProcess();
                  }
                } else {
                  setCountdownDisplay(count);
                  setStatusText(`Finalizando em ${count}...`);
                }
              }, 1000);
            }, SILENCE_WAIT_MS);
          }
        }
      }, VAD_CHECK_INTERVAL);
      
      // Timeout inicial
      initialWaitTimeoutRef.current = window.setTimeout(() => {
        if (isRecordingRef.current && !hasEverSpokenRef.current && !isStoppingRef.current) {
          isStoppingRef.current = true;
          shouldProcessOnStopRef.current = false;
          clearAllTimers();
          
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
          }
          releaseMediaResources();
          
          setState("processing");
          setStatusText("Processando...");
          playTTSResponse("Não consegui ouvir você. Pode falar mais alto ou mais perto do microfone?")
            .finally(() => {
              isProcessingRef.current = false;
              resetAllFlags();
            });
        }
      }, INITIAL_WAIT_MS);
      
    } catch (error: any) {
      fullCleanup();
      if (error.name === "NotAllowedError") {
        toast.error("Permissão de microfone negada");
      } else {
        toast.error("Erro ao acessar microfone");
      }
      goToIdle();
    }
  }, [state, fullCleanup, releaseMediaResources, resetAllFlags, goToIdle, checkVoiceActivity, cancelAllSilenceTimers, finalizeAndProcess, clearAllTimers, playTTSResponse, processRecordedAudio]);

  // Cancelar gravação
  const cancelRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    
    isStoppingRef.current = true;
    shouldProcessOnStopRef.current = false;
    clearAllTimers();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        releaseMediaResources();
        resetAllFlags();
        goToIdle();
      }
    } else {
      releaseMediaResources();
      resetAllFlags();
      goToIdle();
    }
    
    vibrate([30, 30, 30]);
    toast.info("Gravação cancelada");
  }, [clearAllTimers, releaseMediaResources, resetAllFlags, goToIdle]);

  // Audio player handlers
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * audioRef.current.duration;
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const agentConfig = getAgentConfig(selectedAgent);
  const colors = AGENT_COLORS[selectedAgent] || AGENT_COLORS.economia;

  return (
    <div className={`min-h-screen bg-gradient-to-b ${colors.bg} flex flex-col transition-colors duration-500 pb-20`}>
      {/* Header */}
      <header className="p-4 flex items-center justify-center">
        <img src={knowriskLogo} alt="KnowYOU" className="h-10" />
      </header>

      {/* Indicators (only for economia) */}
      {selectedAgent === "economia" && indicators.length > 0 && (
        <div className="px-4 py-2">
          <div className="flex gap-2 justify-center flex-wrap">
            {indicators.map((indicator) => (
              <div
                key={indicator.code}
                className="flex items-center gap-1 px-3 py-1.5 bg-card/30 rounded-full text-sm"
              >
                <span className="text-muted-foreground">{indicator.name}:</span>
                <span className="font-medium">
                  {indicator.unit === "R$" 
                    ? `R$ ${indicator.value?.toFixed(2)}`
                    : `${indicator.value?.toFixed(2)}${indicator.unit}`
                  }
                </span>
                {indicator.trend === "up" && <TrendingUp className="h-3 w-3 text-red-400" />}
                {indicator.trend === "down" && <TrendingDown className="h-3 w-3 text-emerald-400" />}
                {indicator.trend === "stable" && <Minus className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Agent Icon */}
        <div className={`text-6xl mb-4 transition-transform duration-300 ${state === "recording" ? "scale-110" : ""}`}>
          {agentConfig.icon}
        </div>
        <h2 className={`text-2xl font-bold ${colors.primary} mb-2 transition-colors duration-300`}>
          {agentConfig.name}
        </h2>
        
        {/* Status */}
        <p className="text-muted-foreground mb-8">{statusText}</p>
        
        {/* Countdown */}
        {countdownDisplay !== null && (
          <div className="text-4xl font-bold text-primary mb-4 animate-pulse">{countdownDisplay}</div>
        )}

        {/* Main Button */}
        <div className="relative">
          {state === "idle" && (
            <button
              onClick={startRecording}
              className={`w-32 h-32 rounded-full bg-primary flex items-center justify-center shadow-lg ${colors.glow} hover:scale-105 active:scale-95 transition-transform`}
            >
              <Mic className="h-12 w-12 text-primary-foreground" />
            </button>
          )}

          {state === "recording" && (
            <button
              onClick={cancelRecording}
              className="w-32 h-32 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse"
            >
              <Square className="h-10 w-10 text-white" />
            </button>
          )}

          {state === "processing" && (
            <div className="w-32 h-32 rounded-full bg-card flex items-center justify-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          )}

          {state === "ready" && (
            <button
              onClick={handlePlayPause}
              className="w-32 h-32 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <Pause className="h-12 w-12 text-white" />
              ) : (
                <Play className="h-12 w-12 text-white ml-2" />
              )}
            </button>
          )}
        </div>
      </main>

      {/* Audio Player */}
      {audioUrl && (
        <div className="p-4 bg-card/50 backdrop-blur mb-16">
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (audioRef.current) setDuration(audioRef.current.duration);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              setProgress(0);
            }}
          />
          
          {/* Progress bar */}
          <div
            className="h-2 bg-muted rounded-full cursor-pointer mb-3"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={cyclePlaybackRate}
              className="px-3 py-1 text-xs bg-muted rounded-full"
            >
              {playbackRate}x
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={handlePlayPause}
                className="p-2 rounded-full bg-primary text-primary-foreground"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
            </div>
            
            <button
              onClick={() => {
                setAudioUrl(null);
                goToIdle();
              }}
              className="p-2 rounded-full hover:bg-muted"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <PWABottomBar
        activeSlug={selectedAgent}
        availableSlugs={availableAgents}
        onSlugChange={setSelectedAgent}
        onHelpClick={() => setShowHelp(true)}
      />

      {/* Help Modal */}
      <PWAHelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
}

// Main component with auth gate
export default function PWAMultiAgent() {
  return (
    <PWAAuthGate>
      {({ fingerprint, pwaAccess }) => (
        <PWAMultiAgentContent 
          fingerprint={fingerprint} 
          pwaAccess={pwaAccess} 
        />
      )}
    </PWAAuthGate>
  );
}
