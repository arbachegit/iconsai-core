/**
 * Agents Configuration
 * @version 1.0.0
 * @date 2026-01-25
 *
 * Registry of all available agents in the PWA Voice Platform.
 * New agents are registered here and automatically available in routing.
 */

import type { AgentConfig } from '@/core/types';

/**
 * List of all registered agents
 */
export const AGENTS: AgentConfig[] = [
  {
    name: 'home',
    slug: 'home',
    displayName: 'IconsAI',
    icon: 'Home',
    color: '#00D4FF',
    edgeFunctionName: 'pwa-home-agent',
    isActive: true,
    sortOrder: 0,
  },
  // Future agents can be added here:
  // {
  //   name: 'fiscal',
  //   slug: 'fiscal',
  //   displayName: 'Fiscal',
  //   icon: 'FileText',
  //   color: '#10B981',
  //   edgeFunctionName: 'pwa-fiscal-agent',
  //   isActive: true,
  //   sortOrder: 1,
  // },
];

/**
 * Get agent by slug
 */
export function getAgentBySlug(slug: string): AgentConfig | undefined {
  return AGENTS.find(agent => agent.slug === slug);
}

/**
 * Get agent by name
 */
export function getAgentByName(name: string): AgentConfig | undefined {
  return AGENTS.find(agent => agent.name === name);
}

/**
 * Get all active agents
 */
export function getActiveAgents(): AgentConfig[] {
  return AGENTS.filter(agent => agent.isActive !== false).sort((a, b) =>
    (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
}

/**
 * Get default agent (first active agent)
 */
export function getDefaultAgent(): AgentConfig {
  const active = getActiveAgents();
  return active[0] || AGENTS[0];
}

/**
 * Check if agent exists
 */
export function agentExists(slug: string): boolean {
  return AGENTS.some(agent => agent.slug === slug);
}

export default AGENTS;
