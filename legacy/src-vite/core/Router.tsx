/**
 * Agent Router - Dynamic Agent Loading
 * @version 1.0.0
 * @date 2026-01-25
 *
 * Handles routing to /pwa/:agentName with dynamic agent loading.
 * Agents are lazy-loaded for optimal bundle size.
 */

import React, { Suspense, lazy, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { getAgentBySlug, getDefaultAgent, getActiveAgents } from '@/config/agents.config';
import { NavigationFooter } from '@/core/components/NavigationFooter';
import { EventBus } from '@/core/EventBus';
import type { AgentConfig, AgentProps } from '@/core/types';
import { getDeviceFingerprint } from '@/lib/security-shield';
import { v4 as uuidv4 } from 'uuid';

// Agent module registry - lazy load each agent
const agentModules: Record<string, React.LazyExoticComponent<React.FC<AgentProps>>> = {
  home: lazy(() => import('@/agents/home')),
  // Add new agents here:
  // fiscal: lazy(() => import('@/agents/fiscal')),
};

// Loading fallback
const AgentLoader: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <Loader2 size={48} className="text-cyan-400" />
    </motion.div>
    <motion.p
      className="mt-4 text-slate-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      Loading agent...
    </motion.p>
  </div>
);

// Error fallback for unknown agents
const AgentNotFound: React.FC<{ slug: string }> = ({ slug }) => {
  const navigate = useNavigate();
  const defaultAgent = getDefaultAgent();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(`/pwa/${defaultAgent.slug}`, { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate, defaultAgent.slug]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-6xl mb-4"
      >
        🤖
      </motion.div>
      <h1 className="text-xl font-semibold mb-2">Agent Not Found</h1>
      <p className="text-slate-400 text-center mb-4">
        The agent "{slug}" doesn't exist or is not available.
      </p>
      <p className="text-slate-500 text-sm">
        Redirecting to {defaultAgent.displayName}...
      </p>
    </div>
  );
};

/**
 * Main Router Component
 */
export const AgentRouter: React.FC = () => {
  const { agentName } = useParams<{ agentName: string }>();
  const navigate = useNavigate();
  const [sessionId] = useState(() => uuidv4());
  const [deviceId, setDeviceId] = useState<string>('');

  // Get device ID on mount
  useEffect(() => {
    const id = getDeviceFingerprint();
    setDeviceId(id);
  }, []);

  // Get agent config
  const agentConfig = useMemo(() => {
    if (!agentName) return getDefaultAgent();
    return getAgentBySlug(agentName);
  }, [agentName]);

  // Redirect to default agent if no agent specified
  useEffect(() => {
    if (!agentName) {
      const defaultAgent = getDefaultAgent();
      navigate(`/pwa/${defaultAgent.slug}`, { replace: true });
    }
  }, [agentName, navigate]);

  // Emit navigation change event
  useEffect(() => {
    if (agentConfig) {
      EventBus.emit('navigation:change', { agentName: agentConfig.name });
    }
  }, [agentConfig]);

  // Get active agents for footer
  const activeAgents = useMemo(() => getActiveAgents(), []);

  // If no agent config found, show not found
  if (!agentConfig && agentName) {
    return <AgentNotFound slug={agentName} />;
  }

  // If still loading device ID
  if (!deviceId || !agentConfig) {
    return <AgentLoader />;
  }

  // Get the agent component
  const AgentComponent = agentModules[agentConfig.name];

  // If agent module doesn't exist
  if (!AgentComponent) {
    return <AgentNotFound slug={agentConfig.slug} />;
  }

  const agentProps: AgentProps = {
    deviceId,
    sessionId,
    config: agentConfig,
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Suspense fallback={<AgentLoader />}>
        <AgentComponent {...agentProps} />
      </Suspense>

      {/* Navigation Footer - hidden until first interaction */}
      <NavigationFooter agents={activeAgents} />
    </div>
  );
};

export default AgentRouter;
