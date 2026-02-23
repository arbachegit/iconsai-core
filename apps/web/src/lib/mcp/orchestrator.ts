/**
 * MCP Orchestrator - Routes queries to appropriate agents and tools
 * @version 1.0.0
 * @date 2026-01-26
 *
 * Responsibilities:
 * 1. Classify user intent
 * 2. Route to appropriate agent
 * 3. Execute tool and get data
 * 4. Generate response with LLM
 * 5. Emit progress events for UI
 */

import type {
  MCPServerConfig,
  MCPTool,
  ExecutionContext,
  ClassifiedIntent,
  OrchestratorResult,
  ExecutionStage,
  ProgressEvent,
  ToolHandler,
} from './types';
import { classify, findAgentForIntent, findToolForIntent } from './classifier';

// ============================================
// ORCHESTRATOR CLASS
// ============================================

export class MCPOrchestrator {
  private agents: Map<string, MCPServerConfig> = new Map();
  private handlers: Map<string, ToolHandler> = new Map();
  private progressCallback?: (event: ProgressEvent) => void;

  /**
   * Register an agent with its configuration
   */
  registerAgent(config: MCPServerConfig, handlers: Record<string, ToolHandler>): void {
    this.agents.set(config.name, config);

    // Register handlers for this agent's tools
    for (const tool of config.tools) {
      const handlerKey = `${config.name}:${tool.name}`;
      const handler = handlers[tool.name];
      if (handler) {
        this.handlers.set(handlerKey, handler);
      }
    }

    console.log(`[MCPOrchestrator] Registered agent: ${config.name} with ${config.tools.length} tools`);
  }

  /**
   * Set callback for progress events
   */
  onProgress(callback: (event: ProgressEvent) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Emit progress event
   */
  private emitProgress(stage: ProgressEvent['stage'], progress: number, message?: string): void {
    this.progressCallback?.({
      stage,
      progress,
      message,
    });
  }

  /**
   * Get all registered agents
   */
  getAgents(): MCPServerConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): MCPServerConfig | undefined {
    return this.agents.get(name);
  }

  /**
   * Execute a query through the orchestration pipeline
   */
  async execute(
    query: string,
    context: Omit<ExecutionContext, 'query'>
  ): Promise<OrchestratorResult> {
    const startTime = performance.now();
    const stages: ExecutionStage[] = [];
    const fullContext: ExecutionContext = { ...context, query };

    try {
      // Stage 1: Classify intent
      this.emitProgress('classifying', 10, 'Analisando pergunta...');
      const classifyStart = performance.now();

      const intent = await classify(query);
      fullContext.intent = intent;

      stages.push({
        name: 'classify',
        status: 'completed',
        startMs: classifyStart,
        endMs: performance.now(),
        durationMs: performance.now() - classifyStart,
        metadata: { intent: intent.type, confidence: intent.confidence },
      });

      // Stage 2: Route to agent
      this.emitProgress('routing', 20, 'Selecionando especialista...');
      const routeStart = performance.now();

      const agents = this.getAgents().filter((a) => a.isActive !== false);
      const agent = findAgentForIntent(intent, agents);

      if (!agent) {
        throw new Error('No agent available for this query');
      }

      const toolMatch = findToolForIntent(intent, agent);
      if (!toolMatch) {
        throw new Error(`No tool available in agent ${agent.name}`);
      }

      const tool = agent.tools.find((t) => t.name === toolMatch.tool);
      if (!tool) {
        throw new Error(`Tool ${toolMatch.tool} not found`);
      }

      intent.suggestedAgent = agent.name;
      intent.suggestedTool = tool.name;

      stages.push({
        name: 'route',
        status: 'completed',
        startMs: routeStart,
        endMs: performance.now(),
        durationMs: performance.now() - routeStart,
        metadata: { agent: agent.name, tool: tool.name },
      });

      // Stage 3: Execute tool
      this.emitProgress('fetching', 40, `Buscando dados...`);
      const executeStart = performance.now();

      const handlerKey = `${agent.name}:${tool.name}`;
      const handler = this.handlers.get(handlerKey);

      let toolData: unknown = null;
      if (handler) {
        try {
          toolData = await handler(intent.entities, fullContext);
        } catch (toolError) {
          console.error(`[MCPOrchestrator] Tool execution failed:`, toolError);
          // Continue with null data - LLM will handle
        }
      }

      stages.push({
        name: 'execute',
        status: toolData ? 'completed' : 'failed',
        startMs: executeStart,
        endMs: performance.now(),
        durationMs: performance.now() - executeStart,
        metadata: { hasData: !!toolData },
      });

      // Stage 4: Generate response
      this.emitProgress('generating', 70, 'Preparando resposta...');
      const generateStart = performance.now();

      const systemPrompt = agent.prompts.find((p) => p.name === 'system');
      const response = await this.generateResponse(query, toolData, systemPrompt?.template, agent);

      stages.push({
        name: 'generate',
        status: 'completed',
        startMs: generateStart,
        endMs: performance.now(),
        durationMs: performance.now() - generateStart,
      });

      // Stage 5: TTS (optional, handled by caller)
      this.emitProgress('speaking', 90, 'Convertendo para áudio...');

      const totalMs = performance.now() - startTime;

      return {
        success: true,
        response,
        source: tool.source || 'llm',
        agent: agent.name,
        tool: tool.name,
        totalMs,
        stages,
        data: toolData,
      };
    } catch (error) {
      const totalMs = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('[MCPOrchestrator] Execution failed:', error);

      // Try fallback
      const fallbackResult = await this.executeFallback(query, fullContext);
      if (fallbackResult) {
        return {
          ...fallbackResult,
          totalMs,
          stages,
        };
      }

      return {
        success: false,
        response: 'Desculpe, não consegui processar sua solicitação.',
        source: 'fallback',
        agent: 'none',
        tool: 'none',
        totalMs,
        stages,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute fallback when primary route fails
   */
  private async executeFallback(
    query: string,
    context: ExecutionContext
  ): Promise<Partial<OrchestratorResult> | null> {
    // Find an agent with fallback enabled
    const agents = this.getAgents();
    const fallbackAgent = agents.find((a) => a.fallback?.enabled);

    if (!fallbackAgent) {
      return null;
    }

    try {
      const response = await this.generateResponse(
        query,
        null,
        fallbackAgent.prompts.find((p) => p.name === 'system')?.template,
        fallbackAgent
      );

      return {
        success: true,
        response,
        source: 'fallback',
        agent: fallbackAgent.name,
        tool: 'fallback',
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate response using LLM
   */
  private async generateResponse(
    query: string,
    data: unknown,
    systemPrompt?: string,
    agent?: MCPServerConfig
  ): Promise<string> {
    // TODO: Integrate with actual LLM service
    // For now, return a formatted response based on data

    if (!data) {
      return `Não encontrei dados específicos para sua pergunta. Por favor, tente reformular.`;
    }

    // Simple response formatting
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      if (typeof item === 'object') {
        const keys = Object.keys(item);
        const summary = keys
          .slice(0, 5)
          .map((k) => `${k}: ${(item as Record<string, unknown>)[k]}`)
          .join(', ');
        return `Encontrei: ${summary}`;
      }
    }

    if (typeof data === 'object') {
      return `Dados encontrados: ${JSON.stringify(data, null, 2)}`;
    }

    return String(data);
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let orchestratorInstance: MCPOrchestrator | null = null;

export function getOrchestrator(): MCPOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new MCPOrchestrator();
  }
  return orchestratorInstance;
}

export function resetOrchestrator(): void {
  orchestratorInstance = null;
}

// ============================================
// REACT HOOK
// ============================================

import { useState, useCallback, useRef } from 'react';
import type { ProgressEvent as ProgressEventType } from './types';

interface UseOrchestratorOptions {
  deviceId: string;
  sessionId: string;
}

interface UseOrchestratorReturn {
  execute: (query: string) => Promise<OrchestratorResult>;
  isProcessing: boolean;
  progress: number;
  stage: ProgressEventType['stage'] | null;
  lastResult: OrchestratorResult | null;
}

export function useOrchestrator(options: UseOrchestratorOptions): UseOrchestratorReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<ProgressEventType['stage'] | null>(null);
  const [lastResult, setLastResult] = useState<OrchestratorResult | null>(null);
  const orchestratorRef = useRef(getOrchestrator());

  const execute = useCallback(
    async (query: string): Promise<OrchestratorResult> => {
      setIsProcessing(true);
      setProgress(0);
      setStage(null);

      orchestratorRef.current.onProgress((event) => {
        setProgress(event.progress);
        setStage(event.stage);
      });

      try {
        const result = await orchestratorRef.current.execute(query, {
          deviceId: options.deviceId,
          sessionId: options.sessionId,
          agentName: 'home', // Will be determined by orchestrator
        });

        setLastResult(result);
        setProgress(100);
        return result;
      } finally {
        setIsProcessing(false);
      }
    },
    [options.deviceId, options.sessionId]
  );

  return {
    execute,
    isProcessing,
    progress,
    stage,
    lastResult,
  };
}

export default MCPOrchestrator;
