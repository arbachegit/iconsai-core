/**
 * HistoryButton - Conversation History Access
 * @version 1.0.0
 * @date 2026-01-25
 *
 * Button to access conversation history.
 * Shows indicator when there are conversations.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';

interface HistoryButtonProps {
  /** Click handler */
  onClick?: () => void;
  /** Whether there are conversations in history */
  hasHistory?: boolean;
  /** Button color (hex) */
  color?: string;
  /** Additional CSS classes */
  className?: string;
}

export const HistoryButton: React.FC<HistoryButtonProps> = ({
  onClick,
  hasHistory = false,
  color = '#00D4FF',
  className = '',
}) => {
  return (
    <motion.button
      onClick={onClick}
      className={`
        relative p-2 rounded-lg
        bg-slate-800/50 hover:bg-slate-700/50
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950
        ${className}
      `}
      style={{
        borderColor: `${color}30`,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="View conversation history"
    >
      <History size={20} color={color} />

      {/* Indicator dot when there's history */}
      {hasHistory && (
        <motion.div
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  );
};

export default HistoryButton;
