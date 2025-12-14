import { useState, useMemo, useCallback } from "react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Database,
  Loader2,
  BarChart3,
  LineChartIcon,
  AreaChartIcon,
  Info,
  RefreshCw,
  DollarSign,
  Percent,
  Hash,
  Activity,
  X,
} from "lucide-react";
import { format } from "date-fns";
import {
  linearRegression,
  standardDeviation,
  mean,
  movingAverage,
  detectTrend,
  coefficientOfVariation,
} from "@/lib/statistics-utils";

interface Indicator {
  id: string;
  name: string;
  code: string;
  unit: string | null;
  category: string | null;
  api_id: string | null;
  api?: { id: string; name: string; provider: string | null } | null;
}

interface IndicatorValue {
  indicator_id: string;
  reference_date: string;
  value: number;
}

type ChartType = "line" | "bar" | "area";

const CHART_ICONS: Record<ChartType, React.ReactNode> = {
  line: <LineChartIcon className="h-4 w-4" />,
  bar: <BarChart3 className="h-4 w-4" />,
  area: <AreaChartIcon className="h-4 w-4" />,
};

// Category groups for organization
const CATEGORY_GROUPS = {
  financial: {
    title: 'Indicadores Financeiros Globais',
    icon: TrendingUp,
    codes: ['IPCA', 'IPCA_BCB', 'SELIC', 'SELIC_IPEADATA', 'SELIC_OVER', 'CDI', 'DOLAR', 'DOLAR_PTAX_COMPRA', 'PIB', 'NY.GDP.PCAP.PP.CD', '4099', 'POP_RESIDENTE']
  },
  pmc: {
    title: 'PMC - Pesquisa Mensal do Comércio',
    icon: BarChart3,
    codes: ['PMC', 'PMC_COMB', 'PMC_FARM', 'PMC_MOV', 'PMC_VEST', 'PMC_CONST', 'PMC_VEIC', 'PMC_COMBUSTIVEIS_UF', 'PMC_FARMACIA_UF', 'PMC_MOVEIS_UF', 'PMC_VESTUARIO_UF', 'PMC_CONSTRUCAO_UF', 'PMC_VEICULOS_UF', 'PMC_VAREJO_UF']
  },
  pac: {
    title: 'PAC - Pesquisa Anual do Comércio',
    icon: DollarSign,
    codes: ['PAC_TOTAL_RB_UF', 'PAC_VAREJO_RB_UF', 'PAC_ATACADO_RB_UF', 'PAC_VEICULOS_RB_UF', 'PAC_HIPER_RB_UF', 'PAC_COMBUSTIVEIS_RB_UF', 'PAC_ALIMENTOS_RB_UF', 'PAC_TECIDOS_RB_UF', 'PAC_INFORMATICA_RB_UF']
  }
};

// Format unit for display
function formatUnit(unit: string | null): { label: string; icon: React.ReactNode } {
  if (!unit) return { label: 'N/A', icon: <Hash className="h-3 w-3" /> };
  const u = unit.toLowerCase();
  // BRL e valores em Reais
  if (u.includes('r$') || u.includes('mil') || u.includes('reais') || u === 'brl') {
    return { label: 'R$', icon: <DollarSign className="h-3 w-3" /> };
  }
  // Dólar/USD
  if (u.includes('us$') || u.includes('usd') || u.includes('dólar') || u.includes('dollar')) {
    return { label: '$', icon: <DollarSign className="h-3 w-3" /> };
  }
  if (u.includes('%')) {
    return { label: '%', icon: <Percent className="h-3 w-3" /> };
  }
  if (u.includes('índice') || u.includes('base') || u.includes('index')) {
    return { label: 'Índice', icon: <Activity className="h-3 w-3" /> };
  }
  if (u.includes('pessoas') || u.includes('quantidade') || u.includes('pop')) {
    return { label: 'Qtd', icon: <Hash className="h-3 w-3" /> };
  }
  return { label: unit.substring(0, 6), icon: <Hash className="h-3 w-3" /> };
}

// Format large values with optional unit display
function formatValue(value: number, unit: string | null, includeUnit: boolean = false): string {
  const u = (unit || '').toLowerCase();
  const isIndex = u.includes('índice') || u.includes('base') || u.includes('index');
  
  // Valores em Reais (incluindo BRL)
  if (u.includes('r$') || u.includes('mil') || u.includes('reais') || u === 'brl') {
    let formatted = '';
    if (value >= 1e12) formatted = `${(value / 1e12).toFixed(1)} tri`;
    else if (value >= 1e9) formatted = `${(value / 1e9).toFixed(1)} bi`;
    else if (value >= 1e6) formatted = `${(value / 1e6).toFixed(1)} mi`;
    else if (value >= 1e3) formatted = `${(value / 1e3).toFixed(1)} mil`;
    else formatted = value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    return includeUnit && !isIndex ? `R$ ${formatted}` : formatted;
  }
  
  const formatted = value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  
  if (includeUnit && !isIndex) {
    if (u.includes('%')) return `${formatted}%`;
    if (u.includes('us$') || u.includes('usd') || u.includes('dólar') || u.includes('dollar')) return `R$ ${formatted}`;
  }
  
  return formatted;
}

// Format value for statistics display (with unit formatting like TableDatabaseTab)
function formatStatValue(value: number, unit: string | null): string {
  const u = (unit || '').toLowerCase();
  
  // Percentual: 2 casas decimais + símbolo %
  if (u.includes('%')) {
    return `${value.toFixed(2)}%`;
  }
  
  // Real/BRL: formato moeda
  if (u.includes('r$') || u.includes('mil') || u.includes('reais') || u === 'brl') {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  // Dólar/USD: formato moeda USD
  if (u.includes('us$') || u.includes('usd') || u.includes('dólar') || u.includes('dollar')) {
    return `$ ${value.toFixed(2)}`;
  }
  
  // Índice ou padrão: 2 casas decimais
  return value.toFixed(2);
}

export function ChartDatabaseTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [chartType, setChartType] = useState<ChartType>("line");
  const [showMovingAvg, setShowMovingAvg] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<{ count: number; date: Date } | null>(null);

  // Fetch indicators with API linkage
  const { data: indicators = [], isLoading: loadingIndicators, refetch: refetchIndicators } = useQuery({
    queryKey: ["indicators-chart-db"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economic_indicators")
        .select("id, name, code, unit, category, api_id, system_api_registry(id, name, provider)")
        .not('api_id', 'is', null)
        .order("name");
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        api: item.system_api_registry || null,
      })) as Indicator[];
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  // Fetch all indicator values (paginated to bypass 1000 row limit)
  const { data: allValues = [], isLoading: loadingValues, refetch: refetchValues } = useQuery({
    queryKey: ["indicator-values-chart-db"],
    queryFn: async () => {
      const allData: IndicatorValue[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("indicator_values")
          .select("indicator_id, reference_date, value")
          .order("reference_date")
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...(data as IndicatorValue[]));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  // Fetch regional values for PAC indicators
  const { data: regionalValues = [] } = useQuery({
    queryKey: ["regional-values-chart-db"],
    queryFn: async () => {
      const allData: IndicatorValue[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("indicator_regional_values")
          .select("indicator_id, reference_date, value")
          .order("reference_date")
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...(data as IndicatorValue[]));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchIndicators(), refetchValues()]);
      setLastUpdate({ count: allValues.length + regionalValues.length, date: new Date() });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Combined values (national + regional)
  const combinedValues = useMemo(() => {
    return [...allValues, ...regionalValues];
  }, [allValues, regionalValues]);

  // Get stats for each indicator
  const indicatorStats = useMemo(() => {
    const stats: Record<string, { count: number; min: string; max: string; lastValue: number }> = {};
    combinedValues.forEach((v) => {
      if (!stats[v.indicator_id]) {
        stats[v.indicator_id] = {
          count: 0,
          min: v.reference_date,
          max: v.reference_date,
          lastValue: v.value,
        };
      }
      stats[v.indicator_id].count++;
      if (v.reference_date < stats[v.indicator_id].min) {
        stats[v.indicator_id].min = v.reference_date;
      }
      if (v.reference_date > stats[v.indicator_id].max) {
        stats[v.indicator_id].max = v.reference_date;
        stats[v.indicator_id].lastValue = v.value;
      }
    });
    return stats;
  }, [combinedValues]);

  // Filter indicators by search and only show those with data
  const filteredIndicators = useMemo(() => {
    let filtered = indicators.filter(i => indicatorStats[i.id]?.count > 0);
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          (i.category && i.category.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [indicators, searchQuery, indicatorStats]);

  // Group indicators by category
  const groupedIndicators = useMemo(() => {
    const groups: Record<string, Indicator[]> = {};
    
    Object.entries(CATEGORY_GROUPS).forEach(([key, group]) => {
      const groupItems = filteredIndicators.filter(i => group.codes.includes(i.code));
      if (groupItems.length > 0) {
        groups[key] = groupItems;
      }
    });
    
    // Add "Outros" group for uncategorized indicators
    const categorizedCodes = Object.values(CATEGORY_GROUPS).flatMap(g => g.codes);
    const uncategorized = filteredIndicators.filter(i => !categorizedCodes.includes(i.code));
    if (uncategorized.length > 0) {
      groups['outros'] = uncategorized;
    }
    
    return groups;
  }, [filteredIndicators]);

  // Get data for selected indicator
  const selectedData = useMemo(() => {
    if (!selectedIndicator) return [];
    return combinedValues
      .filter((v) => v.indicator_id === selectedIndicator.id)
      .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
      .map((v) => ({
        date: format(new Date(v.reference_date), "MM/yyyy"),
        value: v.value,
        rawDate: v.reference_date,
      }));
  }, [selectedIndicator, combinedValues]);

  // Calculate statistics for selected indicator
  const statistics = useMemo(() => {
    if (selectedData.length === 0) return null;

    const values = selectedData.map((d) => d.value);
    const x = values.map((_, i) => i);
    const regression = linearRegression(x, values);
    const trend = detectTrend(regression.slope);
    const stdDev = standardDeviation(values);
    const avg = mean(values);
    const cv = coefficientOfVariation(values);
    const movAvg = movingAverage(values, 3);

    const trendLineData = selectedData.map((d, i) => ({
      ...d,
      trendLine: regression.slope * i + regression.intercept,
      movingAvg: movAvg[i - 2] || null,
    }));

    return {
      mean: avg,
      stdDev,
      cv,
      min: Math.min(...values),
      max: Math.max(...values),
      trend,
      slope: regression.slope,
      r2: regression.r2,
      trendLineData,
    };
  }, [selectedData]);

  // Generate suggestions based on statistics
  const suggestions = useMemo(() => {
    if (!statistics) return [];
    const result: string[] = [];

    if (statistics.cv > 30) {
      result.push("📊 Alta variabilidade detectada. Considere analisar períodos específicos ou fatores externos.");
    }
    if (statistics.r2 > 0.7) {
      result.push("📈 Tendência clara identificada (R² > 70%). Considere projeções futuras.");
    }
    if (statistics.trend === "down" && statistics.slope < -0.1) {
      result.push("⚠️ Tendência de queda significativa. Investigue causas e compare com indicadores correlacionados.");
    }
    if (statistics.trend === "up" && statistics.slope > 0.1) {
      result.push("✅ Tendência de crescimento sustentado. Analise se é compatível com expectativas do mercado.");
    }
    if (statistics.stdDev > statistics.mean * 0.5) {
      result.push("🔄 Desvio padrão alto relativo à média. Verifique sazonalidade ou eventos atípicos.");
    }

    return result;
  }, [statistics]);

  if (loadingIndicators || loadingValues) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render indicator card
  const renderIndicatorCard = (indicator: Indicator) => {
    const stats = indicatorStats[indicator.id];
    if (!stats) return null;
    
    const unitInfo = formatUnit(indicator.unit);
    const minDate = format(new Date(stats.min), "MM/yy");
    const maxDate = format(new Date(stats.max), "MM/yy");
    const u = (indicator.unit || '').toLowerCase();
    const isIndex = u.includes('índice') || u.includes('base') || u.includes('index');

    return (
      <Card
        key={indicator.id}
        className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
        onClick={() => setSelectedIndicator(indicator)}
      >
        <CardContent className="pt-4 pb-3">
          {/* Provider badge */}
          {indicator.api?.provider && (
            <Badge variant="secondary" className="w-fit mb-2 text-xs">
              {indicator.api.provider}
            </Badge>
          )}
          {/* Horizontal title */}
          <h3 className="font-semibold text-sm mb-3 line-clamp-2 min-h-[40px]">
            {indicator.name}
          </h3>
          
          {/* 2x2 Badge grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Unit badge with label */}
            <div className="flex flex-col items-center justify-center border rounded-md py-1.5 bg-muted/30">
              <span className="text-[9px] text-muted-foreground uppercase">Unidade</span>
              <div className="flex items-center gap-1.5">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-muted-foreground/50">
                  {unitInfo.icon}
                </div>
                <span className="text-xs font-medium">{unitInfo.label}</span>
              </div>
            </div>
            
            {/* Period badge with label */}
            <div className="flex flex-col items-center justify-center border rounded-md py-1.5 bg-muted/30">
              <span className="text-[9px] text-muted-foreground uppercase">Período</span>
              <span className="text-xs font-medium">{minDate} - {maxDate}</span>
            </div>
            
            {/* Records badge with label */}
            <div className="flex flex-col items-center justify-center border rounded-md py-1.5 bg-secondary/50">
              <span className="text-[9px] text-muted-foreground uppercase">Registros</span>
              <div className="flex items-center gap-1">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-muted-foreground/50">
                  <Database className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium">{stats.count.toLocaleString()}</span>
              </div>
            </div>
            
            {/* Last value badge with label and unit */}
            <div className="flex flex-col items-center justify-center border rounded-md py-1.5 bg-primary/10 text-primary">
              <span className="text-[9px] text-muted-foreground uppercase">Último Valor</span>
              <span className="text-xs font-bold">
                {formatValue(stats.lastValue, indicator.unit, !isIndex)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Chart Data Base
          </h2>
          <p className="text-muted-foreground">
            Visualização detalhada e análise estatística de indicadores
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              {lastUpdate.count.toLocaleString()} registros • {lastUpdate.date.toLocaleDateString('pt-BR')} {lastUpdate.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <DebouncedInput
          placeholder="Buscar indicador..."
          value={searchQuery}
          onChange={setSearchQuery}
          delay={300}
          className="pl-9"
        />
      </div>

      {/* Grouped Indicator Cards */}
      <div className="space-y-8">
        {Object.entries(groupedIndicators).map(([key, groupIndicators]) => {
          const group = CATEGORY_GROUPS[key as keyof typeof CATEGORY_GROUPS] || {
            title: 'Outros Indicadores',
            icon: Database
          };
          const GroupIcon = group.icon;

          return (
            <div key={key} className="space-y-4">
              {/* Group header */}
              <div className="flex items-center gap-3 border-b pb-2">
                <GroupIcon className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">{group.title}</h3>
                <Badge variant="outline" className="ml-auto">
                  {groupIndicators.length} indicadores
                </Badge>
              </div>
              
              {/* Cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupIndicators.map(renderIndicatorCard)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedIndicator} onOpenChange={() => setSelectedIndicator(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
          {/* Custom Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{selectedIndicator?.name}</h2>
                  {selectedIndicator?.api?.provider && (
                    <Badge variant="outline">{selectedIndicator.api.provider}</Badge>
                  )}
                  {selectedIndicator?.unit && (
                    <Badge variant="secondary">{selectedIndicator.unit}</Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedData.length} registros
                </span>
              </div>
            </div>
            
            {/* Circular X button with red hover */}
            <button
              onClick={() => setSelectedIndicator(null)}
              className="h-10 w-10 rounded-full border border-cyan-500/50 flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {selectedIndicator && statistics && (
            <div className="p-6 space-y-6">
              {/* Chart Type Selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Tipo de Gráfico:</span>
                <div className="flex gap-2">
                  {(["line", "bar", "area"] as ChartType[]).map((type) => (
                    <Button
                      key={type}
                      variant={chartType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChartType(type)}
                      className="gap-2"
                    >
                      {CHART_ICONS[type]}
                      {type === "line" ? "Linha" : type === "bar" ? "Barras" : "Área"}
                    </Button>
                  ))}
                </div>
                <Button
                  variant={showMovingAvg ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowMovingAvg(!showMovingAvg)}
                >
                  Média Móvel
                </Button>
              </div>

              {/* Chart */}
              <Card>
                <CardContent className="pt-4">
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === "line" ? (
                        <LineChart data={statistics.trendLineData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="value"
                            name="Valor"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="trendLine"
                            name="Tendência"
                            stroke="hsl(var(--destructive))"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                          />
                          {showMovingAvg && (
                            <Line
                              type="monotone"
                              dataKey="movingAvg"
                              name="Média Móvel (3)"
                              stroke="#22c55e"
                              strokeWidth={1.5}
                              dot={false}
                            />
                          )}
                          <ReferenceLine y={statistics.mean} stroke="#888" strokeDasharray="3 3" />
                        </LineChart>
                      ) : chartType === "bar" ? (
                        <BarChart data={statistics.trendLineData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                          <Bar dataKey="value" name="Valor" fill="hsl(var(--primary))" />
                          <ReferenceLine y={statistics.mean} stroke="#888" strokeDasharray="3 3" />
                        </BarChart>
                      ) : (
                        <AreaChart data={statistics.trendLineData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="value"
                            name="Valor"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.3}
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                          />
                          <ReferenceLine y={statistics.mean} stroke="#888" strokeDasharray="3 3" />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Panel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Média</p>
                    <p className="text-xl font-bold">{formatStatValue(statistics.mean, selectedIndicator?.unit)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Desvio Padrão</p>
                    <p className="text-xl font-bold">{formatStatValue(statistics.stdDev, selectedIndicator?.unit)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Coef. Variação</p>
                    <p className="text-xl font-bold">{statistics.cv.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Tendência</p>
                    <div className="flex items-center justify-center gap-1">
                      {statistics.trend === "up" && <TrendingUp className="h-5 w-5 text-green-500" />}
                      {statistics.trend === "down" && <TrendingDown className="h-5 w-5 text-red-500" />}
                      {statistics.trend === "stable" && <Minus className="h-5 w-5 text-gray-500" />}
                      <span className="font-bold">
                        {statistics.trend === "up" ? "Alta" : statistics.trend === "down" ? "Baixa" : "Estável"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Análise de Tendência</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Mínimo:</span>
                      <span className="ml-2 font-medium">{formatStatValue(statistics.min, selectedIndicator?.unit)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Máximo:</span>
                      <span className="ml-2 font-medium">{formatStatValue(statistics.max, selectedIndicator?.unit)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Coef. Angular:</span>
                      <span className={`ml-2 font-medium ${statistics.slope > 0 ? "text-green-500" : statistics.slope < 0 ? "text-red-500" : ""}`}>
                        {statistics.slope.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">R²:</span>
                      <span className="ml-2 font-medium">{(statistics.r2 * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      Sugestões de Análise
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {suggestions.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChartDatabaseTab;
