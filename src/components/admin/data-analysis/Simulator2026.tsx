import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Bot, TrendingUp } from "lucide-react";
import { MacroSliders } from "./simulator/MacroSliders";
import { ScenarioButtons } from "./simulator/ScenarioButtons";
import { SeasonalBars } from "./simulator/SeasonalBars";

interface AnnualData {
  year: number;
  sales: number;
  [key: string]: number;
}

interface Simulator2026Props {
  annualData: AnnualData[];
}

type ScenarioType = "neutral" | "optimistic" | "pessimistic";

interface Sliders2026 {
  renda: number;
  dolar: number;
  selic: number;
  ipca: number;
  desemprego: number;
}

const SCENARIOS_2026: Record<ScenarioType, Sliders2026> = {
  neutral: { renda: 1950, dolar: 5.80, selic: 12.5, ipca: 4.5, desemprego: 7.5 },
  optimistic: { renda: 2200, dolar: 5.20, selic: 10.0, ipca: 3.5, desemprego: 6.0 },
  pessimistic: { renda: 1750, dolar: 6.50, selic: 15.0, ipca: 6.5, desemprego: 9.5 },
};

// Baselines para cálculo de efeito
const BASELINE = { renda: 1950, dolar: 5.80, selic: 12.5, ipca: 4.5, desemprego: 7.5 };

// Elasticidades estimadas (efeito % no PMC para cada 1% de variação)
const ELASTICITIES = {
  renda: 0.8,       // +1% renda → +0.8% vendas
  dolar: -0.15,     // +1% dólar → -0.15% vendas
  selic: -0.1,      // +1pp selic → -0.1% vendas
  ipca: -0.2,       // +1pp ipca → -0.2% vendas
  desemprego: -0.3, // +1pp desemprego → -0.3% vendas
};

export function Simulator2026({ annualData }: Simulator2026Props) {
  const [activeScenario, setActiveScenario] = useState<ScenarioType>("neutral");
  const [sliders, setSliders] = useState<Sliders2026>(SCENARIOS_2026.neutral);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Função para animar sliders ao mudar cenário
  const applyScenario = (scenario: ScenarioType) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setActiveScenario(scenario);
    const target = SCENARIOS_2026[scenario];
    const start = { ...sliders };
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      setSliders({
        renda: Math.round(start.renda + (target.renda - start.renda) * eased),
        dolar: Math.round((start.dolar + (target.dolar - start.dolar) * eased) * 100) / 100,
        selic: Math.round((start.selic + (target.selic - start.selic) * eased) * 10) / 10,
        ipca: Math.round((start.ipca + (target.ipca - start.ipca) * eased) * 100) / 100,
        desemprego: Math.round((start.desemprego + (target.desemprego - start.desemprego) * eased) * 10) / 10,
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setSliders(target);
        setIsAnimating(false);
      }
    };

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);
  };

  // Calcular projeção baseada nos sliders
  const projection = useMemo(() => {
    const lastYear = annualData?.filter(d => d.sales > 0).slice(-1)[0];
    if (!lastYear) return { base: 100, projected: 100, change: 0 };
    
    const base = lastYear.sales;
    
    // Calcular efeito combinado
    let effect = 1;
    
    // Renda: variação percentual
    const rendaChange = ((sliders.renda - BASELINE.renda) / BASELINE.renda) * 100;
    effect += (rendaChange * ELASTICITIES.renda) / 100;
    
    // Dólar: variação percentual
    const dolarChange = ((sliders.dolar - BASELINE.dolar) / BASELINE.dolar) * 100;
    effect += (dolarChange * ELASTICITIES.dolar) / 100;
    
    // Selic: variação em pontos percentuais
    const selicChange = sliders.selic - BASELINE.selic;
    effect += (selicChange * ELASTICITIES.selic) / 100;
    
    // IPCA: variação em pontos percentuais
    const ipcaChange = sliders.ipca - BASELINE.ipca;
    effect += (ipcaChange * ELASTICITIES.ipca) / 100;
    
    // Desemprego: variação em pontos percentuais
    const desempregoChange = sliders.desemprego - BASELINE.desemprego;
    effect += (desempregoChange * ELASTICITIES.desemprego) / 100;
    
    const projected = Math.round(base * effect * 10) / 10;
    const change = Math.round((projected / base - 1) * 1000) / 10;
    
    return { base, projected, change };
  }, [sliders, annualData]);

  // Dados para o gráfico de projeção
  const chartData = useMemo(() => {
    if (!annualData?.length) return [];
    
    const historical = annualData
      .filter(d => d.sales > 0 && d.year >= 2020)
      .map(d => ({
        year: d.year,
        historical: Math.round(d.sales * 10) / 10,
        projected: null as number | null,
      }));
    
    // Adicionar projeção 2026
    return [
      ...historical,
      {
        year: 2026,
        historical: null,
        projected: projection.projected,
      },
    ];
  }, [annualData, projection.projected]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8 text-primary" />
        <div>
          <h3 className="text-xl font-semibold">Simulador de Cenários 2026</h3>
          <p className="text-muted-foreground text-sm">
            Projete vendas 2026 com base em variáveis macroeconômicas
          </p>
        </div>
      </div>

      {/* Gráfico de Projeção */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Projeção de Vendas PMC
              </CardTitle>
              <CardDescription>Histórico (2020-2025) + Projeção 2026</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`text-lg font-bold ${projection.change >= 0 ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}`}
              >
                {projection.change >= 0 ? '+' : ''}{projection.change}%
              </Badge>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{projection.projected.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">PMC 2026</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  width={50}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={({ payload, label }) => {
                    if (!payload?.length) return null;
                    const data = payload[0].payload;
                    const value = data.historical ?? data.projected;
                    const isProjection = data.projected !== null;
                    return (
                      <div className="bg-card border border-border p-2 rounded-lg shadow-lg">
                        <p className="font-semibold text-sm">{label}</p>
                        <p className={`text-sm ${isProjection ? 'text-primary font-bold' : ''}`}>
                          PMC: {value?.toFixed(1)} {isProjection && '(projeção)'}
                        </p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine x={2026} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="historical"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: 'hsl(var(--primary))', r: 8 }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Controles: Sliders + Cenários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <MacroSliders 
              values={sliders} 
              onChange={setSliders}
              disabled={isAnimating}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <ScenarioButtons 
              activeScenario={activeScenario}
              onSelect={applyScenario}
              isAnimating={isAnimating}
            />
            
            {/* Resultado da Projeção */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projeção PMC 2026</p>
                  <p className="text-3xl font-bold text-primary">{projection.projected.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">vs 2025</p>
                  <p className={`text-xl font-bold ${projection.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {projection.change >= 0 ? '+' : ''}{projection.change}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barras Sazonais */}
      <SeasonalBars scenario={activeScenario} baseProjection={projection.projected} />
    </div>
  );
}
