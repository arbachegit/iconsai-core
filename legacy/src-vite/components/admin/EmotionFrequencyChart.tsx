/**
 * EmotionFrequencyChart - F0 Frequency and Emotion Chart
 * @version 1.0.0
 * @date 2026-01-28
 *
 * Chart component for displaying:
 * - F0 frequency over time
 * - Emotion detection timeline
 * - Comparative analysis
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface F0DataPoint {
  timestamp: string;
  f0Mean: number;
  f0Range: number;
  emotion: string;
  confidence: number;
  userName?: string;
}

interface EmotionDistribution {
  emotion: string;
  count: number;
  percentage: number;
}

interface EmotionFrequencyChartProps {
  data: F0DataPoint[];
  type: "timeline" | "distribution" | "comparison";
  period?: "day" | "week" | "month";
  showUsers?: boolean;
}

const EMOTION_COLORS: Record<string, string> = {
  happy: "#22c55e",
  sad: "#3b82f6",
  neutral: "#6b7280",
  angry: "#ef4444",
  fearful: "#a855f7",
  surprised: "#eab308",
  bored: "#9ca3af",
};

const EMOTION_LABELS: Record<string, string> = {
  happy: "Alegria",
  sad: "Tristeza",
  neutral: "Neutro",
  angry: "Raiva",
  fearful: "Medo",
  surprised: "Surpresa",
  bored: "Tédio",
};

export default function EmotionFrequencyChart({
  data,
  type,
  period = "day",
  showUsers = false,
}: EmotionFrequencyChartProps) {
  // Process data for timeline chart
  const timelineData = useMemo(() => {
    if (type !== "timeline") return [];

    return data.map((point) => ({
      time: format(new Date(point.timestamp), "HH:mm", { locale: ptBR }),
      date: format(new Date(point.timestamp), "dd/MM", { locale: ptBR }),
      f0Mean: Math.round(point.f0Mean),
      f0Range: Math.round(point.f0Range),
      emotion: point.emotion,
      emotionColor: EMOTION_COLORS[point.emotion] || "#6b7280",
      confidence: Math.round(point.confidence * 100),
      user: point.userName,
    }));
  }, [data, type]);

  // Calculate emotion distribution
  const distributionData = useMemo(() => {
    if (type !== "distribution") return [];

    const counts: Record<string, number> = {};
    data.forEach((point) => {
      counts[point.emotion] = (counts[point.emotion] || 0) + 1;
    });

    const total = data.length;
    return Object.entries(counts)
      .map(([emotion, count]) => ({
        emotion,
        label: EMOTION_LABELS[emotion] || emotion,
        count,
        percentage: Math.round((count / total) * 100),
        color: EMOTION_COLORS[emotion] || "#6b7280",
      }))
      .sort((a, b) => b.count - a.count);
  }, [data, type]);

  // Calculate comparison data (avg F0 by emotion)
  const comparisonData = useMemo(() => {
    if (type !== "comparison") return [];

    const emotionStats: Record<string, { f0Sum: number; rangeSum: number; count: number }> = {};

    data.forEach((point) => {
      if (!emotionStats[point.emotion]) {
        emotionStats[point.emotion] = { f0Sum: 0, rangeSum: 0, count: 0 };
      }
      emotionStats[point.emotion].f0Sum += point.f0Mean;
      emotionStats[point.emotion].rangeSum += point.f0Range;
      emotionStats[point.emotion].count++;
    });

    return Object.entries(emotionStats).map(([emotion, stats]) => ({
      emotion,
      label: EMOTION_LABELS[emotion] || emotion,
      avgF0: Math.round(stats.f0Sum / stats.count),
      avgRange: Math.round(stats.rangeSum / stats.count),
      count: stats.count,
      color: EMOTION_COLORS[emotion] || "#6b7280",
    }));
  }, [data, type]);

  // Custom tooltip for timeline
  const TimelineTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0]?.payload;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <div className="font-medium mb-2">{label}</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">F0 Média:</span>
            <span className="font-medium">{point?.f0Mean} Hz</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">F0 Range:</span>
            <span className="font-medium">{point?.f0Range} Hz</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Emoção:</span>
            <span
              className="font-medium"
              style={{ color: point?.emotionColor }}
            >
              {EMOTION_LABELS[point?.emotion] || point?.emotion}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Confiança:</span>
            <span className="font-medium">{point?.confidence}%</span>
          </div>
          {showUsers && point?.user && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Usuário:</span>
              <span className="font-medium">{point.user}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render timeline chart
  if (type === "timeline") {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="f0Gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="time"
            stroke="#666"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#666"
            fontSize={12}
            tickLine={false}
            domain={[50, 300]}
            label={{
              value: "F0 (Hz)",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#666", fontSize: 12 },
            }}
          />
          <Tooltip content={<TimelineTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="f0Mean"
            name="F0 Média"
            stroke="#00D4FF"
            fill="url(#f0Gradient)"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="f0Range"
            name="F0 Range"
            stroke="#FF6B6B"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Render distribution chart (pie)
  if (type === "distribution") {
    return (
      <div className="flex items-center gap-8">
        <ResponsiveContainer width="60%" height={300}>
          <PieChart>
            <Pie
              data={distributionData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="count"
            >
              {distributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                `${value} (${props.payload.percentage}%)`,
                props.payload.label,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-2">
          {distributionData.map((entry) => (
            <div
              key={entry.emotion}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-medium">{entry.label}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {entry.count} ({entry.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render comparison chart (bar)
  if (type === "comparison") {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={comparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="label"
            stroke="#666"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#666"
            fontSize={12}
            tickLine={false}
            label={{
              value: "Frequência (Hz)",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#666", fontSize: 12 },
            }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value} Hz`,
              name === "avgF0" ? "F0 Média" : "F0 Range",
            ]}
            labelFormatter={(label) => `Emoção: ${label}`}
          />
          <Legend
            formatter={(value) => (value === "avgF0" ? "F0 Média" : "F0 Range")}
          />
          <Bar dataKey="avgF0" name="avgF0" fill="#00D4FF" radius={[4, 4, 0, 0]}>
            {comparisonData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
          <Bar dataKey="avgRange" name="avgRange" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
