import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface RegionalContext {
  ufSigla: string;
  ufName: string;
  researchName: string;
  researchId: string;
  trend: 'up' | 'down' | 'stable';
  lastValue: number | null;
  lastDate: string | null;
  recordCount: number;
  // Raw data for chart generation (limited to avoid payload bloat)
  data?: Array<{ date: string; value: number }>;
}

export interface ChartContext {
  // Identification
  indicatorId: string;
  indicatorName: string;
  indicatorCode: string;
  
  // Type and period
  chartType: 'line' | 'bar' | 'area';
  frequency: string | null;
  unit: string | null;
  periodStart: string;
  periodEnd: string;
  totalRecords: number;
  
  // Raw data for chart generation (limited to avoid payload bloat)
  data: Array<{ date: string; value: number }>;
  
  // Basic statistics
  statistics: {
    mean: number;
    stdDev: number;
    cv: number;
    min: number;
    max: number;
    trend: 'up' | 'down' | 'stable';
    slope: number;
    r2: number;
  } | null;
  
  // STS Result (Structural Time Series)
  stsResult: {
    mu_smoothed: number;
    beta_smoothed: number;
    direction: string;
    strength: string;
    forecast: {
      mean: number;
      p05: number;
      p95: number;
    };
  } | null;
}

// History item for comparison support
export interface ContextHistoryItem {
  id: string;
  type: 'chart' | 'regional';
  timestamp: Date;
  label: string;
  context: ChartContext | RegionalContext;
}

export interface DashboardAnalyticsContextType {
  // Current state
  activeTab: string;
  chartContext: ChartContext | null;
  selectedUF: string | null;
  regionalContext: RegionalContext | null;
  
  // History for comparisons
  contextHistory: ContextHistoryItem[];
  
  // Setters
  setActiveTab: (tab: string) => void;
  setChartContext: (ctx: ChartContext | null) => void;
  setSelectedUF: (uf: string | null) => void;
  setRegionalContext: (ctx: RegionalContext | null) => void;
  
  // History management
  addToHistory: (item: Omit<ContextHistoryItem, 'id' | 'timestamp'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  
  // Context prompt generator
  buildContextualSystemPrompt: () => string;
  // Contextual suggestions generator
  buildContextualSuggestions: () => string[];
  hasContext: boolean;
}

const DashboardAnalyticsContext = createContext<DashboardAnalyticsContextType | null>(null);

interface DashboardAnalyticsProviderProps {
  children: ReactNode;
}

const MAX_HISTORY_ITEMS = 10;

export function DashboardAnalyticsProvider({ children }: DashboardAnalyticsProviderProps) {
  const [activeTab, setActiveTab] = useState<string>("indicators");
  const [chartContext, setChartContext] = useState<ChartContext | null>(null);
  const [selectedUF, setSelectedUF] = useState<string | null>(null);
  const [regionalContext, setRegionalContext] = useState<RegionalContext | null>(null);
  const [contextHistory, setContextHistory] = useState<ContextHistoryItem[]>([]);

  const hasContext = !!chartContext || !!regionalContext;

  // History management functions
  const addToHistory = useCallback((item: Omit<ContextHistoryItem, 'id' | 'timestamp'>) => {
    setContextHistory(prev => {
      // Check if this item is already in history (by label)
      const exists = prev.some(h => h.label === item.label);
      if (exists) return prev;
      
      const newItem: ContextHistoryItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };
      
      // Add to beginning, limit to MAX_HISTORY_ITEMS
      const updated = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
      return updated;
    });
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setContextHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setContextHistory([]);
  }, []);

  const buildContextualSystemPrompt = useCallback((): string => {
    let prompt = "";
    
    // Include history section if there are multiple items for comparison
    if (contextHistory.length > 1) {
      prompt += `## HISTÓRICO DE ANÁLISES (para comparações)\n\n`;
      prompt += `Você tem acesso aos seguintes contextos anteriores que o usuário analisou:\n`;
      
      contextHistory.slice(0, 5).forEach((item, idx) => {
        if (item.type === 'regional') {
          const ctx = item.context as RegionalContext;
          prompt += `\n### ${idx + 1}. ${item.label}\n`;
          prompt += `- Tipo: Regional\n`;
          prompt += `- Estado: ${ctx.ufName} (${ctx.ufSigla})\n`;
          prompt += `- Pesquisa: ${ctx.researchName}\n`;
          if (ctx.lastValue) prompt += `- Último valor: ${ctx.lastValue.toLocaleString('pt-BR')}\n`;
          if (ctx.data && ctx.data.length > 0) {
            prompt += `- Dados disponíveis: ${ctx.data.length} registros\n`;
          }
        } else {
          const ctx = item.context as ChartContext;
          prompt += `\n### ${idx + 1}. ${item.label}\n`;
          prompt += `- Tipo: Indicador Nacional\n`;
          prompt += `- Indicador: ${ctx.indicatorName}\n`;
          prompt += `- Período: ${ctx.periodStart} a ${ctx.periodEnd}\n`;
          if (ctx.statistics) {
            prompt += `- Média: ${ctx.statistics.mean.toFixed(2)}\n`;
            prompt += `- Tendência: ${ctx.statistics.trend}\n`;
          }
        }
      });
      
      prompt += `\n---\n\n`;
    }
    
    // Regional context takes priority if exists (more specific)
    if (regionalContext) {
      const trendEmoji = regionalContext.trend === 'up' ? '📈' : 
                         regionalContext.trend === 'down' ? '📉' : '➡️';
      const trendLabel = regionalContext.trend === 'up' ? 'Alta' : 
                         regionalContext.trend === 'down' ? 'Baixa' : 'Estável';
      
      prompt += `## CONTEXTO ATUAL - ANÁLISE REGIONAL

Você está auxiliando um analista que está visualizando dados regionais:
**Estado:** ${regionalContext.ufName} (${regionalContext.ufSigla})
**Pesquisa:** ${regionalContext.researchName}
**Registros disponíveis:** ${regionalContext.recordCount}`;

      if (regionalContext.lastValue !== null) {
        prompt += `\n**Último Valor:** ${regionalContext.lastValue.toLocaleString('pt-BR')}`;
      }
      if (regionalContext.lastDate) {
        prompt += `\n**Data mais recente:** ${regionalContext.lastDate}`;
      }
      prompt += `\n**Tendência:** ${trendEmoji} ${trendLabel}`;

      // Include raw data for chart generation
      if (regionalContext.data && regionalContext.data.length > 0) {
        prompt += `

### DADOS DISPONÍVEIS PARA GRÁFICO:
Você TEM acesso aos dados abaixo. Use-os diretamente para gerar gráficos quando solicitado.
\`\`\`json
${JSON.stringify(regionalContext.data, null, 2)}
\`\`\``;
      }

      prompt += `

## INSTRUÇÕES
Responda perguntas sobre este estado e indicador regional.
${contextHistory.length > 1 ? 'Você pode comparar com os indicadores anteriores do histórico quando solicitado.' : ''}
Relacione com economia brasileira e contexto regional quando relevante.
Considere diferenças socioeconômicas entre regiões do Brasil.
IMPORTANTE: Você TEM os dados disponíveis acima. Quando o usuário pedir gráficos, USE esses dados diretamente.
Seja preciso e objetivo nas respostas.`;

      return prompt;
    }

    if (!chartContext) return prompt;

    const { statistics, stsResult, data } = chartContext;
    
    prompt += `## CONTEXTO ATUAL

Você está auxiliando um analista que está visualizando:
**Indicador:** ${chartContext.indicatorName} (${chartContext.indicatorCode})
**Tipo de Gráfico:** ${chartContext.chartType === 'line' ? 'Linha' : chartContext.chartType === 'bar' ? 'Barras' : 'Área'}
**Período:** ${chartContext.periodStart} a ${chartContext.periodEnd} (${chartContext.totalRecords} registros)
**Frequência:** ${chartContext.frequency || 'N/A'}
**Unidade:** ${chartContext.unit || 'N/A'}`;

    if (statistics) {
      const trendEmoji = statistics.trend === 'up' ? '📈' : statistics.trend === 'down' ? '📉' : '➡️';
      const trendLabel = statistics.trend === 'up' ? 'Alta' : statistics.trend === 'down' ? 'Baixa' : 'Estável';
      
      prompt += `

### Estatísticas:
- **Média:** ${statistics.mean.toFixed(2)}
- **Desvio Padrão:** ${statistics.stdDev.toFixed(2)}
- **Coef. Variação:** ${statistics.cv.toFixed(1)}%
- **Mínimo:** ${statistics.min.toFixed(2)}
- **Máximo:** ${statistics.max.toFixed(2)}
- **Tendência:** ${trendEmoji} ${trendLabel} (slope: ${statistics.slope > 0 ? '+' : ''}${statistics.slope.toFixed(4)}/período)
- **R²:** ${(statistics.r2 * 100).toFixed(1)}%`;
    }

    if (stsResult) {
      prompt += `

### Análise STS (Structural Time Series):
- **Nível atual (μ):** ${stsResult.mu_smoothed.toFixed(2)}
- **Inclinação (β):** ${stsResult.beta_smoothed > 0 ? '+' : ''}${stsResult.beta_smoothed.toFixed(4)}/período
- **Direção:** ${stsResult.direction}
- **Intensidade:** ${stsResult.strength}
- **Previsão próximo período:** ${stsResult.forecast.mean.toFixed(2)} (IC 95%: ${stsResult.forecast.p05.toFixed(2)} - ${stsResult.forecast.p95.toFixed(2)})`;
    }

    // Include raw data for chart generation
    if (data && data.length > 0) {
      prompt += `

### DADOS DISPONÍVEIS PARA GRÁFICO:
Você TEM acesso aos dados abaixo. Use-os diretamente para gerar gráficos quando solicitado.
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\``;
    }

    if (selectedUF) {
      prompt += `

### Contexto Regional:
- **Estado selecionado:** ${selectedUF}`;
    }

    prompt += `

## INSTRUÇÕES
Responda perguntas sobre este indicador com base nos dados acima.
${contextHistory.length > 1 ? 'Você pode comparar com os indicadores anteriores do histórico quando solicitado.' : ''}
Relacione com economia brasileira, política monetária e contexto regional quando relevante.
Use os dados estatísticos e de tendência para fundamentar suas análises.
IMPORTANTE: Você TEM os dados disponíveis acima. Quando o usuário pedir gráficos, USE esses dados diretamente.
Seja preciso e objetivo nas respostas.`;

    return prompt;
  }, [chartContext, regionalContext, selectedUF, contextHistory]);

  // Build contextual suggestions based on active context
  const buildContextualSuggestions = useCallback((): string[] => {
    const suggestions: string[] = [];
    
    // Add comparison suggestions if multiple items in history
    if (contextHistory.length >= 2) {
      const labels = contextHistory.slice(0, 2).map(h => h.label);
      suggestions.push(`🔄 Comparar ${labels[0]} com ${labels[1]}`);
    }
    
    if (regionalContext) {
      suggestions.push(
        `📊 Gerar gráfico de ${regionalContext.researchName}`,
        `📈 Analisar tendência de ${regionalContext.ufSigla}`,
      );
      if (contextHistory.length < 2) {
        suggestions.push(`🔍 Comparar com outros estados`);
      }
    } else if (chartContext) {
      suggestions.push(
        `📊 Gerar gráfico de ${chartContext.indicatorName}`,
        `📈 Analisar tendência temporal`,
      );
      if (contextHistory.length < 2) {
        suggestions.push(`🔍 Estatísticas detalhadas`);
      }
    }
    
    // Add summary suggestion if many items
    if (contextHistory.length >= 3) {
      suggestions.push(`📋 Resumo de todas as análises`);
    }
    
    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }, [regionalContext, chartContext, contextHistory]);

  const value: DashboardAnalyticsContextType = {
    activeTab,
    chartContext,
    selectedUF,
    regionalContext,
    contextHistory,
    setActiveTab,
    setChartContext,
    setSelectedUF,
    setRegionalContext,
    addToHistory,
    removeFromHistory,
    clearHistory,
    buildContextualSystemPrompt,
    buildContextualSuggestions,
    hasContext,
  };

  return (
    <DashboardAnalyticsContext.Provider value={value}>
      {children}
    </DashboardAnalyticsContext.Provider>
  );
}

export function useDashboardAnalytics(): DashboardAnalyticsContextType {
  const context = useContext(DashboardAnalyticsContext);
  if (!context) {
    throw new Error("useDashboardAnalytics must be used within a DashboardAnalyticsProvider");
  }
  return context;
}

// Safe hook that returns null when not in provider (for AgentChat)
export function useDashboardAnalyticsSafe(): DashboardAnalyticsContextType | null {
  return useContext(DashboardAnalyticsContext);
}
