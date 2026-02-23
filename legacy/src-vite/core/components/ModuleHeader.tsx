/**
 * ModuleHeader - Agent Header Component
 * @version 1.0.0
 * @date 2026-01-25
 *
 * Displays agent icon, name, and history button.
 * Clean, minimal design for the voice platform.
 */

import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { HistoryButton } from './HistoryButton';
import type { AgentConfig } from '@/core/types';

interface ModuleHeaderProps {
  /** Agent configuration */
  config: AgentConfig;
  /** Handler for history button click */
  onHistoryClick?: () => void;
  /** Whether there are conversations in history */
  hasHistory?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  config,
  onHistoryClick,
  hasHistory = false,
  className = '',
}) => {
  // Get icon component from Lucide
  const IconComponent = (LucideIcons as Record<string, React.FC<{ size?: number; color?: string }>>)[config.icon]
    || LucideIcons.Bot;

  return (
    <motion.header
      className={`
        w-full px-4 py-3 flex items-center justify-between
        bg-slate-900/50 backdrop-blur-sm border-b border-slate-800/50
        ${className}
      `}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Left spacer for alignment */}
      <div className="w-10" />

      {/* Center: Icon + Agent Name */}
      <div className="flex items-center gap-2">
        <motion.div
          className="p-1.5 rounded-lg"
          style={{ backgroundColor: `${config.color}20` }}
          whileHover={{ scale: 1.05 }}
        >
          <IconComponent size={20} color={config.color} />
        </motion.div>
        <span
          className="text-lg font-semibold"
          style={{ color: config.color }}
        >
          {config.displayName}
        </span>
      </div>

      {/* Right: History Button */}
      <HistoryButton
        onClick={onHistoryClick}
        hasHistory={hasHistory}
        color={config.color}
      />
    </motion.header>
  );
};

export default ModuleHeader;
