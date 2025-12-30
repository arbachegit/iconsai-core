import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Loader2, Play, Pause, RotateCcw } from "lucide-react";
import { CometBorder } from "./CometBorder";
import { StatusIndicator } from "./StatusIndicator";
import { MicrophoneButton } from "./MicrophoneButton";

type PlayerState = "idle" | "loading" | "playing" | "listening" | "processing";

interface VoicePlayerBoxProps {
  state: PlayerState;
  onMicClick: () => void;
  onPlayPause?: () => void;
  onReset?: () => void;
  showMic?: boolean;
  title?: string;
  subtitle?: string;
}

export const VoicePlayerBox: React.FC<VoicePlayerBoxProps> = ({ 
  state, 
  onMicClick,
  onPlayPause,
  onReset,
  showMic = true,
  title,
  subtitle,
}) => {
  const isAnimating = state === "loading" || state === "processing";
  const isActive = state !== "idle";

  // Determinar velocidade da animação baseado no estado
  const getAnimationSpeed = () => {
    switch (state) {
      case "loading": return 1.5;
      case "processing": return 1;
      case "playing": return 3;
      default: return 4;
    }
  };

  // Cor da borda baseada no estado
  const getBorderColor = () => {
    switch (state) {
      case "listening": return "#EF4444"; // vermelho
      case "processing": return "#F59E0B"; // âmbar
      default: return "#00D4FF"; // cyan
    }
  };

  return (
    <CometBorder 
      isActive={isAnimating || state === "playing"} 
      speed={getAnimationSpeed()}
      color={getBorderColor()}
      glowColor={`${getBorderColor()}80`}
      className="w-full max-w-sm mx-auto"
    >
      <div className="flex flex-col items-center gap-6 p-6">
        {/* Título opcional */}
        {title && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && (
              <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
            )}
          </motion.div>
        )}

        {/* Área central do player */}
        <div className="relative">
          {/* Círculo de fundo com gradiente */}
          <motion.div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)",
            }}
            animate={state === "playing" ? {
              scale: [1, 1.05, 1],
              boxShadow: [
                "0 0 20px rgba(0, 212, 255, 0.2)",
                "0 0 40px rgba(0, 212, 255, 0.4)",
                "0 0 20px rgba(0, 212, 255, 0.2)",
              ],
            } : {}}
            transition={{
              duration: 1,
              repeat: state === "playing" ? Infinity : 0,
              ease: "easeInOut",
            }}
          >
            {/* Ícone central baseado no estado */}
            <AnimatePresence mode="wait">
              {state === "loading" || state === "processing" ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                </motion.div>
              ) : state === "playing" ? (
                <motion.div
                  key="playing"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Volume2 className="w-10 h-10 text-cyan-400" />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Play className="w-10 h-10 text-cyan-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Ondas de áudio (quando playing) */}
          <AnimatePresence>
            {state === "playing" && (
              <motion.div
                className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-end gap-1 h-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {[...Array(7)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-cyan-400 rounded-full"
                    animate={{
                      height: [4, 16 + Math.random() * 8, 4],
                    }}
                    transition={{
                      duration: 0.4 + Math.random() * 0.2,
                      repeat: Infinity,
                      delay: i * 0.05,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status e controles */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Indicador de status */}
          <div className="flex items-center gap-2">
            <StatusIndicator isActive={isActive} color={getBorderColor()} />
            <span className="text-sm text-slate-400">
              {state === "idle" && "Pronto para começar"}
              {state === "loading" && "Carregando..."}
              {state === "playing" && "Reproduzindo..."}
              {state === "listening" && "Ouvindo você..."}
              {state === "processing" && "Processando..."}
            </span>
          </div>

          {/* Controles de reprodução */}
          {onPlayPause && (state === "playing" || state === "idle") && (
            <div className="flex items-center gap-4">
              <motion.button
                onClick={onPlayPause}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {state === "playing" ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </motion.button>
              
              {onReset && (
                <motion.button
                  onClick={onReset}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <RotateCcw className="w-5 h-5 text-white" />
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Botão de microfone (aparece após reprodução ou em listening) */}
        <AnimatePresence>
          {showMic && (state === "idle" || state === "listening") && (
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.8 }}
              transition={{ 
                type: "spring", 
                stiffness: 300,
                damping: 20,
              }}
              className="mt-4"
            >
              <MicrophoneButton
                isListening={state === "listening"}
                onClick={onMicClick}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CometBorder>
  );
};

export default VoicePlayerBox;
