import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  ComposedChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Calculator,
  Loader2,
  Info,
  AlertTriangle,
  Lightbulb,
  Activity,
  RefreshCw,
  Brain,
  Search,
  Clock,
  SlidersHorizontal,
  Calendar,
  Plus,
  X,
  Snowflake,
  Gift,
  ShoppingCart,
  Heart,
  GraduationCap,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { runStructuralTimeSeries, STSResult } from "@/lib/structural-time-series";
import regression from "regression";
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
import {
  spearmanCorrelation,
  crossCorrelation,
  findBestCorrelations,
  findOptimalLag,
  interpretLag,
  CorrelationCandidate,
  BestCorrelation,
} from "@/lib/time-series-correlation";

type CorrelationMethod = "pearson" | "spearman" | "crosscorr";

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

interface SliderConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  baseline: number;
  effect: number;
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

const SLIDER_CONFIG: SliderConfig[] = [
  { key: "dollar", label: "Dólar Futuro (R$)", min: 4, max: 7, step: 0.1, unit: "R$", baseline: 5.5, effect: 0.05 },
  { key: "selic", label: "Selic Futura (%)", min: 5, max: 15, step: 0.25, unit: "%", baseline: 11, effect: 0.02 },
  { key: "unemployment", label: "Desemprego (%)", min: 5, max: 15, step: 0.5, unit: "%", baseline: 8, effect: 0.03 },
  { key: "ipca", label: "IPCA Futuro (%)", min: 2, max: 12, step: 0.25, unit: "%", baseline: 5, effect: 0.02 },
  { key: "pib", label: "PIB Futuro (%)", min: -3, max: 5, step: 0.5, unit: "%", baseline: 0, effect: 0.04 },
  { key: "income", label: "Renda (R$)", min: 2500, max: 4000, step: 50, unit: "R$", baseline: 3000, effect: 0.001 },
  { key: "confidence", label: "Confiança", min: 60, max: 120, step: 1, unit: "", baseline: 90, effect: 0.01 },
];

const SEASONAL_MULTIPLIERS = [
  { label: "Natal", effect: 0.45, month: 12, icon: Gift },
  { label: "Black Friday", effect: 0.30, month: 11, icon: ShoppingCart },
  { label: "Páscoa", effect: 0.15, month: 4, icon: Heart },
  { label: "Dia das Mães", effect: 0.20, month: 5, icon: Heart },
  { label: "Dia dos Pais", effect: 0.12, month: 8, icon: Heart },
  { label: "Volta às Aulas", effect: 0.10, month: 2, icon: GraduationCap },
];

export function DataAnalysisTab() {
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([2015, 2025]);
  const [impactIndicator, setImpactIndicator] = useState<string | null>(null);
  const [impactVariation, setImpactVariation] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<{ count: number; date: Date } | null>(null);
  const [correlationMethod, setCorrelationMethod] = useState<CorrelationMethod>("pearson");
  const [maxLag, setMaxLag] = useState<number>(12);
  const [bestCorrelationsTarget, setBestCorrelationsTarget] = useState<string | null>(null);

  // New states for advanced features
  const [showPredictiveSimulator, setShowPredictiveSimulator] = useState(false);
  const [cutoffYear, setCutoffYear] = useState(2022);
  const [futureSliders, setFutureSliders] = useState<Record<string, number>>({
    dollar: 5.5,
    selic: 11.5,
    unemployment: 8.0,
    ipca: 5.0,
    pib: 2.0,
    income: 3200,
    confidence: 95,
  });
  const [customCorrelations, setCustomCorrelations] = useState<string[]>([]);
  const [showCorrelationPicker, setShowCorrelationPicker] = useState(false);
  const [scatterXIndicator, setScatterXIndicator] = useState<string | null>(null);
  const [scatterYIndicator, setScatterYIndicator] = useState<string | null>(null);
  const [scatterSizeIndicator, setScatterSizeIndicator] = useState<string | null>(null);

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
    staleTime: 30000,
  });

  // Fetch all indicator values (paginated to bypass 1000 row limit)
  const { data: allValues = [], isLoading: loadingValues, refetch: refetchValues } = useQuery({
    queryKey: ["indicator-values-analysis"],
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

  // Calculate correlations for selected pairs using selected method
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

      let r: number;
      let lag: number | undefined;
      let lagInterpretation: string | undefined;

      if (correlationMethod === "crosscorr") {
        const optimal = findOptimalLag(values1, values2, maxLag);
        r = optimal.correlation;
        lag = optimal.lag;
        const ind1 = indicators.find((i) => i.id === id1);
        const ind2 = indicators.find((i) => i.id === id2);
        lagInterpretation = interpretLag(lag, ind1?.name || id1, ind2?.name || id2);
      } else if (correlationMethod === "spearman") {
        r = spearmanCorrelation(values1, values2);
      } else {
        r = pearsonCorrelation(values1, values2);
      }

      const ind1 = indicators.find((i) => i.id === id1);
      const ind2 = indicators.find((i) => i.id === id2);

      return {
        id1,
        id2,
        name1: ind1?.name || id1,
        name2: ind2?.name || id2,
        correlation: r,
        lag,
        lagInterpretation,
        ...getCorrelationStrength(r),
      };
    });
  }, [selectedIndicators, filteredValues, indicators, correlationMethod, maxLag]);

  // Correlation Matrix for heatmap
  const correlationMatrix = useMemo(() => {
    if (selectedIndicators.length < 2) return [];
    
    const matrix: { x: string; y: string; xName: string; yName: string; value: number }[] = [];
    
    for (const id1 of selectedIndicators) {
      for (const id2 of selectedIndicators) {
        const values1 = filteredValues
          .filter((v) => v.indicator_id === id1)
          .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
          .map((v) => v.value);
        const values2 = filteredValues
          .filter((v) => v.indicator_id === id2)
          .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
          .map((v) => v.value);
        
        const ind1 = indicators.find((i) => i.id === id1);
        const ind2 = indicators.find((i) => i.id === id2);
        
        let r = 0;
        if (values1.length >= 2 && values2.length >= 2) {
          r = correlationMethod === "spearman" 
            ? spearmanCorrelation(values1, values2) 
            : pearsonCorrelation(values1, values2);
        }
        
        matrix.push({ x: id1, y: id2, xName: ind1?.name || id1, yName: ind2?.name || id2, value: r });
      }
    }
    return matrix;
  }, [selectedIndicators, filteredValues, indicators, correlationMethod]);

  // Auto-discover best correlated variables for a target indicator
  const bestCorrelations = useMemo(() => {
    if (!bestCorrelationsTarget) return [];

    const targetValues = filteredValues
      .filter((v) => v.indicator_id === bestCorrelationsTarget)
      .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
      .map((v) => v.value);

    const targetIndicator = indicators.find((i) => i.id === bestCorrelationsTarget);
    
    const target: CorrelationCandidate = {
      id: bestCorrelationsTarget,
      name: targetIndicator?.name || bestCorrelationsTarget,
      values: targetValues,
    };

    // Build candidates from ALL indicators (not just selected ones)
    const candidates: CorrelationCandidate[] = indicators
      .filter((ind) => ind.id !== bestCorrelationsTarget)
      .map((ind) => ({
        id: ind.id,
        name: ind.name,
        values: allValues
          .filter((v) => {
            const year = new Date(v.reference_date).getFullYear();
            return v.indicator_id === ind.id && year >= yearRange[0] && year <= yearRange[1];
          })
          .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
          .map((v) => v.value),
      }))
      .filter((c) => c.values.length >= 5);

    return findBestCorrelations(target, candidates, correlationMethod, 15, maxLag);
  }, [bestCorrelationsTarget, filteredValues, allValues, indicators, correlationMethod, maxLag, yearRange]);

  // Calculate trend analysis for each selected indicator
  const trends = useMemo(() => {
    return selectedIndicators.map((indId) => {
      const values = filteredValues
        .filter((v) => v.indicator_id === indId)
        .sort((a, b) => a.reference_date.localeCompare(b.reference_date));

      const x = values.map((_, i) => i);
      const y = values.map((v) => v.value);

      const reg = linearRegression(x, y);
      const trend = detectTrend(reg.slope);
      const indicator = indicators.find((i) => i.id === indId);

      // Predict next year value
      const nextYearX = x.length > 0 ? x[x.length - 1] + 12 : 12;
      const predictedValue = predictValue(reg, nextYearX);

      return {
        id: indId,
        name: indicator?.name || indId,
        trend,
        slope: reg.slope,
        r2: reg.r2,
        predictedValue,
        currentValue: y[y.length - 1] || 0,
      };
    });
  }, [selectedIndicators, filteredValues, indicators]);

  // Calculate STS for each selected indicator
  const stsResults = useMemo(() => {
    const results: Record<string, { result: STSResult | null; indicator: Indicator | undefined }> = {};
    
    selectedIndicators.forEach((indId) => {
      const values = filteredValues
        .filter((v) => v.indicator_id === indId)
        .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
        .map((v) => ({
          date: new Date(v.reference_date),
          value: v.value,
        }));

      const indicator = indicators.find((i) => i.id === indId);
      const frequency = indicator?.category === 'daily' ? 'daily' : 'monthly';
      
      results[indId] = {
        result: values.length >= 5 ? runStructuralTimeSeries(values, frequency as any) : null,
        indicator,
      };
    });
    
    return results;
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
    
    const interpretations: string[] = [];

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
    const highImpacts = impactResults.filter((r) => Math.abs(r.impact) > 10);
    const moderateImpacts = impactResults.filter((r) => Math.abs(r.impact) >= 5 && Math.abs(r.impact) <= 10);
    
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

  // Scatter plot data
  const scatterData = useMemo(() => {
    if (!scatterXIndicator || !scatterYIndicator) return [];
    
    const xValues = filteredValues
      .filter((v) => v.indicator_id === scatterXIndicator)
      .sort((a, b) => a.reference_date.localeCompare(b.reference_date));
    const yValues = filteredValues
      .filter((v) => v.indicator_id === scatterYIndicator)
      .sort((a, b) => a.reference_date.localeCompare(b.reference_date));
    const sizeValues = scatterSizeIndicator 
      ? filteredValues.filter((v) => v.indicator_id === scatterSizeIndicator).sort((a, b) => a.reference_date.localeCompare(b.reference_date))
      : [];
    
    const dateMap: Record<string, { x: number; y: number; size: number; date: string }> = {};
    
    xValues.forEach((v) => {
      const date = v.reference_date.substring(0, 7);
      if (!dateMap[date]) dateMap[date] = { x: 0, y: 0, size: 50, date };
      dateMap[date].x = v.value;
    });
    
    yValues.forEach((v) => {
      const date = v.reference_date.substring(0, 7);
      if (dateMap[date]) dateMap[date].y = v.value;
    });
    
    sizeValues.forEach((v) => {
      const date = v.reference_date.substring(0, 7);
      if (dateMap[date]) dateMap[date].size = Math.max(20, Math.min(v.value * 10, 200));
    });
    
    return Object.values(dateMap).filter((d) => d.x > 0 && d.y > 0);
  }, [scatterXIndicator, scatterYIndicator, scatterSizeIndicator, filteredValues]);

  // Annual data for predictive simulator
  const annualData = useMemo(() => {
    if (selectedIndicators.length === 0) return [];
    
    const yearMap: Record<number, Record<string, number>> = {};
    
    filteredValues.forEach((v) => {
      const year = new Date(v.reference_date).getFullYear();
      if (!yearMap[year]) yearMap[year] = { year };
      
      const ind = indicators.find((i) => i.id === v.indicator_id);
      const key = ind?.code || v.indicator_id;
      
      if (!yearMap[year][key]) yearMap[year][key] = 0;
      yearMap[year][key] = (yearMap[year][key] + v.value) / 2; // Average if multiple values
    });
    
    return Object.values(yearMap)
      .sort((a, b) => (a.year as number) - (b.year as number))
      .map((d) => ({
        year: d.year as number,
        ...d,
        sales: d.PMC || d.PIB || Object.values(d).find((v) => typeof v === 'number' && v !== d.year) || 0,
        income: d.RENDA || 3000,
        ipca: d.IPCA || 5,
      }));
  }, [filteredValues, selectedIndicators, indicators]);

  // Predictive model with backtesting
  const predictiveModel = useMemo(() => {
    if (annualData.length < 3) {
      return { chartData: [], modelMetrics: { r2: 0, slope: 0, intercept: 0 }, sensitivity: {} };
    }

    const trainingData = annualData.filter((d) => d.year <= cutoffYear);
    const testData = annualData.filter((d) => d.year > cutoffYear);

    if (trainingData.length < 3) {
      return { chartData: [], modelMetrics: { r2: 0, slope: 0, intercept: 0 }, sensitivity: {} };
    }

    // Regressão linear: Vendas = β₀ + β₁ × Renda
    const dataPoints: [number, number][] = trainingData.map((d) => [d.income || 3000, d.sales || 0]);
    const result = regression.linear(dataPoints);
    const [intercept, slope] = result.equation;

    // Calculate R²
    const predictedTrain = trainingData.map((d) => slope * (d.income || 3000) + intercept);
    const actualTrain = trainingData.map((d) => d.sales || 0);
    const meanActual = actualTrain.reduce((a, b) => a + b, 0) / actualTrain.length;
    
    const ssRes = actualTrain.reduce((sum, actual, i) => sum + Math.pow(actual - predictedTrain[i], 2), 0);
    const ssTot = actualTrain.reduce((sum, actual) => sum + Math.pow(actual - meanActual, 2), 0);
    const r2 = ssTot > 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 0;

    // Generate chart data
    const chartPoints = annualData.map((d) => {
      const predicted = slope * (d.income || 3000) + intercept;
      const isTraining = d.year <= cutoffYear;
      
      return {
        year: d.year,
        actual: d.sales,
        predicted: isTraining ? null : predicted,
        backtested: isTraining ? predicted : null,
        lower: isTraining ? null : predicted * 0.9,
        upper: isTraining ? null : predicted * 1.1,
      };
    });

    // Add future projections (3 years)
    const lastYear = annualData[annualData.length - 1]?.year || 2024;
    
    // Calculate correlation effect from custom correlations
    let correlationEffect = 0;
    customCorrelations.forEach((varName) => {
      const corr = bestCorrelations.find((c) => c.name === varName);
      if (corr) {
        correlationEffect += corr.correlation * 0.05;
      }
    });
    
    for (let i = 1; i <= 3; i++) {
      const futureYear = lastYear + i;
      
      // Apply slider effects
      let totalEffect = 0;
      SLIDER_CONFIG.forEach((s) => {
        const sliderValue = futureSliders[s.key] || s.baseline;
        const delta = s.baseline - sliderValue;
        totalEffect += delta * s.effect;
      });
      
      const adjustedIncome = (futureSliders.income || 3000) * (1 + totalEffect);
      let predicted = slope * adjustedIncome + intercept;
      
      // Apply correlation effect
      predicted = predicted * (1 + correlationEffect);
      
      chartPoints.push({
        year: futureYear,
        actual: null,
        predicted: predicted,
        backtested: null,
        lower: predicted * 0.85,
        upper: predicted * 1.15,
      });
    }

    // Calculate sensitivity
    const sens: Record<string, string> = {};
    SLIDER_CONFIG.forEach((s) => {
      const delta = s.baseline - (futureSliders[s.key] || s.baseline);
      sens[s.key] = (delta * s.effect * 100).toFixed(1);
    });

    return {
      chartData: chartPoints,
      modelMetrics: { r2, slope, intercept },
      sensitivity: sens,
    };
  }, [annualData, cutoffYear, futureSliders, customCorrelations, bestCorrelations]);

  // Top correlations for dropdown
  const topCorrelationsForPicker = useMemo(() => {
    if (!bestCorrelationsTarget && selectedIndicators.length > 0) {
      // Use first selected indicator as target
      const targetId = selectedIndicators[0];
      const targetValues = filteredValues
        .filter((v) => v.indicator_id === targetId)
        .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
        .map((v) => v.value);

      const targetIndicator = indicators.find((i) => i.id === targetId);
      
      const target: CorrelationCandidate = {
        id: targetId,
        name: targetIndicator?.name || targetId,
        values: targetValues,
      };

      const candidates: CorrelationCandidate[] = indicators
        .filter((ind) => ind.id !== targetId)
        .map((ind) => ({
          id: ind.id,
          name: ind.name,
          values: allValues
            .filter((v) => {
              const year = new Date(v.reference_date).getFullYear();
              return v.indicator_id === ind.id && year >= yearRange[0] && year <= yearRange[1];
            })
            .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
            .map((v) => v.value),
        }))
        .filter((c) => c.values.length >= 5);

      return findBestCorrelations(target, candidates, correlationMethod, 15, maxLag);
    }
    return bestCorrelations;
  }, [bestCorrelationsTarget, selectedIndicators, filteredValues, allValues, indicators, correlationMethod, maxLag, yearRange, bestCorrelations]);

  const toggleIndicator = (id: string) => {
    setSelectedIndicators((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getMatrixCellColor = (value: number) => {
    if (value >= 0.7) return "bg-emerald-500";
    if (value >= 0.4) return "bg-emerald-500/60";
    if (value >= 0.1) return "bg-emerald-500/30";
    if (value >= -0.1) return "bg-muted";
    if (value >= -0.4) return "bg-red-500/30";
    if (value >= -0.7) return "bg-red-500/60";
    return "bg-red-500";
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

          {/* Correlation Method Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Tipo de Correlação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={correlationMethod}
                onValueChange={(v) => setCorrelationMethod(v as CorrelationMethod)}
                className="flex flex-wrap gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pearson" id="pearson" />
                  <Label htmlFor="pearson" className="cursor-pointer">
                    <span className="font-medium">Pearson</span>
                    <span className="text-xs text-muted-foreground ml-1">(linear)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spearman" id="spearman" />
                  <Label htmlFor="spearman" className="cursor-pointer">
                    <span className="font-medium">Spearman</span>
                    <span className="text-xs text-muted-foreground ml-1">(ranks)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="crosscorr" id="crosscorr" />
                  <Label htmlFor="crosscorr" className="cursor-pointer">
                    <span className="font-medium">Cross-Correlation</span>
                    <span className="text-xs text-muted-foreground ml-1">(com lag)</span>
                  </Label>
                </div>
              </RadioGroup>

              {correlationMethod === "crosscorr" && (
                <div className="flex items-center gap-4 pt-2 border-t">
                  <Label className="text-sm font-medium whitespace-nowrap">
                    Max Lag: {maxLag} períodos
                  </Label>
                  <Slider
                    value={[maxLag]}
                    onValueChange={(v) => setMaxLag(v[0])}
                    min={3}
                    max={24}
                    step={1}
                    className="flex-1 max-w-xs"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Correlation Matrix Heatmap */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Matriz de Correlação
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Usando {correlationMethod === "spearman" ? "Spearman" : "Pearson"} (melhor para séries temporais)
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="inline-grid gap-1" style={{ gridTemplateColumns: `80px repeat(${selectedIndicators.length}, 60px)` }}>
                  {/* Header row */}
                  <div className="h-8" />
                  {selectedIndicators.map((indId) => {
                    const ind = indicators.find((i) => i.id === indId);
                    return (
                      <div key={indId} className="text-xs font-medium text-center truncate px-1" title={ind?.name}>
                        {ind?.name?.substring(0, 8) || indId.substring(0, 8)}
                      </div>
                    );
                  })}
                  
                  {/* Data rows */}
                  {selectedIndicators.map((rowId) => {
                    const rowInd = indicators.find((i) => i.id === rowId);
                    return (
                      <>
                        <div key={`label-${rowId}`} className="text-xs font-medium truncate flex items-center" title={rowInd?.name}>
                          {rowInd?.name?.substring(0, 10) || rowId.substring(0, 10)}
                        </div>
                        {selectedIndicators.map((colId) => {
                          const cell = correlationMatrix.find((c) => c.x === rowId && c.y === colId);
                          const value = cell?.value || 0;
                          return (
                            <div
                              key={`${rowId}-${colId}`}
                              className={`h-12 flex items-center justify-center text-xs font-mono rounded ${getMatrixCellColor(value)} ${rowId === colId ? 'opacity-50' : ''}`}
                              title={`${rowInd?.name} × ${indicators.find((i) => i.id === colId)?.name}: ${value.toFixed(3)}`}
                            >
                              {value.toFixed(2)}
                            </div>
                          );
                        })}
                      </>
                    );
                  })}
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-500 rounded" />
                  <span>Negativa</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-muted rounded" />
                  <span>Neutro</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-emerald-500 rounded" />
                  <span>Positiva</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scatter Plot */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Scatter Plot - Relação entre Indicadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="text-sm mb-2 block">Eixo X:</Label>
                  <Select value={scatterXIndicator || ""} onValueChange={setScatterXIndicator}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione indicador" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedIndicators.map((id) => {
                        const ind = indicators.find((i) => i.id === id);
                        return <SelectItem key={id} value={id}>{ind?.name || id}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-2 block">Eixo Y:</Label>
                  <Select value={scatterYIndicator || ""} onValueChange={setScatterYIndicator}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione indicador" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedIndicators.map((id) => {
                        const ind = indicators.find((i) => i.id === id);
                        return <SelectItem key={id} value={id}>{ind?.name || id}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-2 block">Tamanho da Bolha:</Label>
                  <Select value={scatterSizeIndicator || ""} onValueChange={setScatterSizeIndicator}>
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {selectedIndicators.map((id) => {
                        const ind = indicators.find((i) => i.id === id);
                        return <SelectItem key={id} value={id}>{ind?.name || id}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {scatterXIndicator && scatterYIndicator && scatterData.length > 0 && (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name={indicators.find((i) => i.id === scatterXIndicator)?.name || "X"}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name={indicators.find((i) => i.id === scatterYIndicator)?.name || "Y"}
                        tick={{ fontSize: 12 }}
                      />
                      <ZAxis type="number" dataKey="size" range={[50, 200]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string) => [value.toFixed(2), name]}
                      />
                      <Scatter name="Dados" data={scatterData} fill="#3b82f6">
                        {scatterData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {(!scatterXIndicator || !scatterYIndicator) && (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Selecione indicadores para os eixos X e Y
                </div>
              )}
            </CardContent>
          </Card>

          {/* Correlation Cards */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Correlações ({correlationMethod === "pearson" ? "Pearson" : correlationMethod === "spearman" ? "Spearman" : "Cross-Correlation"}) - {correlations.length} {correlations.length === 1 ? "par" : "pares"}
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
                        {correlationMethod === "spearman" ? "ρ" : "r"} = {c.correlation.toFixed(3)}
                      </div>
                      <Badge variant="outline" className="mt-2">
                        {c.strength}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        {c.description}
                      </p>
                      {correlationMethod === "crosscorr" && c.lag !== undefined && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="flex items-center justify-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-cyan-500" />
                            <span className="font-medium">Lag: {c.lag === 0 ? "0" : c.lag > 0 ? `+${c.lag}` : c.lag}</span>
                          </div>
                          <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                            {c.lagInterpretation}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Best Correlations Discovery */}
          <Card className="border-cyan-500/30 bg-cyan-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5 text-cyan-500" />
                Variáveis Mais Correlacionadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium whitespace-nowrap">Indicador Alvo:</Label>
                <Select value={bestCorrelationsTarget || ""} onValueChange={setBestCorrelationsTarget}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Selecione um indicador para descobrir correlações" />
                  </SelectTrigger>
                  <SelectContent>
                    {indicators.map((ind) => (
                      <SelectItem key={ind.id} value={ind.id}>
                        {ind.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {bestCorrelationsTarget && bestCorrelations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Top 15 indicadores mais correlacionados com{" "}
                    <span className="font-medium text-foreground">
                      {indicators.find((i) => i.id === bestCorrelationsTarget)?.name}
                    </span>
                    :
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {bestCorrelations.slice(0, 15).map((bc, idx) => (
                      <div
                        key={bc.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          bc.correlation > 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-muted-foreground">#{idx + 1}</span>
                          <span className="font-medium text-sm truncate max-w-[120px]" title={bc.name}>{bc.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={bc.correlation > 0 ? "default" : "destructive"}
                            className="min-w-[60px] justify-center text-xs"
                          >
                            {bc.correlation > 0 ? "+" : ""}{(bc.correlation * 100).toFixed(0)}%
                          </Badge>
                          {bc.lag !== undefined && bc.lag !== 0 && (
                            <span className="text-xs text-cyan-600 dark:text-cyan-400">
                              lag {bc.lag}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* Predictive Simulator Toggle */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  Simulador Preditivo Avançado
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="simulator-toggle" className="text-sm">
                      {showPredictiveSimulator ? "Ativo" : "Inativo"}
                    </Label>
                    <Switch
                      id="simulator-toggle"
                      checked={showPredictiveSimulator}
                      onCheckedChange={setShowPredictiveSimulator}
                    />
                  </div>
                  {showPredictiveSimulator && (
                    <Badge variant={predictiveModel.modelMetrics.r2 > 0.7 ? "default" : predictiveModel.modelMetrics.r2 > 0.5 ? "secondary" : "destructive"}>
                      R² = {predictiveModel.modelMetrics.r2.toFixed(3)}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            {showPredictiveSimulator && (
              <CardContent className="space-y-6">
                {/* Cutoff Year Selector */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <Label className="font-medium">Ano de Corte (Backtest):</Label>
                  <Select value={String(cutoffYear)} onValueChange={(v) => setCutoffYear(Number(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2018, 2019, 2020, 2021, 2022, 2023].map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sliders Panel */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Cenário What-If
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCorrelationPicker(true)}
                          disabled={customCorrelations.length >= 5}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Correlação
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {SLIDER_CONFIG.map((s) => (
                        <div key={s.key} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{s.label}</span>
                            <span className="font-mono">
                              {s.unit === "R$" ? `R$ ${(futureSliders[s.key] || s.baseline).toLocaleString()}` :
                               s.unit === "%" ? `${futureSliders[s.key] || s.baseline}%` :
                               futureSliders[s.key] || s.baseline}
                            </span>
                          </div>
                          <Slider
                            value={[futureSliders[s.key] || s.baseline]}
                            onValueChange={(v) => setFutureSliders((prev) => ({ ...prev, [s.key]: v[0] }))}
                            min={s.min}
                            max={s.max}
                            step={s.step}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{s.min}{s.unit}</span>
                            <span className={Number(predictiveModel.sensitivity[s.key]) > 0 ? "text-emerald-500" : Number(predictiveModel.sensitivity[s.key]) < 0 ? "text-red-500" : ""}>
                              {Number(predictiveModel.sensitivity[s.key]) > 0 ? "+" : ""}{predictiveModel.sensitivity[s.key]}%
                            </span>
                            <span>{s.max}{s.unit}</span>
                          </div>
                        </div>
                      ))}

                      {/* Custom Correlations */}
                      {customCorrelations.length > 0 && (
                        <div className="pt-4 border-t">
                          <p className="text-sm font-medium mb-2">Variáveis Correlacionadas:</p>
                          <div className="flex flex-wrap gap-2">
                            {customCorrelations.map((varName) => {
                              const corr = topCorrelationsForPicker.find((c) => c.name === varName);
                              return (
                                <Badge key={varName} variant="outline" className="gap-1">
                                  {varName}
                                  <span className="text-xs ml-1">
                                    {corr?.correlation ? `${corr.correlation > 0 ? "+" : ""}${(corr.correlation * 100).toFixed(0)}%` : ""}
                                  </span>
                                  <button
                                    onClick={() => setCustomCorrelations(customCorrelations.filter((c) => c !== varName))}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Backtesting Chart */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Backtesting & Projeção</CardTitle>
                        {predictiveModel.modelMetrics.r2 < 0.5 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Baixa precisão
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={predictiveModel.chartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                            />
                            <Legend />
                            <ReferenceLine x={cutoffYear} stroke="hsl(var(--primary))" strokeDasharray="5 5" label="Corte" />
                            {/* Confidence interval */}
                            <Area
                              type="monotone"
                              dataKey="upper"
                              stackId="1"
                              stroke="none"
                              fill="hsl(var(--primary))"
                              fillOpacity={0.1}
                              name="IC Superior"
                            />
                            <Area
                              type="monotone"
                              dataKey="lower"
                              stackId="2"
                              stroke="none"
                              fill="hsl(var(--background))"
                              name="IC Inferior"
                            />
                            {/* Actual values */}
                            <Line
                              type="monotone"
                              dataKey="actual"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              name="Real"
                            />
                            {/* Backtest */}
                            <Line
                              type="monotone"
                              dataKey="backtested"
                              stroke="#22c55e"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={{ r: 3 }}
                              name="Backtest"
                            />
                            {/* Projection */}
                            <Line
                              type="monotone"
                              dataKey="predicted"
                              stroke="#f59e0b"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              name="Projeção"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sensitivity Cards */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Análise de Sensibilidade</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {SLIDER_CONFIG.map((s) => (
                      <Card key={s.key} className="bg-muted/30">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground truncate">{s.label.split(" ")[0]}</p>
                          <p className={`text-lg font-bold ${
                            Number(predictiveModel.sensitivity[s.key]) > 0 ? "text-emerald-500" :
                            Number(predictiveModel.sensitivity[s.key]) < 0 ? "text-red-500" :
                            "text-muted-foreground"
                          }`}>
                            {Number(predictiveModel.sensitivity[s.key]) > 0 ? "+" : ""}{predictiveModel.sensitivity[s.key]}%
                          </p>
                          <p className="text-xs text-muted-foreground">Impacto</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Seasonal Multipliers */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-semibold mb-3">Multiplicadores Sazonais</h4>
                  <div className="flex flex-wrap gap-2">
                    {SEASONAL_MULTIPLIERS.map((m) => (
                      <Badge key={m.label} variant="secondary" className="gap-1">
                        <m.icon className="h-3 w-3" />
                        {m.label}: +{(m.effect * 100).toFixed(0)}%
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Correlation Picker Dialog */}
          <Dialog open={showCorrelationPicker} onOpenChange={setShowCorrelationPicker}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Variável Correlacionada</DialogTitle>
                <DialogDescription>
                  Selecione variáveis com base no nível de correlação
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {topCorrelationsForPicker
                  .filter((c) => !customCorrelations.includes(c.name))
                  .slice(0, 15)
                  .map((corr) => (
                    <div
                      key={corr.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        if (customCorrelations.length < 5) {
                          setCustomCorrelations([...customCorrelations, corr.name]);
                          setShowCorrelationPicker(false);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{corr.name}</span>
                        {corr.lag !== undefined && corr.lag > 0 && (
                          <Badge variant="outline" className="text-xs">
                            lag {corr.lag}m
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono ${
                          corr.correlation > 0.7 ? "text-emerald-500" :
                          corr.correlation > 0.5 ? "text-emerald-400" :
                          corr.correlation > 0.3 ? "text-yellow-400" :
                          corr.correlation < -0.5 ? "text-red-500" :
                          corr.correlation < -0.3 ? "text-red-400" :
                          "text-muted-foreground"
                        }`}>
                          {corr.correlation > 0 ? "+" : ""}{(corr.correlation * 100).toFixed(0)}%
                        </span>
                        <Badge variant={
                          Math.abs(corr.correlation) > 0.7 ? "default" :
                          Math.abs(corr.correlation) > 0.5 ? "secondary" :
                          "outline"
                        }>
                          {Math.abs(corr.correlation) > 0.7 ? "Alta" :
                           Math.abs(corr.correlation) > 0.5 ? "Média" :
                           Math.abs(corr.correlation) > 0.3 ? "Baixa" : "Fraca"}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
              <DialogFooter>
                <div className="text-sm text-muted-foreground">
                  Selecionadas: {customCorrelations.length}/5
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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

                {/* STS Output */}
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-cyan-500" />
                    Saída do Modelo STS (State-Space)
                  </h4>
                  <div className="space-y-3">
                    {selectedIndicators.map((indId) => {
                      const stsData = stsResults[indId];
                      if (!stsData?.result) return null;
                      
                      const { result, indicator } = stsData;
                      const trendDirection = result.direction === 'up' ? '↑' : result.direction === 'down' ? '↓' : '→';
                      const trendColor = result.direction === 'up' ? 'text-green-500' : result.direction === 'down' ? 'text-red-500' : 'text-gray-500';
                      
                      return (
                        <div key={indId} className="p-3 bg-background/60 rounded-lg border border-cyan-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{indicator?.name || indId}</span>
                            <Badge variant="outline" className={`${trendColor} border-current`}>
                              {trendDirection} {result.strength}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">μ<sub>t</sub> (Tendência):</span>
                              <div className="font-mono font-medium">{result.mu_smoothed.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">β<sub>t</sub> (Inclinação):</span>
                              <div className={`font-mono font-medium ${result.beta_smoothed > 0 ? 'text-green-500' : result.beta_smoothed < 0 ? 'text-red-500' : ''}`}>
                                {result.beta_smoothed > 0 ? '+' : ''}{result.beta_smoothed.toFixed(4)}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">IC 95%:</span>
                              <div className="font-mono font-medium">
                                [{result.mu_ci_low.toFixed(2)}, {result.mu_ci_high.toFixed(2)}]
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Incerteza:</span>
                              <Badge variant="secondary" className="text-xs">
                                {result.uncertainty}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">σ²<sub>ε</sub>:</span>
                              <span className="ml-1 font-mono">{result.sigma2_epsilon.toFixed(4)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">σ²<sub>η</sub>:</span>
                              <span className="ml-1 font-mono">{result.sigma2_eta.toFixed(4)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">σ²<sub>ζ</sub>:</span>
                              <span className="ml-1 font-mono">{result.sigma2_zeta.toFixed(4)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sugestões de Análise */}
          {comparativeAnalysis && comparativeAnalysis.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-green-500" />
                  Sugestões de Análise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {comparativeAnalysis.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
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
