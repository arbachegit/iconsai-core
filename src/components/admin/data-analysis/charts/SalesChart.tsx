import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";

interface AnnualData {
  year: number;
  sales: number;
  pmcVest: number;
  pmcMov: number;
  pmcFarm: number;
  pmcComb: number;
  pmcVeic: number;
  pmcConst: number;
  [key: string]: number;
}

interface SalesChartProps {
  data: AnnualData[];
  sectorCode: string;
  sectorLabel: string;
}

const SECTOR_KEY_MAP: Record<string, string> = {
  "PMC": "sales",
  "PMC_VEST": "pmcVest",
  "PMC_MOV": "pmcMov",
  "PMC_FARM": "pmcFarm",
  "PMC_COMB": "pmcComb",
  "PMC_VEIC": "pmcVeic",
  "PMC_CONST": "pmcConst",
};

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

export function SalesChart({ data, sectorCode, sectorLabel }: SalesChartProps) {
  const chartData = useMemo(() => {
    if (!data?.length) return { points: [], trend: [], r2: 0 };
    
    const sectorKey = SECTOR_KEY_MAP[sectorCode] || "sales";
    const filtered = data.filter(d => d[sectorKey] > 0 && d.year >= 2015);
    
    const points = filtered.map(d => ({
      year: d.year,
      value: Math.round(d[sectorKey] * 10) / 10,
    }));

    // Calcular linha de tendência
    const regressionData: [number, number][] = points.map(p => [p.year, p.value]);
    const { equation, r2 } = linearRegression(regressionData);
    
    const trend = points.map(p => ({
      year: p.year,
      trend: Math.round((equation[0] + equation[1] * p.year) * 10) / 10,
    }));

    return { points, trend, r2 };
  }, [data, sectorCode]);

  if (!chartData.points.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-500" />
            Vendas: {sectorLabel}
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
              <BarChart3 className="h-5 w-5 text-green-500" />
              Vendas: {sectorLabel}
            </CardTitle>
            <CardDescription>Índice PMC anualizado (IBGE)</CardDescription>
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
                tickFormatter={(v) => v.toFixed(1)}
                width={50}
              />
              <Tooltip
                formatter={(value: number) => [value.toFixed(1), '']}
                labelFormatter={(label) => `Ano: ${label}`}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name="Índice PMC"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', r: 4 }}
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
