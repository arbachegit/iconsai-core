import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { TrendingUp, RefreshCw, Info, Database, Bell, FileText, BarChart3, LineChart, ShoppingCart, AlertTriangle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { IndicatorCard, IndicatorDetailModal } from './indicators';
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

interface IndicatorStats {
  [indicatorId: string]: {
    recordCount: number;
    lastUpdate: string | null;
  };
}

interface ApiRegistry {
  id: string;
  name: string;
  provider: string;
  fetch_start_date: string | null;
  fetch_end_date: string | null;
  last_sync_metadata: Record<string, unknown> | null;
}

interface DataDiscrepancy {
  indicatorId: string;
  indicatorName: string;
  configuredStart: string | null;
  configuredEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  isDiscrepant: boolean;
}

// Category configuration
const CATEGORIES = {
  macro: { label: 'Visão Macro', icon: LineChart, color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/40' },
  varejo_restrito: { label: 'Varejo Restrito', icon: ShoppingCart, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/40' },
  varejo_ampliado: { label: 'Varejo Ampliado', icon: BarChart3, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/40' },
};

export default function EconomicIndicatorsTab() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [indicatorStats, setIndicatorStats] = useState<IndicatorStats>({});
  const [apiRegistry, setApiRegistry] = useState<ApiRegistry[]>([]);
  const [dataDiscrepancies, setDataDiscrepancies] = useState<DataDiscrepancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [forceRefreshing, setForceRefreshing] = useState(false);
  const [etlModalOpen, setEtlModalOpen] = useState(false);
  
  // Force refresh confirmation modal
  const [forceRefreshModalOpen, setForceRefreshModalOpen] = useState(false);
  const [forceRefreshConfirmed, setForceRefreshConfirmed] = useState(false);
  
  // Detail modal state
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (debugSource: string = 'initial') => {
    console.log(`[ECONOMIC_INDICATORS] fetchData triggered by: ${debugSource}`);
    setLoading(true);
    try {
      // Fetch indicators, stats, and API registry in parallel
      const [indicatorsRes, statsRes, apiRes] = await Promise.all([
        supabase.from('economic_indicators').select('*').order('name'),
        supabase.from('indicator_values').select('indicator_id, reference_date').order('reference_date', { ascending: false }),
        supabase.from('system_api_registry').select('id, name, provider, fetch_start_date, fetch_end_date, last_sync_metadata')
      ]);

      if (indicatorsRes.error) throw indicatorsRes.error;
      
      console.log(`[ECONOMIC_INDICATORS] Loaded ${indicatorsRes.data?.length || 0} indicators`);
      console.log(`[ECONOMIC_INDICATORS] Loaded ${statsRes.data?.length || 0} indicator values`);
      console.log(`[ECONOMIC_INDICATORS] Loaded ${apiRes.data?.length || 0} API registry entries`);
      
      setIndicators(indicatorsRes.data || []);
      setApiRegistry((apiRes.data || []) as unknown as ApiRegistry[]);

      // Process stats with min/max dates for discrepancy detection
      const stats: IndicatorStats = {};
      const groupedByIndicator: Record<string, string[]> = {};
      
      (statsRes.data || []).forEach(row => {
        if (!groupedByIndicator[row.indicator_id]) {
          groupedByIndicator[row.indicator_id] = [];
        }
        groupedByIndicator[row.indicator_id].push(row.reference_date);
      });

      // Build discrepancy list
      const discrepancies: DataDiscrepancy[] = [];
      const indicatorsList = indicatorsRes.data || [];
      const apiList = apiRes.data || [];

      Object.entries(groupedByIndicator).forEach(([indicatorId, dates]) => {
        const sortedDates = [...dates].sort();
        const actualStart = sortedDates[0] || null;
        const actualEnd = sortedDates[sortedDates.length - 1] || null;
        
        stats[indicatorId] = {
          recordCount: dates.length,
          lastUpdate: dates[dates.length - 1] || null // Most recent by sort
        };

        // Find indicator and its API config
        const indicator = indicatorsList.find(i => i.id === indicatorId);
        if (indicator?.api_id) {
          const api = apiList.find(a => a.id === indicator.api_id);
          if (api?.fetch_start_date && api?.fetch_end_date) {
            const configStart = api.fetch_start_date.substring(0, 10);
            const configEnd = api.fetch_end_date.substring(0, 10);
            
            // Check if actual data range is significantly different from configured range
            const actualStartYear = actualStart ? parseInt(actualStart.substring(0, 4)) : null;
            const configStartYear = parseInt(configStart.substring(0, 4));
            const yearDiff = actualStartYear ? actualStartYear - configStartYear : 0;
            
            // Debug logging for discrepancy detection
            console.log(`[DISCREPANCY_CHECK] ${indicator.name}: config=${configStart}→${configEnd}, actual=${actualStart}→${actualEnd}, yearDiff=${yearDiff}`);
            
            // Discrepancy: data starts more than 1 year after configured start
            if (yearDiff > 1) {
              console.log(`[DISCREPANCY_DETECTED] ${indicator.name}: yearDiff ${yearDiff} > 1`);
              discrepancies.push({
                indicatorId,
                indicatorName: indicator.name,
                configuredStart: configStart,
                configuredEnd: configEnd,
                actualStart,
                actualEnd,
                isDiscrepant: true
              });
            }
          }
        }
      });

      console.log(`[ECONOMIC_INDICATORS] Total discrepancies found: ${discrepancies.length}`);
      if (discrepancies.length > 0) {
        console.log('[ECONOMIC_INDICATORS] Discrepancy details:', discrepancies);
      }

      setIndicatorStats(stats);
      setDataDiscrepancies(discrepancies);
    } catch (error) {
      console.error('[ECONOMIC_INDICATORS] Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAll = async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setForceRefreshing(true);
    } else {
      setFetchingAll(true);
    }
    console.log(`[SYNC_ALL] Starting synchronization... forceRefresh=${forceRefresh}`);
    
    try {
      const response = await supabase.functions.invoke('fetch-economic-data', {
        body: { fetchAll: true, forceRefresh }
      });

      if (response.error) throw response.error;
      
      console.log('[SYNC_ALL] Response:', response.data);
      
      if (forceRefresh) {
        toast.success(`☢️ Recarga Zero-Base concluída: ${response.data?.recordsInserted || 0} registros inseridos`);
      } else {
        toast.success(`Todos indicadores atualizados: ${response.data?.recordsInserted || 0} registros`);
      }
      
      // Clear state before refetch to ensure fresh data
      setDataDiscrepancies([]);
      setIndicatorStats({});
      
      // Add small delay to ensure database has committed all changes
      console.log('[SYNC_ALL] Waiting 1s before refetch...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('[SYNC_ALL] Triggering data refetch...');
      await fetchData('post-sync');
      console.log('[SYNC_ALL] Refetch complete');
    } catch (error) {
      console.error('[SYNC_ALL] Error:', error);
      toast.error('Erro ao buscar dados');
    } finally {
      setFetchingAll(false);
      setForceRefreshing(false);
      setForceRefreshModalOpen(false);
      setForceRefreshConfirmed(false);
    }
  };

  const handleForceRefreshClick = () => {
    setForceRefreshConfirmed(false);
    setForceRefreshModalOpen(true);
  };

  const handleForceRefreshConfirm = () => {
    if (!forceRefreshConfirmed) {
      toast.error('Você deve confirmar que entende a operação');
      return;
    }
    handleFetchAll(true);
  };

  const handleCardClick = (indicator: Indicator) => {
    setSelectedIndicator(indicator);
    setDetailModalOpen(true);
  };

  const getSourceForIndicator = (indicator: Indicator): string => {
    if (indicator.api_id) {
      const api = apiRegistry.find(a => a.id === indicator.api_id);
      if (api) return api.provider;
    }
    // Fallback based on code
    const code = indicator.code.toLowerCase();
    if (code.includes('selic') || code.includes('dolar') || code.includes('cdi') || code.includes('ptax')) return 'BCB';
    if (code.includes('ipca') || code.includes('pib') || code.includes('pmc') || code.includes('pnad')) return 'IBGE';
    return 'API';
  };

  // Group indicators by category
  const groupedIndicators = useMemo(() => {
    const macro = indicators.filter(i => !i.category || i.category === 'macro');
    const varejoRestrito = indicators.filter(i => i.category === 'varejo_restrito');
    const varejoAmpliado = indicators.filter(i => i.category === 'varejo_ampliado');
    return { macro, varejoRestrito, varejoAmpliado };
  }, [indicators]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Cadastro de Dados Econômicos</h2>
            <p className="text-sm text-muted-foreground">
              {indicators.length} indicadores • {Object.values(indicatorStats).reduce((acc, s) => acc + s.recordCount, 0)} registros
            </p>
          </div>
          
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
            onClick={() => handleFetchAll(false)}
            disabled={fetchingAll || forceRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${fetchingAll ? 'animate-spin' : ''}`} />
            Sincronizar Todos
          </Button>
          
          <Button
            variant="destructive"
            onClick={handleForceRefreshClick}
            disabled={fetchingAll || forceRefreshing}
            className="gap-2"
          >
            <Trash2 className={`h-4 w-4 ${forceRefreshing ? 'animate-spin' : ''}`} />
            {forceRefreshing ? 'Recarregando...' : 'Forçar Recarga Zero-Base'}
          </Button>
        </div>
      </div>

      {/* Data Discrepancy Alert */}
      {dataDiscrepancies.length > 0 && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-400">Inconsistência de Dados Detectada</AlertTitle>
          <AlertDescription className="text-amber-300/80">
            <p className="mb-2">
              Os seguintes indicadores têm dados fora do período configurado. Execute "Sincronizar Todos" para corrigir:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {dataDiscrepancies.map(d => (
                <li key={d.indicatorId}>
                  <span className="font-medium">{d.indicatorName}</span>: 
                  Configurado {d.configuredStart?.substring(0, 4)}-{d.configuredEnd?.substring(0, 4)}, 
                  mas dados começam em {d.actualStart?.substring(0, 4)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Macro Indicators Section */}
      {groupedIndicators.macro.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <LineChart className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold">Visão Macro</h3>
            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/40">
              {groupedIndicators.macro.length} indicadores
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedIndicators.macro.map(indicator => (
              <IndicatorCard
                key={indicator.id}
                indicator={indicator}
                recordCount={indicatorStats[indicator.id]?.recordCount || 0}
                lastUpdate={indicatorStats[indicator.id]?.lastUpdate || null}
                source={getSourceForIndicator(indicator)}
                onClick={() => handleCardClick(indicator)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Varejo Restrito Section */}
      {groupedIndicators.varejoRestrito.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold">Varejo Restrito</h3>
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
              {groupedIndicators.varejoRestrito.length} indicadores
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedIndicators.varejoRestrito.map(indicator => (
              <IndicatorCard
                key={indicator.id}
                indicator={indicator}
                recordCount={indicatorStats[indicator.id]?.recordCount || 0}
                lastUpdate={indicatorStats[indicator.id]?.lastUpdate || null}
                source={getSourceForIndicator(indicator)}
                onClick={() => handleCardClick(indicator)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Varejo Ampliado Section */}
      {groupedIndicators.varejoAmpliado.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold">Varejo Ampliado</h3>
            <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/40">
              {groupedIndicators.varejoAmpliado.length} indicadores
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedIndicators.varejoAmpliado.map(indicator => (
              <IndicatorCard
                key={indicator.id}
                indicator={indicator}
                recordCount={indicatorStats[indicator.id]?.recordCount || 0}
                lastUpdate={indicatorStats[indicator.id]?.lastUpdate || null}
                source={getSourceForIndicator(indicator)}
                onClick={() => handleCardClick(indicator)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Detail Modal */}
      <IndicatorDetailModal
        indicator={selectedIndicator}
        source={selectedIndicator ? getSourceForIndicator(selectedIndicator) : ''}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onDataChange={fetchData}
      />

      {/* Force Refresh Confirmation Modal */}
      <Dialog open={forceRefreshModalOpen} onOpenChange={setForceRefreshModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              ☢️ Recarga Zero-Base
            </DialogTitle>
            <DialogDescription className="text-left pt-2">
              Esta operação irá:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <Trash2 className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">APAGAR TODOS os dados</p>
                  <p className="text-muted-foreground">Todos os registros históricos de todos os indicadores serão excluídos permanentemente.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <RefreshCw className="h-4 w-4 text-blue-400 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-400">RECARREGAR do Zero</p>
                  <p className="text-muted-foreground">Os dados serão buscados novamente das APIs (BCB, IBGE) usando os períodos configurados (2010-presente).</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="force-confirm"
                checked={forceRefreshConfirmed}
                onCheckedChange={(checked) => setForceRefreshConfirmed(checked === true)}
              />
              <Label
                htmlFor="force-confirm"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Confirmo que entendo que todos os dados serão excluídos e recarregados
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setForceRefreshModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceRefreshConfirm}
              disabled={!forceRefreshConfirmed || forceRefreshing}
              className="gap-2"
            >
              {forceRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Confirmar Recarga
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
