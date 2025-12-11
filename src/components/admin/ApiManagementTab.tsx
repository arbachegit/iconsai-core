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
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Webhook, CheckCircle, XCircle, RefreshCw, ExternalLink, Activity, AlertCircle, Clock, Database, FileJson, Copy, Calendar as CalendarIcon, Settings, Info, Stethoscope } from 'lucide-react';
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

export default function ApiManagementTab() {
  const { t } = useTranslation();
  const [apis, setApis] = useState<ApiRegistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiRegistry | null>(null);
  const [testingApiId, setTestingApiId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [testedApiName, setTestedApiName] = useState<string>('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedApiForLog, setSelectedApiForLog] = useState<ApiRegistry | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configApi, setConfigApi] = useState<ApiRegistry | null>(null);
  const [configStartDate, setConfigStartDate] = useState<Date | undefined>(undefined);
  const [configEndDate, setConfigEndDate] = useState<Date | undefined>(undefined);
  const [configAutoEnabled, setConfigAutoEnabled] = useState(false);
  const [configInterval, setConfigInterval] = useState('daily');
  const [apiDiagnosticModalOpen, setApiDiagnosticModalOpen] = useState(false);
  const [testingAllApis, setTestingAllApis] = useState(false);
  const [testAllProgress, setTestAllProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
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

  const handleViewLog = (api: ApiRegistry) => {
    setSelectedApiForLog(api);
    setShowLogModal(true);
  };

  const handleOpenConfigModal = (api: ApiRegistry) => {
    setConfigApi(api);
    setConfigStartDate(api.fetch_start_date ? new Date(api.fetch_start_date) : new Date('2010-01-01'));
    setConfigEndDate(api.fetch_end_date ? new Date(api.fetch_end_date) : undefined);
    setConfigAutoEnabled(api.auto_fetch_enabled || false);
    setConfigInterval(api.auto_fetch_interval || 'daily');
    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
    if (!configApi) return;
    
    try {
      const { error } = await supabase
        .from('system_api_registry')
        .update({
          fetch_start_date: configStartDate ? format(configStartDate, 'yyyy-MM-dd') : null,
          fetch_end_date: configEndDate ? format(configEndDate, 'yyyy-MM-dd') : null,
          auto_fetch_enabled: configAutoEnabled,
          auto_fetch_interval: configInterval
        })
        .eq('id', configApi.id);

      if (error) throw error;
      toast.success('Configuração salva com sucesso');
      setShowConfigModal(false);
      fetchApis();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configuração');
    }
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="hidden md:table-cell">URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Última Verificação</TableHead>
                  <TableHead className="hidden xl:table-cell">Dados Extraídos</TableHead>
                  <TableHead className="hidden xl:table-cell">Período</TableHead>
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
                  apis.map((api) => (
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
                        <Badge variant="outline" className={getProviderColor(api.provider)}>
                          {api.provider}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1 max-w-[200px]">
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
                      <TableCell className="hidden lg:table-cell">
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
                      <TableCell className="hidden xl:table-cell">
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
                      {/* Período - Clickable */}
                      <TableCell className="hidden xl:table-cell">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 gap-1.5 border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                          onClick={() => handleOpenConfigModal(api)}
                        >
                          <Settings className="h-3 w-3" />
                          {getConfiguredPeriod(api) || 'Configurar'}
                          {api.auto_fetch_enabled && (
                            <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 border-cyan-500/40 text-cyan-400">
                              Auto
                            </Badge>
                          )}
                        </Button>
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
                                  onClick={() => handleViewLog(api)}
                                  disabled={!api.last_sync_metadata}
                                >
                                  <FileJson className="h-4 w-4 text-amber-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver Log Detalhado</TooltipContent>
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
        </CardContent>
      </Card>

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

      {/* Configuration Modal */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-emerald-500" />
              Configurar Período e Automação
            </DialogTitle>
            <DialogDescription>
              {configApi?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Section A: Intervalo de Coleta */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-emerald-400" />
                <Label className="text-sm font-medium">Intervalo de Coleta</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !configStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {configStartDate ? format(configStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={configStartDate}
                        onSelect={setConfigStartDate}
                        defaultMonth={configStartDate}
                        initialFocus
                        className="pointer-events-auto"
                        captionLayout="dropdown-buttons"
                        fromYear={2000}
                        toYear={2030}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !configEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {configEndDate ? format(configEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Até Hoje"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={configEndDate}
                        onSelect={setConfigEndDate}
                        defaultMonth={configEndDate || configStartDate}
                        initialFocus
                        className="pointer-events-auto"
                        captionLayout="dropdown-buttons"
                        fromYear={2000}
                        toYear={2030}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="border-t border-border/40" />

            {/* Section B: Busca Automatizada */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-cyan-400" />
                <Label className="text-sm font-medium">Busca Automatizada</Label>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-sm">Habilitar Busca Automática</Label>
                  <p className="text-xs text-muted-foreground">
                    Preenche lacunas e busca novos registros
                  </p>
                </div>
                <Switch
                  checked={configAutoEnabled}
                  onCheckedChange={setConfigAutoEnabled}
                />
              </div>

              {configAutoEnabled && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Intervalo de Verificação</Label>
                  <Select value={configInterval} onValueChange={setConfigInterval}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6hours">A cada 6 horas</SelectItem>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-300">
                  O sistema irá consultar a API automaticamente neste intervalo para preencher lacunas de dados ou buscar novos registros após a Data Fim.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Diagnostic Modal */}
      <ApiDiagnosticModal 
        open={apiDiagnosticModalOpen} 
        onOpenChange={setApiDiagnosticModalOpen} 
      />
    </div>
  );
}
