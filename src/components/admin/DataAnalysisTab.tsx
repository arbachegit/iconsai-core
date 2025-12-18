import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, 
  ComposedChart, Area, ReferenceLine, AreaChart, BarChart, Bar
} from "recharts";
import { Calculator, TrendingUp, AlertTriangle, Plus, X, RefreshCw, BarChart3, Loader2, Bot, Smile, Frown, Meh } from "lucide-react";
import { spearmanCorrelation, findOptimalLag, getCorrelationStrengthPtBr } from "@/lib/time-series-correlation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Simple linear regression implementation
function linearRegression(data: [number, number][]): { equation: [number, number]; r2: number } {
  const n = data.length;
  if (n < 2) return { equation: [0, 0], r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const [x, y] of data) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const [x, y] of data) {
    const predicted = slope * x + intercept;
    ssRes += (y - predicted) ** 2;
    ssTot += (y - meanY) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { equation: [intercept, slope], r2 };
}

// Mapeamento de códigos de indicadores para variáveis do modelo
const INDICATOR_MAPPING: Record<string, string> = {
  "PMC": "sales",
  "IPCA": "ipca",
  "SELIC": "selic",
  "PIB": "pib",
  "DOLAR": "dollar",
  "4099": "unemployment",
  "RENDA_MEDIA": "income",
  "GINI": "gini",
  // Classes sociais
  "RENDA_CLASSE_A": "incomeClassA",
  "RENDA_CLASSE_B": "incomeClassB",
  "RENDA_CLASSE_C": "incomeClassC",
  "RENDA_CLASSE_D": "incomeClassD",
  "RENDA_CLASSE_E": "incomeClassE",
  // PMC por setor
  "PMC_VEST": "pmcVest",
  "PMC_MOV": "pmcMov",
  "PMC_FARM": "pmcFarm",
  "PMC_COMB": "pmcComb",
  "PMC_VEIC": "pmcVeic",
  "PMC_CONST": "pmcConst",
};

const VARIABLES = [
  { key: "sales", label: "Vendas (PMC)", unit: "índice" },
  { key: "dollar", label: "Dólar", unit: "R$" },
  { key: "selic", label: "Selic", unit: "%" },
  { key: "ipca", label: "IPCA", unit: "%" },
  { key: "pib", label: "PIB", unit: "%" },
  { key: "unemployment", label: "Desemprego", unit: "%" },
  { key: "income", label: "Renda Per Capita", unit: "R$" },
  { key: "gini", label: "Índice Gini", unit: "índice" },
];

const SLIDER_CONFIG = [
  { key: "dollar", label: "Dólar Futuro (R$)", min: 4, max: 7, step: 0.1, unit: "R$", baseline: 5.5, effect: 0.05 },
  { key: "selic", label: "Selic Futura (%)", min: 5, max: 15, step: 0.25, unit: "%", baseline: 11, effect: 0.02 },
  { key: "unemployment", label: "Desemprego Futuro (%)", min: 5, max: 15, step: 0.5, unit: "%", baseline: 8, effect: 0.03 },
  { key: "ipca", label: "IPCA Futuro (%)", min: 2, max: 12, step: 0.25, unit: "%", baseline: 5, effect: 0.02 },
  { key: "pib", label: "PIB Futuro (%)", min: -3, max: 5, step: 0.5, unit: "%", baseline: 0, effect: 0.04 },
  { key: "income", label: "Renda Per Capita (R$)", min: 1000, max: 3000, step: 50, unit: "R$", baseline: 1848, effect: 0.05 },
];

const SEASONAL_MULTIPLIERS = [
  { label: "🎄 Natal", value: "+45%" },
  { label: "🛒 Black Friday", value: "+30%" },
  { label: "🥚 Páscoa", value: "+15%" },
];

// Cores para classes sociais
const CLASS_COLORS = {
  A: "#3B82F6", // azul
  B: "#10B981", // verde
  C: "#F59E0B", // amarelo
  D: "#F97316", // laranja
  E: "#EF4444", // vermelho
};

// PMC por setor
const PMC_SECTORS = [
  { key: "sales", code: "PMC", label: "PMC Geral" },
  { key: "pmcVest", code: "PMC_VEST", label: "Vestuário" },
  { key: "pmcMov", code: "PMC_MOV", label: "Móveis" },
  { key: "pmcFarm", code: "PMC_FARM", label: "Farmácia" },
  { key: "pmcComb", code: "PMC_COMB", label: "Combustíveis" },
  { key: "pmcVeic", code: "PMC_VEIC", label: "Veículos" },
  { key: "pmcConst", code: "PMC_CONST", label: "Mat. Construção" },
];

// Cenários do Simulador 2026
const SCENARIOS_2026 = {
  neutral: { renda: 1950, dolar: 5.80, selic: 12.5, ipca: 4.5, desemprego: 7.5 },
  optimistic: { renda: 2200, dolar: 5.20, selic: 10.0, ipca: 3.5, desemprego: 6.0 },
  pessimistic: { renda: 1750, dolar: 6.50, selic: 15.0, ipca: 6.5, desemprego: 9.5 },
};

// Eventos sazonais 2026
const SEASONAL_2026 = [
  { label: "🎭 Carnaval", month: "Fev", multiplier: 0.12 },
  { label: "👩 Mães", month: "Mai", multiplier: 0.18 },
  { label: "💕 Namorados", month: "Jun", multiplier: 0.08 },
  { label: "👨 Pais", month: "Ago", multiplier: 0.10 },
  { label: "🧒 Crianças", month: "Out", multiplier: 0.15 },
  { label: "🛒 Black Friday", month: "Nov", multiplier: 0.30 },
  { label: "🎄 Natal", month: "Dez", multiplier: 0.45 },
];

// Tipo para dados anuais
interface AnnualData {
  year: number;
  sales: number;
  dollar: number;
  selic: number;
  ipca: number;
  pib: number;
  unemployment: number;
  income: number;
  gini: number;
  incomeClassA: number;
  incomeClassB: number;
  incomeClassC: number;
  incomeClassD: number;
  incomeClassE: number;
  pmcVest: number;
  pmcMov: number;
  pmcFarm: number;
  pmcComb: number;
  pmcVeic: number;
  pmcConst: number;
  [key: string]: number;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function DataAnalysisTab() {
  // Fetch de dados reais do banco
  const { data: annualData, isLoading, error, refetch } = useQuery({
    queryKey: ["data-analysis-annual"],
    queryFn: async (): Promise<AnnualData[]> => {
      const { data, error } = await supabase
        .from("indicator_values")
        .select(`
          reference_date,
          value,
          economic_indicators!inner(code)
        `)
        .in("economic_indicators.code", Object.keys(INDICATOR_MAPPING))
        .order("reference_date", { ascending: true });

      if (error) throw error;

      // Agrupar por ano e calcular médias
      const yearMap = new Map<number, Record<string, number[]>>();
      
      for (const row of data || []) {
        const year = new Date(row.reference_date).getFullYear();
        const code = (row.economic_indicators as any)?.code;
        const varKey = INDICATOR_MAPPING[code];
        
        if (!varKey) continue;
        
        if (!yearMap.has(year)) {
          yearMap.set(year, {});
        }
        const yearData = yearMap.get(year)!;
        if (!yearData[varKey]) {
          yearData[varKey] = [];
        }
        yearData[varKey].push(Number(row.value));
      }

      // Converter para array com médias
      const result: AnnualData[] = [];
      const sortedYears = Array.from(yearMap.keys()).sort();
      
      for (const year of sortedYears) {
        const yearValues = yearMap.get(year)!;
        const entry: AnnualData = {
          year,
          sales: 0,
          dollar: 0,
          selic: 0,
          ipca: 0,
          pib: 0,
          unemployment: 0,
          income: 0,
          gini: 0,
          incomeClassA: 0,
          incomeClassB: 0,
          incomeClassC: 0,
          incomeClassD: 0,
          incomeClassE: 0,
          pmcVest: 0,
          pmcMov: 0,
          pmcFarm: 0,
          pmcComb: 0,
          pmcVeic: 0,
          pmcConst: 0,
        };
        
        for (const [key, values] of Object.entries(yearValues)) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          // IPCA mensal → anualizado (soma aproximada)
          if (key === "ipca") {
            entry[key] = avg * 12;
          } else {
            entry[key] = avg;
          }
        }
        
        result.push(entry);
      }

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
  // Calcular limites de ano de corte dinamicamente
  const yearRange = useMemo(() => {
    if (!annualData || annualData.length < 2) return { min: 2015, max: 2023 };
    const years = annualData.map(d => d.year);
    return { min: Math.min(...years) + 2, max: Math.max(...years) - 1 };
  }, [annualData]);

  // Estados do Simulador
  const [cutoffYear, setCutoffYear] = useState(2022);
  const [showSimulator, setShowSimulator] = useState(false);
  const [futureSliders, setFutureSliders] = useState({
    dollar: 5.5,
    selic: 11.5,
    unemployment: 8.0,
    ipca: 5.0,
    pib: 2.0,
    income: 1848,
  });

  // Estados do Dropdown de Correlações
  const [customCorrelations, setCustomCorrelations] = useState<string[]>([]);
  const [showCorrelationPicker, setShowCorrelationPicker] = useState(false);

  // Estados dos novos gráficos
  const [selectedPmcSector, setSelectedPmcSector] = useState("sales");
  const [showAnalyticalCharts, setShowAnalyticalCharts] = useState(true);

  // Estados do Simulador 2026
  const [show2026Simulator, setShow2026Simulator] = useState(false);
  const [isAnimating2026, setIsAnimating2026] = useState(false);
  const [activeScenario, setActiveScenario] = useState<"neutral" | "optimistic" | "pessimistic">("neutral");
  const [sliders2026, setSliders2026] = useState(SCENARIOS_2026.neutral);
  const animationRef = useRef<number | null>(null);

  // Função para animar sliders do cenário 2026
  const applyScenario2026 = (scenario: "neutral" | "optimistic" | "pessimistic") => {
    if (isAnimating2026) return;
    
    setIsAnimating2026(true);
    setActiveScenario(scenario);
    const target = SCENARIOS_2026[scenario];
    const start = { ...sliders2026 };
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      setSliders2026({
        renda: start.renda + (target.renda - start.renda) * eased,
        dolar: start.dolar + (target.dolar - start.dolar) * eased,
        selic: start.selic + (target.selic - start.selic) * eased,
        ipca: start.ipca + (target.ipca - start.ipca) * eased,
        desemprego: start.desemprego + (target.desemprego - start.desemprego) * eased,
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating2026(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Dados prontos para uso (fallback vazio se loading)
  const data = annualData || [];

  // Calcular Matriz de Correlação usando Spearman
  const correlationMatrix = useMemo(() => {
    if (data.length < 3) return [];
    
    const variables = VARIABLES.map(v => v.key);
    const matrix: { x: string; y: string; value: number }[] = [];

    for (const v1 of variables) {
      for (const v2 of variables) {
        const values1 = data.map(d => d[v1 as keyof typeof d] as number).filter(v => v != null);
        const values2 = data.map(d => d[v2 as keyof typeof d] as number).filter(v => v != null);

        if (values1.length < 3 || values2.length < 3) {
          matrix.push({ x: v1, y: v2, value: 0 });
          continue;
        }

        try {
          const corr = spearmanCorrelation(values1, values2);
          matrix.push({ x: v1, y: v2, value: isNaN(corr) ? 0 : corr });
        } catch {
          matrix.push({ x: v1, y: v2, value: 0 });
        }
      }
    }
    return matrix;
  }, [data]);

  // Top Correlações com Vendas
  const topCorrelations = useMemo(() => {
    if (data.length < 3) return [];
    
    const salesValues = data.map(d => d.sales).filter(v => v != null && v > 0);
    const correlations: { variable: string; label: string; value: number; lag: number }[] = [];

    for (const v of VARIABLES) {
      if (v.key === "sales") continue;
      const varValues = data.map(d => d[v.key as keyof typeof d] as number).filter(v => v != null);

      if (varValues.length < 3 || salesValues.length < 3) continue;

      try {
        const result = findOptimalLag(salesValues, varValues, 3);
        correlations.push({
          variable: v.key,
          label: v.label,
          value: result.correlation,
          lag: Math.abs(result.lag),
        });
      } catch {
        const corr = spearmanCorrelation(salesValues, varValues);
        correlations.push({
          variable: v.key,
          label: v.label,
          value: isNaN(corr) ? 0 : corr,
          lag: 0,
        });
      }
    }

    return correlations.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [data]);

  // Dados para Scatter Plot (Selic vs Vendas com bolha IPCA)
  const scatterData = useMemo(() => {
    return data.filter(d => d.sales > 0 && d.selic > 0).map(d => ({
      selic: d.selic,
      sales: d.sales,
      ipca: Math.max(d.ipca, 1) * 3,
      year: d.year,
    }));
  }, [data]);

  // ============================================
  // DADOS PARA GRÁFICOS ANALÍTICOS (4 novos)
  // ============================================

  // Gráfico 1: Renda Per Capita (dados + trend line)
  const rendaChartData = useMemo(() => {
    const rendaData = data.filter(d => d.income > 0).map(d => ({
      year: d.year,
      income: d.income,
    }));
    
    if (rendaData.length < 2) return { data: rendaData, trendLine: [] };
    
    const dataPoints: [number, number][] = rendaData.map(d => [d.year, d.income]);
    const regression = linearRegression(dataPoints);
    const [intercept, slope] = regression.equation;
    
    const trendLine = rendaData.map(d => ({
      year: d.year,
      trend: slope * d.year + intercept,
    }));
    
    return { 
      data: rendaData.map((d, i) => ({ ...d, trend: trendLine[i]?.trend || 0 })),
      r2: regression.r2,
      slope 
    };
  }, [data]);

  // Gráfico 2: Vendas do Setor (PMC por setor, anualizado)
  const pmcSectorChartData = useMemo(() => {
    const sectorData = data.filter(d => d.year >= 2010).map(d => ({
      year: d.year,
      sales: d.sales,
      pmcVest: d.pmcVest,
      pmcMov: d.pmcMov,
      pmcFarm: d.pmcFarm,
      pmcComb: d.pmcComb,
      pmcVeic: d.pmcVeic,
      pmcConst: d.pmcConst,
    }));
    return sectorData;
  }, [data]);

  // Gráfico 3: Impacto Renda vs Vendas (ScatterChart com regressão)
  const rendaVsVendasData = useMemo(() => {
    const validData = data.filter(d => d.income > 0 && d.sales > 0);
    if (validData.length < 3) return { data: [], r2: 0, elasticity: 0 };
    
    const scatterPoints = validData.map(d => ({
      income: d.income,
      sales: d.sales,
      year: d.year,
    }));
    
    const dataPoints: [number, number][] = validData.map(d => [d.income, d.sales]);
    const regression = linearRegression(dataPoints);
    const [intercept, slope] = regression.equation;
    
    // Elasticidade: (∂Y/∂X) * (X̄/Ȳ)
    const avgIncome = validData.reduce((sum, d) => sum + d.income, 0) / validData.length;
    const avgSales = validData.reduce((sum, d) => sum + d.sales, 0) / validData.length;
    const elasticity = slope * (avgIncome / avgSales);
    
    // Linha de regressão
    const minIncome = Math.min(...validData.map(d => d.income));
    const maxIncome = Math.max(...validData.map(d => d.income));
    const regressionLine = [
      { income: minIncome, trendSales: slope * minIncome + intercept },
      { income: maxIncome, trendSales: slope * maxIncome + intercept },
    ];
    
    return { data: scatterPoints, regressionLine, r2: regression.r2, elasticity };
  }, [data]);

  // Gráfico 4: Participação Classes Sociais (Stacked 100%)
  const classesChartData = useMemo(() => {
    const classData = data.filter(d => 
      d.incomeClassA > 0 || d.incomeClassB > 0 || d.incomeClassC > 0 || 
      d.incomeClassD > 0 || d.incomeClassE > 0
    ).map(d => {
      const total = d.incomeClassA + d.incomeClassB + d.incomeClassC + d.incomeClassD + d.incomeClassE;
      if (total === 0) return null;
      return {
        year: d.year,
        A: (d.incomeClassA / total) * 100,
        B: (d.incomeClassB / total) * 100,
        C: (d.incomeClassC / total) * 100,
        D: (d.incomeClassD / total) * 100,
        E: (d.incomeClassE / total) * 100,
        rawA: d.incomeClassA,
        rawB: d.incomeClassB,
        rawC: d.incomeClassC,
        rawD: d.incomeClassD,
        rawE: d.incomeClassE,
      };
    }).filter(Boolean);
    return classData;
  }, [data]);

  // ============================================
  // DADOS PARA SIMULADOR 2026
  // ============================================

  const simulator2026Data = useMemo(() => {
    // Dados históricos de vendas (PMC)
    const historicalSales = data.filter(d => d.sales > 0).map(d => ({
      year: d.year,
      sales: d.sales,
      type: "historical" as const,
    }));

    if (historicalSales.length < 3) return { chartData: [], projection: 0 };

    // Regressão para projeção base
    const dataPoints: [number, number][] = historicalSales.map(d => [d.year, d.sales]);
    const regression = linearRegression(dataPoints);
    const [intercept, slope] = regression.equation;

    // Calcular projeção 2026 com ajustes dos sliders
    const baseProjection = slope * 2026 + intercept;
    
    // Efeitos dos sliders (simplificado)
    const rendaEffect = ((sliders2026.renda - 1950) / 1950) * 0.3;
    const dolarEffect = ((5.80 - sliders2026.dolar) / 5.80) * 0.1;
    const selicEffect = ((12.5 - sliders2026.selic) / 12.5) * 0.15;
    const ipcaEffect = ((4.5 - sliders2026.ipca) / 4.5) * 0.1;
    const desempregoEffect = ((7.5 - sliders2026.desemprego) / 7.5) * 0.2;

    const totalEffect = 1 + rendaEffect + dolarEffect + selicEffect + ipcaEffect + desempregoEffect;
    const projection2026 = baseProjection * totalEffect;

    // Dados do gráfico
    const chartData = [
      ...historicalSales,
      { year: 2026, sales: projection2026, type: "projection" as const },
    ];

    // Barras sazonais
    const seasonalBars = SEASONAL_2026.map(s => ({
      ...s,
      value: projection2026 * s.multiplier,
    }));

    return { chartData, projection: projection2026, seasonalBars };
  }, [data, sliders2026]);

  // ============================================
  // PARTE 2: SIMULADOR PREDITIVO (existente)
  // ============================================

  const { chartData, modelMetrics, sensitivity } = useMemo(() => {
    if (data.length < 3) {
      return { chartData: [], modelMetrics: { r2: 0, slope: 0, intercept: 0 }, sensitivity: {} };
    }
    
    const trainingData = data.filter(d => d.year <= cutoffYear && d.sales > 0);
    const testData = data.filter(d => d.year > cutoffYear);

    if (trainingData.length < 3) {
      return { chartData: [], modelMetrics: { r2: 0, slope: 0, intercept: 0 }, sensitivity: {} };
    }

    // Regressão linear: Vendas = β₀ + β₁ × Ano (tendência temporal)
    const dataPoints: [number, number][] = trainingData.map(d => [d.year, d.sales]);
    const result = linearRegression(dataPoints);
    const [intercept, slope] = result.equation;
    const r2 = result.r2;

    // Gerar dados do gráfico
    const chartPoints = data.filter(d => d.sales > 0).map(d => {
      const predicted = slope * d.year + intercept;
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

    // Projeções futuras (3 anos)
    const lastYear = data[data.length - 1]?.year || 2024;

    for (let i = 1; i <= 3; i++) {
      const futureYear = lastYear + i;

      // Aplicar efeitos dos sliders
      let totalEffect = 0;
      SLIDER_CONFIG.forEach(s => {
        const sliderValue = futureSliders[s.key as keyof typeof futureSliders];
        const delta = s.baseline - sliderValue;
        totalEffect += delta * s.effect;
      });

      // Efeito das correlações customizadas
      let correlationEffect = 0;
      customCorrelations.forEach(varName => {
        const corr = topCorrelations.find(c => c.variable === varName);
        if (corr) {
          correlationEffect += corr.value * 0.05;
        }
      });

      const basePredicted = slope * futureYear + intercept;
      const predicted = basePredicted * (1 + totalEffect + correlationEffect);

      chartPoints.push({
        year: futureYear,
        actual: null,
        predicted: predicted,
        backtested: null,
        lower: predicted * 0.85,
        upper: predicted * 1.15,
      });
    }

    // Calcular sensibilidade
    const sens: Record<string, string> = {};
    SLIDER_CONFIG.forEach(s => {
      const sliderValue = futureSliders[s.key as keyof typeof futureSliders];
      const delta = s.baseline - sliderValue;
      sens[s.key] = (delta * s.effect * 100).toFixed(1);
    });

    return {
      chartData: chartPoints,
      modelMetrics: { r2, slope, intercept },
      sensitivity: sens,
    };
  }, [cutoffYear, futureSliders, customCorrelations, topCorrelations, data]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dados econômicos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-4" />
          <p className="text-destructive font-medium">Erro ao carregar dados</p>
          <p className="text-muted-foreground text-sm mt-2">{(error as Error).message}</p>
          <Button onClick={() => refetch()} className="mt-4" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }


  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const getCorrelationColor = (value: number) => {
    if (value > 0.7) return "bg-emerald-500";
    if (value > 0.4) return "bg-emerald-500/60";
    if (value > 0) return "bg-emerald-500/30";
    if (value > -0.4) return "bg-red-500/30";
    if (value > -0.7) return "bg-red-500/60";
    return "bg-red-500";
  };

  const formatSliderValue = (key: string, value: number) => {
    if (key === "dollar" || key === "income") return `R$ ${value.toLocaleString("pt-BR")}`;
    if (key === "confidence") return value.toString();
    return `${value}%`;
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6 p-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Análise de Dados</h2>
          <p className="text-muted-foreground">Diagnóstico histórico e simulador preditivo</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* ============================================ */}
      {/* PARTE 1: DIAGNÓSTICO HISTÓRICO */}
      {/* ============================================ */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MATRIZ DE CORRELAÇÃO */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Matriz de Correlação
            </CardTitle>
            <CardDescription>Usando Spearman (melhor para séries temporais)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `60px repeat(${VARIABLES.length}, 1fr)` }}>
                {/* Header */}
                <div className="h-8" />
                {VARIABLES.map(v => (
                  <div key={v.key} className="h-8 flex items-center justify-center text-[10px] font-medium text-muted-foreground truncate px-1">
                    {v.label.slice(0, 6)}
                  </div>
                ))}

                {/* Rows */}
                {VARIABLES.map(rowVar => (
                  <div key={`row-${rowVar.key}`} className="contents">
                    <div className="h-8 flex items-center text-[10px] font-medium text-muted-foreground truncate">
                      {rowVar.label.slice(0, 8)}
                    </div>
                    {VARIABLES.map(colVar => {
                      const cell = correlationMatrix.find(c => c.x === rowVar.key && c.y === colVar.key);
                      const value = cell?.value || 0;
                      return (
                        <div
                          key={`${rowVar.key}-${colVar.key}`}
                          className={`h-8 flex items-center justify-center text-[9px] font-mono text-white rounded-sm ${getCorrelationColor(value)}`}
                          title={`${rowVar.label} × ${colVar.label}: ${value.toFixed(2)}`}
                        >
                          {value.toFixed(2)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legenda */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-red-500" />
                Negativa
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-muted" />
                Neutro
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-emerald-500" />
                Positiva
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SCATTER PLOT - SELIC VS VENDAS */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Impacto: Selic vs Vendas</CardTitle>
            <CardDescription>Tamanho da bolha = Inflação (IPCA)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="selic" 
                    name="Selic" 
                    type="number" 
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    label={{ value: "Selic (%)", position: "bottom", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    dataKey="sales" 
                    name="Vendas" 
                    type="number"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => v.toFixed(0)}
                  />
                  <ZAxis dataKey="ipca" range={[50, 400]} name="IPCA" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "Vendas") return [value.toFixed(1), "PMC"];
                      if (name === "Selic") return [`${value.toFixed(2)}%`, name];
                      return [value, name];
                    }}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `Ano: ${item.year}` : "";
                    }}
                  />
                  <Scatter name="Anos" data={scatterData} fill="hsl(var(--primary))">
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.ipca / 5 > 6 ? "#ef4444" : entry.ipca / 5 > 4 ? "#f59e0b" : "#10b981"}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TOP 10 CORRELAÇÕES */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Top Correlações com Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {topCorrelations.slice(0, 10).map((corr, i) => (
              <div
                key={corr.variable}
                className={`p-3 rounded-lg text-center ${
                  corr.value > 0
                    ? "bg-emerald-500/10 border border-emerald-500/30"
                    : "bg-red-500/10 border border-red-500/30"
                }`}
              >
                <p className="text-xs font-medium text-foreground truncate">{corr.label}</p>
                <p className={`text-lg font-bold ${corr.value > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {corr.value > 0 ? "+" : ""}{corr.value.toFixed(2)}
                </p>
                {corr.lag > 0 && (
                  <Badge variant="outline" className="text-[10px] mt-1">
                    lag {corr.lag}m
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* GRÁFICOS ANALÍTICOS (4 novos) */}
      {/* ============================================ */}

      <div className="flex items-center gap-4">
        <Button
          variant={showAnalyticalCharts ? "default" : "outline"}
          onClick={() => setShowAnalyticalCharts(!showAnalyticalCharts)}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          {showAnalyticalCharts ? "Ocultar" : "Mostrar"} Gráficos Analíticos
        </Button>
        <Button
          variant={show2026Simulator ? "default" : "outline"}
          onClick={() => setShow2026Simulator(!show2026Simulator)}
          className="gap-2"
        >
          <Calculator className="h-4 w-4" />
          Simulador 2026
        </Button>
      </div>

      {showAnalyticalCharts && (
        <Tabs defaultValue="renda" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="renda">Renda Per Capita</TabsTrigger>
            <TabsTrigger value="vendas">Vendas por Setor</TabsTrigger>
            <TabsTrigger value="impacto">Renda vs Vendas</TabsTrigger>
            <TabsTrigger value="classes">Classes Sociais</TabsTrigger>
          </TabsList>

          {/* TAB 1: RENDA PER CAPITA */}
          <TabsContent value="renda">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Renda Per Capita (2012-2025)</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  Evolução com linha de tendência
                  {rendaChartData.r2 && (
                    <Badge variant="outline">R² = {rendaChartData.r2.toFixed(3)}</Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rendaChartData.data} margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="year" 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => `R$ ${v.toLocaleString("pt-BR")}`}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => [
                          `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`,
                          name === "income" ? "Renda" : "Tendência"
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="income"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "hsl(var(--primary))" }}
                        name="Renda Per Capita"
                      />
                      <Line
                        type="monotone"
                        dataKey="trend"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Tendência"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: VENDAS DO SETOR */}
          <TabsContent value="vendas">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Vendas por Setor (PMC)</CardTitle>
                    <CardDescription>Dados anualizados com linha de tendência</CardDescription>
                  </div>
                  <Select value={selectedPmcSector} onValueChange={setSelectedPmcSector}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Selecione setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {PMC_SECTORS.map(s => (
                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pmcSectorChartData} margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="year" 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => v.toFixed(0)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey={selectedPmcSector}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "hsl(var(--primary))" }}
                        name={PMC_SECTORS.find(s => s.key === selectedPmcSector)?.label || "PMC"}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: IMPACTO RENDA VS VENDAS */}
          <TabsContent value="impacto">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Impacto: Renda vs Vendas</CardTitle>
                    <CardDescription>Correlação com linha de regressão</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">R² = {rendaVsVendasData.r2.toFixed(3)}</Badge>
                    <Badge variant={rendaVsVendasData.elasticity > 0 ? "default" : "destructive"}>
                      Elasticidade: {rendaVsVendasData.elasticity.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="income"
                        type="number"
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => `R$ ${v}`}
                        label={{ value: "Renda Per Capita (R$)", position: "bottom", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => v.toFixed(0)}
                        label={{ value: "PMC", angle: -90, position: "insideLeft", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => [
                          name === "sales" ? value.toFixed(1) : `R$ ${value.toLocaleString("pt-BR")}`,
                          name === "sales" ? "PMC" : "Renda"
                        ]}
                        labelFormatter={(_, payload) => {
                          const item = payload?.[0]?.payload;
                          return item ? `Ano: ${item.year}` : "";
                        }}
                      />
                      <Scatter 
                        data={rendaVsVendasData.data} 
                        fill="hsl(var(--primary))"
                        name="Anos"
                      >
                        {rendaVsVendasData.data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                        ))}
                      </Scatter>
                      <Line
                        data={rendaVsVendasData.regressionLine}
                        type="linear"
                        dataKey="trendSales"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Regressão"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: PARTICIPAÇÃO CLASSES SOCIAIS */}
          <TabsContent value="classes">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Participação das Classes Sociais</CardTitle>
                <CardDescription>Distribuição percentual da renda (2012-2025)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={classesChartData} stackOffset="expand" margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="year" 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string, props: any) => {
                          const raw = props.payload?.[`raw${name}`];
                          return [
                            `${(value * 100).toFixed(1)}% (R$ ${raw?.toLocaleString("pt-BR") || "N/A"})`,
                            `Classe ${name}`
                          ];
                        }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="E" stackId="1" stroke={CLASS_COLORS.E} fill={CLASS_COLORS.E} name="E (20% mais pobres)" />
                      <Area type="monotone" dataKey="D" stackId="1" stroke={CLASS_COLORS.D} fill={CLASS_COLORS.D} name="D (20%)" />
                      <Area type="monotone" dataKey="C" stackId="1" stroke={CLASS_COLORS.C} fill={CLASS_COLORS.C} name="C (40% classe média)" />
                      <Area type="monotone" dataKey="B" stackId="1" stroke={CLASS_COLORS.B} fill={CLASS_COLORS.B} name="B (15%)" />
                      <Area type="monotone" dataKey="A" stackId="1" stroke={CLASS_COLORS.A} fill={CLASS_COLORS.A} name="A (Top 5%)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* ============================================ */}
      {/* SIMULADOR 2026 */}
      {/* ============================================ */}

      {show2026Simulator && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-primary" />
              Simulador de Cenários 2026
              {isAnimating2026 && <Bot className="h-5 w-5 animate-spin text-primary" />}
            </CardTitle>
            <CardDescription>Projete vendas 2026 com base em variáveis macroeconômicas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* GRÁFICO DE PROJEÇÃO */}
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={simulator2026Data.chartData} margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => v.toFixed(0)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [value.toFixed(1), "PMC"]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="PMC"
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.type === "projection") {
                        return <circle cx={cx} cy={cy} r={6} fill="#10b981" stroke="#10b981" />;
                      }
                      return <circle cx={cx} cy={cy} r={4} fill="hsl(var(--primary))" />;
                    }}
                  />
                  <ReferenceLine
                    x={2025}
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="3 3"
                    label={{ value: "2026 →", position: "top", fontSize: 10, fill: "hsl(var(--destructive))" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* SLIDERS + CENÁRIOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SLIDERS */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">Parâmetros Macroeconômicos</h4>
                
                {/* Renda */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Renda Per Capita</span>
                    <span className="font-medium">R$ {sliders2026.renda.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                  </div>
                  <Slider
                    value={[sliders2026.renda]}
                    onValueChange={([v]) => setSliders2026(prev => ({ ...prev, renda: v }))}
                    min={1500}
                    max={2500}
                    step={50}
                    disabled={isAnimating2026}
                  />
                </div>

                {/* Dólar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dólar</span>
                    <span className="font-medium">R$ {sliders2026.dolar.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[sliders2026.dolar]}
                    onValueChange={([v]) => setSliders2026(prev => ({ ...prev, dolar: v }))}
                    min={4.5}
                    max={7.5}
                    step={0.1}
                    disabled={isAnimating2026}
                  />
                </div>

                {/* Selic */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Selic</span>
                    <span className="font-medium">{sliders2026.selic.toFixed(1)}%</span>
                  </div>
                  <Slider
                    value={[sliders2026.selic]}
                    onValueChange={([v]) => setSliders2026(prev => ({ ...prev, selic: v }))}
                    min={8}
                    max={18}
                    step={0.5}
                    disabled={isAnimating2026}
                  />
                </div>

                {/* IPCA */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IPCA</span>
                    <span className="font-medium">{sliders2026.ipca.toFixed(1)}%</span>
                  </div>
                  <Slider
                    value={[sliders2026.ipca]}
                    onValueChange={([v]) => setSliders2026(prev => ({ ...prev, ipca: v }))}
                    min={2}
                    max={10}
                    step={0.5}
                    disabled={isAnimating2026}
                  />
                </div>

                {/* Desemprego */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Desemprego</span>
                    <span className="font-medium">{sliders2026.desemprego.toFixed(1)}%</span>
                  </div>
                  <Slider
                    value={[sliders2026.desemprego]}
                    onValueChange={([v]) => setSliders2026(prev => ({ ...prev, desemprego: v }))}
                    min={4}
                    max={12}
                    step={0.5}
                    disabled={isAnimating2026}
                  />
                </div>
              </div>

              {/* BOTÕES DE CENÁRIO */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">Cenários Pré-definidos</h4>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={activeScenario === "optimistic" ? "default" : "outline"}
                    className="flex flex-col items-center gap-1 h-auto py-4"
                    onClick={() => applyScenario2026("optimistic")}
                    disabled={isAnimating2026}
                  >
                    <Smile className="h-6 w-6 text-emerald-400" />
                    <span>Otimista</span>
                    <span className="text-[10px] text-muted-foreground">😊</span>
                  </Button>
                  <Button
                    variant={activeScenario === "neutral" ? "default" : "outline"}
                    className="flex flex-col items-center gap-1 h-auto py-4"
                    onClick={() => applyScenario2026("neutral")}
                    disabled={isAnimating2026}
                  >
                    <Meh className="h-6 w-6 text-amber-400" />
                    <span>Neutro</span>
                    <span className="text-[10px] text-muted-foreground">😐</span>
                  </Button>
                  <Button
                    variant={activeScenario === "pessimistic" ? "default" : "outline"}
                    className="flex flex-col items-center gap-1 h-auto py-4"
                    onClick={() => applyScenario2026("pessimistic")}
                    disabled={isAnimating2026}
                  >
                    <Frown className="h-6 w-6 text-red-400" />
                    <span>Pessimista</span>
                    <span className="text-[10px] text-muted-foreground">😟</span>
                  </Button>
                </div>

                {/* Projeção resultado */}
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
                  <p className="text-sm text-muted-foreground">Projeção PMC 2026</p>
                  <p className="text-3xl font-bold text-primary">{simulator2026Data.projection.toFixed(1)}</p>
                </div>
              </div>
            </div>

            {/* BARRAS SAZONAIS */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Eventos Sazonais 2026</h4>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={simulator2026Data.seasonalBars} margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => v.toFixed(0)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value.toFixed(1)} (+${(props.payload.multiplier * 100).toFixed(0)}%)`,
                        props.payload.label
                      ]}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                      {simulator2026Data.seasonalBars?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.multiplier >= 0.30 ? "#10b981" : entry.multiplier >= 0.15 ? "#f59e0b" : "hsl(var(--primary))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* PARTE 2: SIMULADOR PREDITIVO (existente) */}
      {/* ============================================ */}

      {/* TOGGLE + ANO DE CORTE + R² */}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant={showSimulator ? "default" : "outline"}
          onClick={() => setShowSimulator(!showSimulator)}
          className="gap-2"
        >
          <Calculator className="h-4 w-4" />
          {showSimulator ? "Ocultar" : "Mostrar"} Simulador Preditivo
        </Button>

        {showSimulator && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ano de Corte:</span>
              <Select value={cutoffYear.toString()} onValueChange={(v) => setCutoffYear(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: yearRange.max - yearRange.min + 1 }, (_, i) => yearRange.min + i).map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Badge variant={modelMetrics.r2 > 0.7 ? "default" : modelMetrics.r2 > 0.5 ? "secondary" : "destructive"}>
              R² = {modelMetrics.r2.toFixed(3)}
            </Badge>
          </>
        )}
      </div>

      {showSimulator && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PAINEL DE SLIDERS */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Cenário What-If
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCorrelationPicker(true)}
                    disabled={customCorrelations.length >= 5}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {SLIDER_CONFIG.map(s => (
                  <div key={s.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{s.label}</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatSliderValue(s.key, futureSliders[s.key as keyof typeof futureSliders])}
                      </span>
                    </div>
                    <Slider
                      value={[futureSliders[s.key as keyof typeof futureSliders]]}
                      onValueChange={([v]) => setFutureSliders(prev => ({ ...prev, [s.key]: v }))}
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{s.min}{s.unit === "R$" ? "" : s.unit}</span>
                      <span className={
                        Number(sensitivity[s.key]) > 0 ? "text-emerald-400" :
                        Number(sensitivity[s.key]) < 0 ? "text-red-400" : ""
                      }>
                        {Number(sensitivity[s.key]) > 0 ? "+" : ""}{sensitivity[s.key]}%
                      </span>
                      <span>{s.max}{s.unit === "R$" ? "" : s.unit}</span>
                    </div>
                  </div>
                ))}

                {/* Correlações Customizadas Selecionadas */}
                {customCorrelations.length > 0 && (
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Variáveis Correlacionadas:</p>
                    <div className="flex flex-wrap gap-2">
                      {customCorrelations.map(varName => {
                        const corr = topCorrelations.find(c => c.variable === varName);
                        return (
                          <Badge key={varName} variant="secondary" className="gap-1 pr-1">
                            <span>{corr?.label}</span>
                            <span className={corr?.value && corr.value > 0 ? "text-emerald-400" : "text-red-400"}>
                              {corr?.value && corr.value > 0 ? "+" : ""}{((corr?.value || 0) * 100).toFixed(0)}%
                            </span>
                            <button
                              onClick={() => setCustomCorrelations(customCorrelations.filter(c => c !== varName))}
                              className="ml-1 hover:bg-destructive/20 rounded p-0.5"
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

            {/* GRÁFICO BACKTESTING & PROJEÇÃO */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Backtesting & Projeção Futura</CardTitle>
                  {modelMetrics.r2 < 0.5 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Modelo com baixa precisão
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="year" 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number | null, name: string) => {
                          if (value === null) return ["-", name];
                          return [`R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      
                      {/* Intervalo de Confiança */}
                      <Area
                        type="monotone"
                        dataKey="upper"
                        stroke="transparent"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.1}
                        name="IC Superior"
                      />
                      <Area
                        type="monotone"
                        dataKey="lower"
                        stroke="transparent"
                        fill="hsl(var(--background))"
                        fillOpacity={1}
                        name="IC Inferior"
                      />

                      {/* Linhas */}
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "hsl(var(--primary))" }}
                        name="Vendas Reais"
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="backtested"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 3 }}
                        name="Backtest"
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#10b981" }}
                        name="Projeção"
                        connectNulls={false}
                      />

                      {/* Linha de Corte */}
                      <ReferenceLine
                        x={cutoffYear}
                        stroke="hsl(var(--destructive))"
                        strokeDasharray="3 3"
                        label={{
                          value: "Corte",
                          position: "top",
                          fontSize: 10,
                          fill: "hsl(var(--destructive))",
                        }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CARTÕES DE SENSIBILIDADE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {SLIDER_CONFIG.map(s => (
              <Card key={s.key} className="border-border/50 bg-card/50 backdrop-blur p-3 text-center">
                <p className="text-xs text-muted-foreground truncate">{s.label.split(" ")[0]}</p>
                <p className={`text-xl font-bold ${
                  Number(sensitivity[s.key]) > 0 ? "text-emerald-400" :
                  Number(sensitivity[s.key]) < 0 ? "text-red-400" :
                  "text-muted-foreground"
                }`}>
                  {Number(sensitivity[s.key]) > 0 ? "+" : ""}{sensitivity[s.key]}%
                </p>
                <p className="text-[10px] text-muted-foreground">Impacto</p>
              </Card>
            ))}
          </div>

          {/* MULTIPLICADORES SAZONAIS */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="py-3">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-muted-foreground">Multiplicadores Sazonais:</span>
                {SEASONAL_MULTIPLIERS.map(m => (
                  <Badge key={m.label} variant="outline" className="text-sm">
                    {m.label}: {m.value}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ============================================ */}
      {/* PARTE 3: DIALOG DE CORRELAÇÕES */}
      {/* ============================================ */}

      <Dialog open={showCorrelationPicker} onOpenChange={setShowCorrelationPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Variável Correlacionada</DialogTitle>
            <DialogDescription>
              Selecione variáveis com base no nível de correlação com Vendas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {topCorrelations
              .filter(c => !customCorrelations.includes(c.variable))
              .slice(0, 15)
              .map(corr => {
                const strength = getCorrelationStrengthPtBr(corr.value);
                return (
                  <div
                    key={corr.variable}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => {
                      if (customCorrelations.length < 5) {
                        setCustomCorrelations([...customCorrelations, corr.variable]);
                        setShowCorrelationPicker(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{corr.label}</span>
                      {corr.lag > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          lag {corr.lag}m
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-sm ${
                        corr.value > 0.5 ? "text-emerald-400" :
                        corr.value > 0 ? "text-emerald-400/70" :
                        corr.value > -0.5 ? "text-red-400/70" :
                        "text-red-400"
                      }`}>
                        {corr.value > 0 ? "+" : ""}{(corr.value * 100).toFixed(0)}%
                      </span>
                      <Badge variant={
                        Math.abs(corr.value) > 0.7 ? "default" :
                        Math.abs(corr.value) > 0.5 ? "secondary" :
                        "outline"
                      }>
                        {strength.strength}
                      </Badge>
                    </div>
                  </div>
                );
              })}
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                Selecionadas: {customCorrelations.length}/5
              </span>
              <Button variant="outline" onClick={() => setShowCorrelationPicker(false)}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
