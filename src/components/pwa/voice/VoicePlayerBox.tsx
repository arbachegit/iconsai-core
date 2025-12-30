import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Loader2, Volume2, RotateCcw } from "lucide-react";

export type PlayerState = "idle" | "loading" | "playing" | "waiting" | "processing";

interface VoicePlayerBoxProps {
  state: PlayerState;
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onMicClick?: () => void;
  audioProgress?: number;
  showMic?: boolean;
  title?: string;
  subtitle?: string;
}

export const VoicePlayerBox: React.FC<VoicePlayerBoxProps> = ({
  state,
  onPlay,
  onPause,
  onReset,
  audioProgress = 0,
}) => {
  const rotationDuration = useMemo(() => {
    switch (state) {
      case "loading": case "processing": return 1.5;
      case "playing": return 3;
      case "waiting": return 4;
      default: return 6;
    }
  }, [state]);

  const isAnimating = state === "loading" || state === "processing" || state === "playing";
  const isWaiting = state === "waiting" || state === "idle";

  const handleClick = () => {
    if (state === "playing" && onPause) onPause();
    else if (onPlay) onPlay();
  };

  return (
    <div className="relative flex flex-col items-center gap-6">
      <div className="relative w-40 h-40">
        <motion.div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(from 0deg, transparent 0deg, hsl(191, 100%, 50%) 60deg, hsl(191, 100%, 50%, 0.5) 120deg, transparent 180deg, transparent 360deg)`, opacity: isAnimating ? 1 : 0.3 }} animate={{ rotate: 360 }} transition={{ duration: rotationDuration, repeat: Infinity, ease: "linear" }} />

        <AnimatePresence>
          {isAnimating && (
            <motion.div className="absolute inset-0 rounded-full blur-md" style={{ background: `conic-gradient(from 0deg, transparent 0deg, hsl(191, 100%, 50%, 0.6) 40deg, transparent 100deg)` }} initial={{ opacity: 0 }} animate={{ opacity: 1, rotate: 360 }} exit={{ opacity: 0 }} transition={{ opacity: { duration: 0.3 }, rotate: { duration: rotationDuration * 0.8, repeat: Infinity, ease: "linear" } }} />
          )}
        </AnimatePresence>

        {isWaiting && (
          <motion.div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, hsl(191, 100%, 50%, 0.2) 0%, transparent 70%)" }} animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
        )}

        <div className="absolute inset-2 rounded-full flex items-center justify-center overflow-hidden" style={{ background: "hsl(225, 54%, 8%)", border: "1px solid hsl(191, 100%, 50%, 0.2)" }}>
          <AnimatePresence>
            {isWaiting && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[1, 2, 3].map((i) => (
                  <motion.div key={i} className="absolute rounded-full border" style={{ width: `${40 + i * 20}%`, height: `${40 + i * 20}%`, borderColor: "hsl(191, 100%, 50%, 0.2)" }} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: [0.8, 1.2, 0.8], opacity: [0, 0.3, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }} />
                ))}
              </div>
            )}
          </AnimatePresence>

          <motion.button className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(191, 100%, 50%) 0%, hsl(191, 100%, 40%) 100%)", boxShadow: "0 0 30px hsl(191, 100%, 50%, 0.4)" }} onClick={handleClick} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <AnimatePresence mode="wait">
              {state === "loading" || state === "processing" ? (
                <motion.div key="loader" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(225, 71%, 8%)" }} />
                </motion.div>
              ) : state === "playing" ? (
                <motion.div key="pause" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                  <Pause className="w-8 h-8" style={{ color: "hsl(225, 71%, 8%)" }} />
                </motion.div>
              ) : (
                <motion.div key="play" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                  <Play className="w-8 h-8 ml-1" style={{ color: "hsl(225, 71%, 8%)" }} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <AnimatePresence>
            {state === "playing" && audioProgress > 0 && (
              <motion.svg className="absolute inset-0 w-full h-full -rotate-90" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <circle cx="50%" cy="50%" r="45%" fill="none" stroke="hsl(191, 100%, 50%, 0.2)" strokeWidth="2" />
                <motion.circle cx="50%" cy="50%" r="45%" fill="none" stroke="hsl(191, 100%, 50%)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 45}`} strokeDashoffset={`${2 * Math.PI * 45 * (1 - audioProgress / 100)}`} style={{ transition: "stroke-dashoffset 0.1s linear" }} />
              </motion.svg>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {state === "playing" && (
          <motion.div className="flex items-end justify-center gap-1 h-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            {[...Array(9)].map((_, i) => {
              const heights = [16, 24, 32, 20, 28, 18, 30, 22, 14];
              return <motion.div key={i} className="w-1 rounded-full" style={{ background: "hsl(191, 100%, 50%)", height: 8 }} animate={{ height: [8, heights[i], 8] }} transition={{ duration: 0.6 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }} />;
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state === "playing" && (
          <motion.div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <Volume2 className="w-4 h-4" style={{ color: "hsl(191, 100%, 50%)" }} />
            <span className="text-xs" style={{ color: "hsl(191, 100%, 50%)" }}>Reproduzindo</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoicePlayerBox;
