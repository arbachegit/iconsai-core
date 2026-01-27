/**
 * VoiceButton - Voice Interaction Button with Explicit Control
 * @version 1.0.0
 * @date 2026-01-27
 *
 * Button component for VoiceService with 5 states:
 * - idle: Play icon (start conversation)
 * - playing: Stop icon (audio playing)
 * - ready: Mic icon (waiting for user to start recording) <-- NEW!
 * - recording: Stop icon (recording, red pulse)
 * - processing: Spinner (processing request)
 *
 * Key difference from UnifiedButton: 'ready' state gives user
 * explicit control over when to start recording.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Mic, Square, Loader2 } from 'lucide-react';
import type { VoiceServiceState } from '@/core/services/VoiceService/types';

interface VoiceButtonProps {
  /** Current button state */
  state: VoiceServiceState;
  /** Handler for play action (idle state) */
  onPlay: () => void;
  /** Handler for start recording (ready state) */
  onRecord: () => void;
  /** Handler for stop action (playing or recording) */
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

export const VoiceButton: React.FC<VoiceButtonProps> = ({
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
      case 'ready':
        return Mic;
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
      case 'ready':
        onRecord();
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
          iconColor: primaryColor,
        };
      case 'playing':
        return {
          bg: 'bg-slate-800/80',
          border: primaryColor,
          glow: `${primaryColor}60`,
          iconColor: primaryColor,
        };
      case 'ready':
        // Ready state: Mic highlighted, ready to record
        return {
          bg: 'bg-slate-800/80',
          border: '#10B981', // Green to indicate ready
          glow: '#10B98160',
          iconColor: '#10B981',
        };
      case 'recording':
        return {
          bg: 'bg-red-900/80',
          border: '#EF4444',
          glow: '#EF444460',
          iconColor: '#F87171',
        };
      case 'processing':
        return {
          bg: 'bg-slate-800/80',
          border: '#F59E0B',
          glow: '#F59E0B40',
          iconColor: '#F59E0B',
        };
      default:
        return {
          bg: 'bg-slate-800/80',
          border: primaryColor,
          glow: `${primaryColor}40`,
          iconColor: primaryColor,
        };
    }
  };

  const colors = getColors();

  // Calculate progress ring circumference
  const circumference = 2 * Math.PI * (sizeConfig.ring / 2 - 4);
  const strokeDashoffset = circumference - (progress * circumference);

  // Get state label
  const getStateLabel = () => {
    switch (state) {
      case 'idle':
        return 'Tap to start';
      case 'playing':
        return 'Playing...';
      case 'ready':
        return 'Tap to speak';
      case 'recording':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      default:
        return '';
    }
  };

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

      {/* Ready state pulse (green glow) */}
      {state === 'ready' && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: sizeConfig.button + 20,
            height: sizeConfig.button + 20,
            backgroundColor: '#10B98120',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.6, 0.3, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
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
          state === 'ready' ? 'Start recording' :
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
              className={state === 'processing' ? 'animate-spin' : ''}
              style={{ color: colors.iconColor }}
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
        className="absolute -bottom-8 text-xs font-medium"
        style={{
          color: state === 'ready' ? '#10B981' : '#94A3B8',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={state}
      >
        {getStateLabel()}
      </motion.div>
    </div>
  );
};

export default VoiceButton;
