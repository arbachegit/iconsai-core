import React, { useEffect, useRef, useState, useMemo } from "react";
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
  duration = 4500,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [stage, setStage] = useState<SplashStage>("stars");
  const [starScale, setStarScale] = useState(0);

  // Generate stars once with useMemo
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: 150 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 2 + 1,
        twinkleOffset: Math.random() * Math.PI * 2,
      })),
    []
  );

  // Canvas animation with DPI handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // DPI handling for sharp rendering
    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      return { width: rect.width, height: rect.height };
    };

    let dimensions = setupCanvas();

    const handleResize = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      dimensions = setupCanvas();
    };

    window.addEventListener("resize", handleResize);

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const { width, height } = dimensions;

      // Radial gradient background
      const bgGradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height)
      );
      bgGradient.addColorStop(0, "#0A0E1A");
      bgGradient.addColorStop(0.5, "#0F172A");
      bgGradient.addColorStop(1, "#020617");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Calculate central area for star fade
      const centerX = width / 2;
      const centerY = height / 2;
      const centralRadius = starScale * Math.min(width, height) * 0.4;

      // Draw stars
      stars.forEach((star) => {
        // Twinkle effect
        const twinkle =
          Math.sin((elapsed / 1000) * star.twinkleSpeed + star.twinkleOffset) *
            0.3 +
          0.7;
        const baseOpacity = star.opacity * twinkle;

        const x = (star.x / 100) * width;
        const y = (star.y / 100) * height;

        // Calculate distance from center for fade effect
        const distFromCenter = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );

        // Fade out stars near center when central star grows
        const fadeMultiplier =
          stage === "growing" || stage === "morphing"
            ? Math.min(1, distFromCenter / (centralRadius + 50))
            : 1;

        if (fadeMultiplier <= 0.01) return;

        const finalOpacity = baseOpacity * fadeMultiplier;

        // Glow around star
        ctx.beginPath();
        ctx.arc(x, y, star.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity * 0.15})`;
        ctx.fill();

        // Core of star
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stars, stage, starScale]);

  // Stage timeline with progressive scaling
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [
      // Stage: growing
      setTimeout(() => setStage("growing"), 1000),

      // Progressive star scale
      setTimeout(() => setStarScale(0.3), 1200),
      setTimeout(() => setStarScale(0.6), 1600),
      setTimeout(() => setStarScale(1), 2000),

      // Stage: morphing
      setTimeout(() => {
        setStage("morphing");
        setStarScale(2);
      }, 2800),

      // Complete
      setTimeout(() => {
        setStage("complete");
        onComplete();
      }, duration),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete, duration]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: "#020617" }}
    >
      {/* Starfield Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: stage === "complete" ? 0 : 1,
          transition: "opacity 0.5s",
        }}
      />

      {/* Central AI Star */}
      <AnimatePresence>
        {(stage === "growing" || stage === "morphing") && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{
                scale: stage === "morphing" ? 2 : starScale,
                rotate: 0,
              }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 15,
                duration: 1,
              }}
            >
              <svg
                width="200"
                height="200"
                viewBox="0 0 200 200"
                style={{
                  filter: "drop-shadow(0 0 40px hsl(191, 100%, 50%))",
                }}
              >
                <defs>
                  <linearGradient
                    id="starGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="hsl(191, 100%, 60%)" />
                    <stop offset="50%" stopColor="hsl(191, 100%, 50%)" />
                    <stop offset="100%" stopColor="hsl(270, 64%, 58%)" />
                  </linearGradient>
                  <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                    <stop
                      offset="0%"
                      stopColor="hsl(191, 100%, 80%)"
                      stopOpacity="0.6"
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(191, 100%, 50%)"
                      stopOpacity="0"
                    />
                  </radialGradient>
                </defs>

                {/* 5-pointed star path */}
                <motion.path
                  d="M100 10 L118 75 L185 75 L130 115 L150 180 L100 145 L50 180 L70 115 L15 75 L82 75 Z"
                  fill="url(#starGradient)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />

                {/* Inner glow */}
                <circle cx="100" cy="100" r="60" fill="url(#starGlow)" />
              </svg>

              {/* Pulsing glow behind star */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0.2, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div
                  className="w-48 h-48 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, hsl(191, 100%, 50%, 0.3) 0%, transparent 70%)",
                  }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KnowYOU Text with animated gradient */}
      <AnimatePresence>
        {stage === "growing" && starScale >= 0.6 && (
          <motion.div
            className="absolute inset-x-0 bottom-1/3 flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h1
              className="text-4xl font-bold tracking-wider"
              style={{
                background:
                  "linear-gradient(135deg, hsl(191, 100%, 60%), hsl(270, 64%, 58%), hsl(191, 100%, 60%))",
                backgroundSize: "200% 200%",
                animation: "gradient-shift 3s ease infinite",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              KnowYOU
            </h1>
            <p
              className="text-sm tracking-widest uppercase"
              style={{ color: "hsl(215, 16%, 60%)" }}
            >
              Seu assistente de voz inteligente
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4 Progressive loading indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {[0, 1, 2, 3].map((i) => {
          const isActive =
            i === 0
              ? stage !== "stars"
              : i === 1
                ? starScale >= 0.3
                : i === 2
                  ? starScale >= 0.6
                  : i === 3
                    ? stage === "morphing"
                    : false;

          const shouldPulse =
            i ===
            (stage === "morphing"
              ? 3
              : starScale >= 0.6
                ? 2
                : starScale >= 0.3
                  ? 1
                  : 0);

          return (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: isActive
                  ? "hsl(191, 100%, 50%)"
                  : "hsl(215, 16%, 30%)",
              }}
              animate={
                shouldPulse
                  ? {
                      scale: [1, 1.3, 1],
                    }
                  : {}
              }
              transition={{
                duration: 0.5,
                repeat: shouldPulse ? Infinity : 0,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default SplashScreen;
