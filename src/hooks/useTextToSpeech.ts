import { useState, useCallback, useRef } from "react";

interface UseTextToSpeechOptions {
  voice?: string;
}

interface UseTextToSpeechReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  progress: number;
  error: string | null;
}

export const useTextToSpeech = (options?: UseTextToSpeechOptions): UseTextToSpeechReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voice = options?.voice || "fernando";

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Use fetch directly because the edge function returns streaming audio
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voice }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      // Get audio blob directly from streaming response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsPlaying(true);
        setIsPaused(false);
        setIsLoading(false);
      };

      audio.onpause = () => {
        if (audioRef.current && audioRef.current.currentTime < audioRef.current.duration) {
          setIsPaused(true);
        }
      };

      audio.ontimeupdate = () => {
        if (audio.duration > 0) {
          const currentProgress = (audio.currentTime / audio.duration) * 100;
          setProgress(currentProgress);
        }
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(100);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setTimeout(() => setProgress(0), 500);
      };

      audio.onerror = () => {
        setError("Falha ao reproduzir áudio");
        setIsPlaying(false);
        setIsLoading(false);
      };

      await audio.play();
    } catch (err) {
      console.error("TTS Error:", err);
      setError(err instanceof Error ? err.message : "Falha ao gerar fala");
      setIsLoading(false);
    }
  }, [voice]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current && isPlaying && !isPaused) {
      audioRef.current.pause();
      setIsPaused(true);
    }
  }, [isPlaying, isPaused]);

  const resume = useCallback(() => {
    if (audioRef.current && isPaused) {
      audioRef.current.play();
      setIsPaused(false);
    }
  }, [isPaused]);

  return { speak, stop, pause, resume, isPlaying, isPaused, isLoading, progress, error };
};

export default useTextToSpeech;
