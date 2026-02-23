/**
 * UnifiedButton - Single Play/Mic Button with State Machine
 * @version 1.0.0
 * @date 2026-01-25
 *
 * State Machine:
 * idle -> [click] -> playing (welcome)
 * playing -> [audio ends] -> recording (auto)
 * recording -> [stop/timeout 60s] -> processing
 * processing -> [response ready] -> playing
 * playing -> [audio ends] -> recording (cycle)
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Mic, Square, Loader2 } from 'lucide-react';
import type { UnifiedButtonState } from '@/core/types';

interface UnifiedButtonProps {
  /** Current button state */
  state: UnifiedButtonState;
  /** Handler for play action (idle state) */
  onPlay: () => void;
  /** Handler for start recording (after welcome ends) */
  onRecord: () => void;
  /** Handler for stop action (recording/playing) */
  onStop: () => void;
  /** Progress indicator (0-1) for playing state */
  progress?: number;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Primary color (hex) */
  primaryColor?: string;
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';
}

export const UnifiedButton: React.FC<UnifiedButtonProps> = ({
  state,
  onPlay,
  onRecord,
  onStop,
  progress = 0,
  disabled = false,
  primaryColor = '#00D4FF',
  size = 'lg',
}) => {
  // Size configuration
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'sm':
        return { button: 80, icon: 32, ring: 88 };
      case 'md':
        return { button: 120, icon: 48, ring: 132 };
      case 'lg':
      default:
        return { button: 160, icon: 64, ring: 176 };
    }
  }, [size]);

  // Get icon based on state
  const Icon = useMemo(() => {
    switch (state) {
      case 'idle':
        return Play;
      case 'playing':
        return Square;
      case 'recording':
        return Square;
      case 'processing':
        return Loader2;
      default:
        return Play;
    }
  }, [state]);

  // Handle click based on state
  const handleClick = () => {
    if (disabled) return;

    switch (state) {
      case 'idle':
        onPlay();
        break;
      case 'playing':
        onStop();
        break;
      case 'recording':
        onStop();
        break;
      case 'processing':
        // No action during processing
        break;
    }
  };

  // Get button colors based on state
  const getColors = () => {
    switch (state) {
      case 'idle':
        return {
          bg: 'bg-slate-800/80',
          border: primaryColor,
          glow: `${primaryColor}40`,
        };
      case 'playing':
        return {
          bg: 'bg-slate-800/80',
          border: primaryColor,
          glow: `${primaryColor}60`,
        };
      case 'recording':
        return {
          bg: 'bg-red-900/80',
          border: '#EF4444',
          glow: '#EF444460',
        };
      case 'processing':
        return {
          bg: 'bg-slate-800/80',
          border: '#F59E0B',
          glow: '#F59E0B40',
        };
      default:
        return {
          bg: 'bg-slate-800/80',
          border: primaryColor,
          glow: `${primaryColor}40`,
        };
    }
  };

  const colors = getColors();

  // Calculate progress ring circumference
  const circumference = 2 * Math.PI * (sizeConfig.ring / 2 - 4);
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <div className="relative flex items-center justify-center">
      {/* Progress Ring (visible when playing) */}
      {state === 'playing' && progress > 0 && (
        <svg
          className="absolute"
          width={sizeConfig.ring}
          height={sizeConfig.ring}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background ring */}
          <circle
            cx={sizeConfig.ring / 2}
            cy={sizeConfig.ring / 2}
            r={sizeConfig.ring / 2 - 4}
            fill="none"
            stroke={`${primaryColor}20`}
            strokeWidth={3}
          />
          {/* Progress ring */}
          <circle
            cx={sizeConfig.ring / 2}
            cy={sizeConfig.ring / 2}
            r={sizeConfig.ring / 2 - 4}
            fill="none"
            stroke={primaryColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
      )}

      {/* Recording pulse animation */}
      {state === 'recording' && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: sizeConfig.button + 20,
            height: sizeConfig.button + 20,
            backgroundColor: '#EF444420',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.2, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Main Button */}
      <motion.button
        onClick={handleClick}
        disabled={disabled || state === 'processing'}
        className={`
          relative rounded-full flex items-center justify-center
          ${colors.bg}
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950
        `}
        style={{
          width: sizeConfig.button,
          height: sizeConfig.button,
          border: `2px solid ${colors.border}`,
          boxShadow: `0 0 20px ${colors.glow}`,
        }}
        whileHover={!disabled && state !== 'processing' ? { scale: 1.05 } : {}}
        whileTap={!disabled && state !== 'processing' ? { scale: 0.95 } : {}}
        aria-label={
          state === 'idle' ? 'Start conversation' :
          state === 'playing' ? 'Stop audio' :
          state === 'recording' ? 'Stop recording' :
          'Processing'
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Icon
              size={sizeConfig.icon}
              className={`
                ${state === 'processing' ? 'animate-spin' : ''}
                ${state === 'recording' ? 'text-red-400' : ''}
              `}
              style={{
                color: state === 'recording' ? '#F87171' : primaryColor,
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Recording indicator */}
        {state === 'recording' && (
          <motion.div
            className="absolute top-2 right-2 w-3 h-3 rounded-full bg-red-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* State label */}
      <motion.div
        className="absolute -bottom-8 text-xs text-slate-400 font-medium"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={state}
      >
        {state === 'idle' && 'Tap to start'}
        {state === 'playing' && 'Playing...'}
        {state === 'recording' && 'Listening...'}
        {state === 'processing' && 'Processing...'}
      </motion.div>
    </div>
  );
};

export default UnifiedButton;
