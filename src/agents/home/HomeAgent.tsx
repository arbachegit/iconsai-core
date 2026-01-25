/**
 * HomeAgent - Main Home Agent Component
 * @version 1.0.0
 * @date 2026-01-25
 *
 * Primary voice interface for IconsAI PWA.
 * Implements the unified button interaction cycle:
 * idle -> playing (welcome) -> recording -> processing -> playing (response) -> recording...
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { AgentProps, UnifiedButtonState, SpectrumMode } from '@/core/types';
import { EventBus } from '@/core/EventBus';
import { useAudioEngine } from '@/core/AudioEngine';
import { UnifiedButton } from '@/core/components/UnifiedButton';
import { SpectrumAnalyzer } from '@/core/components/SpectrumAnalyzer';
import { ModuleHeader } from '@/core/components/ModuleHeader';
import { useHomeConversation } from './hooks/useHomeConversation';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { warmupAudioSync } from '@/utils/audio-warmup';

export const HomeAgent: React.FC<AgentProps> = ({
  deviceId,
  sessionId,
  config,
}) => {
  // Button state
  const [buttonState, setButtonState] = useState<UnifiedButtonState>('idle');
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Refs
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedWelcome = useRef(false);

  // Conversation hook
  const {
    messages,
    isProcessing,
    error,
    sendAudioMessage,
    getWelcomeAudio,
    setFirstInteractionComplete,
    isFirstInteractionComplete,
  } = useHomeConversation({
    deviceId,
    sessionId,
    agentName: config.name,
  });

  // Audio engine
  const audioEngine = useAudioEngine({
    onEnded: () => {
      // When audio ends, start recording
      if (buttonState === 'playing') {
        startRecordingMode();
      }
    },
    onFrequencyData: (data) => {
      if (buttonState === 'playing') {
        setFrequencyData(data);
      }
    },
  });

  // Audio recorder
  const {
    state: recorderState,
    audioBase64,
    startRecording,
    stopRecording,
    reset: resetRecorder,
  } = useAudioRecorder({
    onFrequencyData: (data) => {
      if (buttonState === 'recording') {
        setFrequencyData(data);
      }
    },
  });

  // Convert button state to spectrum mode
  const getSpectrumMode = (): SpectrumMode => {
    switch (buttonState) {
      case 'playing':
        return 'playing';
      case 'recording':
        return 'recording';
      default:
        return 'idle';
    }
  };

  // Start recording mode
  const startRecordingMode = useCallback(() => {
    setButtonState('recording');
    setFrequencyData([]);
    startRecording();

    // Set 60-second timeout
    recordingTimeoutRef.current = setTimeout(() => {
      handleStopRecording();
    }, 60000);
  }, [startRecording]);

  // Handle stop recording
  const handleStopRecording = useCallback(async () => {
    // Clear timeout
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    setButtonState('processing');
    await stopRecording();
  }, [stopRecording]);

  // Process recorded audio when available
  useEffect(() => {
    if (audioBase64 && buttonState === 'processing') {
      processAudio(audioBase64);
    }
  }, [audioBase64, buttonState]);

  // Process audio and get response
  const processAudio = async (base64: string) => {
    const result = await sendAudioMessage(base64);

    if (result.success && result.audioUrl) {
      setButtonState('playing');
      await audioEngine.play(result.audioUrl, config.name);

      // Mark first interaction complete (shows footer)
      if (!isFirstInteractionComplete) {
        setFirstInteractionComplete();
        EventBus.emit('footer:show');
      }
    } else {
      // Error - go back to recording
      console.error('[HomeAgent] Process error:', result.error);
      setButtonState('recording');
      startRecording();
    }

    resetRecorder();
  };

  // Handle play button click
  const handlePlay = useCallback(async () => {
    // Warmup audio on user gesture
    warmupAudioSync();

    if (!hasPlayedWelcome.current) {
      // First time - play welcome
      setButtonState('playing');
      const welcomeUrl = await getWelcomeAudio();

      if (welcomeUrl) {
        await audioEngine.play(welcomeUrl, config.name);
        hasPlayedWelcome.current = true;
      } else {
        // No welcome audio - go straight to recording
        startRecordingMode();
      }
    } else {
      // Already welcomed - go to recording
      startRecordingMode();
    }
  }, [audioEngine, config.name, getWelcomeAudio, startRecordingMode]);

  // Handle stop button click
  const handleStop = useCallback(() => {
    if (buttonState === 'playing') {
      audioEngine.stop();
      setButtonState('idle');
    } else if (buttonState === 'recording') {
      handleStopRecording();
    }
  }, [buttonState, audioEngine, handleStopRecording]);

  // Handle history button click
  const handleHistoryClick = useCallback(() => {
    setShowHistory(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      audioEngine.stop();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <ModuleHeader
        config={config}
        onHistoryClick={handleHistoryClick}
        hasHistory={messages.length > 0}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-24">
        {/* Spectrum Analyzer */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SpectrumAnalyzer
            mode={getSpectrumMode()}
            frequencyData={frequencyData}
            primaryColor={config.color}
            secondaryColor="#8B5CF6"
            barCount={24}
            width={160}
            height={80}
          />
        </motion.div>

        {/* Unified Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
        >
          <UnifiedButton
            state={buttonState}
            onPlay={handlePlay}
            onRecord={startRecordingMode}
            onStop={handleStop}
            progress={audioEngine.progress}
            primaryColor={config.color}
            disabled={isProcessing && buttonState !== 'processing'}
          />
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            className="mt-8 px-4 py-2 rounded-lg bg-red-900/50 border border-red-500/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-red-300 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Last Response Preview */}
        {messages.length > 0 && buttonState === 'idle' && (
          <motion.div
            className="mt-8 max-w-xs text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-slate-400 text-sm line-clamp-2">
              {messages[messages.length - 1]?.content}
            </p>
          </motion.div>
        )}
      </main>

      {/* History Modal would go here */}
      {/* TODO: Implement ConversationHistory component */}
    </div>
  );
};

export default HomeAgent;
