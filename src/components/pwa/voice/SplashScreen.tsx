import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

type SplashStage = "stars" | "growing" | "morphing" | "complete";

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 4000,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<SplashStage>("stars");
  const [centralStarScale, setCentralStarScale] = useState(0);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number>();

  const generateStars = useCallback(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 2 + 1,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
    return stars;
  }, []);

  useEffect(() => {
    starsRef.current = generateStars();
  }, [generateStars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      ctx.fillStyle = "hsl(225, 71%, 5%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      starsRef.current.forEach((star) => {
        const twinkle = Math.sin(elapsed / 1000 * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
        const finalOpacity = star.opacity * twinkle;
        const x = (star.x / 100) * canvas.width;
        const y = (star.y / 100) * canvas.height;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, star.size * 4);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${finalOpacity})`);
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${finalOpacity * 0.3})`);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.beginPath();
        ctx.arc(x, y, star.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setStage("growing"), 1000));
    timers.push(setTimeout(() => setCentralStarScale(1), 1200));
    timers.push(setTimeout(() => setStage("morphing"), 2500));
    timers.push(setTimeout(() => { setStage("complete"); onComplete(); }, duration));
    return () => timers.forEach(clearTimeout);
  }, [onComplete, duration]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: "hsl(225, 71%, 5%)" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: stage === "complete" ? 0 : 1, transition: "opacity 0.5s" }} />

      <AnimatePresence>
        {(stage === "growing" || stage === "morphing") && (
          <motion.div className="absolute inset-0 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.5 }} transition={{ duration: 0.5 }}>
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: centralStarScale, rotate: 0 }} transition={{ type: "spring", stiffness: 100, damping: 15, duration: 1 }}>
              <svg width="200" height="200" viewBox="0 0 200 200" style={{ filter: "drop-shadow(0 0 40px hsl(191, 100%, 50%))" }}>
                <defs>
                  <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(191, 100%, 60%)" />
                    <stop offset="50%" stopColor="hsl(191, 100%, 50%)" />
                    <stop offset="100%" stopColor="hsl(270, 64%, 58%)" />
                  </linearGradient>
                </defs>
                <motion.path d="M100 10 L118 75 L185 75 L130 115 L150 180 L100 145 L50 180 L70 115 L15 75 L82 75 Z" fill="url(#starGradient)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }} />
              </svg>
              <motion.div className="absolute inset-0 flex items-center justify-center" animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                <div className="w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, hsl(191, 100%, 50%, 0.3) 0%, transparent 70%)" }} />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === "growing" && (
          <motion.div className="absolute inset-x-0 bottom-1/3 flex flex-col items-center gap-2" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ delay: 0.5, duration: 0.6 }}>
            <h1 className="text-4xl font-bold tracking-wider" style={{ background: "linear-gradient(135deg, hsl(191, 100%, 60%), hsl(270, 64%, 58%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>KnowYOU</h1>
            <p className="text-sm tracking-widest uppercase" style={{ color: "hsl(215, 16%, 60%)" }}>Seu assistente de voz</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: "hsl(191, 100%, 50%)" }} animate={{ scale: stage === "stars" ? [1, 1.5, 1] : 1, opacity: stage === "complete" ? 0 : [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: stage === "stars" ? Infinity : 0, delay: i * 0.2 }} />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
