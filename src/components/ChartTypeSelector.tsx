import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BarChart3, TrendingUp, PieChart, AreaChart, ChevronDown } from 'lucide-react';

export type ChartType = 'bar' | 'line' | 'pie' | 'area';

interface ChartTypeSelectorProps {
  value: ChartType;
  onChange: (type: ChartType) => void;
  compact?: boolean;
}

const chartTypeOptions: { type: ChartType; label: string; icon: React.ElementType }[] = [
  { type: 'bar', label: 'Barras', icon: BarChart3 },
  { type: 'line', label: 'Linhas', icon: TrendingUp },
  { type: 'pie', label: 'Pizza', icon: PieChart },
  { type: 'area', label: 'Área', icon: AreaChart },
];

export const ChartTypeSelector = ({ value, onChange, compact = false }: ChartTypeSelectorProps) => {
  const selectedOption = chartTypeOptions.find(opt => opt.type === value) || chartTypeOptions[0];
  const Icon = selectedOption.icon;

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 shadow-[0_3px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.3)] transition-shadow" title="Solicitar gráfico">
            <BarChart3 className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px]">
          {chartTypeOptions.map(({ type, label, icon: ItemIcon }) => (
            <DropdownMenuItem
              key={type}
              onClick={() => onChange(type)}
              className="flex items-center gap-2"
            >
              <ItemIcon className="h-4 w-4" />
              <span>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <Icon className="h-3 w-3" />
          {selectedOption.label}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[120px]">
        {chartTypeOptions.map(({ type, label, icon: ItemIcon }) => (
          <DropdownMenuItem
            key={type}
            onClick={() => onChange(type)}
            className="flex items-center gap-2"
          >
            <ItemIcon className="h-4 w-4" />
            <span>{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
