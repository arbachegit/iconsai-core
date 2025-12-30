import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onComplete,
  duration = 3200 
}) => {
  const [stage, setStage] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 600),
      setTimeout(() => setStage(2), 1200),
      setTimeout(() => setStage(3), 1800),
      setTimeout(() => setStage(4), 2400),
      setTimeout(() => setIsExiting(true), duration - 500),
      setTimeout(() => onComplete(), duration),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete, duration]);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Partículas de fundo */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
                initial={{
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                  y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                  scale: Math.random() * 0.5 + 0.5,
                }}
                animate={{
                  y: [null, Math.random() * -200],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          {/* Container principal da animação */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Stage 0: Círculos abstratos */}
            <AnimatePresence>
              {stage === 0 && (
                <>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={`circle-${i}`}
                      className="absolute rounded-full border-2 border-cyan-400/50"
                      initial={{ 
                        width: 40 + i * 30, 
                        height: 40 + i * 30,
                        opacity: 0,
                        scale: 0.5,
                      }}
                      animate={{ 
                        opacity: 1,
                        scale: 1,
                        rotate: i % 2 === 0 ? 360 : -360,
                      }}
                      exit={{ 
                        opacity: 0,
                        scale: 1.5,
                      }}
                      transition={{
                        duration: 0.8,
                        delay: i * 0.1,
                        rotate: {
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        },
                      }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>

            {/* Stage 1: Forma ondulada */}
            <AnimatePresence>
              {stage === 1 && (
                <motion.svg
                  viewBox="0 0 200 200"
                  className="w-48 h-48 absolute"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.path
                    d="M100,20 C140,20 180,60 180,100 C180,140 140,180 100,180 C60,180 20,140 20,100 C20,60 60,20 100,20"
                    fill="none"
                    stroke="url(#gradient1)"
                    strokeWidth="3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6 }}
                  />
                  <defs>
                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00D4FF" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                </motion.svg>
              )}
            </AnimatePresence>

            {/* Stage 2: Forma orgânica com glow */}
            <AnimatePresence>
              {stage === 2 && (
                <motion.div
                  className="absolute"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    className="w-32 h-32 rounded-full"
                    style={{
                      background: "linear-gradient(135deg, #00D4FF 0%, #8B5CF6 100%)",
                      boxShadow: "0 0 60px rgba(0, 212, 255, 0.5), 0 0 120px rgba(139, 92, 246, 0.3)",
                    }}
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stage 3 & 4: Logo KnowYOU */}
            <AnimatePresence>
              {stage >= 3 && (
                <motion.div
                  className="absolute flex flex-col items-center"
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                  }}
                  transition={{ 
                    duration: 0.6, 
                    type: "spring",
                    stiffness: 200,
                  }}
                >
                  {/* Ícone/Logo */}
                  <motion.div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                    style={{
                      background: "linear-gradient(135deg, #00D4FF 0%, #8B5CF6 100%)",
                      boxShadow: "0 0 40px rgba(0, 212, 255, 0.4)",
                    }}
                    animate={stage === 4 ? {
                      boxShadow: [
                        "0 0 40px rgba(0, 212, 255, 0.4)",
                        "0 0 60px rgba(0, 212, 255, 0.6)",
                        "0 0 40px rgba(0, 212, 255, 0.4)",
                      ],
                    } : {}}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  >
                    <span className="text-3xl font-bold text-white">K</span>
                  </motion.div>

                  {/* Texto KnowYOU */}
                  <motion.h1
                    className="text-3xl font-bold"
                    style={{
                      background: "linear-gradient(135deg, #00D4FF 0%, #8B5CF6 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    KnowYOU
                  </motion.h1>

                  {/* Subtítulo */}
                  <motion.p
                    className="text-slate-400 text-sm mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    Seu assistente de voz
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Indicador de carregamento */}
          <motion.div
            className="absolute bottom-20 flex gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i <= stage ? "bg-cyan-400" : "bg-slate-600"
                }`}
                animate={i === stage ? {
                  scale: [1, 1.3, 1],
                } : {}}
                transition={{
                  duration: 0.5,
                  repeat: i === stage ? Infinity : 0,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
