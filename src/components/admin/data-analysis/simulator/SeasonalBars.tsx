import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Calendar } from "lucide-react";

type ScenarioType = "neutral" | "optimistic" | "pessimistic";

interface SeasonalBarsProps {
  scenario: ScenarioType;
  baseProjection: number;
}

const SEASONAL_EVENTS = [
  { label: "🎭 Carnaval", month: "Fev", multiplier: 0.12 },
  { label: "👩 Mães", month: "Mai", multiplier: 0.18 },
  { label: "💕 Namorados", month: "Jun", multiplier: 0.08 },
  { label: "👨 Pais", month: "Ago", multiplier: 0.10 },
  { label: "🧒 Crianças", month: "Out", multiplier: 0.15 },
  { label: "🛒 Black Friday", month: "Nov", multiplier: 0.30 },
  { label: "🎄 Natal", month: "Dez", multiplier: 0.45 },
];

const SCENARIO_COLORS = {
  optimistic: "#10B981",
  neutral: "#F59E0B",
  pessimistic: "#EF4444",
};

export function SeasonalBars({ scenario, baseProjection }: SeasonalBarsProps) {
  const barColor = SCENARIO_COLORS[scenario];
  
  const chartData = SEASONAL_EVENTS.map(event => ({
    ...event,
    impact: event.multiplier * 100,
    value: Math.round(baseProjection * (1 + event.multiplier) * 10) / 10,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">Eventos Sazonais 2026</CardTitle>
            <CardDescription>Impacto estimado nas vendas por período</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" vertical={false} />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10 }}
                interval={0}
                angle={0}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `+${v}%`}
                width={45}
              />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border border-border p-2 rounded-lg shadow-lg">
                      <p className="font-semibold text-sm">{data.label}</p>
                      <p className="text-xs text-muted-foreground">{data.month}/2026</p>
                      <p className="text-sm mt-1">
                        Impacto: <span className="font-medium text-primary">+{data.impact.toFixed(0)}%</span>
                      </p>
                      <p className="text-sm">
                        PMC: <span className="font-medium">{data.value.toFixed(1)}</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="impact" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={barColor} fillOpacity={0.7 + (entry.multiplier * 0.5)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
