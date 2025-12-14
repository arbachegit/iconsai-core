import { useState, useMemo } from "react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Database,
  Loader2,
  BarChart3,
  RefreshCw,
  DollarSign,
  Percent,
  Hash,
  Activity,
  TrendingUp,
  MapPin,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

interface Indicator {
  id: string;
  name: string;
  code: string;
  unit: string | null;
  category: string | null;
  frequency: string | null;
  is_regional: boolean | null;
  api_id: string | null;
}

interface IndicatorValue {
  indicator_id: string;
  reference_date: string;
  value: number;
}

interface ApiRegistry {
  id: string;
  name: string;
}

interface IndicatorWithApi extends Indicator {
  api?: ApiRegistry | null;
}

interface IndicatorValueWithUF {
  reference_date: string;
  value: number;
  brazilian_ufs?: { uf_name: string; uf_sigla: string } | null;
}

// Category groups for organization
const CATEGORY_GROUPS = {
  financial: {
    title: 'Indicadores Financeiros Globais',
    icon: TrendingUp,
    codes: ['IPCA', 'IPCA_BCB', 'SELIC', 'SELIC_IPEADATA', 'SELIC_OVER', 'CDI', 'DOLAR', 'DOLAR_PTAX_COMPRA', 'PIB', 'NY.GDP.PCAP.PP.CD', '4099', 'POP_RESIDENTE']
  },
  pmc: {
    title: 'PMC - Pesquisa Mensal do Comércio',
    icon: BarChart3,
    codes: ['PMC', 'PMC_COMB', 'PMC_FARM', 'PMC_MOV', 'PMC_VEST', 'PMC_CONST', 'PMC_VEIC', 'PMC_COMBUSTIVEIS_UF', 'PMC_FARMACIA_UF', 'PMC_MOVEIS_UF', 'PMC_VESTUARIO_UF', 'PMC_CONSTRUCAO_UF', 'PMC_VEICULOS_UF', 'PMC_VAREJO_UF']
  },
  pac: {
    title: 'PAC - Pesquisa Anual do Comércio',
    icon: DollarSign,
    codes: ['PAC_TOTAL_RB_UF', 'PAC_VAREJO_RB_UF', 'PAC_ATACADO_RB_UF', 'PAC_VEICULOS_RB_UF', 'PAC_HIPER_RB_UF', 'PAC_COMBUSTIVEIS_RB_UF', 'PAC_ALIMENTOS_RB_UF', 'PAC_TECIDOS_RB_UF', 'PAC_INFORMATICA_RB_UF']
  }
};

const CATEGORIES: Record<string, string> = {
  macro: "Macroeconômico",
  regional: "Regional",
  pmc: "PMC",
  pac: "PAC",
};

const FREQUENCIES: Record<string, string> = {
  daily: "Diária",
  monthly: "Mensal",
  quarterly: "Trimestral",
  annual: "Anual",
};

// Format unit for display
function formatUnit(unit: string | null): { label: string; icon: React.ReactNode } {
  if (!unit) return { label: 'N/A', icon: <Hash className="h-3 w-3" /> };
  const u = unit.toLowerCase();
  if (u.includes('r$') || u.includes('mil') || u.includes('reais') || u === 'brl') {
    return { label: 'R$', icon: <DollarSign className="h-3 w-3" /> };
  }
  if (u.includes('us$') || u.includes('usd') || u.includes('dólar') || u.includes('dollar')) {
    return { label: '$', icon: <DollarSign className="h-3 w-3" /> };
  }
  if (u.includes('%')) {
    return { label: '%', icon: <Percent className="h-3 w-3" /> };
  }
  if (u.includes('índice') || u.includes('base') || u.includes('index')) {
    return { label: 'Índice', icon: <Activity className="h-3 w-3" /> };
  }
  if (u.includes('pessoas') || u.includes('quantidade') || u.includes('pop')) {
    return { label: 'Qtd', icon: <Hash className="h-3 w-3" /> };
  }
  return { label: unit.substring(0, 6), icon: <Hash className="h-3 w-3" /> };
}

// Format large values
function formatValue(value: number, unit: string | null, includeUnit: boolean = false): string {
  const u = (unit || '').toLowerCase();
  const isIndex = u.includes('índice') || u.includes('base') || u.includes('index');
  
  if (u.includes('r$') || u.includes('mil') || u.includes('reais') || u === 'brl') {
    let formatted = '';
    if (value >= 1e12) formatted = `${(value / 1e12).toFixed(1)} tri`;
    else if (value >= 1e9) formatted = `${(value / 1e9).toFixed(1)} bi`;
    else if (value >= 1e6) formatted = `${(value / 1e6).toFixed(1)} mi`;
    else if (value >= 1e3) formatted = `${(value / 1e3).toFixed(1)} mil`;
    else formatted = value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    return includeUnit && !isIndex ? `R$ ${formatted}` : formatted;
  }
  
  const formatted = value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  
  if (includeUnit && !isIndex) {
    if (u.includes('%')) return `${formatted}%`;
    if (u.includes('us$') || u.includes('usd') || u.includes('dólar') || u.includes('dollar')) return `R$ ${formatted}`;
  }
  
  return formatted;
}

export function TableDatabaseTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorWithApi | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<{ count: number; date: Date } | null>(null);

  // Fetch indicators with API name
  const { data: indicators = [], isLoading: loadingIndicators, refetch: refetchIndicators } = useQuery({
    queryKey: ["indicators-table-db"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economic_indicators")
        .select("id, name, code, unit, category, frequency, is_regional, api_id, system_api_registry(id, name)")
        .order("name");
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        api: item.system_api_registry,
      })) as IndicatorWithApi[];
    },
  });

  // Fetch all indicator values
  const { data: allValues = [], refetch: refetchValues } = useQuery({
    queryKey: ["indicator-values-table-db"],
    queryFn: async () => {
      const allData: IndicatorValue[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("indicator_values")
          .select("indicator_id, reference_date, value")
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...(data as IndicatorValue[]));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
  });

  // Fetch regional values
  const { data: regionalValues = [] } = useQuery({
    queryKey: ["regional-values-table-db"],
    queryFn: async () => {
      const allData: IndicatorValue[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("indicator_regional_values")
          .select("indicator_id, reference_date, value")
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...(data as IndicatorValue[]));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
  });

  // Fetch values for the selected indicator modal
  const { data: selectedIndicatorValues = [], isLoading: loadingSelectedValues } = useQuery({
    queryKey: ["selected-indicator-values", selectedIndicator?.id],
    queryFn: async () => {
      if (!selectedIndicator) return [];
      
      if (selectedIndicator.is_regional) {
        const { data, error } = await supabase
          .from("indicator_regional_values")
          .select("reference_date, value, brazilian_ufs!inner(uf_name, uf_sigla)")
          .eq("indicator_id", selectedIndicator.id)
          .order("reference_date", { ascending: false })
          .limit(500);
        if (error) throw error;
        return (data || []) as IndicatorValueWithUF[];
      } else {
        const { data, error } = await supabase
          .from("indicator_values")
          .select("reference_date, value")
          .eq("indicator_id", selectedIndicator.id)
          .order("reference_date", { ascending: false })
          .limit(500);
        if (error) throw error;
        return (data || []) as IndicatorValueWithUF[];
      }
    },
    enabled: !!selectedIndicator?.id,
  });

  const handleCardClick = (indicator: IndicatorWithApi) => {
    setSelectedIndicator(indicator);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchIndicators(), refetchValues()]);
      setLastUpdate({ count: allValues.length + regionalValues.length, date: new Date() });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Combined values
  const combinedValues = useMemo(() => {
    return [...allValues, ...regionalValues];
  }, [allValues, regionalValues]);

  // Get stats for each indicator
  const indicatorStats = useMemo(() => {
    const stats: Record<string, { count: number; min: string; max: string; lastValue: number }> = {};
    combinedValues.forEach((v) => {
      if (!stats[v.indicator_id]) {
        stats[v.indicator_id] = {
          count: 0,
          min: v.reference_date,
          max: v.reference_date,
          lastValue: v.value,
        };
      }
      stats[v.indicator_id].count++;
      if (v.reference_date < stats[v.indicator_id].min) {
        stats[v.indicator_id].min = v.reference_date;
      }
      if (v.reference_date > stats[v.indicator_id].max) {
        stats[v.indicator_id].max = v.reference_date;
        stats[v.indicator_id].lastValue = v.value;
      }
    });
    return stats;
  }, [combinedValues]);

  // Filter and group indicators
  const filteredIndicators = useMemo(() => {
    let filtered = indicators;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          (i.category && i.category.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [indicators, searchQuery]);

  // Group indicators by category
  const groupedIndicators = useMemo(() => {
    const groups: Record<string, IndicatorWithApi[]> = {};
    
    Object.entries(CATEGORY_GROUPS).forEach(([key, group]) => {
      const groupItems = filteredIndicators.filter(i => group.codes.includes(i.code));
      if (groupItems.length > 0) {
        groups[key] = groupItems;
      }
    });
    
    const categorizedCodes = Object.values(CATEGORY_GROUPS).flatMap(g => g.codes);
    const uncategorized = filteredIndicators.filter(i => !categorizedCodes.includes(i.code));
    if (uncategorized.length > 0) {
      groups['outros'] = uncategorized;
    }
    
    return groups;
  }, [filteredIndicators]);

  if (loadingIndicators) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render indicator card
  const renderIndicatorCard = (indicator: IndicatorWithApi) => {
    const stats = indicatorStats[indicator.id];
    const unitInfo = formatUnit(indicator.unit);
    const hasData = stats && stats.count > 0;
    const minDate = hasData ? format(new Date(stats.min), "MM/yy") : "N/A";
    const maxDate = hasData ? format(new Date(stats.max), "MM/yy") : "N/A";
    const u = (indicator.unit || '').toLowerCase();
    const isIndex = u.includes('índice') || u.includes('base') || u.includes('index');

    return (
      <Card
        key={indicator.id}
        className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
        onClick={() => handleCardClick(indicator)}
      >
        <CardContent className="pt-4 pb-3">
          {/* Title */}
          <h3 className="font-semibold text-sm mb-3 line-clamp-2 min-h-[40px]">
            {indicator.name}
          </h3>
          
          {/* 2x2 Badge grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Unit badge */}
            <div className="flex flex-col items-center justify-center border rounded-md py-1.5 bg-muted/30">
              <span className="text-[9px] text-muted-foreground uppercase">Unidade</span>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-muted-foreground/50">
                  {unitInfo.icon}
                </div>
                <span className="text-xs font-medium">{unitInfo.label}</span>
              </div>
            </div>
            
            {/* Period badge */}
            <div className="flex flex-col items-center justify-center border rounded-md py-1.5 bg-muted/30">
              <span className="text-[9px] text-muted-foreground uppercase">Período</span>
              <span className="text-xs font-medium">{minDate} - {maxDate}</span>
            </div>
            
            {/* Records badge */}
            <div className="flex flex-col items-center justify-center border rounded-md py-1.5 bg-secondary/50">
              <span className="text-[9px] text-muted-foreground uppercase">Registros</span>
              <div className="flex items-center gap-1">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-muted-foreground/50">
                  <Database className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium">{hasData ? stats.count.toLocaleString() : "0"}</span>
              </div>
            </div>
            
            {/* Last value badge */}
            <div className="flex flex-col items-center justify-center border rounded-md py-1.5 bg-primary/10 text-primary">
              <span className="text-[9px] text-muted-foreground uppercase">Último Valor</span>
              <span className="text-xs font-bold">
                {hasData ? formatValue(stats.lastValue, indicator.unit, !isIndex) : "N/A"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Table Data Base
          </h2>
          <p className="text-muted-foreground">
            Visualização de indicadores econômicos e seus valores
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              {lastUpdate.count.toLocaleString()} registros • {lastUpdate.date.toLocaleDateString('pt-BR')}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <DebouncedInput
          placeholder="Buscar indicador..."
          value={searchQuery}
          onChange={setSearchQuery}
          delay={300}
          className="pl-9"
        />
      </div>

      {/* Grouped Indicator Cards */}
      <div className="space-y-8">
        {Object.entries(groupedIndicators).map(([key, groupIndicators]) => {
          const group = CATEGORY_GROUPS[key as keyof typeof CATEGORY_GROUPS] || {
            title: 'Outros Indicadores',
            icon: Database
          };
          const GroupIcon = group.icon;

          return (
            <div key={key} className="space-y-4">
              <div className="flex items-center gap-3 border-b pb-2">
                <GroupIcon className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">{group.title}</h3>
                <Badge variant="outline" className="ml-auto">
                  {groupIndicators.length} indicadores
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupIndicators.map(renderIndicatorCard)}
              </div>
            </div>
          );
        })}
      </div>

      {/* View Modal */}
      <Dialog open={!!selectedIndicator} onOpenChange={(open) => {
        if (!open) setSelectedIndicator(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {selectedIndicator?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Info Section (Non-Editable) */}
          <div className="grid grid-cols-3 gap-4 py-4 border-b">
            <div>
              <span className="text-xs text-muted-foreground">Código</span>
              <p className="font-mono text-sm">{selectedIndicator?.code}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Unidade</span>
              <p className="text-sm">{selectedIndicator?.unit || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Categoria</span>
              <Badge variant="outline" className="mt-1">
                {CATEGORIES[selectedIndicator?.category || ''] || selectedIndicator?.category || '-'}
              </Badge>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Frequência</span>
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm">{FREQUENCIES[selectedIndicator?.frequency || ''] || selectedIndicator?.frequency || '-'}</span>
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Regional</span>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm">{selectedIndicator?.is_regional ? 'Sim (por UF)' : 'Não (Brasil)'}</span>
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">API Vinculada</span>
              <p className="text-sm">{selectedIndicator?.api?.name || 'Nenhuma'}</p>
            </div>
          </div>

          {/* Values Table */}
          <div className="flex-1 min-h-0 mt-4">
            {loadingSelectedValues ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[350px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Indicador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedIndicatorValues.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          Nenhum valor encontrado para este indicador.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedIndicatorValues.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(item.reference_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {Number(item.value).toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 4 
                            })}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {selectedIndicator?.name}
                            {item.brazilian_ufs ? ` - ${item.brazilian_ufs.uf_name}` : ' - Brasil'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Total: {selectedIndicatorValues.length} registros {selectedIndicatorValues.length === 500 && '(limitado a 500)'}
            </span>
            <Button variant="outline" onClick={() => setSelectedIndicator(null)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TableDatabaseTab;
