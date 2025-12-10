import { createContext, useContext, useState, useRef, ReactNode, useCallback } from "react";

interface AudioPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  title: string;
  audioUrl: string;
}

interface AudioPlayerContextType {
  floatingPlayerState: AudioPlayerState | null;
  playAudio: (title: string, audioUrl: string) => void;
  togglePlayPause: () => void;
  stopPlayback: () => void;
  closePlayer: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [floatingPlayerState, setFloatingPlayerState] = useState<AudioPlayerState | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    progressInterval.current = setInterval(() => {
      if (audioRef.current) {
        setFloatingPlayerState(prev => prev ? {
          ...prev,
          currentTime: audioRef.current?.currentTime || 0,
          duration: audioRef.current?.duration || 0,
        } : null);
      }
    }, 100);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  // Main function to start playing audio - creates and manages its own Audio element
  const playAudio = useCallback((title: string, audioUrl: string) => {
    // If same audio is already loaded, just toggle play/pause
    if (floatingPlayerState?.audioUrl === audioUrl && audioRef.current) {
      if (floatingPlayerState.isPlaying) {
        audioRef.current.pause();
        stopProgressTracking();
        setFloatingPlayerState(prev => prev ? {
          ...prev,
          isPlaying: false,
          isPaused: true,
        } : null);
      } else {
        audioRef.current.play();
        startProgressTracking();
        setFloatingPlayerState(prev => prev ? {
          ...prev,
          isPlaying: true,
          isPaused: false,
        } : null);
      }
      return;
    }

    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.oncanplaythrough = null;
      audioRef.current = null;
    }
    stopProgressTracking();

    // Create new audio element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    setFloatingPlayerState({
      isPlaying: false,
      isPaused: false,
      isLoading: true,
      currentTime: 0,
      duration: 0,
      title,
      audioUrl,
    });

    audio.oncanplaythrough = () => {
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isLoading: false,
        isPlaying: true,
        duration: audio.duration,
      } : null);
      audio.play();
      startProgressTracking();
    };

    audio.onended = () => {
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      } : null);
      stopProgressTracking();
    };

    audio.load();
  }, [floatingPlayerState?.audioUrl, floatingPlayerState?.isPlaying, startProgressTracking, stopProgressTracking]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !floatingPlayerState) return;

    if (floatingPlayerState.isPlaying) {
      // Currently playing -> pause
      audioRef.current.pause();
      stopProgressTracking();
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isPlaying: false,
        isPaused: true,
      } : null);
    } else if (floatingPlayerState.isPaused) {
      // Currently paused -> resume
      audioRef.current.play();
      startProgressTracking();
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isPlaying: true,
        isPaused: false,
      } : null);
    } else {
      // Stopped state (after STOP button) -> restart from beginning
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      startProgressTracking();
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isPlaying: true,
        isPaused: false,
        currentTime: 0,
      } : null);
    }
  }, [floatingPlayerState, startProgressTracking, stopProgressTracking]);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    stopProgressTracking();
    // Keep the player visible but in stopped state (not playing, not paused)
    setFloatingPlayerState(prev => prev ? {
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
    } : null);
  }, [stopProgressTracking]);

  const closePlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.oncanplaythrough = null;
      audioRef.current = null;
    }
    stopProgressTracking();
    setFloatingPlayerState(null);
  }, [stopProgressTracking]);

  return (
    <AudioPlayerContext.Provider value={{ 
      floatingPlayerState, 
      playAudio,
      togglePlayPause,
      stopPlayback,
      closePlayer,
    }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return context;
}
