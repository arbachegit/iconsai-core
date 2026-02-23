/**
 * Template Agent Export
 * @version 1.0.0
 *
 * INSTRUCTIONS:
 * 1. Rename exports from 'Template' to your agent name
 * 2. Update file imports accordingly
 */

// Main component (default export for lazy loading)
export { AgentTemplate as default } from './AgentTemplate';
export { AgentTemplate } from './AgentTemplate';

// Configuration
export { TEMPLATE_AGENT_CONFIG, TEMPLATE_SETTINGS } from './config';
export { TEMPLATE_MCP_CONFIG } from './mcp-config';

// Hooks
export { useTemplateConversation } from './hooks/useTemplateConversation';

// Handlers (MCP Tools)
export { templateHandlers } from './handlers';
