import React, { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Estados da máquina de estados finitos do botão de microfone
 * 
 * IDLE -> LOADING -> RECORDING -> PROCESSING -> IDLE
 */
type MicrophoneState = "idle" | "loading" | "recording" | "processing";

interface ToggleMicrophoneButtonProps {
  onAudioCapture: (blob: Blob) => void;
  disabled?: boolean;
  isPlaying?: boolean;
  isProcessing?: boolean;
  primaryColor?: string;
  onFrequencyData?: (data: number[]) => void;
  onRecordingChange?: (isRecording: boolean) => void;
  maxDurationSeconds?: number;
}

const MAX_DURATION_DEFAULT = 60;
const MIN_RECORDING_MS = 500;

export const ToggleMicrophoneButton: React.FC<ToggleMicrophoneButtonProps> = ({
  onAudioCapture,
  disabled = false,
  isPlaying = false,
  isProcessing: externalProcessing = false,
  primaryColor = "#22c55e",
  onFrequencyData,
  onRecordingChange,
  maxDurationSeconds = MAX_DURATION_DEFAULT,
}) => {
  const [state, setState] = useState<MicrophoneState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Notificar mudança de estado de gravação
  useEffect(() => {
    onRecordingChange?.(state === "recording");
  }, [state, onRecordingChange]);

  // Timer de 60 segundos com auto-stop
  useEffect(() => {
    if (state === "recording") {
      setElapsedSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev >= maxDurationSeconds - 1) {
            // Auto-stop ao atingir limite
            stopRecording();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    }
  }, [state, maxDurationSeconds]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  const cleanupResources = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
  }, []);

  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    if (!onFrequencyData) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateFrequencyData = () => {
        if (analyserRef.current && state === "recording") {
          analyserRef.current.getByteFrequencyData(dataArray);
          const frequencies = Array.from(dataArray.slice(0, 32));
          onFrequencyData(frequencies);
          animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
        }
      };

      animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
    } catch (err) {
      console.error("Error setting up audio analyser:", err);
    }
  }, [onFrequencyData, state]);

  const startRecording = useCallback(async () => {
    if (state !== "idle") return;

    setError(null);
    setState("loading");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;

      // Determinar MIME type suportado
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordingDuration = Date.now() - recordingStartTimeRef.current;

        // Verificar duração mínima
        if (recordingDuration < MIN_RECORDING_MS) {
          console.log(`Recording too short: ${recordingDuration}ms`);
          setError("Gravação muito curta. Fale por mais tempo.");
          setState("idle");
          cleanupResources();
          return;
        }

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType || "audio/webm",
          });

          if (audioBlob.size > 0) {
            setState("processing");
            onAudioCapture(audioBlob);
            
            // Voltar para idle após enviar (o processing externo vai controlar)
            setTimeout(() => {
              setState("idle");
            }, 500);
          } else {
            setError("Áudio vazio. Tente novamente.");
            setState("idle");
          }
        } else {
          setError("Nenhum áudio capturado. Tente novamente.");
          setState("idle");
        }

        cleanupResources();
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Erro na gravação. Tente novamente.");
        setState("idle");
        cleanupResources();
      };

      // Iniciar gravação
      mediaRecorder.start();
      recordingStartTimeRef.current = Date.now();
      
      // Setup analyser para visualização
      setupAudioAnalyser(stream);

      // Transição: LOADING -> RECORDING
      setState("recording");

    } catch (err: any) {
      console.error("Error starting recording:", err);
      
      if (err.name === "NotAllowedError") {
        setError("Permissão de microfone negada.");
      } else if (err.name === "NotFoundError") {
        setError("Microfone não encontrado.");
      } else {
        setError("Erro ao acessar microfone.");
      }
      
      setState("idle");
      cleanupResources();
    }
  }, [state, onAudioCapture, setupAudioAnalyser, cleanupResources]);

  const stopRecording = useCallback(() => {
    if (state !== "recording" || !mediaRecorderRef.current) return;

    try {
      // Forçar flush dos dados antes de parar
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      }
    } catch (err) {
      console.error("Error stopping recording:", err);
      setState("idle");
      cleanupResources();
    }
  }, [state, cleanupResources]);

  const handleClick = useCallback(() => {
    if (disabled || isPlaying || externalProcessing) return;

    switch (state) {
      case "idle":
        startRecording();
        break;
      case "recording":
        stopRecording();
        break;
      // LOADING e PROCESSING: botão não responde a cliques
      default:
        break;
    }
  }, [state, disabled, isPlaying, externalProcessing, startRecording, stopRecording]);

  // Formatar tempo MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Determinar se o botão está desabilitado
  const isButtonDisabled = disabled || isPlaying || externalProcessing || state === "loading" || state === "processing";

  // Determinar texto do botão
  const getButtonText = (): string => {
    if (error) return error;
    
    switch (state) {
      case "idle":
        return "Toque para falar";
      case "loading":
        return "Iniciando...";
      case "recording":
        return `Gravando ${formatTime(elapsedSeconds)}`;
      case "processing":
        return "Processando...";
      default:
        return "Toque para falar";
    }
  };

  // Limpar erro ao mudar estado
  useEffect(() => {
    if (state !== "idle") {
      setError(null);
    }
  }, [state]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Botão principal */}
      <button
        onClick={handleClick}
        disabled={isButtonDisabled}
        className={cn(
          "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
          "focus:outline-none focus:ring-4 focus:ring-offset-2",
          "shadow-lg hover:shadow-xl",
          isButtonDisabled && "opacity-60 cursor-not-allowed",
          state === "recording" && "animate-pulse"
        )}
        style={{
          backgroundColor: state === "recording" ? "#EF4444" : primaryColor,
          boxShadow: state === "recording" 
            ? "0 0 20px 5px rgba(239, 68, 68, 0.4)" 
            : `0 4px 20px ${primaryColor}40`,
        }}
        aria-label={getButtonText()}
      >
        {/* Ícone baseado no estado */}
        {state === "loading" || state === "processing" ? (
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        ) : state === "recording" ? (
          <Square className="w-8 h-8 text-white fill-white" />
        ) : (
          <Mic className="w-10 h-10 text-white" />
        )}

        {/* Indicador de gravação ativa */}
        {state === "recording" && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full animate-ping" />
        )}
      </button>

      {/* Texto de estado */}
      <span 
        className={cn(
          "text-sm font-medium transition-colors duration-200",
          error ? "text-destructive" : "text-muted-foreground",
          state === "recording" && "text-red-500 font-semibold"
        )}
      >
        {getButtonText()}
      </span>

      {/* Barra de progresso para tempo restante */}
      {state === "recording" && (
        <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-1000 ease-linear"
            style={{
              width: `${(elapsedSeconds / maxDurationSeconds) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ToggleMicrophoneButton;
