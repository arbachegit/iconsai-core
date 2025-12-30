import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export const useTextToSpeech = (): UseTextToSpeechReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the existing text-to-speech edge function
      const { data, error: fnError } = await supabase.functions.invoke("text-to-speech", {
        body: { 
          text,
          voice: "onyx", // OpenAI voice
        },
      });

      if (fnError) throw fnError;

      if (data?.audioContent) {
        // Create audio from base64
        const audioBlob = base64ToBlob(data.audioContent, "audio/mpeg");
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
          setError("Failed to play audio");
          setIsPlaying(false);
          setIsLoading(false);
        };

        await audio.play();
      } else {
        throw new Error("No audio content received");
      }
    } catch (err) {
      console.error("TTS Error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate speech");
      setIsLoading(false);
    }
  }, []);

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

// Helper function to convert base64 to blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export default useTextToSpeech;
