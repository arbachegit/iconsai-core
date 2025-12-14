import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Plus, Pencil, Trash2, ArrowUpDown, Database, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type SortField = "name" | "code" | "unit" | "category" | "frequency" | "is_regional" | "count";
type SortDirection = "asc" | "desc";

interface IndicatorWithStats {
  id: string;
  name: string;
  code: string;
  unit: string | null;
  category: string | null;
  frequency: string | null;
  is_regional: boolean | null;
  api_id: string | null;
  count: number;
  min_date: string | null;
  max_date: string | null;
  last_value: number | null;
}

interface IndicatorForm {
  name: string;
  code: string;
  unit: string;
  category: string;
  frequency: string;
  is_regional: boolean;
  api_id: string | null;
}

const initialForm: IndicatorForm = {
  name: "",
  code: "",
  unit: "",
  category: "macro",
  frequency: "monthly",
  is_regional: false,
  api_id: null,
};

export function TableDatabaseTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<IndicatorForm>(initialForm);

  // Fetch indicators with stats
  const { data: indicators = [], isLoading } = useQuery({
    queryKey: ["table-database-indicators"],
    queryFn: async () => {
      const { data: indicatorsData, error: indicatorsError } = await supabase
        .from("economic_indicators")
        .select("*")
        .order("name");

      if (indicatorsError) throw indicatorsError;

      // Get stats for each indicator
      const indicatorsWithStats: IndicatorWithStats[] = await Promise.all(
        indicatorsData.map(async (indicator) => {
          const table = indicator.is_regional ? "indicator_regional_values" : "indicator_values";
          
          const { count } = await supabase
            .from(table)
            .select("*", { count: "exact", head: true })
            .eq("indicator_id", indicator.id);

          const { data: dateRange } = await supabase
            .from(table)
            .select("reference_date, value")
            .eq("indicator_id", indicator.id)
            .order("reference_date", { ascending: false })
            .limit(1);

          const { data: minDate } = await supabase
            .from(table)
            .select("reference_date")
            .eq("indicator_id", indicator.id)
            .order("reference_date", { ascending: true })
            .limit(1);

          return {
            ...indicator,
            count: count || 0,
            min_date: minDate?.[0]?.reference_date || null,
            max_date: dateRange?.[0]?.reference_date || null,
            last_value: dateRange?.[0]?.value || null,
          };
        })
      );

      return indicatorsWithStats;
    },
  });

  // Fetch APIs for select
  const { data: apis = [] } = useQuery({
    queryKey: ["apis-for-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_api_registry")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: IndicatorForm) => {
      const { error } = await supabase.from("economic_indicators").insert({
        name: data.name,
        code: data.code,
        unit: data.unit || null,
        category: data.category,
        frequency: data.frequency,
        is_regional: data.is_regional,
        api_id: data.api_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Indicador criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["table-database-indicators"] });
      setIsFormOpen(false);
      setForm(initialForm);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: IndicatorForm }) => {
      const { error } = await supabase
        .from("economic_indicators")
        .update({
          name: data.name,
          code: data.code,
          unit: data.unit || null,
          category: data.category,
          frequency: data.frequency,
          is_regional: data.is_regional,
          api_id: data.api_id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Indicador atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["table-database-indicators"] });
      setIsFormOpen(false);
      setEditingId(null);
      setForm(initialForm);
    },
    onError: (error: Error) => {
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
      toast.success("Indicador excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["table-database-indicators"] });
      setIsDeleteOpen(false);
      setDeletingId(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  // Filter and sort
  const filteredIndicators = useMemo(() => {
    let result = [...indicators];

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.code.toLowerCase().includes(query) ||
          (i.category?.toLowerCase().includes(query) ?? false)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number | boolean = "";
      let bVal: string | number | boolean = "";

      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "code":
          aVal = a.code.toLowerCase();
          bVal = b.code.toLowerCase();
          break;
        case "unit":
          aVal = (a.unit || "").toLowerCase();
          bVal = (b.unit || "").toLowerCase();
          break;
        case "category":
          aVal = (a.category || "").toLowerCase();
          bVal = (b.category || "").toLowerCase();
          break;
        case "frequency":
          aVal = (a.frequency || "").toLowerCase();
          bVal = (b.frequency || "").toLowerCase();
          break;
        case "is_regional":
          aVal = a.is_regional ? 1 : 0;
          bVal = b.is_regional ? 1 : 0;
          break;
        case "count":
          aVal = a.count;
          bVal = b.count;
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [indicators, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleEdit = (indicator: IndicatorWithStats) => {
    setEditingId(indicator.id);
    setForm({
      name: indicator.name,
      code: indicator.code,
      unit: indicator.unit || "",
      category: indicator.category || "macro",
      frequency: indicator.frequency || "monthly",
      is_regional: indicator.is_regional || false,
      api_id: indicator.api_id,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Nome e Código são obrigatórios");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const SortableHeader = ({ field, label }: { field: SortField; label: string }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-primary" : "text-muted-foreground"}`} />
      </div>
    </TableHead>
  );

  const formatPeriod = (minDate: string | null, maxDate: string | null) => {
    if (!minDate || !maxDate) return "-";
    const min = format(new Date(minDate), "MM/yy", { locale: ptBR });
    const max = format(new Date(maxDate), "MM/yy", { locale: ptBR });
    return `${min} - ${max}`;
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Table Data Base</h1>
        </div>
        <Button onClick={() => { setEditingId(null); setForm(initialForm); setIsFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Indicador
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar indicador..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <SortableHeader field="name" label="Nome" />
                <SortableHeader field="code" label="Código" />
                <SortableHeader field="unit" label="Unidade" />
                <SortableHeader field="category" label="Categoria" />
                <SortableHeader field="frequency" label="Frequência" />
                <SortableHeader field="is_regional" label="Regional" />
                <SortableHeader field="count" label="Registros" />
                <TableHead>Período</TableHead>
                <TableHead>Último Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIndicators.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhum indicador encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredIndicators.map((indicator) => (
                  <TableRow key={indicator.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{indicator.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{indicator.code}</code>
                    </TableCell>
                    <TableCell>{indicator.unit || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {indicator.category || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{indicator.frequency || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={indicator.is_regional ? "default" : "secondary"} className="text-xs">
                        {indicator.is_regional ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{indicator.count.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatPeriod(indicator.min_date, indicator.max_date)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {indicator.last_value !== null ? indicator.last_value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(indicator)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(indicator.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Indicador" : "Novo Indicador"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Atualize os dados do indicador" : "Preencha os dados para criar um novo indicador"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Taxa Selic"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Ex: SELIC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Input
                id="unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="Ex: % a.a."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="macro">Macro</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="pmc">PMC</SelectItem>
                    <SelectItem value="pac">PAC</SelectItem>
                    <SelectItem value="demographic">Demográfico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>API Vinculada</Label>
              <Select value={form.api_id || "none"} onValueChange={(v) => setForm({ ...form, api_id: v === "none" ? null : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma API" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {apis.map((api) => (
                    <SelectItem key={api.id} value={api.id}>
                      {api.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_regional"
                checked={form.is_regional}
                onCheckedChange={(checked) => setForm({ ...form, is_regional: !!checked })}
              />
              <Label htmlFor="is_regional" className="cursor-pointer">
                Indicador Regional (dados por UF)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este indicador? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
