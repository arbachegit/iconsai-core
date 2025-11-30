import { createContext, useContext, useState, ReactNode } from "react";

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  messageContent?: string;
  onStop: () => void;
  onClose: () => void;
}

interface AudioPlayerContextType {
  floatingPlayerState: AudioPlayerState | null;
  setFloatingPlayerState: (state: AudioPlayerState | null) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [floatingPlayerState, setFloatingPlayerState] = useState<AudioPlayerState | null>(null);

  return (
    <AudioPlayerContext.Provider value={{ floatingPlayerState, setFloatingPlayerState }}>
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
