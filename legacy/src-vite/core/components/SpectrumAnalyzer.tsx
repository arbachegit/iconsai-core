/**
 * SpectrumAnalyzer - Core Audio Visualization Component
 * @version 1.0.0
 * @date 2026-01-25
 *
 * Bidirectional spectrum analyzer adapted from VoiceSpectrumBidirectional.
 * Supports idle, playing, and recording modes with configurable colors.
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SpectrumMode } from '@/core/types';

interface SpectrumAnalyzerProps {
  /** Current mode: idle, playing, or recording */
  mode: SpectrumMode;
  /** Number of bars in the spectrum */
  barCount?: number;
  /** Primary color (hex) */
  primaryColor?: string;
  /** Secondary color for gradient (hex) */
  secondaryColor?: string;
  /** Real frequency data from audio (0-255 per bar) */
  frequencyData?: number[];
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

export const SpectrumAnalyzer: React.FC<SpectrumAnalyzerProps> = ({
  mode = 'idle',
  barCount = 24,
  primaryColor = '#00D4FF',
  secondaryColor = '#8B5CF6',
  frequencyData,
  width = 160,
  height = 80,
  className = '',
}) => {
  const halfHeight = height / 2;
  const [barHeights, setBarHeights] = useState<number[]>(
    Array(barCount).fill(0.05)
  );
  const animationRef = useRef<number | null>(null);
  const barWidth = Math.max(2, (width / barCount) - 2);

  // Generate heights for idle state
  const generateIdleHeights = (time: number) => {
    return Array(barCount).fill(0).map((_, i) => {
      const wave = Math.sin(time / 1000 + i * 0.3) * 0.08;
      return 0.03 + Math.abs(wave);
    });
  };

  // Generate smooth playing heights
  const generateSmoothPlayingHeights = (prevHeights: number[]) => {
    return prevHeights.map((prev) => {
      const target = 0.1 + Math.random() * 0.7;
      return prev + (target - prev) * 0.25;
    });
  };

  // Generate smooth recording heights
  const generateSmoothRecordingHeights = (prevHeights: number[], elapsed: number) => {
    const pulse = Math.sin(elapsed / 500) * 0.2 + 0.8;
    return prevHeights.map((prev) => {
      const target = 0.2 + Math.random() * 0.6 * pulse;
      return prev + (target - prev) * 0.25;
    });
  };

  // Animation loop
  useEffect(() => {
    let startTime = Date.now();
    let lastUpdate = 0;
    let isRunning = true;
    const UPDATE_INTERVAL = 80;

    const animate = () => {
      if (!isRunning) return;

      const now = Date.now();
      const elapsed = now - startTime;

      if (now - lastUpdate < UPDATE_INTERVAL) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastUpdate = now;

      switch (mode) {
        case 'idle':
          setBarHeights(generateIdleHeights(elapsed));
          break;

        case 'playing':
          if (frequencyData && frequencyData.length > 0) {
            const step = Math.max(1, Math.floor(frequencyData.length / barCount));
            const heights = Array(barCount).fill(0).map((_, i) => {
              const value = frequencyData[Math.min(i * step, frequencyData.length - 1)] / 255;
              return Math.max(0.05, value);
            });
            setBarHeights(heights);
          } else {
            setBarHeights(prev => generateSmoothPlayingHeights(prev));
          }
          break;

        case 'recording':
          if (frequencyData && frequencyData.length > 0) {
            const step = Math.max(1, Math.floor(frequencyData.length / barCount));
            const heights = Array(barCount).fill(0).map((_, i) => {
              const value = frequencyData[Math.min(i * step, frequencyData.length - 1)] / 255;
              return Math.max(0.08, value);
            });
            setBarHeights(heights);
          } else {
            setBarHeights(prev => generateSmoothRecordingHeights(prev, elapsed));
          }
          break;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isRunning = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode, barCount, frequencyData]);

  // Transition duration based on mode
  const transitionDuration = useMemo(() => {
    switch (mode) {
      case 'idle': return 0.8;
      case 'playing': return 0.25;
      case 'recording': return 0.15;
      default: return 0.3;
    }
  }, [mode]);

  // Get colors based on mode
  const getBarColors = () => {
    if (mode === 'recording') {
      return {
        primary: '#EF4444',
        secondary: '#F87171',
      };
    }
    return {
      primary: primaryColor,
      secondary: secondaryColor,
    };
  };

  const colors = getBarColors();

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ height, width }}
      role="img"
      aria-label="Audio spectrum visualization"
    >
      {/* Center line */}
      <div
        className="absolute left-0 right-0 h-[1px] opacity-30"
        style={{
          top: '50%',
          background: `linear-gradient(to right, transparent, ${colors.primary}, transparent)`,
        }}
      />

      {/* Bars container */}
      <div className="flex items-center justify-center gap-[2px]" style={{ height }}>
        {barHeights.map((heightPercent, index) => {
          const barHeightPx = heightPercent * halfHeight;

          return (
            <div
              key={index}
              className="relative flex flex-col items-center justify-center"
              style={{ width: barWidth, height }}
            >
              {/* Top bar (grows upward) */}
              <motion.div
                className="rounded-full"
                style={{
                  width: barWidth,
                  background: `linear-gradient(to top, ${colors.primary}, ${colors.secondary})`,
                  transformOrigin: 'bottom',
                }}
                animate={{ height: barHeightPx }}
                transition={{ duration: transitionDuration, ease: 'easeOut' }}
              />

              {/* Bottom bar (grows downward - mirrored) */}
              <motion.div
                className="rounded-full"
                style={{
                  width: barWidth,
                  background: `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary})`,
                  transformOrigin: 'top',
                }}
                animate={{ height: barHeightPx }}
                transition={{ duration: transitionDuration, ease: 'easeOut' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpectrumAnalyzer;
