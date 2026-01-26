/**
 * Home Agent Export
 * @version 2.0.0
 * @date 2026-01-26
 */

// Main component
export { HomeAgent as default } from './HomeAgent';
export { HomeAgent } from './HomeAgent';

// Configuration
export { HOME_AGENT_CONFIG } from './config';
export { HOME_MCP_CONFIG } from './mcp-config';

// Hooks
export { useHomeConversation } from './hooks/useHomeConversation';

// Handlers (MCP Tools)
export { homeHandlers } from './handlers';

// Services
export * from './services/homeAgentService';
