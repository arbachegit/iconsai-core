import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 800),
      setTimeout(() => setStage(2), 1600),
      setTimeout(() => setStage(3), 2400),
      setTimeout(() => onComplete(), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // SVG paths for morphing animation
  const paths = [
    // Stage 0: Abstract circles
    "M50,25 C65,25 75,35 75,50 C75,65 65,75 50,75 C35,75 25,65 25,50 C25,35 35,25 50,25",
    // Stage 1: Organic wave form
    "M30,50 Q40,20 50,50 T70,50 Q80,80 50,80 Q20,80 30,50",
    // Stage 2: Logo silhouette hint
    "M35,30 L50,20 L65,30 L65,70 L50,80 L35,70 Z",
    // Stage 3: Final clean shape
    "M40,25 C55,25 65,30 70,45 C75,60 65,75 50,75 C35,75 25,65 30,50 C35,35 25,25 40,25",
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: "radial-gradient(circle at 50% 50%, hsl(191, 100%, 50%), transparent 70%)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* SVG Morphing Animation */}
      <motion.svg
        viewBox="0 0 100 100"
        className="w-32 h-32 mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Glow filter */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(191, 100%, 50%)" />
            <stop offset="100%" stopColor="hsl(270, 64%, 58%)" />
          </linearGradient>
        </defs>

        {/* Main morphing path */}
        <motion.path
          d={paths[stage]}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="2"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />

        {/* Pulsing circles in early stages */}
        {stage < 2 && (
          <>
            <motion.circle
              cx="50"
              cy="50"
              r="30"
              fill="none"
              stroke="hsl(191, 100%, 50%)"
              strokeWidth="1"
              opacity="0.3"
              animate={{
                r: [30, 40, 30],
                opacity: [0.3, 0.1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.circle
              cx="50"
              cy="50"
              r="20"
              fill="none"
              stroke="hsl(270, 64%, 58%)"
              strokeWidth="1"
              opacity="0.5"
              animate={{
                r: [20, 25, 20],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
            />
          </>
        )}
      </motion.svg>

      {/* Logo text */}
      <motion.h1
        className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? 0 : 20 }}
        transition={{ duration: 0.5 }}
      >
        KnowYOU
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        className="text-muted-foreground mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 3 ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        Seu assistente de voz inteligente
      </motion.p>

      {/* Loading dots */}
      <motion.div
        className="flex gap-1 mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
