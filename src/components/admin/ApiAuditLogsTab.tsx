import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  Database,
  Wifi,
  Settings,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  api_id: string | null;
  api_name: string;
  event_type: string;
  event_category: string;
  severity: string;
  action_description: string;
  records_affected: number;
  execution_time_ms: number | null;
  http_status: number | null;
  user_email: string | null;
  user_role: string | null;
  error_message: string | null;
  created_at: string;
}

const severityConfig = {
  SUCCESS: { icon: CheckCircle2, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  INFO: { icon: Info, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  WARNING: { icon: AlertTriangle, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  ERROR: { icon: XCircle, color: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

const categoryConfig = {
  CONFIG: { icon: Settings, label: 'Configuração' },
  CONNECTION: { icon: Wifi, label: 'Conexão' },
  SYNC: { icon: RefreshCw, label: 'Sincronização' },
  DATA: { icon: Database, label: 'Dados' },
};

export function ApiAuditLogsTab() {
  const [filters, setFilters] = useState({
    search: '',
    severity: 'all',
    category: 'all',
    apiId: 'all',
    dateRange: '7d',
  });

  // Fetch logs
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['api-audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('api_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters.severity !== 'all') {
        query = query.eq('severity', filters.severity);
      }
      if (filters.category !== 'all') {
        query = query.eq('event_category', filters.category);
      }
      if (filters.apiId !== 'all') {
        query = query.eq('api_id', filters.apiId);
      }
      if (filters.search) {
        query = query.or(`api_name.ilike.%${filters.search}%,action_description.ilike.%${filters.search}%`);
      }

      if (filters.dateRange !== 'all') {
        const now = new Date();
        let startDate: Date;
        switch (filters.dateRange) {
          case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  // Fetch APIs for filter
  const { data: apis } = useQuery({
    queryKey: ['apis-for-audit-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_api_registry')
        .select('id, name')
        .order('name');
      return data;
    },
  });

  // Stats
  const stats = useMemo(() => ({
    total: logs?.length || 0,
    success: logs?.filter(l => l.severity === 'SUCCESS').length || 0,
    errors: logs?.filter(l => l.severity === 'ERROR').length || 0,
    warnings: logs?.filter(l => l.severity === 'WARNING').length || 0,
  }), [logs]);

  // Export CSV
  const handleExport = () => {
    if (!logs) return;
    
    const csv = [
      ['Data/Hora', 'API', 'Evento', 'Categoria', 'Severidade', 'Descrição', 'Registros', 'Tempo (ms)', 'Usuário'].join(','),
      ...logs.map(log => [
        format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
        `"${log.api_name}"`,
        log.event_type,
        log.event_category,
        log.severity,
        `"${log.action_description.replace(/"/g, '""')}"`,
        log.records_affected,
        log.execution_time_ms || '',
        log.user_email || 'Sistema'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Log de APIs</h1>
            <p className="text-muted-foreground text-sm">
              Auditoria completa de todas as operações do sistema de APIs
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!logs?.length}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total de Eventos</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-500">{stats.success}</div>
            <p className="text-xs text-muted-foreground">Sucessos</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-yellow-500">{stats.warnings}</div>
            <p className="text-xs text-muted-foreground">Avisos</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-red-500">{stats.errors}</div>
            <p className="text-xs text-muted-foreground">Erros</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-9 h-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            
            <Select value={filters.severity} onValueChange={(v) => setFilters({ ...filters, severity: v })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="SUCCESS">✅ Sucesso</SelectItem>
                <SelectItem value="INFO">ℹ️ Info</SelectItem>
                <SelectItem value="WARNING">⚠️ Aviso</SelectItem>
                <SelectItem value="ERROR">❌ Erro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="CONFIG">⚙️ Configuração</SelectItem>
                <SelectItem value="CONNECTION">📡 Conexão</SelectItem>
                <SelectItem value="SYNC">🔄 Sincronização</SelectItem>
                <SelectItem value="DATA">💾 Dados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.apiId} onValueChange={(v) => setFilters({ ...filters, apiId: v })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="API" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as APIs</SelectItem>
                {apis?.map((api) => (
                  <SelectItem key={api.id} value={api.id}>{api.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.dateRange} onValueChange={(v) => setFilters({ ...filters, dateRange: v })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Últimas 24h</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Data/Hora</TableHead>
                  <TableHead>API</TableHead>
                  <TableHead className="w-[160px]">Evento</TableHead>
                  <TableHead className="w-[100px]">Categoria</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[70px] text-right">Reg.</TableHead>
                  <TableHead className="w-[70px] text-right">Tempo</TableHead>
                  <TableHead className="w-[140px]">Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      <span className="text-sm text-muted-foreground">Carregando logs...</span>
                    </TableCell>
                  </TableRow>
                ) : logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  logs?.map((log) => {
                    const SeverityIcon = severityConfig[log.severity as keyof typeof severityConfig]?.icon || Info;
                    const CategoryIcon = categoryConfig[log.event_category as keyof typeof categoryConfig]?.icon || Settings;
                    const categoryLabel = categoryConfig[log.event_category as keyof typeof categoryConfig]?.label || log.event_category;
                    
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{log.api_name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[250px]" title={log.action_description}>
                            {log.action_description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {log.event_type}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            <CategoryIcon className="h-3.5 w-3.5" />
                            <span>{categoryLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${severityConfig[log.severity as keyof typeof severityConfig]?.color}`}
                          >
                            <SeverityIcon className="h-3 w-3 mr-1" />
                            {log.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {log.records_affected > 0 ? log.records_affected.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {log.execution_time_ms ? `${log.execution_time_ms}ms` : '-'}
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[140px]" title={log.user_email || 'Sistema'}>
                          {log.user_email || <span className="text-muted-foreground italic">Sistema</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ApiAuditLogsTab;
