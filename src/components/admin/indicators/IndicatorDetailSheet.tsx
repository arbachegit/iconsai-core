import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { RefreshCw, ChevronDown, Plus, Pencil, Trash2, Check, X, Calendar, TrendingUp, DollarSign, Percent, Users, BarChart3, ShoppingCart, Heart, Building2, Car, Fuel, Pill, Tv, Shirt, Activity, LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Indicator {
  id: string;
  name: string;
  code: string;
  frequency: string;
  unit: string | null;
  category?: string;
}

interface IndicatorValue {
  id: string;
  reference_date: string;
  value: number;
}

interface YearGroup {
  year: number;
  values: IndicatorValue[];
}

interface IndicatorDetailSheetProps {
  indicator: Indicator | null;
  source: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChange: () => void;
}

// Icon mapping
const getIndicatorIcon = (code: string, name: string): LucideIcon => {
  const lowerCode = code.toLowerCase();
  const lowerName = name.toLowerCase();
  
  if (lowerCode.includes('selic') || lowerCode.includes('cdi')) return TrendingUp;
  if (lowerCode.includes('dolar') || lowerCode.includes('ptax')) return DollarSign;
  if (lowerCode.includes('ipca')) return Percent;
  if (lowerCode.includes('pib')) return BarChart3;
  if (lowerCode.includes('desemp') || lowerName.includes('desemprego')) return Users;
  if (lowerName.includes('confiança')) return Heart;
  if (lowerName.includes('vestuário')) return Shirt;
  if (lowerName.includes('móveis')) return Tv;
  if (lowerName.includes('farmácia')) return Pill;
  if (lowerName.includes('combustível')) return Fuel;
  if (lowerName.includes('veículo')) return Car;
  if (lowerName.includes('construção')) return Building2;
  if (lowerName.includes('varejo')) return ShoppingCart;
  
  return Activity;
};

// Get frequency label
const getFrequencyLabel = (frequency: string): string => {
  const freq = frequency?.toLowerCase() || 'monthly';
  if (freq === 'daily' || freq === 'diária') return 'Diária';
  if (freq === 'monthly' || freq === 'mensal') return 'Mensal';
  if (freq === 'quarterly' || freq === 'trimestral') return 'Trimestral';
  if (freq === 'yearly' || freq === 'anual') return 'Anual';
  return 'Mensal';
};

// Check if frequency is annual (show flat table) or monthly (show accordion)
const isAnnualFrequency = (frequency: string): boolean => {
  const freq = frequency?.toLowerCase() || '';
  return freq === 'yearly' || freq === 'anual';
};

// Get month name from date
const getMonthName = (dateStr: string): string => {
  return format(new Date(dateStr), 'MMM', { locale: ptBR });
};

export default function IndicatorDetailSheet({ 
  indicator, 
  source, 
  open, 
  onOpenChange,
  onDataChange 
}: IndicatorDetailSheetProps) {
  const [values, setValues] = useState<IndicatorValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [openYears, setOpenYears] = useState<Set<number>>(new Set());
  
  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Add new value dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    if (indicator && open) {
      fetchValues();
    }
  }, [indicator, open]);

  const fetchValues = async () => {
    if (!indicator) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('indicator_values')
        .select('id, reference_date, value')
        .eq('indicator_id', indicator.id)
        .order('reference_date', { ascending: false });

      if (error) throw error;
      setValues((data || []).map(d => ({ ...d, value: Number(d.value) })));
      
      // Auto-expand current year
      if (data && data.length > 0) {
        const currentYear = new Date().getFullYear();
        setOpenYears(new Set([currentYear]));
      }
    } catch (error) {
      console.error('Error fetching values:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Group values by year
  const yearGroups = useMemo((): YearGroup[] => {
    const groups: Record<number, IndicatorValue[]> = {};
    
    values.forEach(v => {
      const year = new Date(v.reference_date).getFullYear();
      if (!groups[year]) groups[year] = [];
      groups[year].push(v);
    });
    
    return Object.entries(groups)
      .map(([year, vals]) => ({ 
        year: parseInt(year), 
        values: vals.sort((a, b) => new Date(b.reference_date).getTime() - new Date(a.reference_date).getTime())
      }))
      .sort((a, b) => b.year - a.year);
  }, [values]);

  const handleFetchData = async () => {
    if (!indicator) return;
    setFetching(true);
    try {
      const response = await supabase.functions.invoke('fetch-economic-data', {
        body: { indicatorId: indicator.id }
      });

      if (response.error) throw response.error;
      toast.success(`Dados atualizados: ${response.data?.recordsInserted || 0} registros`);
      fetchValues();
      onDataChange();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao buscar dados da API');
    } finally {
      setFetching(false);
    }
  };

  const handleStartEdit = (id: string, currentValue: number) => {
    setEditingId(id);
    setEditValue(String(currentValue));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSaveEdit = async (id: string) => {
    const numValue = parseFloat(editValue);
    if (isNaN(numValue)) {
      toast.error('Valor inválido');
      return;
    }

    try {
      const { error } = await supabase
        .from('indicator_values')
        .update({ value: numValue })
        .eq('id', id);

      if (error) throw error;
      
      setValues(prev => prev.map(v => v.id === id ? { ...v, value: numValue } : v));
      toast.success('Valor atualizado');
      setEditingId(null);
      onDataChange();
    } catch (error) {
      console.error('Error updating value:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro?')) return;
    
    try {
      const { error } = await supabase
        .from('indicator_values')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setValues(prev => prev.filter(v => v.id !== id));
      toast.success('Registro excluído');
      onDataChange();
    } catch (error) {
      console.error('Error deleting value:', error);
      toast.error('Erro ao excluir');
    }
  };

  const handleAddValue = async () => {
    if (!indicator || !newDate || !newValue) {
      toast.error('Preencha todos os campos');
      return;
    }

    const numValue = parseFloat(newValue);
    if (isNaN(numValue)) {
      toast.error('Valor inválido');
      return;
    }

    try {
      const { error } = await supabase
        .from('indicator_values')
        .insert({
          indicator_id: indicator.id,
          reference_date: newDate,
          value: numValue
        });

      if (error) throw error;
      
      toast.success('Valor inserido');
      setAddDialogOpen(false);
      setNewDate('');
      setNewValue('');
      fetchValues();
      onDataChange();
    } catch (error) {
      console.error('Error adding value:', error);
      toast.error('Erro ao inserir');
    }
  };

  const toggleYear = (year: number) => {
    setOpenYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  if (!indicator) return null;

  const Icon = getIndicatorIcon(indicator.code, indicator.name);
  const isAnnual = isAnnualFrequency(indicator.frequency);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-lg">{indicator.name}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{source}</Badge>
                  <Badge variant="outline" className="text-xs">{getFrequencyLabel(indicator.frequency)}</Badge>
                  {indicator.unit && <Badge variant="secondary" className="text-xs">{indicator.unit}</Badge>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 pt-4">
              <Button 
                onClick={handleFetchData} 
                disabled={fetching}
                className="gap-2"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
                Atualizar via API
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Inserir Valor
              </Button>
            </div>
          </SheetHeader>

          <div className="py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : values.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum dado disponível</p>
                <p className="text-sm mt-1">Clique em "Atualizar via API" para buscar dados</p>
              </div>
            ) : isAnnual ? (
              // FLAT TABLE for Annual frequency
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ano</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {values.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">
                        {new Date(v.reference_date).getFullYear()}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === v.id ? (
                          <Input
                            type="number"
                            step="any"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8 w-28 text-right ml-auto"
                            autoFocus
                          />
                        ) : (
                          <span className="font-mono">
                            {v.value.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                            {indicator.unit && ` ${indicator.unit}`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === v.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveEdit(v.id)}>
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStartEdit(v.id, v.value)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(v.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              // ACCORDION by Year for Monthly frequency
              <div className="space-y-2">
                {yearGroups.map(group => (
                  <Collapsible 
                    key={group.year} 
                    open={openYears.has(group.year)}
                    onOpenChange={() => toggleYear(group.year)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openYears.has(group.year) ? '' : '-rotate-90'}`} />
                        <span className="font-semibold">{group.year}</span>
                        <Badge variant="secondary" className="text-xs">
                          {group.values.length} registros
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mês</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="w-24 text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.values.map(v => (
                            <TableRow key={v.id}>
                              <TableCell className="font-medium capitalize">
                                {getMonthName(v.reference_date)}
                              </TableCell>
                              <TableCell className="text-right">
                                {editingId === v.id ? (
                                  <Input
                                    type="number"
                                    step="any"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="h-8 w-28 text-right ml-auto"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="font-mono">
                                    {v.value.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                                    {indicator.unit && ` ${indicator.unit}`}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {editingId === v.id ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveEdit(v.id)}>
                                      <Check className="h-4 w-4 text-green-500" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                                      <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStartEdit(v.id, v.value)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(v.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Value Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inserir Novo Valor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data de Referência</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor {indicator?.unit && `(${indicator.unit})`}</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddValue}>Inserir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
