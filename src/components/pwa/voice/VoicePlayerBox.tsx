import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Mic, Loader2, Play, Pause, AudioLines } from "lucide-react";
import { CometBorder } from "./CometBorder";
import { StatusIndicator } from "./StatusIndicator";
import type { PlayerState } from "@/stores/pwaStore";

interface VoicePlayerBoxProps {
  state: PlayerState;
  onMicClick: () => void;
  onPlayPause: () => void;
  transcript?: string;
}

const stateConfig = {
  idle: {
    icon: Volume2,
    label: "Toque para começar",
    color: "cyan" as const
  },
  loading: {
    icon: Loader2,
    label: "Carregando...",
    color: "cyan" as const
  },
  playing: {
    icon: AudioLines,
    label: "Reproduzindo...",
    color: "cyan" as const
  },
  listening: {
    icon: Mic,
    label: "Ouvindo...",
    color: "green" as const
  },
  processing: {
    icon: Loader2,
    label: "Processando...",
    color: "amber" as const
  }
};

export const VoicePlayerBox: React.FC<VoicePlayerBoxProps> = ({
  state,
  onMicClick,
  onPlayPause,
  transcript
}) => {
  const isAnimating = state === "loading" || state === "processing";
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <CometBorder 
      isActive={isAnimating || state === "playing"} 
      speed={state === "loading" ? 1.5 : 2}
      className="w-full max-w-xs mx-auto"
    >
      <motion.div
        className="p-8 flex flex-col items-center gap-6 min-h-[200px]"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Central icon with animation */}
        <motion.div
          className="relative w-20 h-20 flex items-center justify-center"
          animate={state === "playing" ? { scale: [1, 1.05, 1] } : {}}
          transition={state === "playing" ? {
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut"
          } : {}}
        >
          {/* Glow background */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
            animate={isAnimating || state === "listening" ? {
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3]
            } : {}}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Icon */}
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className={isAnimating ? "animate-spin" : ""}
              style={isAnimating ? { animationDuration: "1s" } : {}}
            >
              <Icon 
                className={`w-10 h-10 ${
                  state === "listening" ? "text-green-500" : "text-primary"
                }`} 
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Waveform visual when playing */}
        <AnimatePresence>
          {state === "playing" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-end justify-center gap-1 h-8"
            >
              {[...Array(7)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-primary rounded-full"
                  animate={{
                    height: [8, 24, 8],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transcript display when listening */}
        <AnimatePresence>
          {state === "listening" && transcript && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-muted-foreground text-center italic max-w-full break-words"
            >
              "{transcript}"
            </motion.p>
          )}
        </AnimatePresence>

        {/* Status indicator and label */}
        <div className="flex items-center gap-2">
          <StatusIndicator isActive={state !== "idle"} color={config.color} size="sm" />
          <motion.span
            key={config.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground"
          >
            {config.label}
          </motion.span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          {/* Play/Pause button */}
          {(state === "idle" || state === "playing") && (
            <motion.button
              onClick={onPlayPause}
              className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              {state === "playing" ? (
                <Pause className="w-5 h-5 text-foreground" />
              ) : (
                <Play className="w-5 h-5 text-foreground ml-0.5" />
              )}
            </motion.button>
          )}
          
          {/* Mic button */}
          {(state === "idle" || state === "listening") && (
            <motion.button
              onClick={onMicClick}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                state === "listening" 
                  ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" 
                  : "bg-muted/50 hover:bg-muted"
              }`}
              whileTap={{ scale: 0.95 }}
              animate={state === "listening" ? {
                scale: [1, 1.05, 1],
              } : {}}
              transition={state === "listening" ? {
                duration: 0.8,
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
            >
              <Mic className={`w-5 h-5 ${state === "listening" ? "text-white" : "text-foreground"}`} />
            </motion.button>
          )}
        </div>
      </motion.div>
    </CometBorder>
  );
};

export default VoicePlayerBox;
