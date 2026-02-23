/**
 * NavigationFooter - Agent Navigation Component
 * @version 1.0.0
 * @date 2026-01-25
 *
 * Footer navigation showing available agents.
 * HIDDEN until first interaction is complete.
 * Listens to EventBus 'footer:show' event.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { useEventBus } from '@/core/EventBus';
import type { AgentConfig } from '@/core/types';

interface NavigationFooterProps {
  /** List of available agents */
  agents: AgentConfig[];
  /** Whether to force visibility (override hide behavior) */
  forceVisible?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const NavigationFooter: React.FC<NavigationFooterProps> = ({
  agents,
  forceVisible = false,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(forceVisible);
  const navigate = useNavigate();
  const location = useLocation();

  // Get current agent from URL
  const currentSlug = location.pathname.split('/').pop() || 'home';

  // Listen for footer:show event
  useEventBus('footer:show', () => {
    setIsVisible(true);
  });

  // Also show on navigation change
  useEventBus('navigation:change', () => {
    setIsVisible(true);
  });

  // Update visibility when forceVisible changes
  useEffect(() => {
    if (forceVisible) {
      setIsVisible(true);
    }
  }, [forceVisible]);

  // Filter active agents only
  const activeAgents = agents.filter(agent => agent.isActive !== false);

  const handleAgentClick = (agent: AgentConfig) => {
    if (agent.slug !== currentSlug) {
      navigate(`/pwa/${agent.slug}`);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && activeAgents.length > 1 && (
        <motion.footer
          className={`
            fixed bottom-0 left-0 right-0
            bg-slate-900/95 backdrop-blur-md
            border-t border-slate-800/50
            px-4 py-2 pb-safe
            ${className}
          `}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center justify-around max-w-md mx-auto">
            {activeAgents.map((agent) => {
              const isActive = agent.slug === currentSlug;
              const IconComponent = (LucideIcons as Record<string, React.FC<{ size?: number; color?: string }>>)[agent.icon]
                || LucideIcons.Bot;

              return (
                <motion.button
                  key={agent.slug}
                  onClick={() => handleAgentClick(agent)}
                  className={`
                    flex flex-col items-center gap-1 p-2 rounded-xl
                    transition-colors duration-200
                    ${isActive ? 'bg-slate-800/80' : 'hover:bg-slate-800/40'}
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={agent.displayName}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <motion.div
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: isActive ? `${agent.color}20` : 'transparent',
                    }}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                    }}
                  >
                    <IconComponent
                      size={24}
                      color={isActive ? agent.color : '#94A3B8'}
                    />
                  </motion.div>
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: isActive ? agent.color : '#94A3B8',
                    }}
                  >
                    {agent.displayName}
                  </span>

                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 w-1 h-1 rounded-full"
                      style={{ backgroundColor: agent.color }}
                      layoutId="activeIndicator"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.footer>
      )}
    </AnimatePresence>
  );
};

export default NavigationFooter;
