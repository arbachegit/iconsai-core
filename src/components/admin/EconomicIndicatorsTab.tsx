import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, RefreshCw, Calendar, Clock, Download, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Indicator {
  id: string;
  name: string;
  code: string;
  frequency: string;
  unit: string | null;
  cron_schedule: string | null;
  api_id: string | null;
}

interface IndicatorValue {
  reference_date: string;
  value: number;
}

interface ChartData {
  date: string;
  value: number;
  formattedDate: string;
}

export default function EconomicIndicatorsTab() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<string>('');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [cronDialogOpen, setCronDialogOpen] = useState(false);
  const [cronSchedule, setCronSchedule] = useState('');

  useEffect(() => {
    fetchIndicators();
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

  const fetchIndicatorValues = async (indicatorId: string) => {
    try {
      const { data, error } = await supabase
        .from('indicator_values')
        .select('reference_date, value')
        .eq('indicator_id', indicatorId)
        .order('reference_date', { ascending: true });

      if (error) throw error;

      const formattedData: ChartData[] = (data || []).map((item) => ({
        date: item.reference_date,
        value: Number(item.value),
        formattedDate: format(new Date(item.reference_date), 'MMM/yy', { locale: ptBR })
      }));

      setChartData(formattedData);
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

      toast.success(`Dados atualizados: ${response.data?.recordsInserted || 0} registros`);
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

      toast.success(`Todos os indicadores atualizados`);
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

  const selectedIndicatorData = indicators.find(i => i.id === selectedIndicator);

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
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleFetchAll}
            disabled={fetchingData}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${fetchingData ? 'animate-spin' : ''}`} />
            Atualizar Todos
          </Button>
        </div>
      </div>

      {/* Indicator Selector */}
      <Card className="border-border/40 bg-card/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Selecione um indicador" />
                </SelectTrigger>
                <SelectContent>
                  {indicators.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>
                      {ind.name} ({ind.code})
                    </SelectItem>
                  ))}
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
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {latestValue && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/40 bg-card/50">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Último Valor</div>
              <div className="text-3xl font-bold">
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
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Variação</div>
              <div className={`text-3xl font-bold ${variation && variation >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {variation !== null ? (
                  <>
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
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total de Registros</div>
              <div className="text-3xl font-bold">{chartData.length}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {chartData.length > 0 && (
                  <>
                    Desde {format(new Date(chartData[0].date), 'MMM/yyyy', { locale: ptBR })}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Série Histórica - {selectedIndicatorData?.name || 'Indicador'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum dado disponível</p>
                <p className="text-sm">Clique em "Buscar Dados" para carregar</p>
              </div>
            </div>
          ) : (
            <div className="h-[400px]">
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
                    fontSize={12}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
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
      </Card>

      {lastFetch && (
        <p className="text-xs text-muted-foreground text-right">
          Última atualização: {format(new Date(lastFetch), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </p>
      )}
    </div>
  );
}
