import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, Calendar, Clock, Download, Plus, Pencil, Trash2, Info, Database, Bell, FileText, ChevronDown, Newspaper, ExternalLink, BarChart3, LineChart } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Indicator {
  id: string;
  name: string;
  code: string;
  frequency: string;
  unit: string | null;
  cron_schedule: string | null;
  api_id: string | null;
  category?: string;
}

interface IndicatorValue {
  id: string;
  reference_date: string;
  value: number;
}

interface ChartData {
  date: string;
  value: number;
  formattedDate: string;
}

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  published_at: string | null;
  sentiment_score: number | null;
}

// Category configuration
const CATEGORIES = {
  macro: { label: 'Visão Macro', icon: LineChart, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  varejo_restrito: { label: 'Varejo Restrito', icon: BarChart3, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  varejo_ampliado: { label: 'Varejo Ampliado', icon: BarChart3, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
};

export default function EconomicIndicatorsTab() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<string>('');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [tableData, setTableData] = useState<IndicatorValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [cronDialogOpen, setCronDialogOpen] = useState(false);
  const [cronSchedule, setCronSchedule] = useState('');
  const [etlModalOpen, setEtlModalOpen] = useState(false);
  
  // CRUD state
  const [crudDialogOpen, setCrudDialogOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<IndicatorValue | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showTable, setShowTable] = useState(false);
  
  // Section state
  const [macroOpen, setMacroOpen] = useState(true);
  const [varejoOpen, setVarejoOpen] = useState(true);
  const [newsOpen, setNewsOpen] = useState(true);
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    fetchIndicators();
    fetchLatestNews();
  }, []);

  useEffect(() => {
    if (selectedIndicator) {
      fetchIndicatorValues(selectedIndicator);
    }
  }, [selectedIndicator]);

  const fetchIndicators = async () => {
    try {
      const { data, error } = await supabase
        .from('economic_indicators')
        .select('*')
        .order('name');

      if (error) throw error;
      setIndicators(data || []);
      if (data && data.length > 0) {
        setSelectedIndicator(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching indicators:', error);
      toast.error('Erro ao carregar indicadores');
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestNews = async () => {
    try {
      const { data, error } = await supabase
        .from('market_news')
        .select('id, title, url, source, published_at, sentiment_score')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(5);

      if (error) throw error;
      setLatestNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };

  const fetchIndicatorValues = async (indicatorId: string) => {
    try {
      const { data, error } = await supabase
        .from('indicator_values')
        .select('id, reference_date, value')
        .eq('indicator_id', indicatorId)
        .order('reference_date', { ascending: true });

      if (error) throw error;

      const formattedData: ChartData[] = (data || []).map((item) => ({
        date: item.reference_date,
        value: Number(item.value),
        formattedDate: format(new Date(item.reference_date), 'MMM/yy', { locale: ptBR })
      }));

      setChartData(formattedData);
      setTableData((data || []).map(d => ({ ...d, value: Number(d.value) })).reverse().slice(0, 24));
    } catch (error) {
      console.error('Error fetching indicator values:', error);
    }
  };

  const handleFetchData = async () => {
    setFetchingData(true);
    try {
      const response = await supabase.functions.invoke('fetch-economic-data', {
        body: { indicatorId: selectedIndicator }
      });

      if (response.error) throw response.error;

      toast.success(`Dados atualizados: ${response.data?.recordsInserted || 0} registros (${response.data?.newRecordsCount || 0} novos)`);
      setLastFetch(new Date().toISOString());
      fetchIndicatorValues(selectedIndicator);
    } catch (error) {
      console.error('Error fetching economic data:', error);
      toast.error('Erro ao buscar dados da API');
    } finally {
      setFetchingData(false);
    }
  };

  const handleFetchAll = async () => {
    setFetchingData(true);
    try {
      const response = await supabase.functions.invoke('fetch-economic-data', {
        body: { fetchAll: true }
      });

      if (response.error) throw response.error;

      toast.success(`Todos os indicadores atualizados: ${response.data?.recordsInserted || 0} registros`);
      setLastFetch(new Date().toISOString());
      if (selectedIndicator) {
        fetchIndicatorValues(selectedIndicator);
      }
    } catch (error) {
      console.error('Error fetching all data:', error);
      toast.error('Erro ao buscar dados');
    } finally {
      setFetchingData(false);
    }
  };

  const handleUpdateCron = async () => {
    if (!selectedIndicator) return;

    try {
      const { error } = await supabase
        .from('economic_indicators')
        .update({ cron_schedule: cronSchedule })
        .eq('id', selectedIndicator);

      if (error) throw error;
      toast.success('Schedule atualizado');
      setCronDialogOpen(false);
      fetchIndicators();
    } catch (error) {
      console.error('Error updating cron:', error);
      toast.error('Erro ao atualizar schedule');
    }
  };

  // CRUD operations
  const handleOpenCrud = (value?: IndicatorValue) => {
    if (value) {
      setEditingValue(value);
      setNewDate(value.reference_date);
      setNewValue(String(value.value));
    } else {
      setEditingValue(null);
      setNewDate('');
      setNewValue('');
    }
    setCrudDialogOpen(true);
  };

  const handleSaveValue = async () => {
    if (!newDate || !newValue || !selectedIndicator) {
      toast.error('Data e valor são obrigatórios');
      return;
    }

    try {
      if (editingValue) {
        const { error } = await supabase
          .from('indicator_values')
          .update({ value: parseFloat(newValue), reference_date: newDate })
          .eq('id', editingValue.id);

        if (error) throw error;
        toast.success('Valor atualizado');
      } else {
        const { error } = await supabase
          .from('indicator_values')
          .insert({
            indicator_id: selectedIndicator,
            reference_date: newDate,
            value: parseFloat(newValue)
          });

        if (error) throw error;
        toast.success('Valor inserido');
      }

      setCrudDialogOpen(false);
      fetchIndicatorValues(selectedIndicator);
    } catch (error) {
      console.error('Error saving value:', error);
      toast.error('Erro ao salvar');
    }
  };

  const handleDeleteValue = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      const { error } = await supabase
        .from('indicator_values')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Registro excluído');
      fetchIndicatorValues(selectedIndicator);
    } catch (error) {
      console.error('Error deleting value:', error);
      toast.error('Erro ao excluir');
    }
  };

  const selectedIndicatorData = indicators.find(i => i.id === selectedIndicator);

  // Group indicators by category
  const macroIndicators = indicators.filter(i => !i.category || i.category === 'macro');
  const varejoRestritoIndicators = indicators.filter(i => i.category === 'varejo_restrito');
  const varejoAmpliadoIndicators = indicators.filter(i => i.category === 'varejo_ampliado');

  const getLatestValue = () => {
    if (chartData.length === 0) return null;
    return chartData[chartData.length - 1];
  };

  const getVariation = () => {
    if (chartData.length < 2) return null;
    const current = chartData[chartData.length - 1].value;
    const previous = chartData[chartData.length - 2].value;
    return ((current - previous) / previous) * 100;
  };

  const getSentimentColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score > 0.2) return 'text-green-400';
    if (score < -0.2) return 'text-red-400';
    return 'text-amber-400';
  };

  const latestValue = getLatestValue();
  const variation = getVariation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Painel de Indicadores Econômicos</h2>
          
          {/* ETL Explanation Modal */}
          <Dialog open={etlModalOpen} onOpenChange={setEtlModalOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  Como Funciona o ETL de Indicadores
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Flow Diagram */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <div className="flex items-center justify-between gap-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Database className="h-6 w-6 text-blue-400" />
                      </div>
                      <span className="text-xs font-medium">APIs Externas</span>
                      <span className="text-xs text-muted-foreground">BCB, IBGE</span>
                    </div>
                    
                    <div className="flex-1 border-t-2 border-dashed border-border relative">
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                        fetch
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 text-green-400" />
                      </div>
                      <span className="text-xs font-medium">Edge Function</span>
                      <span className="text-xs text-muted-foreground">Parse & Transform</span>
                    </div>
                    
                    <div className="flex-1 border-t-2 border-dashed border-border relative">
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                        upsert
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-purple-400" />
                      </div>
                      <span className="text-xs font-medium">Database</span>
                      <span className="text-xs text-muted-foreground">indicator_values</span>
                    </div>
                    
                    <div className="flex-1 border-t-2 border-dashed border-border relative">
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                        notify
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Bell className="h-6 w-6 text-amber-400" />
                      </div>
                      <span className="text-xs font-medium">Notificação</span>
                      <span className="text-xs text-muted-foreground">Email/WhatsApp</span>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="h-6 w-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold shrink-0">1</div>
                    <div>
                      <h4 className="font-medium text-sm">Fetch de APIs (2010-Presente)</h4>
                      <p className="text-xs text-muted-foreground">
                        Consulta APIs do BCB (Selic, Dólar, CDI) e IBGE/SIDRA (IPCA, PIB, PMC, Desemprego).
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="h-6 w-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold shrink-0">2</div>
                    <div>
                      <h4 className="font-medium text-sm">Transformação</h4>
                      <p className="text-xs text-muted-foreground">
                        Dados normalizados, datas convertidas e valores formatados.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="h-6 w-6 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-bold shrink-0">3</div>
                    <div>
                      <h4 className="font-medium text-sm">Upsert Inteligente</h4>
                      <p className="text-xs text-muted-foreground">
                        Existentes atualizados, novos inseridos. Duplicatas detectadas.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="h-6 w-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold shrink-0">4</div>
                    <div>
                      <h4 className="font-medium text-sm">Notificação Automática</h4>
                      <p className="text-xs text-muted-foreground">
                        Novos dados disparam notificação via Email/WhatsApp.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleFetchAll}
            disabled={fetchingData}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${fetchingData ? 'animate-spin' : ''}`} />
            Sync Todos
          </Button>
        </div>
      </div>

      {/* SECTION 1: Visão Macro */}
      <Collapsible open={macroOpen} onOpenChange={setMacroOpen}>
        <Card className="border-border/40 bg-card/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-blue-400" />
                  <span>Visão Macro</span>
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/40">
                    {macroIndicators.length} indicadores
                  </Badge>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${macroOpen ? 'rotate-0' : '-rotate-90'}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Indicator Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 w-full sm:w-auto">
                  <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
                    <SelectTrigger className="w-full sm:w-[300px]">
                      <SelectValue placeholder="Selecione um indicador" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Macro</div>
                      {macroIndicators.map((ind) => (
                        <SelectItem key={ind.id} value={ind.id}>
                          {ind.name} ({ind.code})
                        </SelectItem>
                      ))}
                      {varejoRestritoIndicators.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Varejo Restrito</div>
                          {varejoRestritoIndicators.map((ind) => (
                            <SelectItem key={ind.id} value={ind.id}>
                              {ind.name} ({ind.code})
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {varejoAmpliadoIndicators.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Varejo Ampliado</div>
                          {varejoAmpliadoIndicators.map((ind) => (
                            <SelectItem key={ind.id} value={ind.id}>
                              {ind.name} ({ind.code})
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedIndicatorData && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedIndicatorData.frequency}
                    </Badge>
                    {selectedIndicatorData.unit && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedIndicatorData.unit}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <Dialog open={cronDialogOpen} onOpenChange={setCronDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCronSchedule(selectedIndicatorData?.cron_schedule || '')}
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configurar Schedule (Cron)</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Cron Expression</Label>
                          <Input
                            value={cronSchedule}
                            onChange={(e) => setCronSchedule(e.target.value)}
                            placeholder="0 8 * * 1"
                          />
                          <p className="text-xs text-muted-foreground">
                            Formato: minuto hora dia-mês mês dia-semana
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p><strong>Exemplos:</strong></p>
                          <p>• 0 8 * * 1 - Segunda às 08:00</p>
                          <p>• 0 9 10 * * - Dia 10 às 09:00</p>
                          <p>• 0 18 * * 1-5 - Dias úteis às 18:00</p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCronDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleUpdateCron}>Salvar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    onClick={handleFetchData}
                    disabled={fetchingData || !selectedIndicator}
                    className="gap-2"
                  >
                    <Download className={`h-4 w-4 ${fetchingData ? 'animate-bounce' : ''}`} />
                    Buscar Dados
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              {latestValue && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
                    <div className="text-sm text-muted-foreground mb-1">Último Valor</div>
                    <div className="text-2xl font-bold">
                      {latestValue.value.toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2 
                      })}
                      {selectedIndicatorData?.unit && (
                        <span className="text-lg text-muted-foreground ml-1">
                          {selectedIndicatorData.unit}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Ref: {format(new Date(latestValue.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
                    <div className="text-sm text-muted-foreground mb-1">Variação</div>
                    <div className={`text-2xl font-bold flex items-center gap-2 ${variation && variation >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {variation !== null ? (
                        <>
                          {variation >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                          {variation >= 0 ? '+' : ''}
                          {variation.toFixed(2)}%
                        </>
                      ) : (
                        '-'
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      vs. período anterior
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
                    <div className="text-sm text-muted-foreground mb-1">Total de Registros</div>
                    <div className="text-2xl font-bold">{chartData.length}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {chartData.length > 0 && (
                        <>
                          Desde {format(new Date(chartData[0].date), 'MMM/yyyy', { locale: ptBR })}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Chart */}
              {chartData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dado disponível</p>
                    <p className="text-sm">Clique em "Buscar Dados" para carregar</p>
                  </div>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="formattedDate" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(value) => value.toLocaleString('pt-BR')}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [
                          `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${selectedIndicatorData?.unit || ''}`,
                          selectedIndicatorData?.name || 'Valor'
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* SECTION 2: Varejo Deep Dive */}
      <Collapsible open={varejoOpen} onOpenChange={setVarejoOpen}>
        <Card className="border-border/40 bg-card/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-400" />
                  <span>Varejo Deep Dive</span>
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/40">
                    {varejoRestritoIndicators.length + varejoAmpliadoIndicators.length} categorias
                  </Badge>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${varejoOpen ? 'rotate-0' : '-rotate-90'}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Varejo Restrito */}
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    Varejo Restrito
                  </h4>
                  <div className="space-y-2">
                    {varejoRestritoIndicators.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada. Execute "Sync Todos" para carregar.</p>
                    ) : (
                      varejoRestritoIndicators.map((ind) => (
                        <div 
                          key={ind.id} 
                          className="flex items-center justify-between p-2 rounded bg-background/50 hover:bg-background/80 cursor-pointer transition-colors"
                          onClick={() => setSelectedIndicator(ind.id)}
                        >
                          <span className="text-sm">{ind.name}</span>
                          <Badge variant="outline" className="text-xs">{ind.unit}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Varejo Ampliado */}
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-purple-500" />
                    Varejo Ampliado
                  </h4>
                  <div className="space-y-2">
                    {varejoAmpliadoIndicators.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada. Execute "Sync Todos" para carregar.</p>
                    ) : (
                      varejoAmpliadoIndicators.map((ind) => (
                        <div 
                          key={ind.id} 
                          className="flex items-center justify-between p-2 rounded bg-background/50 hover:bg-background/80 cursor-pointer transition-colors"
                          onClick={() => setSelectedIndicator(ind.id)}
                        >
                          <span className="text-sm">{ind.name}</span>
                          <Badge variant="outline" className="text-xs">{ind.unit}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* SECTION 3: Balcão de Notícias (Inline Preview) */}
      <Collapsible open={newsOpen} onOpenChange={setNewsOpen}>
        <Card className="border-border/40 bg-card/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5 text-amber-400" />
                  <span>Últimas Notícias</span>
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/40">
                    {latestNews.length} recentes
                  </Badge>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${newsOpen ? 'rotate-0' : '-rotate-90'}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {latestNews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Newspaper className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma notícia disponível</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {latestNews.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{item.source}</Badge>
                          {item.published_at && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          )}
                          <span className={`text-xs ${getSentimentColor(item.sentiment_score)}`}>
                            {item.sentiment_score !== null && (
                              item.sentiment_score > 0.2 ? '📈 Positivo' : 
                              item.sentiment_score < -0.2 ? '📉 Negativo' : '➡️ Neutro'
                            )}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* CRUD Table */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Dados Recentes (CRUD)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTable(!showTable)}
            >
              {showTable ? 'Ocultar' : 'Mostrar'} Tabela
            </Button>
            <Dialog open={crudDialogOpen} onOpenChange={setCrudDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenCrud()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Inserir Valor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingValue ? 'Editar Valor' : 'Inserir Novo Valor'}
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
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCrudDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveValue}>
                    {editingValue ? 'Salvar' : 'Inserir'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        {showTable && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Nenhum dado disponível
                    </TableCell>
                  </TableRow>
                ) : (
                  tableData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {format(new Date(row.reference_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {selectedIndicatorData?.unit && (
                          <span className="text-muted-foreground ml-1">{selectedIndicatorData.unit}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenCrud(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteValue(row.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {lastFetch && (
        <p className="text-xs text-muted-foreground text-right">
          Última atualização: {format(new Date(lastFetch), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </p>
      )}
    </div>
  );
}
