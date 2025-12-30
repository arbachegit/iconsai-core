import React from "react";
import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

interface MicrophoneButtonProps {
  isRecording: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-20 h-20"
};

const iconSizes = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8"
};

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  isRecording,
  onClick,
  disabled = false,
  size = "md"
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]} 
        rounded-full 
        flex items-center justify-center
        transition-all duration-300
        ${isRecording 
          ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]" 
          : "bg-gradient-to-br from-primary to-secondary shadow-[0_0_20px_rgba(0,212,255,0.3)]"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-95"}
      `}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      animate={isRecording ? {
        scale: [1, 1.05, 1],
        boxShadow: [
          "0 0 30px rgba(239,68,68,0.5)",
          "0 0 50px rgba(239,68,68,0.7)",
          "0 0 30px rgba(239,68,68,0.5)"
        ]
      } : {}}
      transition={isRecording ? {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut"
      } : {}}
    >
      {/* Ripple effect on recording */}
      {isRecording && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.5
            }}
          />
        </>
      )}
      
      {/* Icon */}
      <motion.div
        animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
        transition={isRecording ? {
          duration: 0.5,
          repeat: Infinity,
          ease: "easeInOut"
        } : {}}
      >
        {disabled ? (
          <MicOff className={`${iconSizes[size]} text-white`} />
        ) : (
          <Mic className={`${iconSizes[size]} text-white`} />
        )}
      </motion.div>
    </motion.button>
  );
};

export default MicrophoneButton;
