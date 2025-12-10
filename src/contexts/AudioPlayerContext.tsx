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
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  startPlayback: (title: string, audioUrl: string) => void;
  togglePlayPause: () => void;
  stopPlayback: () => void;
  closePlayer: () => void;
  transferToFloating: (title: string, audioUrl: string, audioElement: HTMLAudioElement | null) => void;
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

  const startPlayback = useCallback((title: string, audioUrl: string) => {
    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopProgressTracking();

    // Create new audio
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
  }, [startProgressTracking, stopProgressTracking]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !floatingPlayerState) return;

    if (floatingPlayerState.isPlaying) {
      audioRef.current.pause();
      stopProgressTracking();
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isPlaying: false,
        isPaused: true,
      } : null);
    } else if (floatingPlayerState.isPaused) {
      audioRef.current.play();
      startProgressTracking();
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isPlaying: true,
        isPaused: false,
      } : null);
    }
  }, [floatingPlayerState, startProgressTracking, stopProgressTracking]);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    stopProgressTracking();
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
      audioRef.current = null;
    }
    stopProgressTracking();
    setFloatingPlayerState(null);
  }, [stopProgressTracking]);

  const transferToFloating = useCallback((title: string, audioUrl: string, audioElement: HTMLAudioElement | null) => {
    if (!audioElement) return;

    // Transfer the audio element to the global context
    audioRef.current = audioElement;

    setFloatingPlayerState({
      isPlaying: !audioElement.paused,
      isPaused: audioElement.paused && audioElement.currentTime > 0,
      isLoading: false,
      currentTime: audioElement.currentTime,
      duration: audioElement.duration || 0,
      title,
      audioUrl,
    });

    // Set up event handlers
    audioElement.onended = () => {
      setFloatingPlayerState(prev => prev ? {
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      } : null);
      stopProgressTracking();
    };

    if (!audioElement.paused) {
      startProgressTracking();
    }
  }, [startProgressTracking, stopProgressTracking]);

  return (
    <AudioPlayerContext.Provider value={{ 
      floatingPlayerState, 
      audioRef,
      startPlayback,
      togglePlayPause,
      stopPlayback,
      closePlayer,
      transferToFloating,
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