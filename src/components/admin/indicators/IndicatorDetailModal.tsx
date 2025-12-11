import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  RefreshCw, Plus, Calendar, TrendingUp, DollarSign, Percent, Users, 
  BarChart3, ShoppingCart, Heart, Building2, Car, Fuel, Pill, Tv, 
  Shirt, Activity, LucideIcon 
} from 'lucide-react';
import MonthlyMatrixView from './MonthlyMatrixView';
import AnnualBlocksView from './AnnualBlocksView';

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

interface IndicatorDetailModalProps {
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

// Frequency helpers
const getFrequencyLabel = (frequency: string): string => {
  const freq = frequency?.toLowerCase() || 'monthly';
  if (freq === 'daily' || freq === 'diária') return 'Diária';
  if (freq === 'monthly' || freq === 'mensal') return 'Mensal';
  if (freq === 'quarterly' || freq === 'trimestral') return 'Trimestral';
  if (freq === 'yearly' || freq === 'anual') return 'Anual';
  return 'Mensal';
};

const isAnnualFrequency = (frequency: string): boolean => {
  const freq = frequency?.toLowerCase() || '';
  return freq === 'yearly' || freq === 'anual';
};

export default function IndicatorDetailModal({ 
  indicator, 
  source, 
  open, 
  onOpenChange,
  onDataChange 
}: IndicatorDetailModalProps) {
  const [values, setValues] = useState<IndicatorValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
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
    } catch (error) {
      console.error('Error fetching values:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

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

  const handleValueChange = () => {
    fetchValues();
    onDataChange();
  };

  if (!indicator) return null;

  const Icon = getIndicatorIcon(indicator.code, indicator.name);
  const isAnnual = isAnnualFrequency(indicator.frequency);
  const totalRecords = values.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">{indicator.name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{source}</Badge>
                    <Badge variant="outline" className="text-xs">{getFrequencyLabel(indicator.frequency)}</Badge>
                    {indicator.unit && <Badge variant="secondary" className="text-xs">{indicator.unit}</Badge>}
                    <Badge variant="secondary" className="text-xs font-mono">{totalRecords} registros</Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
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
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : values.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Nenhum dado disponível</p>
                <p className="text-sm mt-2">Clique em "Atualizar via API" para buscar dados</p>
              </div>
            ) : isAnnual ? (
              <AnnualBlocksView 
                indicatorId={indicator.id}
                values={values}
                unit={indicator.unit}
                onValueChange={handleValueChange}
              />
            ) : (
              <MonthlyMatrixView 
                indicatorId={indicator.id}
                values={values}
                unit={indicator.unit}
                onValueChange={handleValueChange}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Value Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Inserir Novo Valor
            </DialogTitle>
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
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddValue} className="gap-2">
              <Plus className="h-4 w-4" />
              Inserir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
