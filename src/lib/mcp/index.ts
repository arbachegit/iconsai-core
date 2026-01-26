/**
 * MCP Module - Model Context Protocol Inspired Architecture
 * @version 2.0.0
 * @date 2026-01-26
 *
 * Multi-database architecture:
 * - brasil-data-hub: Geographic/demographic data
 * - fiscal-municipal: Fiscal system data
 */

// Types
export type {
  JSONSchema,
  JSONSchemaProperty,
  MCPTool,
  ToolHandler,
  ToolResult,
  MCPResource,
  MCPPrompt,
  MCPPromptArgument,
  MCPServerConfig,
  ExecutionContext,
  ConversationMessage,
  IntentType,
  ClassifiedIntent,
  RouteResult,
  OrchestratorResult,
  ExecutionStage,
  ProcessingStage,
  ProgressEvent,
} from './types';

// Classifier
export {
  classify,
  classifyFast,
  findAgentForIntent,
  findToolForIntent,
} from './classifier';

// Orchestrator
export {
  MCPOrchestrator,
  getOrchestrator,
  resetOrchestrator,
  useOrchestrator,
} from './orchestrator';

// Database Client (Multi-DB MCP)
export {
  mcpDatabaseClient,
  initializeMCPDatabases,
  getBrasilDataHubClient,
  getFiscalMunicipalClient,
  // Population data
  fetchPopMunicipio,
  fetchPopulacaoHistorico,
  fetchIndicadoresDemograficos,
  // Geographic data
  fetchGeoMunicipio,
  fetchMunicipioCompleto,
  fetchMunicipiosPorRegiao,
  fetchCapitais,
  // State data
  fetchEstado,
  // Config
  DATABASE_CONFIGS,
  // Types
  type DatabaseConfig,
  type PopMunicipioData,
  type MunicipioResumo,
  type GeoMunicipioData,
  type MunicipioCompleto,
} from './database-client';
