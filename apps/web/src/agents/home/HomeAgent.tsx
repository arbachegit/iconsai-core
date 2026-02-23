/**
 * HomeAgent - Main Home Agent Component (VoiceService-Powered)
 * @version 3.0.0
 * @date 2026-01-27
 *
 * Primary voice interface for IconsAI PWA.
 * Now uses VoiceService for modular, explicit-control voice interaction.
 *
 * Interaction cycle (with explicit user control):
 * idle -> [click play] -> playing (welcome) -> [audio ends] -> ready
 * ready -> [click mic] -> recording -> [click stop] -> processing
 * processing -> [response ready] -> playing -> [audio ends] -> ready
 *
 * Key change: User explicitly clicks mic to start recording!
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentProps, SpectrumMode } from '@/core/types';
import type { ProcessingStage } from '@/lib/mcp/types';
import { EventBus } from '@/core/EventBus';
import { SpectrumAnalyzer } from '@/core/components/SpectrumAnalyzer';
import { ModuleHeader } from '@/core/components/ModuleHeader';
import { VoiceButton } from '@/core/components/VoiceButton';
import { useVoiceService } from '@/core/services/VoiceService';
import { useSession } from '@/core/services/SessionService';
import { useAgentConfig } from '@/core/hooks/useAgentConfig';
import { warmupAudioSync } from '@/utils/audio-warmup';
import { getOrchestrator } from '@/lib/mcp/orchestrator';
import { HOME_MCP_CONFIG } from './mcp-config';
import { homeHandlers } from './handlers';
import { HOME_WELCOME_MESSAGE } from './config';

// Register agent on module load
const orchestrator = getOrchestrator();
orchestrator.registerAgent(HOME_MCP_CONFIG, homeHandlers);

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

  const stageLabels: Record<ProcessingStage, string> = {
    classifying: 'Analisando',
    routing: 'Roteando',
    fetching: 'Buscando',
    generating: 'Gerando',
    speaking: 'Preparando áudio',
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <span className="text-slate-400 text-xs">
        {stage ? stageLabels[stage] : 'Processando'}
      </span>
      <span className="text-slate-500 text-xs font-mono">
        {seconds.toFixed(1)}s
      </span>
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

export const HomeAgent: React.FC<AgentProps> = ({
  deviceId,
  sessionId,
  config,
}) => {
  // Session management
  const session = useSession({
    deviceId,
    moduleSlug: config.slug,
    autoInit: true,
  });

  // Fetch agent configuration from database (with fallback to hardcoded)
  const agentConfig = useAgentConfig({
    slug: config.slug,
    deviceId,
  });

  // Determine welcome message based on session state
  const welcomeMessage = (() => {
    // If user is returning from a different module, show personalized message
    if (session.isReturningFromDifferentModule && session.lastModule) {
      const returningMsg = agentConfig.config?.welcome_message_returning;
      if (returningMsg) {
        return returningMsg.replace('{module}', session.lastModule);
      }
      return `Bem-vindo de volta! Você estava no módulo ${session.lastModule}. Como posso ajudar agora?`;
    }
    // Otherwise use standard welcome message
    return agentConfig.config?.welcome_message || HOME_WELCOME_MESSAGE.text;
  })();

  // Use VoiceService hook
  const voice = useVoiceService({
    agentName: config.name,
    agentSlug: config.slug,
    welcomeMessage,
    primaryColor: config.color,
    deviceId,
    sessionId,
  });

  // Processing state for progress display
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<ProcessingStage | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [hasFirstInteraction, setHasFirstInteraction] = useState(false);

  // Set up orchestrator progress callback
  useEffect(() => {
    orchestrator.onProgress((event) => {
      setProcessingProgress(event.progress);
      setProcessingStage(event.stage);
    });
  }, []);

  // Show footer after first interaction
  useEffect(() => {
    if (voice.lastResponse && !hasFirstInteraction) {
      setHasFirstInteraction(true);
      EventBus.emit('footer:show');
    }
  }, [voice.lastResponse, hasFirstInteraction]);

  // Convert voice state to spectrum mode
  const getSpectrumMode = (): SpectrumMode => {
    switch (voice.state) {
      case 'playing':
        return 'playing';
      case 'recording':
        return 'recording';
      default:
        return 'idle';
    }
  };

  // Handler for play button (idle state)
  const handlePlay = useCallback(() => {
    warmupAudioSync();
    voice.playWelcome();
  }, [voice]);

  // Handler for record button (ready state)
  const handleRecord = useCallback(() => {
    voice.startRecording();
  }, [voice]);

  // Handler for stop button (playing or recording state)
  const handleStop = useCallback(() => {
    if (voice.isPlaying) {
      voice.stop();
    } else if (voice.isRecording) {
      voice.stopRecording();
    }
  }, [voice]);

  // Handle history button click
  const handleHistoryClick = useCallback(() => {
    setShowHistory(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <ModuleHeader
        config={config}
        onHistoryClick={handleHistoryClick}
        hasHistory={!!voice.lastResponse}
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
            frequencyData={voice.frequencyData}
            primaryColor={config.color}
            secondaryColor="#8B5CF6"
            barCount={24}
            width={160}
            height={80}
          />
        </motion.div>

        {/* Processing Progress */}
        <AnimatePresence>
          {voice.isProcessing && (
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

        {/* Voice Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
        >
          <VoiceButton
            state={voice.state}
            onPlay={handlePlay}
            onRecord={handleRecord}
            onStop={handleStop}
            progress={voice.progress}
            primaryColor={config.color}
            disabled={false}
          />
        </motion.div>

        {/* Recording Duration */}
        <AnimatePresence>
          {voice.isRecording && voice.recordingDuration > 0 && (
            <motion.div
              className="mt-4 text-slate-400 text-sm font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {voice.recordingDuration}s
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {voice.error && (
            <motion.div
              className="mt-8 px-4 py-2 rounded-lg bg-red-900/50 border border-red-500/50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <p className="text-red-300 text-sm">{voice.error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last Response Preview */}
        <AnimatePresence>
          {voice.lastResponse && voice.isIdle && (
            <motion.div
              className="mt-8 max-w-xs text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-slate-400 text-sm line-clamp-2">
                {voice.lastResponse}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default HomeAgent;
