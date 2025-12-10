import { createContext, useContext, useState, useRef, ReactNode, useCallback, useMemo, useEffect } from "react";

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
  
  // Stable refs to avoid recreating callbacks - CRITICAL for preventing re-renders
  const currentAudioUrlRef = useRef<string | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  
  // Sync refs with state changes
  useEffect(() => {
    currentAudioUrlRef.current = floatingPlayerState?.audioUrl ?? null;
    isPlayingRef.current = floatingPlayerState?.isPlaying ?? false;
  }, [floatingPlayerState?.audioUrl, floatingPlayerState?.isPlaying]);

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

  // Main function to start playing audio - uses REFS for stable dependencies
  const playAudio = useCallback((title: string, audioUrl: string) => {
    // Use refs for comparison - NOT state (avoids callback recreation)
    if (currentAudioUrlRef.current === audioUrl && audioRef.current) {
      if (isPlayingRef.current) {
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
  }, [startProgressTracking, stopProgressTracking]); // STABLE dependencies only

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

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    floatingPlayerState,
    playAudio,
    togglePlayPause,
    stopPlayback,
    closePlayer,
  }), [floatingPlayerState, playAudio, togglePlayPause, stopPlayback, closePlayer]);

  return (
    <AudioPlayerContext.Provider value={contextValue}>
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
