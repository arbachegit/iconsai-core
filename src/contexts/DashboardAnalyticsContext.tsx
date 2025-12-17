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

export interface DashboardAnalyticsContextType {
  // Current state
  activeTab: string;
  chartContext: ChartContext | null;
  selectedUF: string | null;
  regionalContext: RegionalContext | null;
  
  // Setters
  setActiveTab: (tab: string) => void;
  setChartContext: (ctx: ChartContext | null) => void;
  setSelectedUF: (uf: string | null) => void;
  setRegionalContext: (ctx: RegionalContext | null) => void;
  
  // Context prompt generator
  buildContextualSystemPrompt: () => string;
  hasContext: boolean;
}

const DashboardAnalyticsContext = createContext<DashboardAnalyticsContextType | null>(null);

interface DashboardAnalyticsProviderProps {
  children: ReactNode;
}

export function DashboardAnalyticsProvider({ children }: DashboardAnalyticsProviderProps) {
  const [activeTab, setActiveTab] = useState<string>("indicators");
  const [chartContext, setChartContext] = useState<ChartContext | null>(null);
  const [selectedUF, setSelectedUF] = useState<string | null>(null);
  const [regionalContext, setRegionalContext] = useState<RegionalContext | null>(null);

  const hasContext = !!chartContext || !!regionalContext;

  const buildContextualSystemPrompt = useCallback((): string => {
    // Regional context takes priority if exists (more specific)
    if (regionalContext) {
      const trendEmoji = regionalContext.trend === 'up' ? '📈' : 
                         regionalContext.trend === 'down' ? '📉' : '➡️';
      const trendLabel = regionalContext.trend === 'up' ? 'Alta' : 
                         regionalContext.trend === 'down' ? 'Baixa' : 'Estável';
      
      let prompt = `## CONTEXTO DO DASHBOARD - ANÁLISE REGIONAL

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
      prompt += `\n**Tendência:** ${trendEmoji} ${trendLabel}

## INSTRUÇÕES
Responda perguntas sobre este estado e indicador regional.
Relacione com economia brasileira e contexto regional quando relevante.
Considere diferenças socioeconômicas entre regiões do Brasil.
Seja preciso e objetivo nas respostas.`;

      return prompt;
    }

    if (!chartContext) return "";

    const { statistics, stsResult } = chartContext;
    
    let prompt = `## CONTEXTO DO DASHBOARD

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

    if (selectedUF) {
      prompt += `

### Contexto Regional:
- **Estado selecionado:** ${selectedUF}`;
    }

    prompt += `

## INSTRUÇÕES
Responda perguntas sobre este indicador com base nos dados acima.
Relacione com economia brasileira, política monetária e contexto regional quando relevante.
Use os dados estatísticos e de tendência para fundamentar suas análises.
Seja preciso e objetivo nas respostas.`;

    return prompt;
  }, [chartContext, regionalContext, selectedUF]);

  const value: DashboardAnalyticsContextType = {
    activeTab,
    chartContext,
    selectedUF,
    regionalContext,
    setActiveTab,
    setChartContext,
    setSelectedUF,
    setRegionalContext,
    buildContextualSystemPrompt,
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
