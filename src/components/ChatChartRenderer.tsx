import React, { useState, useMemo } from 'react';
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
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BarChart3, TrendingUp, PieChart as PieChartIcon, AreaChart as AreaChartIcon, Download, MessageCircle, Mail, ChevronDown, AlertCircle, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'area';
  title: string;
  data: { name: string; value: number; [key: string]: any }[];
  xKey?: string;
  yKeys?: string[];
}

interface ChatChartRendererProps {
  chartData: ChartData;
  className?: string;
}

interface ProportionValidation {
  isValid: boolean;
  sum: number;
  message?: string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(210, 70%, 50%)',
  'hsl(150, 60%, 45%)',
  'hsl(45, 90%, 55%)',
  'hsl(0, 70%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(180, 60%, 45%)',
];

// Validate if data sums to 100% (±0.1% tolerance) for proportion charts
const validateProportionData = (data: { value: number }[]): ProportionValidation => {
  const sum = data.reduce((acc, item) => acc + (item.value || 0), 0);
  const tolerance = 0.1; // ±0.1% tolerance
  const isValid = Math.abs(sum - 100) <= tolerance;
  
  return {
    isValid,
    sum,
    message: !isValid 
      ? `A soma das variáveis é de ${sum.toFixed(1)}% e deve ser 100% para este tipo de gráfico proporcional.`
      : undefined
  };
};

// Normalize data to sum to 100%
const normalizeToPercentage = <T extends { value: number }>(data: T[]): T[] => {
  const sum = data.reduce((acc, item) => acc + (item.value || 0), 0);
  if (sum === 0) return data;
  
  return data.map(item => ({
    ...item,
    value: Number(((item.value / sum) * 100).toFixed(1))
  }));
};

const ChartTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'bar': return <BarChart3 className="h-4 w-4" />;
    case 'line': return <TrendingUp className="h-4 w-4" />;
    case 'pie': return <PieChartIcon className="h-4 w-4" />;
    case 'area': return <AreaChartIcon className="h-4 w-4" />;
    default: return <BarChart3 className="h-4 w-4" />;
  }
};

export const ChatChartRenderer = ({ chartData, className }: ChatChartRendererProps) => {
  // State for normalized data
  const [normalizedData, setNormalizedData] = useState<typeof chartData.data | null>(null);
  const [showNormalizeDialog, setShowNormalizeDialog] = useState(false);
  
  // Use normalized data if available, otherwise original
  const displayData = normalizedData || chartData.data;
  
  // Validate proportion data based on current display data
  const proportionValidation = useMemo(() => validateProportionData(displayData), [displayData]);
  
  // Initialize chart type with auto-correction for invalid pie charts
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area'>(() => {
    const requestedType = chartData.type || 'bar';
    // Auto-correct pie to bar if data doesn't sum to 100%
    if (requestedType === 'pie') {
      const validation = validateProportionData(chartData.data);
      if (!validation.isValid) {
        console.warn(`Gráfico de pizza solicitado mas soma é ${validation.sum.toFixed(1)}%, usando barras`);
        return 'bar';
      }
    }
    return requestedType;
  });
  
  const chartRef = React.useRef<HTMLDivElement>(null);

  const xKey = chartData.xKey || 'name';
  const yKeys = chartData.yKeys || ['value'];

  // Handle pie chart selection with normalization prompt
  const handlePieSelection = () => {
    if (proportionValidation.isValid) {
      setChartType('pie');
    } else {
      setShowNormalizeDialog(true);
    }
  };

  // Apply normalization and switch to pie
  const applyNormalization = () => {
    const normalized = normalizeToPercentage(chartData.data);
    setNormalizedData(normalized);
    setChartType('pie');
    setShowNormalizeDialog(false);
  };

  const exportToCSV = () => {
    const headers = [xKey, ...yKeys].join(',');
    const rows = displayData.map(item => 
      [item[xKey], ...yKeys.map(k => item[k])].join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `grafico_${chartData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const shareViaWhatsApp = () => {
    const text = `📊 ${chartData.title}\n\n${displayData.map(d => `${d[xKey]}: ${d.value}`).join('\n')}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Gráfico: ${chartData.title}`;
    const body = `📊 ${chartData.title}\n\n${displayData.map(d => `${d[xKey]}: ${d.value}`).join('\n')}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey={xKey} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))'
                }}
              />
              {yKeys.map((key, idx) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[idx % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey={xKey} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))'
                }}
              />
              {yKeys.map((key, idx) => (
                <Line 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]} 
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={displayData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {displayData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey={xKey} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))'
                }}
              />
              {yKeys.map((key, idx) => (
                <Area 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]} 
                  fill={CHART_COLORS[idx % CHART_COLORS.length]}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  // Preview of normalized values for dialog
  const normalizedPreview = useMemo(() => normalizeToPercentage(chartData.data), [chartData.data]);

  return (
    <TooltipProvider>
      <div ref={chartRef} className={cn("my-3 rounded-lg border border-border/50 overflow-hidden bg-card", className)}>
        {/* Header with title and controls */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-sm font-medium truncate">{chartData.title}</h4>
            {normalizedData && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                    <Percent className="h-3 w-3" />
                    Normalizado
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Valores convertidos para porcentagem (soma = 100%)</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Chart Type Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  <ChartTypeIcon type={chartType} />
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Barras - sempre habilitado */}
                <DropdownMenuItem onClick={() => setChartType('bar')}>
                  <BarChart3 className="h-4 w-4 mr-2" /> Barras
                </DropdownMenuItem>
                
                {/* Linha - sempre habilitado */}
                <DropdownMenuItem onClick={() => setChartType('line')}>
                  <TrendingUp className="h-4 w-4 mr-2" /> Linha
                </DropdownMenuItem>
                
                {/* Pizza - com normalização automática */}
                <DropdownMenuItem onClick={handlePieSelection}>
                  <PieChartIcon className="h-4 w-4 mr-2" /> 
                  Pizza
                  {!proportionValidation.isValid && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3 w-3 ml-auto text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="text-xs">Soma atual: {proportionValidation.sum.toFixed(1)}% - Será oferecida normalização</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </DropdownMenuItem>
                
                {/* Área - sempre habilitado */}
                <DropdownMenuItem onClick={() => setChartType('area')}>
                  <AreaChartIcon className="h-4 w-4 mr-2" /> Área
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export/Share Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" /> Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareViaWhatsApp}>
                  <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareViaEmail}>
                  <Mail className="h-4 w-4 mr-2" /> Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Chart */}
        <div className="p-3">
          {renderChart()}
        </div>
      </div>

      {/* Normalization Confirmation Dialog */}
      <AlertDialog open={showNormalizeDialog} onOpenChange={setShowNormalizeDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-amber-500" />
              Normalizar para 100%?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  A soma atual dos valores é <strong className="text-foreground">{proportionValidation.sum.toFixed(1)}%</strong>, 
                  mas gráficos de pizza requerem exatamente 100%.
                </p>
                <p>
                  Deseja converter automaticamente os valores para porcentagens proporcionais?
                </p>
                
                {/* Preview table */}
                <div className="mt-3 rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">Categoria</th>
                        <th className="px-2 py-1.5 text-right font-medium">Original</th>
                        <th className="px-2 py-1.5 text-right font-medium text-emerald-400">Normalizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.data.map((item, idx) => (
                        <tr key={idx} className="border-t border-border/50">
                          <td className="px-2 py-1.5 truncate max-w-[120px]">{item.name}</td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground">{item.value}</td>
                          <td className="px-2 py-1.5 text-right text-emerald-400 font-medium">
                            {normalizedPreview[idx]?.value}%
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-border bg-muted/30">
                        <td className="px-2 py-1.5 font-medium">Total</td>
                        <td className="px-2 py-1.5 text-right text-amber-400 font-medium">
                          {proportionValidation.sum.toFixed(1)}
                        </td>
                        <td className="px-2 py-1.5 text-right text-emerald-400 font-medium">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={applyNormalization} className="bg-emerald-600 hover:bg-emerald-700">
              <Percent className="h-4 w-4 mr-2" />
              Normalizar e Exibir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

// Parse CHART_DATA from text content
export const parseChartData = (content: string): { chartData: ChartData | null; cleanedContent: string } => {
  const chartRegex = /CHART_DATA:\s*(\{[\s\S]*?\})\s*(?=\n|$)/;
  const match = content.match(chartRegex);
  
  if (match) {
    try {
      // Use brace-balancing to extract complete JSON
      const startIndex = content.indexOf('CHART_DATA:') + 'CHART_DATA:'.length;
      let braceCount = 0;
      let jsonStart = -1;
      let jsonEnd = -1;
      
      for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') {
          if (jsonStart === -1) jsonStart = i;
          braceCount++;
        } else if (content[i] === '}') {
          braceCount--;
          if (braceCount === 0 && jsonStart !== -1) {
            jsonEnd = i + 1;
            break;
          }
        }
      }
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = content.slice(jsonStart, jsonEnd);
        const chartData = JSON.parse(jsonStr) as ChartData;
        const cleanedContent = content.replace(/CHART_DATA:\s*\{[\s\S]*?\}\s*(?=\n|$)/, '').trim();
        return { chartData, cleanedContent };
      }
    } catch (e) {
      console.error('Error parsing chart data:', e);
    }
  }
  
  return { chartData: null, cleanedContent: content };
};
