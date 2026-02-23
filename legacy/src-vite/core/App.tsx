/**
 * Core App Shell for Agent Platform
 * @version 1.0.0
 * @date 2026-01-25
 *
 * Minimal shell that provides:
 * - Base styling and theme
 * - Safari audio unlock component
 * - Agent router
 */

import React from 'react';
import { AgentRouter } from './Router';
import { SafariAudioUnlock } from '@/components/pwa/SafariAudioUnlock';

export const CoreApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Safari/iOS Audio Unlock */}
      <SafariAudioUnlock />

      {/* Agent Router */}
      <AgentRouter />
    </div>
  );
};

export default CoreApp;
