import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Webhook, CheckCircle, XCircle, RefreshCw, ExternalLink, Activity, AlertCircle, Clock, Database, FileJson, Copy, Calendar as CalendarIcon, Settings, Info, Stethoscope, Tag, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Key, ArrowUpDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ApiDiagnosticModal from './ApiDiagnosticModal';

interface SyncMetadata {
  extracted_count?: number;
  period_start?: string;
  period_end?: string;
  fields_detected?: string[];
  last_record_value?: string;
  fetch_timestamp?: string;
  error?: string;
}

interface ApiRegistry {
  id: string;
  name: string;
  provider: string;
  base_url: string;
  method: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
  last_latency_ms: number | null;
  target_table: string | null;
  last_http_status: number | null;
  last_sync_metadata: SyncMetadata | null;
  fetch_start_date: string | null;
  fetch_end_date: string | null;
  auto_fetch_enabled: boolean | null;
  auto_fetch_interval: string | null;
  discovered_period_start: string | null;
  discovered_period_end: string | null;
}

interface TestResult {
  success: boolean;
  latencyMs: number;
  statusCode: number | null;
  statusText: string;
  contentType: string | null;
  preview: any[] | null;
  error: string | null;
  timeout: boolean;
  syncMetadata: SyncMetadata | null;
}

const PROVIDERS = ['BCB', 'IBGE', 'WorldBank', 'IMF', 'YahooFinance', 'Internal', 'Scraper'] as const;

const ITEMS_PER_PAGE = 10;

type SortColumn = 'name' | 'provider' | 'last_checked_at' | 'extracted_count' | 'period';
type SortDirection = 'asc' | 'desc';

const QUERY_VARIABLES = [
  { variable: '{DATA_INICIO_REAL}', purpose: 'Controle de Período Otimizado (Mandatório)', format: 'YYYYMM (Ex: 201501). Usar na URL em vez de "all".' },
  { variable: '{DATA_FIM}', purpose: 'Fim da Série Histórica', format: 'YYYYMM (Ex: 202512 ou ano atual).' },
  { variable: 'Localidade (N1)', purpose: 'Nível Geográfico (Padrão)', format: 'N1[all] (Nível Brasil).' },
  { variable: 'Agregado (Tabela)', purpose: 'Tabela Principal de Dados', format: 'ID numérico (Ex: 1737 para IPCA).' },
  { variable: 'Variável (Métrica)', purpose: 'Métrica principal de interesse', format: 'ID numérico (Ex: 63 ou 11612).' },
  { variable: 'Classificação (Filtro)', purpose: 'Filtro de Subgrupos', format: 'Cl=Cxxxx/[ID] (Ex: 12023[46001]).' }
];

const ADDITIONAL_VARIABLES = [
  { variable: 'Região', purpose: 'Localidades desagregadas', format: 'N2[all] (Regiões) ou N3[all] (UF).' },
  { variable: 'Unidade de Medida', purpose: 'Interpretação de volumetria', format: 'Milhões de Reais, Taxa Percentual, etc.' }
];

export default function ApiManagementTab() {
  const { t } = useTranslation();
  const [apis, setApis] = useState<ApiRegistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiRegistry | null>(null);
  const [testingApiId, setTestingApiId] = useState<string | null>(null);
  const [syncingApiId, setSyncingApiId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [testedApiName, setTestedApiName] = useState<string>('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedApiForLog, setSelectedApiForLog] = useState<ApiRegistry | null>(null);
  const [schedulePopoverOpen, setSchedulePopoverOpen] = useState<string | null>(null);
  const [configScheduleFrequency, setConfigScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [configScheduleHour, setConfigScheduleHour] = useState('09');
  const [configScheduleMinute, setConfigScheduleMinute] = useState('00');
  const [configScheduleAmPm, setConfigScheduleAmPm] = useState<'AM' | 'PM'>('AM');
  const [configScheduleDay, setConfigScheduleDay] = useState('monday');
  const [apiDiagnosticModalOpen, setApiDiagnosticModalOpen] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [testingAllApis, setTestingAllApis] = useState(false);
  const [testAllProgress, setTestAllProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showVariablesSection, setShowVariablesSection] = useState(false);
  const [lastTriggerTime, setLastTriggerTime] = useState<Date | null>(null);
  const [viewConfigApi, setViewConfigApi] = useState<ApiRegistry | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'BCB' as string,
    base_url: '',
    method: 'GET',
    description: '',
    status: 'active',
    target_table: 'indicator_values'
  });

  useEffect(() => {
    fetchApis();
  }, []);

  // ========== REALTIME SYNC: Auto-refresh on system_api_registry changes ==========
  useEffect(() => {
    const channel = supabase
      .channel('api-management-sync')
      .on(
        'postgres_changes',
        {
          event: '*',  // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'system_api_registry'
        },
        (payload) => {
          console.log('[REALTIME] 🔄 ApiManagement - system_api_registry changed:', payload.eventType);
          setLastTriggerTime(new Date());
          fetchApis();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchApis = async () => {
    try {
      const { data, error } = await supabase
        .from('system_api_registry')
        .select('*')
        .order('provider', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setApis((data || []) as ApiRegistry[]);
    } catch (error) {
      console.error('Error fetching APIs:', error);
      toast.error('Erro ao carregar APIs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (api?: ApiRegistry) => {
    if (api) {
      setEditingApi(api);
      setFormData({
        name: api.name,
        provider: api.provider,
        base_url: api.base_url,
        method: api.method,
        description: api.description || '',
        status: api.status,
        target_table: api.target_table || 'indicator_values'
      });
    } else {
      setEditingApi(null);
      setFormData({
        name: '',
        provider: 'BCB',
        base_url: '',
        method: 'GET',
        description: '',
        status: 'active',
        target_table: 'indicator_values'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.base_url) {
      toast.error('Nome e URL são obrigatórios');
      return;
    }

    try {
      if (editingApi) {
        const { error } = await supabase
          .from('system_api_registry')
          .update({
            name: formData.name,
            provider: formData.provider,
            base_url: formData.base_url,
            method: formData.method,
            description: formData.description || null,
            status: formData.status,
            target_table: formData.target_table
          })
          .eq('id', editingApi.id);

        if (error) throw error;
        toast.success('API atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('system_api_registry')
          .insert({
            name: formData.name,
            provider: formData.provider,
            base_url: formData.base_url,
            method: formData.method,
            description: formData.description || null,
            status: formData.status,
            target_table: formData.target_table
          });

        if (error) throw error;
        toast.success('API criada com sucesso');
      }

      setIsDialogOpen(false);
      fetchApis();
    } catch (error) {
      console.error('Error saving API:', error);
      toast.error('Erro ao salvar API');
    }
  };

  const handleDelete = async (api: ApiRegistry) => {
    if (!confirm(`Tem certeza que deseja excluir "${api.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('system_api_registry')
        .delete()
        .eq('id', api.id);

      if (error) throw error;
      toast.success('API excluída com sucesso');
      fetchApis();
    } catch (error) {
      console.error('Error deleting API:', error);
      toast.error('Erro ao excluir API');
    }
  };

  const handleToggleStatus = async (api: ApiRegistry) => {
    try {
      const newStatus = api.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('system_api_registry')
        .update({ status: newStatus })
        .eq('id', api.id);

      if (error) throw error;
      toast.success(`API ${newStatus === 'active' ? 'ativada' : 'desativada'}`);
      fetchApis();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleTestConnection = async (api: ApiRegistry) => {
    setTestingApiId(api.id);
    setTestedApiName(api.name);

    try {
      const { data, error } = await supabase.functions.invoke('test-api-connection', {
        body: { apiId: api.id, baseUrl: api.base_url }
      });

      if (error) throw error;

      setTestResult(data as TestResult);
      setShowResultDialog(true);

      if (data.success) {
        toast.success(`Conexão OK! Latência: ${data.latencyMs}ms`);
      } else {
        toast.error(`Falha: ${data.error || 'Erro desconhecido'}`);
      }

      // Refresh to show updated status
      fetchApis();
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Erro ao testar conexão');
    } finally {
      setTestingApiId(null);
    }
  };

  const handleTestAllConnections = async () => {
    const activeApis = apis.filter(api => api.status === 'active');
    if (activeApis.length === 0) {
      toast.warning('Nenhuma API ativa para testar');
      return;
    }

    setTestingAllApis(true);
    setTestAllProgress({ current: 0, total: activeApis.length, success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < activeApis.length; i++) {
      const api = activeApis[i];
      setTestAllProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const { data, error } = await supabase.functions.invoke('test-api-connection', {
          body: { apiId: api.id, baseUrl: api.base_url }
        });

        if (error || !data?.success) {
          failedCount++;
        } else {
          successCount++;
        }
      } catch {
        failedCount++;
      }

      setTestAllProgress(prev => ({ ...prev, success: successCount, failed: failedCount }));

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setTestingAllApis(false);
    toast.success(`Teste concluído: ${successCount}/${activeApis.length} APIs OK`);
    fetchApis();
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada!');
  };

  const handleSyncData = async (api: ApiRegistry) => {
    // Find linked indicator for this API
    const { data: indicators, error: indicatorError } = await supabase
      .from('economic_indicators')
      .select('id, name')
      .eq('api_id', api.id);
    
    if (indicatorError || !indicators || indicators.length === 0) {
      toast.error(`Nenhum indicador vinculado à API "${api.name}". Crie um indicador vinculado primeiro.`);
      return;
    }
    
    setSyncingApiId(api.id);
    
    try {
      for (const indicator of indicators) {
        console.log(`[SYNC] Sincronizando indicador: ${indicator.name} (${indicator.id})`);
        
        const { data, error } = await supabase.functions.invoke('fetch-economic-data', {
          body: { indicatorId: indicator.id }
        });

        if (error) {
          console.error(`[SYNC] Erro ao sincronizar ${indicator.name}:`, error);
          toast.error(`Erro ao sincronizar ${indicator.name}: ${error.message}`);
        } else {
          console.log(`[SYNC] Resultado para ${indicator.name}:`, data);
          const insertedCount = data?.results?.[0]?.insertedCount || data?.insertedCount || 0;
          toast.success(`${indicator.name}: ${insertedCount} registros inseridos`);
        }
      }
      
      fetchApis();
    } catch (error) {
      console.error('[SYNC] Erro geral:', error);
      toast.error('Erro ao sincronizar dados');
    } finally {
      setSyncingApiId(null);
    }
  }

  const handleViewLog = (api: ApiRegistry) => {
    setSelectedApiForLog(api);
    setShowLogModal(true);
  };

  const handleToggleAutoFetch = async (api: ApiRegistry, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('system_api_registry')
        .update({ auto_fetch_enabled: enabled })
        .eq('id', api.id);

      if (error) throw error;
      toast.success(enabled ? 'Atualização automática ativada' : 'Atualização automática desativada');
      fetchApis();
    } catch (error) {
      console.error('Error toggling auto fetch:', error);
      toast.error('Erro ao alterar configuração');
    }
  };

  const handleOpenSchedulePopover = (api: ApiRegistry) => {
    // Parse existing interval: format is "daily|09:00" or "weekly|monday|09:00" or "monthly|last|09:00"
    const interval = api.auto_fetch_interval || 'daily|09:00';
    const parts = interval.split('|');
    
    setConfigScheduleFrequency(parts[0] as 'daily' | 'weekly' | 'monthly');
    
    if (parts[0] === 'daily' && parts[1]) {
      const [hour, minute] = parts[1].split(':');
      const hourNum = parseInt(hour);
      setConfigScheduleAmPm(hourNum >= 12 ? 'PM' : 'AM');
      setConfigScheduleHour(String(hourNum > 12 ? hourNum - 12 : (hourNum === 0 ? 12 : hourNum)).padStart(2, '0'));
      setConfigScheduleMinute(minute || '00');
    } else if (parts[0] === 'weekly' && parts[1] && parts[2]) {
      setConfigScheduleDay(parts[1]);
      const [hour, minute] = parts[2].split(':');
      const hourNum = parseInt(hour);
      setConfigScheduleAmPm(hourNum >= 12 ? 'PM' : 'AM');
      setConfigScheduleHour(String(hourNum > 12 ? hourNum - 12 : (hourNum === 0 ? 12 : hourNum)).padStart(2, '0'));
      setConfigScheduleMinute(minute || '00');
    } else if (parts[0] === 'monthly' && parts[2]) {
      const [hour, minute] = parts[2].split(':');
      const hourNum = parseInt(hour);
      setConfigScheduleAmPm(hourNum >= 12 ? 'PM' : 'AM');
      setConfigScheduleHour(String(hourNum > 12 ? hourNum - 12 : (hourNum === 0 ? 12 : hourNum)).padStart(2, '0'));
      setConfigScheduleMinute(minute || '00');
    } else {
      setConfigScheduleHour('09');
      setConfigScheduleMinute('00');
      setConfigScheduleAmPm('AM');
      setConfigScheduleDay('monday');
    }
    
    setSchedulePopoverOpen(api.id);
  };

  const handleSaveSchedule = async (apiId: string) => {
    // Convert to 24h format
    let hour24 = parseInt(configScheduleHour);
    if (configScheduleAmPm === 'PM' && hour24 !== 12) hour24 += 12;
    if (configScheduleAmPm === 'AM' && hour24 === 12) hour24 = 0;
    const timeStr = `${String(hour24).padStart(2, '0')}:${configScheduleMinute}`;
    
    let intervalValue: string;
    switch (configScheduleFrequency) {
      case 'daily':
        intervalValue = `daily|${timeStr}`;
        break;
      case 'weekly':
        intervalValue = `weekly|${configScheduleDay}|${timeStr}`;
        break;
      case 'monthly':
        intervalValue = `monthly|last|${timeStr}`;
        break;
    }
    
    try {
      const { error } = await supabase
        .from('system_api_registry')
        .update({ auto_fetch_interval: intervalValue })
        .eq('id', apiId);

      if (error) throw error;
      toast.success('Configuração de horário salva');
      setSchedulePopoverOpen(null);
      fetchApis();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Erro ao salvar configuração');
    }
  };

  const getScheduleLabel = (interval: string | null) => {
    if (!interval) return 'Diário 09:00';
    const parts = interval.split('|');
    const freq = parts[0];
    
    if (freq === 'daily' && parts[1]) {
      return `Diário ${parts[1]}`;
    } else if (freq === 'weekly' && parts[1] && parts[2]) {
      const dayLabels: Record<string, string> = {
        monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua', 
        thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom'
      };
      return `${dayLabels[parts[1]] || parts[1]} ${parts[2]}`;
    } else if (freq === 'monthly' && parts[2]) {
      return `Último dia ${parts[2]}`;
    }
    return interval;
  };

  const getIntervalLabel = (interval: string) => {
    switch (interval) {
      case '6hours': return 'A cada 6 horas';
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'monthly': return 'Mensal';
      default: return interval;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'BCB': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'IBGE': return 'bg-green-500/20 text-green-400 border-green-500/40';
      case 'WorldBank': return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
      case 'IMF': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40';
      case 'YahooFinance': return 'bg-violet-500/20 text-violet-400 border-violet-500/40';
      case 'Internal': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'Scraper': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getHttpStatusDisplay = (api: ApiRegistry) => {
    const status = api.last_http_status;
    if (!status) return null;
    
    const isSuccess = status >= 200 && status < 300;
    return (
      <Badge 
        variant="outline" 
        className={`text-[10px] px-1.5 py-0 ${isSuccess ? 'border-green-500/40 text-green-400' : 'border-red-500/40 text-red-400'}`}
      >
        {status}
      </Badge>
    );
  };

  const getStatusDisplay = (api: ApiRegistry) => {
    const hasBeenTested = api.last_checked_at !== null;
    
    if (api.status === 'error') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-red-500">Erro</span>
                {getHttpStatusDisplay(api)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>HTTP {api.last_http_status || 'N/A'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    if (api.status === 'inactive') {
      return (
        <div className="flex items-center gap-1.5">
          <XCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Inativo</span>
        </div>
      );
    }
    
    if (!hasBeenTested) {
      return (
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Não testado</span>
        </div>
      );
    }
    
    // Active and tested
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span className="text-xs text-green-500">Ativo</span>
        {getHttpStatusDisplay(api)}
        {api.last_latency_ms && (
          <Badge 
            variant="outline" 
            className={`ml-1 text-[10px] px-1.5 py-0 ${
              api.last_latency_ms < 500 
                ? 'border-green-500/40 text-green-400' 
                : api.last_latency_ms < 2000 
                  ? 'border-yellow-500/40 text-yellow-400' 
                  : 'border-red-500/40 text-red-400'
            }`}
          >
            {api.last_latency_ms}ms
          </Badge>
        )}
      </div>
    );
  };

  const formatPeriod = (start: string | undefined, end: string | undefined) => {
    if (!start) return null;
    const startYear = start.substring(0, 4);
    const endYear = end ? end.substring(0, 4) : 'Hoje';
    return `${startYear} → ${endYear}`;
  };

  const getConfiguredPeriod = (api: ApiRegistry) => {
    if (api.fetch_start_date) {
      const startYear = api.fetch_start_date.substring(0, 4);
      const endYear = api.fetch_end_date ? api.fetch_end_date.substring(0, 4) : 'Hoje';
      return `${startYear} → ${endYear}`;
    }
    if (api.last_sync_metadata?.period_start && api.last_sync_metadata?.period_end) {
      return formatPeriod(api.last_sync_metadata.period_start, api.last_sync_metadata.period_end);
    }
    return null;
  };

  // Sorting logic
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 text-primary" />
      : <ChevronDown className="h-3 w-3 text-primary" />;
  };

  const sortedApis = [...apis].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;
    
    switch (sortColumn) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'provider':
        aVal = a.provider.toLowerCase();
        bVal = b.provider.toLowerCase();
        break;
      case 'last_checked_at':
        aVal = a.last_checked_at || '';
        bVal = b.last_checked_at || '';
        break;
      case 'extracted_count':
        aVal = a.last_sync_metadata?.extracted_count || 0;
        bVal = b.last_sync_metadata?.extracted_count || 0;
        break;
      case 'period':
        aVal = a.fetch_start_date || '';
        bVal = b.fetch_start_date || '';
        break;
      default:
        aVal = '';
        bVal = '';
    }
    
    const comparison = typeof aVal === 'string' 
      ? aVal.localeCompare(bVal as string)
      : (aVal as number) - (bVal as number);
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedApis.length / ITEMS_PER_PAGE);
  const paginatedApis = sortedApis.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Webhook className="h-6 w-6 text-primary" />
            <CardTitle>Gestão de APIs Externas</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {apis.length}
            </Badge>
            {lastTriggerTime && (
              <span className="text-xs text-muted-foreground ml-2">
                Último sync: {lastTriggerTime.toLocaleTimeString('pt-BR')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleTestAllConnections}
              disabled={testingAllApis}
              className="gap-2"
            >
              {testingAllApis ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {testAllProgress.current}/{testAllProgress.total}
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" />
                  Testar Conexão (Todas)
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setApiDiagnosticModalOpen(true)}
              className="gap-2"
            >
              <Stethoscope className="h-4 w-4" />
              Gestão de API
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova API
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingApi ? 'Editar API' : 'Cadastrar Nova API'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Taxa Selic"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={formData.provider}
                      onValueChange={(v) => setFormData({ ...formData, provider: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>URL do Endpoint *</Label>
                  <Input
                    value={formData.base_url}
                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                    placeholder="https://api.bcb.gov.br/dados/serie/..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Método HTTP</Label>
                    <Select
                      value={formData.method}
                      onValueChange={(v) => setFormData({ ...formData, method: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tabela Destino</Label>
                    <Input
                      value={formData.target_table}
                      onChange={(e) => setFormData({ ...formData, target_table: e.target.value })}
                      placeholder="indicator_values"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição da API e seus dados..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editingApi ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Nome
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('provider')}
                  >
                    <div className="flex items-center gap-1">
                      Provider
                      {getSortIcon('provider')}
                    </div>
                  </TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('last_checked_at')}
                  >
                    <div className="flex items-center gap-1">
                      Última Verificação
                      {getSortIcon('last_checked_at')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('extracted_count')}
                  >
                    <div className="flex items-center gap-1">
                      Dados Extraídos
                      {getSortIcon('extracted_count')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('period')}
                  >
                    <div className="flex items-center gap-1">
                      Período
                      {getSortIcon('period')}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhuma API cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedApis.map((api) => (
                    <TableRow key={api.id}>
                      <TableCell className="font-medium">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help hover:text-primary transition-colors">
                                {api.name}
                              </span>
                            </TooltipTrigger>
                            {api.description && (
                              <TooltipContent side="right" className="max-w-[300px]">
                                <p className="text-sm">{api.description}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => setViewConfigApi(api)}
                          className={cn(
                            "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer hover:opacity-80",
                            getProviderColor(api.provider)
                          )}
                        >
                          {api.provider}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 max-w-[300px]">
                          <span className="text-xs text-muted-foreground truncate">
                            {api.base_url}
                          </span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleCopyUrl(api.base_url)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar URL</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <a
                            href={api.base_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleStatus(api)}
                          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        >
                          {getStatusDisplay(api)}
                        </button>
                      </TableCell>
                      <TableCell>
                        {api.last_checked_at ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground cursor-help">
                                  {formatDistanceToNow(new Date(api.last_checked_at), { addSuffix: true, locale: ptBR })}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {format(new Date(api.last_checked_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {/* Dados Extraídos */}
                      <TableCell>
                        {api.last_sync_metadata?.extracted_count ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-sm">
                              {api.last_sync_metadata.extracted_count.toLocaleString()} registros
                            </div>
                            {api.last_sync_metadata.fields_detected && api.last_sync_metadata.fields_detected.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {api.last_sync_metadata.fields_detected.slice(0, 3).join(', ')}
                                {api.last_sync_metadata.fields_detected.length > 3 && '...'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {/* Período - Discovered Only + Auto Toggle */}
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {/* Discovered Period */}
                          <div className="text-[11px] font-medium">
                            {api.discovered_period_start && api.discovered_period_end ? (
                              <span className="text-foreground">
                                {format(new Date(api.discovered_period_start), 'dd/MM/yyyy')} → {format(new Date(api.discovered_period_end), 'dd/MM/yyyy')}
                              </span>
                            ) : api.discovered_period_start ? (
                              <span className="text-foreground">
                                {format(new Date(api.discovered_period_start), 'dd/MM/yyyy')} → Hoje
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                          
                          {/* Auto Toggle + Settings */}
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={api.auto_fetch_enabled || false}
                              onCheckedChange={(checked) => handleToggleAutoFetch(api, checked)}
                              className="scale-75"
                            />
                            <span className="text-xs text-muted-foreground">Auto</span>
                            
                            {api.auto_fetch_enabled && (
                              <Popover 
                                open={schedulePopoverOpen === api.id} 
                                onOpenChange={(open) => {
                                  if (open) {
                                    handleOpenSchedulePopover(api);
                                  } else {
                                    setSchedulePopoverOpen(null);
                                  }
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                  >
                                    <Settings className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-4" align="start">
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-cyan-400" />
                                      <span className="text-sm font-medium">Configurar Atualização</span>
                                    </div>
                                    
                                    {/* Frequency Selector */}
                                    <div className="space-y-2">
                                      <Label className="text-xs text-muted-foreground">Frequência</Label>
                                      <Select 
                                        value={configScheduleFrequency} 
                                        onValueChange={(v) => setConfigScheduleFrequency(v as 'daily' | 'weekly' | 'monthly')}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="daily">Diária</SelectItem>
                                          <SelectItem value="weekly">Semanal</SelectItem>
                                          <SelectItem value="monthly">Mensal</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    {/* Weekly: Day Selector */}
                                    {configScheduleFrequency === 'weekly' && (
                                      <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Dia da Semana</Label>
                                        <Select value={configScheduleDay} onValueChange={setConfigScheduleDay}>
                                          <SelectTrigger className="h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="monday">Segunda-feira</SelectItem>
                                            <SelectItem value="tuesday">Terça-feira</SelectItem>
                                            <SelectItem value="wednesday">Quarta-feira</SelectItem>
                                            <SelectItem value="thursday">Quinta-feira</SelectItem>
                                            <SelectItem value="friday">Sexta-feira</SelectItem>
                                            <SelectItem value="saturday">Sábado</SelectItem>
                                            <SelectItem value="sunday">Domingo</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                    
                                    {/* Monthly: Info */}
                                    {configScheduleFrequency === 'monthly' && (
                                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Último dia de cada mês</span>
                                      </div>
                                    )}
                                    
                                    {/* Time Selector */}
                                    <div className="space-y-2">
                                      <Label className="text-xs text-muted-foreground">Horário</Label>
                                      <div className="flex items-center gap-2">
                                        <Select value={configScheduleHour} onValueChange={setConfigScheduleHour}>
                                          <SelectTrigger className="h-8 w-16">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(h => (
                                              <SelectItem key={h} value={h}>{h}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <span className="text-muted-foreground">:</span>
                                        <Select value={configScheduleMinute} onValueChange={setConfigScheduleMinute}>
                                          <SelectTrigger className="h-8 w-16">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {['00', '15', '30', '45'].map(m => (
                                              <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Select value={configScheduleAmPm} onValueChange={(v) => setConfigScheduleAmPm(v as 'AM' | 'PM')}>
                                          <SelectTrigger className="h-8 w-16">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="AM">AM</SelectItem>
                                            <SelectItem value="PM">PM</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    
                                    <Button 
                                      size="sm" 
                                      className="w-full gap-2"
                                      onClick={() => handleSaveSchedule(api.id)}
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      Salvar
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                            
                            {api.auto_fetch_enabled && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-cyan-500/40 text-cyan-400">
                                {getScheduleLabel(api.auto_fetch_interval)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleTestConnection(api)}
                                  disabled={testingApiId === api.id}
                                >
                                  {testingApiId === api.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Activity className="h-4 w-4 text-cyan-500" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Testar Conexão</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSyncData(api)}
                                  disabled={syncingApiId === api.id || api.status !== 'active'}
                                >
                                  {syncingApiId === api.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Database className="h-4 w-4 text-green-500" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Sincronizar Dados</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewLog(api)}
                                  disabled={!api.last_sync_metadata}
                                >
                                  <FileJson className="h-4 w-4 text-amber-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver Log Detalhado</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setShowSchemaModal(true)}
                                >
                                  <Tag className="h-4 w-4 text-purple-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver Schema das Tabelas</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(api)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(api)}
                            className="text-destructive hover:text-destructive"
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
          </div>
          
          {/* Pagination */}
          {sortedApis.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
              <span className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedApis.length)} de {sortedApis.length} APIs
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm px-2">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Query Variables Section */}
      <Collapsible open={showVariablesSection} onOpenChange={setShowVariablesSection}>
        <Card className="border-border/40 bg-card/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-base">
                    Variáveis Chave para Construção de Query (API/SGS/SIDRA)
                  </CardTitle>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  showVariablesSection && "rotate-180"
                )} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-6">
              {/* Main Variables Table */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Variáveis Obrigatórias
                </h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Variável</TableHead>
                        <TableHead className="w-[280px]">Finalidade</TableHead>
                        <TableHead>Formato/Exemplo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {QUERY_VARIABLES.map((v, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-amber-400 text-sm">{v.variable}</TableCell>
                          <TableCell className="text-sm">{v.purpose}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{v.format}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Additional Variables Table */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-400" />
                  Variáveis Adicionais (Metadados Ricos)
                </h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Variável</TableHead>
                        <TableHead className="w-[280px]">Finalidade</TableHead>
                        <TableHead>Formato/Exemplo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ADDITIONAL_VARIABLES.map((v, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-blue-400 text-sm">{v.variable}</TableCell>
                          <TableCell className="text-sm">{v.purpose}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{v.format}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Test Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${testResult?.success ? 'text-green-500' : 'text-red-500'}`}>
              {testResult?.success ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Conexão Estabelecida!
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5" />
                  Falha na Conexão
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{testedApiName}</p>
            
            <div className="flex flex-wrap items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${
                  testResult?.latencyMs && testResult.latencyMs < 500 
                    ? 'border-green-500/40 text-green-400' 
                    : testResult?.latencyMs && testResult.latencyMs < 2000 
                      ? 'border-yellow-500/40 text-yellow-400' 
                      : 'border-red-500/40 text-red-400'
                }`}
              >
                Latência: {testResult?.latencyMs || 0}ms
              </Badge>
              
              {testResult?.statusCode && (
                <Badge 
                  variant="outline"
                  className={testResult.statusCode >= 200 && testResult.statusCode < 300 
                    ? 'border-green-500/40 text-green-400' 
                    : 'border-red-500/40 text-red-400'
                  }
                >
                  Status: {testResult.statusCode} {testResult.statusText}
                </Badge>
              )}
              
              {testResult?.timeout && (
                <Badge variant="outline" className="border-red-500/40 text-red-400">
                  Timeout
                </Badge>
              )}
            </div>

            {/* Sync Metadata Summary */}
            {testResult?.syncMetadata && testResult.syncMetadata.extracted_count ? (
              <div className="p-3 bg-muted/50 rounded-md space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-medium">
                    {testResult.syncMetadata.extracted_count.toLocaleString()} registros extraídos
                  </span>
                </div>
                {testResult.syncMetadata.period_start && testResult.syncMetadata.period_end && (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm">
                      Período: {formatPeriod(testResult.syncMetadata.period_start, testResult.syncMetadata.period_end)}
                    </span>
                  </div>
                )}
                {testResult.syncMetadata.fields_detected && (
                  <div className="text-xs text-muted-foreground">
                    Campos: {testResult.syncMetadata.fields_detected.join(', ')}
                  </div>
                )}
              </div>
            ) : null}

            {testResult?.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-sm text-red-400">{testResult.error}</p>
              </div>
            )}

            {testResult?.preview && testResult.preview.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Preview da Resposta (primeiros itens):
                </Label>
                <pre className="bg-muted/50 p-3 rounded-md text-xs overflow-auto max-h-[200px] border border-border/40">
                  {JSON.stringify(testResult.preview, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Raw Log Modal */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-amber-500" />
              Log Detalhado - {selectedApiForLog?.name}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4">
              {selectedApiForLog?.last_sync_metadata ? (
                <pre className="bg-muted/50 p-4 rounded-md text-xs overflow-auto border border-border/40">
                  {JSON.stringify(selectedApiForLog.last_sync_metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum log disponível. Execute um teste de conexão primeiro.
                </p>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button onClick={() => setShowLogModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* API Diagnostic Modal */}
      <ApiDiagnosticModal 
        open={apiDiagnosticModalOpen} 
        onOpenChange={setApiDiagnosticModalOpen} 
      />

      {/* Schema Modal */}
      <Dialog open={showSchemaModal} onOpenChange={setShowSchemaModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-purple-500" />
              Schema das Tabelas de Indicadores
            </DialogTitle>
            <DialogDescription>
              Estrutura das tabelas utilizadas para armazenar APIs e indicadores econômicos
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {/* system_api_registry */}
              <SchemaSection
                tableName="system_api_registry"
                description="Configurações das APIs externas"
                columns={[
                  { name: 'id', type: 'uuid', nullable: false, isPK: true, description: 'Identificador único' },
                  { name: 'name', type: 'text', nullable: false, description: 'Nome da API' },
                  { name: 'provider', type: 'text', nullable: false, description: 'Provedor (BCB, IBGE, etc)' },
                  { name: 'base_url', type: 'text', nullable: false, description: 'URL base da API' },
                  { name: 'method', type: 'text', nullable: true, description: 'Método HTTP (GET, POST)' },
                  { name: 'description', type: 'text', nullable: true, description: 'Descrição da API' },
                  { name: 'status', type: 'text', nullable: true, description: 'Status (active, inactive)' },
                  { name: 'target_table', type: 'text', nullable: true, description: 'Tabela destino dos dados' },
                  { name: 'fetch_start_date', type: 'date', nullable: true, description: 'Data início da coleta' },
                  { name: 'fetch_end_date', type: 'date', nullable: true, description: 'Data fim da coleta' },
                  { name: 'auto_fetch_enabled', type: 'boolean', nullable: true, description: 'Busca automática habilitada' },
                  { name: 'auto_fetch_interval', type: 'text', nullable: true, description: 'Intervalo de busca' },
                  { name: 'last_checked_at', type: 'timestamp', nullable: true, description: 'Última verificação' },
                  { name: 'last_http_status', type: 'integer', nullable: true, description: 'Último status HTTP' },
                  { name: 'last_latency_ms', type: 'integer', nullable: true, description: 'Última latência (ms)' },
                  { name: 'last_sync_metadata', type: 'jsonb', nullable: true, description: 'Metadados da última sincronização' },
                  { name: 'created_at', type: 'timestamp', nullable: true, description: 'Data de criação' },
                  { name: 'updated_at', type: 'timestamp', nullable: true, description: 'Data de atualização' },
                ]}
              />

              {/* economic_indicators */}
              <SchemaSection
                tableName="economic_indicators"
                description="Metadados dos indicadores econômicos"
                columns={[
                  { name: 'id', type: 'uuid', nullable: false, isPK: true, description: 'Identificador único' },
                  { name: 'code', type: 'text', nullable: false, description: 'Código do indicador (ex: SELIC)' },
                  { name: 'name', type: 'text', nullable: false, description: 'Nome do indicador' },
                  { name: 'category', type: 'text', nullable: true, description: 'Categoria (macro, preços, etc)' },
                  { name: 'frequency', type: 'text', nullable: true, description: 'Frequência (daily, monthly, yearly)' },
                  { name: 'unit', type: 'text', nullable: true, description: 'Unidade de medida' },
                  { name: 'api_id', type: 'uuid', nullable: true, isFK: true, description: 'Referência à API fonte' },
                  { name: 'cron_schedule', type: 'text', nullable: true, description: 'Agendamento cron' },
                  { name: 'created_at', type: 'timestamp', nullable: true, description: 'Data de criação' },
                  { name: 'updated_at', type: 'timestamp', nullable: true, description: 'Data de atualização' },
                ]}
              />

              {/* indicator_values */}
              <SchemaSection
                tableName="indicator_values"
                description="Valores coletados dos indicadores"
                columns={[
                  { name: 'id', type: 'uuid', nullable: false, isPK: true, description: 'Identificador único' },
                  { name: 'indicator_id', type: 'uuid', nullable: false, isFK: true, description: 'Referência ao indicador' },
                  { name: 'reference_date', type: 'date', nullable: false, description: 'Data de referência do valor' },
                  { name: 'value', type: 'numeric', nullable: false, description: 'Valor do indicador' },
                  { name: 'created_at', type: 'timestamp', nullable: true, description: 'Data de inserção' },
                ]}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* View Configuration Modal - Read Only */}
      <Dialog open={!!viewConfigApi} onOpenChange={(open) => !open && setViewConfigApi(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Configuração da API
            </DialogTitle>
            <DialogDescription>
              Parâmetros configurados para esta API
            </DialogDescription>
          </DialogHeader>
          {viewConfigApi && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nome</Label>
                  <div className="p-2.5 bg-muted/50 rounded-md border border-border/40 text-sm">
                    {viewConfigApi.name}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Provider</Label>
                  <div className="p-2.5 bg-muted/50 rounded-md border border-border/40">
                    <Badge variant="outline" className={getProviderColor(viewConfigApi.provider)}>
                      {viewConfigApi.provider}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">URL do Endpoint</Label>
                <div className="p-2.5 bg-muted/50 rounded-md border border-border/40 text-sm font-mono break-all">
                  {viewConfigApi.base_url}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Método HTTP</Label>
                  <div className="p-2.5 bg-muted/50 rounded-md border border-border/40 text-sm">
                    {viewConfigApi.method}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="p-2.5 bg-muted/50 rounded-md border border-border/40 text-sm flex items-center gap-2">
                    {viewConfigApi.status === 'active' ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Ativo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>Inativo</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Tabela Destino</Label>
                  <div className="p-2.5 bg-muted/50 rounded-md border border-border/40 text-sm font-mono">
                    {viewConfigApi.target_table || 'indicator_values'}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Descrição</Label>
                <div className="p-2.5 bg-muted/50 rounded-md border border-border/40 text-sm min-h-[60px]">
                  {viewConfigApi.description || <span className="text-muted-foreground italic">Sem descrição</span>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewConfigApi(null)}>
              Fechar
            </Button>
            <Button onClick={() => {
              if (viewConfigApi) {
                handleOpenDialog(viewConfigApi);
                setViewConfigApi(null);
              }
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Schema Section Component
interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  isPK?: boolean;
  isFK?: boolean;
  description: string;
}

interface SchemaSectionProps {
  tableName: string;
  description: string;
  columns: ColumnSchema[];
}

function SchemaSection({ tableName, description, columns }: SchemaSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'uuid': return 'text-blue-400';
      case 'text': return 'text-green-400';
      case 'integer': case 'numeric': return 'text-amber-400';
      case 'boolean': return 'text-purple-400';
      case 'timestamp': case 'date': return 'text-cyan-400';
      case 'jsonb': return 'text-pink-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Database className="h-4 w-4 text-primary" />
            <div>
              <span className="font-mono font-medium text-sm">{tableName}</span>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {columns.length} colunas
            </Badge>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 border border-border/40 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="w-[180px]">Coluna</TableHead>
                <TableHead className="w-[100px]">Tipo</TableHead>
                <TableHead className="w-[80px] text-center">Null?</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((col) => (
                <TableRow key={col.name}>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-1.5">
                      {col.isPK && <Key className="h-3 w-3 text-amber-500" />}
                      {col.isFK && <span className="text-blue-400 text-xs">FK</span>}
                      {col.name}
                    </div>
                  </TableCell>
                  <TableCell className={cn("font-mono text-xs", getTypeColor(col.type))}>
                    {col.type}
                  </TableCell>
                  <TableCell className="text-center">
                    {col.nullable ? (
                      <span className="text-muted-foreground text-xs">✓</span>
                    ) : (
                      <span className="text-red-400 text-xs">✗</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {col.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
