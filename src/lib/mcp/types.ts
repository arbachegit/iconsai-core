/**
 * MCP-Inspired Types for IconsAI Agent Architecture
 * @version 1.0.0
 * @date 2026-01-26
 *
 * Based on Model Context Protocol concepts but simplified for internal use.
 * Each agent is conceptually an MCP Server with Tools, Resources, and Prompts.
 */

// ============================================
// JSON SCHEMA TYPES
// ============================================

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  default?: unknown;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

// ============================================
// TOOL TYPES
// ============================================

/**
 * A Tool is a function that an agent can execute.
 * Similar to MCP Tools but with direct handler reference.
 */
export interface MCPTool {
  /** Unique name of the tool */
  name: string;
  /** Human-readable description */
  description: string;
  /** JSON Schema for input validation */
  inputSchema: JSONSchema;
  /** Path to handler function or inline handler */
  handler: string | ToolHandler;
  /** Data source this tool uses */
  source?: 'sql' | 'rag' | 'api' | 'llm';
  /** Estimated execution time in ms */
  estimatedMs?: number;
  /** Keywords for intent matching */
  keywords?: string[];
}

export type ToolHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: ExecutionContext
) => Promise<TOutput>;

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  source: string;
  executionMs: number;
}

// ============================================
// RESOURCE TYPES
// ============================================

/**
 * A Resource is a data source that an agent can access.
 * Similar to MCP Resources.
 */
export interface MCPResource {
  /** URI identifying the resource (e.g., db://municipios, rag://protocolos) */
  uri: string;
  /** Human-readable name */
  name: string;
  /** Description of what data this resource contains */
  description: string;
  /** MIME type of the resource */
  mimeType?: string;
  /** Whether this resource is read-only */
  readOnly?: boolean;
}

// ============================================
// PROMPT TYPES
// ============================================

/**
 * A Prompt is a template for LLM instructions.
 * Similar to MCP Prompts.
 */
export interface MCPPrompt {
  /** Unique name of the prompt */
  name: string;
  /** Description of when to use this prompt */
  description?: string;
  /** The prompt template (supports {{variable}} syntax) */
  template: string;
  /** Arguments that can be injected into the template */
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  /** Argument name (matches {{name}} in template) */
  name: string;
  /** Description of the argument */
  description?: string;
  /** Whether the argument is required */
  required?: boolean;
  /** Default value if not provided */
  default?: string;
}

// ============================================
// SERVER CONFIG
// ============================================

/**
 * Configuration for an MCP-style agent/server.
 * This is the main configuration object for each agent.
 */
export interface MCPServerConfig {
  /** Unique identifier */
  name: string;
  /** Version following semver */
  version: string;
  /** Human-readable display name */
  displayName: string;
  /** Description of what this agent does */
  description: string;
  /** Lucide icon name */
  icon: string;
  /** Primary color (hex) */
  color: string;
  /** Whether this agent is active */
  isActive?: boolean;
  /** Sort order for navigation */
  sortOrder?: number;

  /** Tools this agent can execute */
  tools: MCPTool[];
  /** Resources this agent can access */
  resources: MCPResource[];
  /** Prompts/templates for this agent */
  prompts: MCPPrompt[];

  /** Fallback configuration */
  fallback?: {
    /** Enable fallback to general LLM */
    enabled: boolean;
    /** Preferred LLM provider */
    provider?: 'gemini' | 'openai' | 'anthropic';
    /** Specific model to use */
    model?: string;
  };

  /** Domains this agent handles (for routing) */
  domains?: string[];
  /** Keywords that trigger this agent */
  keywords?: string[];
}

// ============================================
// EXECUTION CONTEXT
// ============================================

export interface ExecutionContext {
  /** Device fingerprint */
  deviceId: string;
  /** Session ID */
  sessionId: string;
  /** Agent name */
  agentName: string;
  /** User's original query */
  query: string;
  /** Classified intent */
  intent?: ClassifiedIntent;
  /** Conversation history */
  history?: ConversationMessage[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// ============================================
// INTENT CLASSIFICATION
// ============================================

export type IntentType =
  | 'fiscal'
  | 'localizacao'
  | 'saude'
  | 'protocolo'
  | 'populacao'
  | 'educacao'
  | 'atualidades'
  | 'geral';

export interface ClassifiedIntent {
  /** Primary intent type */
  type: IntentType;
  /** Confidence score (0-1) */
  confidence: number;
  /** Extracted entities */
  entities: Record<string, string | number>;
  /** Suggested data source */
  suggestedSource: 'sql' | 'rag' | 'api' | 'llm';
  /** Suggested agent */
  suggestedAgent?: string;
  /** Suggested tool */
  suggestedTool?: string;
  /** Classification method used */
  method: 'pattern' | 'llm' | 'hybrid';
}

// ============================================
// ORCHESTRATOR TYPES
// ============================================

export interface RouteResult {
  /** Selected agent config */
  agent: MCPServerConfig;
  /** Selected tool */
  tool: MCPTool;
  /** Classification result */
  intent: ClassifiedIntent;
}

export interface OrchestratorResult {
  /** Whether execution was successful */
  success: boolean;
  /** Response text */
  response: string;
  /** Audio URL if TTS was performed */
  audioUrl?: string;
  /** Source of the data */
  source: 'sql' | 'rag' | 'api' | 'llm' | 'fallback';
  /** Agent that handled the request */
  agent: string;
  /** Tool that was executed */
  tool: string;
  /** Total execution time in ms */
  totalMs: number;
  /** Breakdown of execution stages */
  stages: ExecutionStage[];
  /** Raw data from tool execution */
  data?: unknown;
  /** Error message if failed */
  error?: string;
}

export interface ExecutionStage {
  name: 'classify' | 'route' | 'execute' | 'generate' | 'tts';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startMs: number;
  endMs?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

// ============================================
// PROGRESS EVENTS (for UI)
// ============================================

export type ProcessingStage =
  | 'classifying'
  | 'routing'
  | 'fetching'
  | 'generating'
  | 'speaking';

export interface ProgressEvent {
  stage: ProcessingStage;
  progress: number; // 0-100
  message?: string;
  metadata?: Record<string, unknown>;
}
