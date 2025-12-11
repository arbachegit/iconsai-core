import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Minus, BarChart3, Calculator, Loader2, Info, AlertTriangle, Lightbulb, Activity, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import {
  pearsonCorrelation,
  linearRegression,
  detectTrend,
  getCorrelationStrength,
  generatePairs,
  predictValue,
  standardDeviation,
  mean,
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

const CHART_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export function DataAnalysisTab() {
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([2015, 2025]);
  const [impactIndicator, setImpactIndicator] = useState<string | null>(null);
  const [impactVariation, setImpactVariation] = useState<number>(0);

  // Fetch indicators
  const { data: indicators = [], isLoading: loadingIndicators, refetch: refetchIndicators } = useQuery({
    queryKey: ["indicators-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economic_indicators")
        .select("id, name, code, unit, category")
        .order("name");
      if (error) throw error;
      return data as Indicator[];
    },
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });

  // Fetch all indicator values
  const { data: allValues = [], isLoading: loadingValues, refetch: refetchValues } = useQuery({
    queryKey: ["indicator-values-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("indicator_values")
        .select("indicator_id, reference_date, value")
        .order("reference_date");
      if (error) throw error;
      return data as IndicatorValue[];
    },
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });

  const handleRefresh = () => {
    refetchIndicators();
    refetchValues();
  };

  // Get date range for each indicator
  const indicatorRanges = useMemo(() => {
    const ranges: Record<string, { min: string; max: string; count: number }> = {};
    allValues.forEach((v) => {
      if (!ranges[v.indicator_id]) {
        ranges[v.indicator_id] = { min: v.reference_date, max: v.reference_date, count: 0 };
      }
      if (v.reference_date < ranges[v.indicator_id].min) {
        ranges[v.indicator_id].min = v.reference_date;
      }
      if (v.reference_date > ranges[v.indicator_id].max) {
        ranges[v.indicator_id].max = v.reference_date;
      }
      ranges[v.indicator_id].count++;
    });
    return ranges;
  }, [allValues]);

  // Filter values by selected indicators and year range
  const filteredValues = useMemo(() => {
    return allValues.filter((v) => {
      const year = new Date(v.reference_date).getFullYear();
      return (
        selectedIndicators.includes(v.indicator_id) &&
        year >= yearRange[0] &&
        year <= yearRange[1]
      );
    });
  }, [allValues, selectedIndicators, yearRange]);

  // Prepare chart data (grouped by date)
  const chartData = useMemo(() => {
    const dataMap: Record<string, Record<string, string | number>> = {};
    filteredValues.forEach((v) => {
      const date = v.reference_date.substring(0, 7); // YYYY-MM
      if (!dataMap[date]) dataMap[date] = { date };
      dataMap[date][v.indicator_id] = v.value;
    });
    return Object.values(dataMap).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [filteredValues]);

  // Calculate correlations for selected pairs
  const correlations = useMemo(() => {
    if (selectedIndicators.length < 2) return [];

    const pairs = generatePairs(selectedIndicators);
    return pairs.map(([id1, id2]) => {
      const values1 = filteredValues
        .filter((v) => v.indicator_id === id1)
        .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
        .map((v) => v.value);
      const values2 = filteredValues
        .filter((v) => v.indicator_id === id2)
        .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
        .map((v) => v.value);

      const r = pearsonCorrelation(values1, values2);
      const ind1 = indicators.find((i) => i.id === id1);
      const ind2 = indicators.find((i) => i.id === id2);

      return {
        id1,
        id2,
        name1: ind1?.name || id1,
        name2: ind2?.name || id2,
        correlation: r,
        ...getCorrelationStrength(r),
      };
    });
  }, [selectedIndicators, filteredValues, indicators]);

  // Calculate trend analysis for each selected indicator
  const trends = useMemo(() => {
    return selectedIndicators.map((indId) => {
      const values = filteredValues
        .filter((v) => v.indicator_id === indId)
        .sort((a, b) => a.reference_date.localeCompare(b.reference_date));

      const x = values.map((_, i) => i);
      const y = values.map((v) => v.value);

      const regression = linearRegression(x, y);
      const trend = detectTrend(regression.slope);
      const indicator = indicators.find((i) => i.id === indId);

      // Predict next year value
      const nextYearX = x.length > 0 ? x[x.length - 1] + 12 : 12;
      const predictedValue = predictValue(regression, nextYearX);

      return {
        id: indId,
        name: indicator?.name || indId,
        trend,
        slope: regression.slope,
        r2: regression.r2,
        predictedValue,
        currentValue: y[y.length - 1] || 0,
      };
    });
  }, [selectedIndicators, filteredValues, indicators]);

  // Calculate impact simulation
  const impactResults = useMemo(() => {
    if (!impactIndicator || impactVariation === 0 || correlations.length === 0) return [];

    return correlations
      .filter((c) => c.id1 === impactIndicator || c.id2 === impactIndicator)
      .map((c) => {
        const otherId = c.id1 === impactIndicator ? c.id2 : c.id1;
        const otherName = c.id1 === impactIndicator ? c.name2 : c.name1;
        const estimatedImpact = impactVariation * c.correlation;

        return {
          id: otherId,
          name: otherName,
          impact: estimatedImpact,
          correlation: c.correlation,
        };
      });
  }, [impactIndicator, impactVariation, correlations]);

  // Comparative Chart Analysis
  const comparativeAnalysis = useMemo(() => {
    if (selectedIndicators.length < 2) return null;

    const summary = selectedIndicators.map((indId) => {
      const values = filteredValues
        .filter((v) => v.indicator_id === indId)
        .map((v) => v.value);
      const ind = indicators.find((i) => i.id === indId);
      const trend = trends.find((t) => t.id === indId);
      const avg = values.length > 0 ? mean(values) : 0;
      const stdDev = values.length > 0 ? standardDeviation(values) : 0;
      const cv = values.length > 0 ? coefficientOfVariation(values) : 0;

      return {
        id: indId,
        name: ind?.name || indId,
        mean: avg,
        stdDev,
        cv,
        trend: trend?.trend || "stable",
        volatility: cv > 30 ? "Alta" : cv > 15 ? "Média" : "Baixa",
      };
    });

    const insights: string[] = [];
    
    // Detect strong correlations
    correlations.filter((c) => Math.abs(c.correlation) > 0.7).forEach((c) => {
      const type = c.correlation > 0 ? "positiva" : "negativa";
      insights.push(`${c.name1} e ${c.name2} apresentam correlação ${c.strength.toLowerCase()} ${type} (r=${c.correlation.toFixed(2)})`);
    });

    // Detect high volatility
    const highVolatility = summary.filter((s) => s.volatility === "Alta");
    if (highVolatility.length > 0) {
      insights.push(`Indicadores com alta volatilidade: ${highVolatility.map((s) => s.name).join(", ")}`);
    }

    // Detect opposing trends
    const upTrends = summary.filter((s) => s.trend === "up");
    const downTrends = summary.filter((s) => s.trend === "down");
    if (upTrends.length > 0 && downTrends.length > 0) {
      insights.push(`Tendências opostas detectadas: ${upTrends.map((s) => s.name).join(", ")} (↑) vs ${downTrends.map((s) => s.name).join(", ")} (↓)`);
    }

    const suggestions: string[] = [];
    if (correlations.some((c) => Math.abs(c.correlation) > 0.8)) {
      suggestions.push("Alta correlação sugere previsibilidade entre variáveis - considere usar um indicador como proxy do outro");
    }
    if (highVolatility.length > 0) {
      suggestions.push("Indicadores voláteis podem necessitar de análise de médias móveis para suavização");
    }
    suggestions.push(`Período analisado: ${yearRange[0]}-${yearRange[1]} - considere expandir para identificar padrões de longo prazo`);

    return { summary, insights, suggestions };
  }, [selectedIndicators, filteredValues, indicators, correlations, trends, yearRange]);

  // Simulation Analysis
  const simulationAnalysis = useMemo(() => {
    if (!impactIndicator || impactVariation === 0 || impactResults.length === 0) return null;

    const baseIndicator = indicators.find((i) => i.id === impactIndicator);
    const variationType = impactVariation > 0 ? "aumento" : "redução";
    
    const interpretations: string[] = [];
    const highImpacts = impactResults.filter((r) => Math.abs(r.impact) > 10);
    const moderateImpacts = impactResults.filter((r) => Math.abs(r.impact) >= 5 && Math.abs(r.impact) <= 10);

    interpretations.push(
      `Com uma variação de ${impactVariation > 0 ? "+" : ""}${impactVariation}% no ${baseIndicator?.name || "indicador"}, estima-se:`
    );

    impactResults.forEach((r) => {
      const direction = r.impact > 0 ? "aumento" : "redução";
      const correlationType = r.correlation > 0 ? "positiva" : "negativa";
      interpretations.push(`• ${r.name}: ${direction} de ${Math.abs(r.impact).toFixed(1)}% (correlação ${correlationType})`);
    });

    const warnings = [
      "Correlação não implica causalidade - fatores externos podem influenciar os resultados reais",
      `Simulação baseada em dados históricos (${yearRange[0]}-${yearRange[1]})`,
      "Relações entre indicadores podem mudar ao longo do tempo",
    ];

    const recommendations: string[] = [];
    if (highImpacts.length > 0) {
      recommendations.push(`Indicadores com impacto >10% requerem atenção especial: ${highImpacts.map((r) => r.name).join(", ")}`);
    }
    if (Math.abs(impactVariation) < 5) {
      recommendations.push("Considere simular cenários mais extremos (-20% a +20%) para avaliar sensibilidade");
    }
    if (moderateImpacts.length > 0) {
      recommendations.push(`Monitore indicadores com impacto moderado: ${moderateImpacts.map((r) => r.name).join(", ")}`);
    }

    return { interpretations, warnings, recommendations };
  }, [impactIndicator, impactVariation, impactResults, indicators, yearRange]);

  const toggleIndicator = (id: string) => {
    setSelectedIndicators((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

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
            <Calculator className="h-6 w-6 text-primary" />
            Data Analysis
          </h2>
          <p className="text-muted-foreground">
            Análise comparativa e correlações entre indicadores econômicos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar Dados
        </Button>
      </div>

      {/* Indicator Selection Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecionar Indicadores para Análise</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Sel.</TableHead>
                <TableHead>Indicador</TableHead>
                <TableHead>Série Histórica</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Registros</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indicators.map((ind) => {
                const range = indicatorRanges[ind.id];
                return (
                  <TableRow key={ind.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIndicators.includes(ind.id)}
                        onCheckedChange={() => toggleIndicator(ind.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{ind.name}</TableCell>
                    <TableCell>
                      {range ? (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(range.min), "MM/yyyy")} → {format(new Date(range.max), "MM/yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{ind.unit || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{range?.count || 0}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedIndicators.length >= 2 && (
        <>
          {/* Year Range Slider */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Período de Análise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{yearRange[0]}</span>
                <Slider
                  value={yearRange}
                  onValueChange={(v) => setYearRange(v as [number, number])}
                  min={2000}
                  max={2025}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium">{yearRange[1]}</span>
              </div>
            </CardContent>
          </Card>

          {/* Correlation Cards */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Correlações de Pearson ({correlations.length} {correlations.length === 1 ? "par" : "pares"})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {correlations.map((c) => (
                <Card key={`${c.id1}-${c.id2}`} className="border-2">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        {c.name1} × {c.name2}
                      </div>
                      <div className={`text-3xl font-bold ${c.color}`}>
                        r = {c.correlation.toFixed(3)}
                      </div>
                      <Badge variant="outline" className="mt-2">
                        {c.strength}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        {c.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Comparative Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análise Comparativa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    {selectedIndicators.map((indId, idx) => {
                      const ind = indicators.find((i) => i.id === indId);
                      return (
                        <Line
                          key={indId}
                          type="monotone"
                          dataKey={indId}
                          name={ind?.name || indId}
                          stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Comparative Chart Analysis */}
          {comparativeAnalysis && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Análise do Gráfico Comparativo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Resumo Estatístico por Indicador
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {comparativeAnalysis.summary.map((s) => (
                      <div key={s.id} className="p-2 bg-background/60 rounded-md text-sm">
                        <span className="font-medium">{s.name}</span>
                        <div className="text-muted-foreground text-xs mt-1">
                          Média: {s.mean.toFixed(2)} | Tendência: {s.trend === "up" ? "↑" : s.trend === "down" ? "↓" : "→"} | Volatilidade: {s.volatility}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insights */}
                {comparativeAnalysis.insights.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-amber-500" />
                      Insights Detectados
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {comparativeAnalysis.insights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-500">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-green-500" />
                    Sugestões
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {comparativeAnalysis.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-500">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trend Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análise de Tendência (Regressão Linear)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trends.map((t) => (
                  <Card key={t.id} className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{t.name}</span>
                        {t.trend === "up" && (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        )}
                        {t.trend === "down" && (
                          <TrendingDown className="h-5 w-5 text-red-500" />
                        )}
                        {t.trend === "stable" && (
                          <Minus className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Coef. Angular:</span>
                          <span className={t.slope > 0 ? "text-green-500" : t.slope < 0 ? "text-red-500" : ""}>
                            {t.slope.toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">R²:</span>
                          <span>{(t.r2 * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valor Atual:</span>
                          <span>{t.currentValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Previsão +1 ano:</span>
                          <span className="font-medium">{t.predictedValue.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Impact Simulator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Simulador de Impacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Indicador Base</label>
                  <Select value={impactIndicator || ""} onValueChange={setImpactIndicator}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um indicador" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedIndicators.map((id) => {
                        const ind = indicators.find((i) => i.id === id);
                        return (
                          <SelectItem key={id} value={id}>
                            {ind?.name || id}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Variação: {impactVariation > 0 ? "+" : ""}{impactVariation}%
                  </label>
                  <Slider
                    value={[impactVariation]}
                    onValueChange={(v) => setImpactVariation(v[0])}
                    min={-20}
                    max={20}
                    step={1}
                  />
                </div>
              </div>

              {impactResults.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Impacto Estimado:</h4>
                  <div className="space-y-2">
                    {impactResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <span className="font-medium">{result.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            (r = {result.correlation.toFixed(2)})
                          </span>
                          <Badge
                            variant={result.impact > 0 ? "default" : "destructive"}
                            className="min-w-[80px] justify-center"
                          >
                            {result.impact > 0 ? "+" : ""}{result.impact.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Simulation Analysis */}
          {simulationAnalysis && (
            <Card className="bg-accent/5 border-accent/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-accent-foreground" />
                  Análise da Simulação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Interpretations */}
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    Interpretação
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {simulationAnalysis.interpretations.map((interp, idx) => (
                      <li key={idx} className={idx === 0 ? "font-medium text-foreground" : ""}>
                        {interp}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Warnings */}
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Avisos Metodológicos
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {simulationAnalysis.warnings.map((warning, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                {simulationAnalysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-green-500" />
                      Recomendações
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {simulationAnalysis.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-500">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedIndicators.length < 2 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Selecione pelo menos <strong>2 indicadores</strong> para visualizar análises comparativas e correlações.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DataAnalysisTab;
