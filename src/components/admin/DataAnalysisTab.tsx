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
import { TrendingUp, TrendingDown, Minus, BarChart3, Calculator, Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  pearsonCorrelation,
  linearRegression,
  detectTrend,
  getCorrelationStrength,
  generatePairs,
  predictValue,
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
  const { data: indicators = [], isLoading: loadingIndicators } = useQuery({
    queryKey: ["indicators-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economic_indicators")
        .select("id, name, code, unit, category")
        .order("name");
      if (error) throw error;
      return data as Indicator[];
    },
  });

  // Fetch all indicator values
  const { data: allValues = [], isLoading: loadingValues } = useQuery({
    queryKey: ["indicator-values-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("indicator_values")
        .select("indicator_id, reference_date, value")
        .order("reference_date");
      if (error) throw error;
      return data as IndicatorValue[];
    },
  });

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
