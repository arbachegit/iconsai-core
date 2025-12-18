import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp } from "lucide-react";

interface AnnualData {
  year: number;
  income: number;
  [key: string]: number;
}

interface IncomeChartProps {
  data: AnnualData[];
}

function linearRegression(data: [number, number][]): { equation: [number, number]; r2: number } {
  const n = data.length;
  if (n < 2) return { equation: [0, 0], r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const [x, y] of data) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
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

export function IncomeChart({ data }: IncomeChartProps) {
  const chartData = useMemo(() => {
    if (!data?.length) return { points: [], trend: [], r2: 0 };
    
    const filtered = data.filter(d => d.income > 0 && d.year >= 2012);
    const points = filtered.map(d => ({
      year: d.year,
      income: Math.round(d.income),
    }));

    // Calcular linha de tendência
    const regressionData: [number, number][] = points.map(p => [p.year, p.income]);
    const { equation, r2 } = linearRegression(regressionData);
    
    const trend = points.map(p => ({
      year: p.year,
      trend: Math.round(equation[0] + equation[1] * p.year),
    }));

    return { points, trend, r2 };
  }, [data]);

  if (!chartData.points.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Renda Per Capita
          </CardTitle>
          <CardDescription>Sem dados disponíveis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Merge data for chart
  const mergedData = chartData.points.map((p, i) => ({
    ...p,
    trend: chartData.trend[i]?.trend,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Renda Per Capita
            </CardTitle>
            <CardDescription>Evolução 2012-2025 (IBGE PNAD)</CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            R² = {(chartData.r2 * 100).toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => String(v)}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `R$ ${v.toLocaleString('pt-BR')}`}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                labelFormatter={(label) => `Ano: ${label}`}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line
                type="monotone"
                dataKey="income"
                name="Renda"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="trend"
                name="Tendência"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
