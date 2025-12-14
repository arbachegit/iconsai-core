import { useState, useMemo, useCallback } from "react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  Plus,
  TrendingUp,
  Trash2,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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

const CATEGORIES = [
  { value: "macro", label: "Macroeconômico" },
  { value: "regional", label: "Regional" },
  { value: "pmc", label: "PMC" },
  { value: "pac", label: "PAC" },
];

const FREQUENCIES = [
  { value: "daily", label: "Diária" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "annual", label: "Anual" },
];

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
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<{ count: number; date: Date } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    unit: "",
    category: "macro",
    frequency: "monthly",
    is_regional: false,
    api_id: "",
  });

  // Fetch indicators
  const { data: indicators = [], isLoading: loadingIndicators, refetch: refetchIndicators } = useQuery({
    queryKey: ["indicators-table-db"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economic_indicators")
        .select("id, name, code, unit, category, frequency, is_regional, api_id")
        .order("name");
      if (error) throw error;
      return data as Indicator[];
    },
  });

  // Fetch APIs for dropdown
  const { data: apis = [] } = useQuery({
    queryKey: ["apis-for-indicators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_api_registry")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as ApiRegistry[];
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("economic_indicators").insert({
        name: data.name,
        code: data.code,
        unit: data.unit || null,
        category: data.category,
        frequency: data.frequency,
        is_regional: data.is_regional,
        api_id: data.api_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Indicador criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["indicators-table-db"] });
      setIsCreating(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("economic_indicators")
        .update({
          name: data.name,
          code: data.code,
          unit: data.unit || null,
          category: data.category,
          frequency: data.frequency,
          is_regional: data.is_regional,
          api_id: data.api_id || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Indicador atualizado!");
      queryClient.invalidateQueries({ queryKey: ["indicators-table-db"] });
      setSelectedIndicator(null);
      setIsEditing(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("economic_indicators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Indicador excluído!");
      queryClient.invalidateQueries({ queryKey: ["indicators-table-db"] });
      setSelectedIndicator(null);
      setDeleteConfirmOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      unit: "",
      category: "macro",
      frequency: "monthly",
      is_regional: false,
      api_id: "",
    });
  };

  const handleCardClick = (indicator: Indicator) => {
    setSelectedIndicator(indicator);
    setFormData({
      name: indicator.name,
      code: indicator.code,
      unit: indicator.unit || "",
      category: indicator.category || "macro",
      frequency: indicator.frequency || "monthly",
      is_regional: indicator.is_regional || false,
      api_id: indicator.api_id || "",
    });
    setIsEditing(true);
  };

  const handleNewIndicator = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.code) {
      toast.error("Nome e código são obrigatórios!");
      return;
    }

    if (isCreating) {
      createMutation.mutate(formData);
    } else if (selectedIndicator) {
      updateMutation.mutate({ id: selectedIndicator.id, data: formData });
    }
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
    const groups: Record<string, Indicator[]> = {};
    
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
  const renderIndicatorCard = (indicator: Indicator) => {
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
            Gerenciamento CRUD de indicadores econômicos
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
          <Button size="sm" onClick={handleNewIndicator} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Indicador
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

      {/* CRUD Modal */}
      <Dialog open={isEditing || isCreating} onOpenChange={(open) => {
        if (!open) {
          setIsEditing(false);
          setIsCreating(false);
          setSelectedIndicator(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {isCreating ? "Novo Indicador" : `Editar: ${selectedIndicator?.name}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do indicador"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Código único (ex: IPCA_BCB)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="Ex: %, R$, Índice"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>API Vinculada</Label>
              <Select value={formData.api_id} onValueChange={(v) => setFormData({ ...formData, api_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma API (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {apis.map((api) => (
                    <SelectItem key={api.id} value={api.id}>{api.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_regional"
                checked={formData.is_regional}
                onCheckedChange={(checked) => setFormData({ ...formData, is_regional: !!checked })}
              />
              <Label htmlFor="is_regional" className="cursor-pointer">
                É indicador regional (dados por UF)
              </Label>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {!isCreating && (
              <Button
                variant="destructive"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setIsCreating(false);
                setSelectedIndicator(null);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o indicador "{selectedIndicator?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedIndicator && deleteMutation.mutate(selectedIndicator.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TableDatabaseTab;
