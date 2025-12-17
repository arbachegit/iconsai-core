import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, 
  ComposedChart, Area, ReferenceLine 
} from "recharts";
import { Calculator, TrendingUp, AlertTriangle, Plus, X, RefreshCw, BarChart3 } from "lucide-react";
import { spearmanCorrelation, findOptimalLag, getCorrelationStrengthPtBr } from "@/lib/time-series-correlation";

// Simple linear regression implementation (replaces regression library)
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
  
  // Calculate R²
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

// ============================================
// DADOS MOCK PARA DEMONSTRAÇÃO
// ============================================
const MOCK_ANNUAL_DATA = [
  { year: 2015, sales: 180000, income: 2800, dollar: 3.9, selic: 14.25, ipca: 10.67, pib: -3.5, unemployment: 8.5, confidence: 78 },
  { year: 2016, sales: 165000, income: 2750, dollar: 3.5, selic: 13.75, ipca: 6.29, pib: -3.3, unemployment: 11.5, confidence: 72 },
  { year: 2017, sales: 185000, income: 2900, dollar: 3.3, selic: 7.0, ipca: 2.95, pib: 1.3, unemployment: 12.7, confidence: 85 },
  { year: 2018, sales: 195000, income: 3000, dollar: 3.9, selic: 6.5, ipca: 3.75, pib: 1.8, unemployment: 12.3, confidence: 88 },
  { year: 2019, sales: 210000, income: 3100, dollar: 4.0, selic: 4.5, ipca: 4.31, pib: 1.2, unemployment: 11.9, confidence: 92 },
  { year: 2020, sales: 175000, income: 2850, dollar: 5.2, selic: 2.0, ipca: 4.52, pib: -3.9, unemployment: 13.5, confidence: 65 },
  { year: 2021, sales: 220000, income: 3050, dollar: 5.4, selic: 9.25, ipca: 10.06, pib: 5.0, unemployment: 13.2, confidence: 75 },
  { year: 2022, sales: 245000, income: 3200, dollar: 5.2, selic: 13.75, ipca: 5.79, pib: 2.9, unemployment: 9.3, confidence: 82 },
  { year: 2023, sales: 260000, income: 3350, dollar: 4.9, selic: 11.75, ipca: 4.62, pib: 2.9, unemployment: 7.8, confidence: 90 },
  { year: 2024, sales: 275000, income: 3500, dollar: 5.5, selic: 10.5, ipca: 4.5, pib: 2.5, unemployment: 7.0, confidence: 95 },
];

const VARIABLES = [
  { key: "sales", label: "Vendas", unit: "R$" },
  { key: "income", label: "Renda", unit: "R$" },
  { key: "dollar", label: "Dólar", unit: "R$" },
  { key: "selic", label: "Selic", unit: "%" },
  { key: "ipca", label: "IPCA", unit: "%" },
  { key: "pib", label: "PIB", unit: "%" },
  { key: "unemployment", label: "Desemprego", unit: "%" },
  { key: "confidence", label: "Confiança", unit: "" },
];

const SLIDER_CONFIG = [
  { key: "dollar", label: "Dólar Futuro (R$)", min: 4, max: 7, step: 0.1, unit: "R$", baseline: 5.5, effect: 0.05 },
  { key: "selic", label: "Selic Futura (%)", min: 5, max: 15, step: 0.25, unit: "%", baseline: 11, effect: 0.02 },
  { key: "unemployment", label: "Desemprego Futuro (%)", min: 5, max: 15, step: 0.5, unit: "%", baseline: 8, effect: 0.03 },
  { key: "ipca", label: "IPCA Futuro (%)", min: 2, max: 12, step: 0.25, unit: "%", baseline: 5, effect: 0.02 },
  { key: "pib", label: "PIB Futuro (%)", min: -3, max: 5, step: 0.5, unit: "%", baseline: 0, effect: 0.04 },
  { key: "income", label: "Renda Futura (R$)", min: 2500, max: 4000, step: 50, unit: "R$", baseline: 3000, effect: 0.001 },
  { key: "confidence", label: "Confiança do Consumidor", min: 60, max: 120, step: 1, unit: "", baseline: 90, effect: 0.01 },
];

const SEASONAL_MULTIPLIERS = [
  { label: "🎄 Natal", value: "+45%" },
  { label: "🛒 Black Friday", value: "+30%" },
  { label: "🥚 Páscoa", value: "+15%" },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function DataAnalysisTab() {
  // Estados do Simulador
  const [cutoffYear, setCutoffYear] = useState(2022);
  const [showSimulator, setShowSimulator] = useState(false);
  const [futureSliders, setFutureSliders] = useState({
    dollar: 5.5,
    selic: 11.5,
    unemployment: 8.0,
    ipca: 5.0,
    pib: 2.0,
    income: 3200,
    confidence: 95,
  });

  // Estados do Dropdown de Correlações
  const [customCorrelations, setCustomCorrelations] = useState<string[]>([]);
  const [showCorrelationPicker, setShowCorrelationPicker] = useState(false);

  // ============================================
  // PARTE 1: DIAGNÓSTICO HISTÓRICO
  // ============================================

  // Calcular Matriz de Correlação usando Spearman
  const correlationMatrix = useMemo(() => {
    const variables = VARIABLES.map(v => v.key);
    const matrix: { x: string; y: string; value: number }[] = [];

    for (const v1 of variables) {
      for (const v2 of variables) {
        const values1 = MOCK_ANNUAL_DATA.map(d => d[v1 as keyof typeof d] as number);
        const values2 = MOCK_ANNUAL_DATA.map(d => d[v2 as keyof typeof d] as number);

        try {
          const corr = spearmanCorrelation(values1, values2);
          matrix.push({ x: v1, y: v2, value: isNaN(corr) ? 0 : corr });
        } catch {
          matrix.push({ x: v1, y: v2, value: 0 });
        }
      }
    }
    return matrix;
  }, []);

  // Top Correlações com Vendas
  const topCorrelations = useMemo(() => {
    const salesValues = MOCK_ANNUAL_DATA.map(d => d.sales);
    const correlations: { variable: string; label: string; value: number; lag: number }[] = [];

    for (const v of VARIABLES) {
      if (v.key === "sales") continue;
      const varValues = MOCK_ANNUAL_DATA.map(d => d[v.key as keyof typeof d] as number);

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
  }, []);

  // Dados para Scatter Plot
  const scatterData = useMemo(() => {
    return MOCK_ANNUAL_DATA.map(d => ({
      income: d.income,
      sales: d.sales,
      ipca: d.ipca * 5,
      year: d.year,
    }));
  }, []);

  // ============================================
  // PARTE 2: SIMULADOR PREDITIVO
  // ============================================

  const { chartData, modelMetrics, sensitivity } = useMemo(() => {
    const trainingData = MOCK_ANNUAL_DATA.filter(d => d.year <= cutoffYear);
    const testData = MOCK_ANNUAL_DATA.filter(d => d.year > cutoffYear);

    if (trainingData.length < 3) {
      return { chartData: [], modelMetrics: { r2: 0, slope: 0, intercept: 0 }, sensitivity: {} };
    }

    // Regressão linear: Vendas = β₀ + β₁ × Renda
    const dataPoints: [number, number][] = trainingData.map(d => [d.income, d.sales]);
    const result = linearRegression(dataPoints);
    const [intercept, slope] = result.equation;
    const r2 = result.r2;

    // Gerar dados do gráfico
    const chartPoints = MOCK_ANNUAL_DATA.map(d => {
      const predicted = slope * d.income + intercept;
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
    const lastYear = MOCK_ANNUAL_DATA[MOCK_ANNUAL_DATA.length - 1]?.year || 2024;

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

      const adjustedIncome = futureSliders.income * (1 + totalEffect + correlationEffect);
      const predicted = slope * adjustedIncome + intercept;

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
  }, [cutoffYear, futureSliders, customCorrelations, topCorrelations]);

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

        {/* SCATTER PLOT - RENDA VS VENDAS */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Poder de Compra: Renda vs Vendas</CardTitle>
            <CardDescription>Tamanho da bolha = Inflação (IPCA)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="income" 
                    name="Renda" 
                    type="number" 
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    label={{ value: "Renda (R$)", position: "bottom", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    dataKey="sales" 
                    name="Vendas" 
                    type="number"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
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
                      if (name === "Vendas") return [`R$ ${value.toLocaleString("pt-BR")}`, name];
                      if (name === "Renda") return [`R$ ${value.toLocaleString("pt-BR")}`, name];
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
      {/* PARTE 2: SIMULADOR PREDITIVO */}
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
                  {[2018, 2019, 2020, 2021, 2022, 2023].map(y => (
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
