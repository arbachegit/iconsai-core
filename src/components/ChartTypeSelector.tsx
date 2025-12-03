import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BarChart3, TrendingUp, PieChart, AreaChart, ChevronDown } from "lucide-react";

export type ChartType = 'bar' | 'line' | 'pie' | 'area';

interface ChartTypeSelectorProps {
  selectedType: ChartType | null;
  onSelectType: (type: ChartType | null) => void;
  disabled?: boolean;
}

const CHART_TYPE_CONFIG: Record<ChartType, { icon: React.ElementType; label: string }> = {
  bar: { icon: BarChart3, label: 'Barras' },
  line: { icon: TrendingUp, label: 'Linha' },
  pie: { icon: PieChart, label: 'Pizza' },
  area: { icon: AreaChart, label: 'Área' },
};

const ChartTypeSelector = React.forwardRef<HTMLButtonElement, ChartTypeSelectorProps>(
  ({ selectedType, onSelectType, disabled }, ref) => {
    const selectedConfig = selectedType ? CHART_TYPE_CONFIG[selectedType] : null;
    const SelectedIcon = selectedConfig?.icon || BarChart3;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={ref}
            type="button"
            size="icon"
            variant={selectedType ? "default" : "ghost"}
            disabled={disabled}
            className="h-8 w-8 relative"
            title={selectedType ? `Tipo: ${selectedConfig?.label}` : "Selecionar tipo de gráfico"}
          >
            <SelectedIcon className="w-4 h-4" />
            {selectedType && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background border border-border">
          {selectedType && (
            <DropdownMenuItem 
              onClick={() => onSelectType(null)}
              className="text-muted-foreground"
            >
              <span className="w-4 h-4 mr-2" />
              Automático
            </DropdownMenuItem>
          )}
          {(Object.entries(CHART_TYPE_CONFIG) as [ChartType, typeof CHART_TYPE_CONFIG[ChartType]][]).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <DropdownMenuItem 
                key={type} 
                onClick={() => onSelectType(type)}
                className={selectedType === type ? "bg-primary/20" : ""}
              >
                <Icon className="w-4 h-4 mr-2" />
                {config.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

ChartTypeSelector.displayName = "ChartTypeSelector";

export { ChartTypeSelector, CHART_TYPE_CONFIG };
