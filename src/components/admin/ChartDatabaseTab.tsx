import { useState, useMemo, useCallback } from "react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export function ChartDatabaseTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [chartType, setChartType] = useState<ChartType>("line");
  const [showMovingAvg, setShowMovingAvg] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<{ count: number; date: Date } | null>(null);

  // Fetch indicators
  const { data: indicators = [], isLoading: loadingIndicators, refetch: refetchIndicators } = useQuery({
    queryKey: ["indicators-chart-db"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economic_indicators")
        .select("id, name, code, unit, category")
        .order("name");
      if (error) throw error;
      return data as Indicator[];
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchIndicators(), refetchValues()]);
      setLastUpdate({ count: allValues.length, date: new Date() });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get stats for each indicator
  const indicatorStats = useMemo(() => {
    const stats: Record<string, { count: number; min: string; max: string; lastValue: number }> = {};
    allValues.forEach((v) => {
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
  }, [allValues]);

  // Filter indicators by search
  const filteredIndicators = useMemo(() => {
    if (!searchQuery.trim()) return indicators;
    const q = searchQuery.toLowerCase();
    return indicators.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        (i.category && i.category.toLowerCase().includes(q))
    );
  }, [indicators, searchQuery]);

  // Get data for selected indicator
  const selectedData = useMemo(() => {
    if (!selectedIndicator) return [];
    return allValues
      .filter((v) => v.indicator_id === selectedIndicator.id)
      .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
      .map((v) => ({
        date: format(new Date(v.reference_date), "MM/yyyy"),
        value: v.value,
        rawDate: v.reference_date,
      }));
  }, [selectedIndicator, allValues]);

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

    // Add trend line data
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

      {/* Indicator Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredIndicators.map((indicator) => {
          const stats = indicatorStats[indicator.id];
          return (
            <Card
              key={indicator.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
              onClick={() => setSelectedIndicator(indicator)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm line-clamp-2">{indicator.name}</h3>
                  <Badge variant="outline" className="text-xs shrink-0 ml-2">
                    {indicator.code}
                  </Badge>
                </div>
                {stats ? (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Registros:</span>
                      <span className="font-medium">{stats.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Período:</span>
                      <span>
                        {format(new Date(stats.min), "MM/yy")} - {format(new Date(stats.max), "MM/yy")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Último valor:</span>
                      <span className="font-medium">
                        {stats.lastValue.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                        {indicator.unit ? ` ${indicator.unit}` : ""}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem dados</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedIndicator} onOpenChange={() => setSelectedIndicator(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {selectedIndicator?.name}
              {selectedIndicator?.unit && (
                <Badge variant="secondary">{selectedIndicator.unit}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedIndicator && statistics && (
            <div className="space-y-6">
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
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="trendLine"
                            name="Tendência"
                            stroke="#ef4444"
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
                          <Bar dataKey="value" name="Valor" fill="#3b82f6" />
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
                            fill="#3b82f6"
                            fillOpacity={0.3}
                            stroke="#3b82f6"
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
                    <p className="text-xl font-bold">{statistics.mean.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Desvio Padrão</p>
                    <p className="text-xl font-bold">{statistics.stdDev.toFixed(2)}</p>
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
                      <span className="ml-2 font-medium">{statistics.min.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Máximo:</span>
                      <span className="ml-2 font-medium">{statistics.max.toFixed(2)}</span>
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
