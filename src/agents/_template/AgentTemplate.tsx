/**
 * Template Agent - Main Component
 * @version 1.0.0
 *
 * Primary voice interface for Template Agent.
 *
 * INSTRUCTIONS:
 * 1. Rename to [YourAgent].tsx
 * 2. Update all references from 'Template' to your agent name
 * 3. Customize UI and behavior as needed
 *
 * Interaction cycle:
 * idle -> playing (welcome) -> recording -> processing -> playing (response) -> recording...
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentProps, UnifiedButtonState, SpectrumMode } from '@/core/types';
import type { ProcessingStage } from '@/lib/mcp/types';
import { EventBus } from '@/core/EventBus';
import { useAudioEngine } from '@/core/AudioEngine';
import { UnifiedButton } from '@/core/components/UnifiedButton';
import { SpectrumAnalyzer } from '@/core/components/SpectrumAnalyzer';
import { ModuleHeader } from '@/core/components/ModuleHeader';
import { useTemplateConversation } from './hooks/useTemplateConversation';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { warmupAudioSync } from '@/utils/audio-warmup';
import { getOrchestrator } from '@/lib/mcp/orchestrator';
import { TEMPLATE_MCP_CONFIG } from './mcp-config';
import { templateHandlers } from './handlers';
import { TEMPLATE_SETTINGS } from './config';

// Register agent on module load
const orchestrator = getOrchestrator();
orchestrator.registerAgent(TEMPLATE_MCP_CONFIG, templateHandlers);

// ============================================
// PROCESSING TIMER COMPONENT
// ============================================

interface ProcessingTimerProps {
  isActive: boolean;
  stage: ProcessingStage | null;
}

const ProcessingTimer: React.FC<ProcessingTimerProps> = ({ isActive, stage }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setSeconds((s) => s + 0.1);
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  const stageLabel = stage ? TEMPLATE_SETTINGS.stageLabels[stage] : 'Processando';

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <span className="text-slate-400 text-xs">{stageLabel}</span>
      <span className="text-slate-500 text-xs font-mono">{seconds.toFixed(1)}s</span>
    </motion.div>
  );
};

// ============================================
// PROGRESS BAR COMPONENT
// ============================================

interface ProgressBarProps {
  progress: number;
  color: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, color }) => {
  return (
    <div className="w-40 h-1 bg-slate-800 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const AgentTemplate: React.FC<AgentProps> = ({
  deviceId,
  sessionId,
  config,
}) => {
  // Button state
  const [buttonState, setButtonState] = useState<UnifiedButtonState>('idle');
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Processing state
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<ProcessingStage | null>(null);

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
  } = useTemplateConversation({
    deviceId,
    sessionId,
    agentName: config.name,
  });

  // Set up orchestrator progress callback
  useEffect(() => {
    orchestrator.onProgress((event) => {
      setProcessingProgress(event.progress);
      setProcessingStage(event.stage);
    });
  }, []);

  // Audio engine
  const audioEngine = useAudioEngine({
    onEnded: () => {
      if (buttonState === 'playing' && TEMPLATE_SETTINGS.autoStartRecording) {
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
    setProcessingProgress(0);
    setProcessingStage(null);
    startRecording();

    // Set recording timeout
    recordingTimeoutRef.current = setTimeout(() => {
      handleStopRecording();
    }, TEMPLATE_SETTINGS.maxRecordingDuration);
  }, [startRecording]);

  // Handle stop recording
  const handleStopRecording = useCallback(async () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    setButtonState('processing');
    setProcessingProgress(5);
    setProcessingStage('classifying');
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
      setProcessingProgress(100);
      await audioEngine.play(result.audioUrl, config.name);

      // Mark first interaction complete (shows footer)
      if (!isFirstInteractionComplete) {
        setFirstInteractionComplete();
        EventBus.emit('footer:show');
      }
    } else {
      // Error - go back to idle
      console.error('[AgentTemplate] Process error:', result.error);
      setButtonState('idle');
    }

    resetRecorder();
    setProcessingProgress(0);
    setProcessingStage(null);
  };

  // Handle play button click
  const handlePlay = useCallback(async () => {
    warmupAudioSync();

    if (!hasPlayedWelcome.current) {
      setButtonState('playing');
      const welcomeUrl = await getWelcomeAudio();

      if (welcomeUrl) {
        await audioEngine.play(welcomeUrl, config.name);
        hasPlayedWelcome.current = true;
      } else {
        startRecordingMode();
      }
    } else {
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
        onHistoryClick={TEMPLATE_SETTINGS.showHistoryButton ? handleHistoryClick : undefined}
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

        {/* Processing Progress */}
        <AnimatePresence>
          {buttonState === 'processing' && (
            <motion.div
              className="mb-4 flex flex-col items-center gap-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <ProgressBar progress={processingProgress} color={config.color} />
              <ProcessingTimer isActive={true} stage={processingStage} />
            </motion.div>
          )}
        </AnimatePresence>

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
        <AnimatePresence>
          {error && (
            <motion.div
              className="mt-8 px-4 py-2 rounded-lg bg-red-900/50 border border-red-500/50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <p className="text-red-300 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last Response Preview */}
        <AnimatePresence>
          {messages.length > 0 && buttonState === 'idle' && (
            <motion.div
              className="mt-8 max-w-xs text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-slate-400 text-sm line-clamp-2">
                {messages[messages.length - 1]?.content}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AgentTemplate;
