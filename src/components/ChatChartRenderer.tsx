import React, { useState, useRef } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChartTypeSelector, ChartType } from './ChartTypeSelector';
import { ContentShareActions } from './ContentShareActions';
import { cn } from '@/lib/utils';

export interface ChartData {
  type?: ChartType;
  title?: string;
  labels: string[];
  datasets: { name: string; values: number[] }[];
}

interface ChatChartRendererProps {
  data: ChartData;
  className?: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8B5CF6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#3B82F6',
];

export const ChatChartRenderer = ({ data, className }: ChatChartRendererProps) => {
  const [chartType, setChartType] = useState<ChartType>(data.type || 'bar');
  const chartRef = useRef<HTMLDivElement>(null);

  // Transform data for Recharts
  const chartData = data.labels.map((label, index) => {
    const point: Record<string, string | number> = { name: label };
    data.datasets.forEach((dataset) => {
      point[dataset.name] = dataset.values[index] || 0;
    });
    return point;
  });

  // For pie chart, use first dataset only
  const pieData = data.labels.map((label, index) => ({
    name: label,
    value: data.datasets[0]?.values[index] || 0,
  }));

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            {data.datasets.map((dataset, idx) => (
              <Line
                key={dataset.name}
                type="monotone"
                dataKey={dataset.name}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={{ fill: COLORS[idx % COLORS.length], strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="hsl(var(--primary))"
              dataKey="value"
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            {data.datasets.map((dataset, idx) => (
              <Area
                key={dataset.name}
                type="monotone"
                dataKey={dataset.name}
                stackId="1"
                stroke={COLORS[idx % COLORS.length]}
                fill={COLORS[idx % COLORS.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );

      default: // bar
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            {data.datasets.map((dataset, idx) => (
              <Bar
                key={dataset.name}
                dataKey={dataset.name}
                fill={COLORS[idx % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className={cn("my-3 rounded-lg border border-border/50 overflow-hidden bg-card", className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-2">
          {data.title && (
            <span className="text-xs font-medium text-foreground">{data.title}</span>
          )}
          <ChartTypeSelector value={chartType} onChange={setChartType} />
        </div>
        <ContentShareActions 
          contentRef={chartRef} 
          filename={`grafico_${data.title?.toLowerCase().replace(/\s+/g, '_') || 'chart'}`}
          title={data.title || 'Gráfico'}
          compact
        />
      </div>

      {/* Chart */}
      <div ref={chartRef} className="p-4 bg-background">
        <ResponsiveContainer width="100%" height={250}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Parse CHART_DATA from message content
export const parseChartData = (content: string): { chartData: ChartData; cleanContent: string } | null => {
  const chartMatch = content.match(/CHART_DATA:\s*(\{[\s\S]*?\})\s*(?:\n|$)/);
  
  if (!chartMatch) return null;

  try {
    const jsonStr = chartMatch[1];
    const chartData = JSON.parse(jsonStr) as ChartData;
    
    // Validate required fields
    if (!chartData.labels || !chartData.datasets) {
      return null;
    }

    const cleanContent = content.replace(chartMatch[0], '').trim();
    return { chartData, cleanContent };
  } catch (error) {
    console.error('Error parsing chart data:', error);
    return null;
  }
};
