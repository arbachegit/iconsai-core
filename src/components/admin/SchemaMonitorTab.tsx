import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Database, Code, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SchemaCheckResult {
  success: boolean;
  summary: {
    timestamp: string;
    total_divergences: number;
    critical: number;
    warnings: number;
    tables_checked: number;
    functions_checked: number;
    all_ok: boolean;
  };
  results: {
    tables: Record<string, { status: string; columns?: string[]; missing?: string[] }>;
    functions: Record<string, { status: string }>;
    references: Record<string, { status: string; contains_required?: boolean; contains_forbidden?: boolean }>;
  };
  divergences: Array<{
    check_type: string;
    entity_name: string;
    expected_state: object;
    actual_state: object;
    divergence_type: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
}

interface AuditLogEntry {
  id: string;
  check_type: string;
  entity_name: string;
  divergence_type: string;
  severity: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export default function SchemaMonitorTab() {
  const queryClient = useQueryClient();
  const [lastCheck, setLastCheck] = useState<SchemaCheckResult | null>(null);

  // Fetch audit log history
  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['schema-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schema_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });

  // Run schema check mutation
  const runCheckMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('schema-monitor');
      if (error) throw error;
      return data as SchemaCheckResult;
    },
    onSuccess: (data) => {
      setLastCheck(data);
      queryClient.invalidateQueries({ queryKey: ['schema-audit-logs'] });
      if (data.summary.all_ok) {
        toast.success('Schema OK - Nenhuma divergência encontrada');
      } else {
        toast.warning(`${data.summary.total_divergences} divergência(s) encontrada(s)`);
      }
    },
    onError: (error) => {
      toast.error('Erro ao verificar schema: ' + error.message);
    },
  });

  // Resolve divergence mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('schema_audit_log')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: 'admin',
          resolution_notes: notes,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schema-audit-logs'] });
      toast.success('Divergência marcada como resolvida');
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Crítico</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" />Aviso</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'missing':
      case 'issue':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'incomplete':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const unresolvedCount = auditLogs?.filter(l => !l.is_resolved).length || 0;
  const criticalUnresolved = auditLogs?.filter(l => !l.is_resolved && l.severity === 'critical').length || 0;

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitor de Schema</h2>
          <p className="text-muted-foreground">Verificação de integridade do banco de dados</p>
        </div>
        <div className="flex items-center gap-4">
          {criticalUnresolved > 0 ? (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              {criticalUnresolved} Crítico(s)
            </Badge>
          ) : unresolvedCount > 0 ? (
            <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-lg px-4 py-2">
              {unresolvedCount} Pendente(s)
            </Badge>
          ) : (
            <Badge variant="outline" className="border-green-500 text-green-600 text-lg px-4 py-2">
              <CheckCircle className="w-4 h-4 mr-2" />
              Schema OK
            </Badge>
          )}
          <Button 
            onClick={() => runCheckMutation.mutate()}
            disabled={runCheckMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${runCheckMutation.isPending ? 'animate-spin' : ''}`} />
            Verificar Agora
          </Button>
        </div>
      </div>

      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">
            <Database className="w-4 h-4 mr-2" />
            Status Atual
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="w-4 h-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          {lastCheck ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Tabelas Verificadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{lastCheck.summary.tables_checked}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Funções Verificadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{lastCheck.summary.functions_checked}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Divergências Críticas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${lastCheck.summary.critical > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {lastCheck.summary.critical}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Avisos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${lastCheck.summary.warnings > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {lastCheck.summary.warnings}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tables Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Tabelas Críticas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tabela</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Colunas</TableHead>
                        <TableHead>Colunas Faltando</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(lastCheck.results.tables).map(([name, info]) => (
                        <TableRow key={name}>
                          <TableCell className="font-mono">{name}</TableCell>
                          <TableCell>{getStatusIcon(info.status)} {info.status}</TableCell>
                          <TableCell>{info.columns?.length || 0}</TableCell>
                          <TableCell>
                            {info.missing?.length ? (
                              <span className="text-red-500 font-mono text-sm">
                                {info.missing.join(', ')}
                              </span>
                            ) : (
                              <span className="text-green-500">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Functions Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Funções RPC Críticas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(lastCheck.results.functions).map(([name, info]) => (
                      <Badge 
                        key={name} 
                        variant={info.status === 'ok' ? 'outline' : 'destructive'}
                        className={info.status === 'ok' ? 'border-green-500 text-green-600' : ''}
                      >
                        {getStatusIcon(info.status)}
                        <span className="ml-1 font-mono">{name}</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Reference Checks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Verificação de Referências
                  </CardTitle>
                  <CardDescription>
                    Verifica se funções referenciam tabelas corretas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Função</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Referência Correta</TableHead>
                        <TableHead>Referência Proibida</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(lastCheck.results.references).map(([name, info]) => (
                        <TableRow key={name}>
                          <TableCell className="font-mono">{name}</TableCell>
                          <TableCell>{getStatusIcon(info.status)}</TableCell>
                          <TableCell>
                            {info.contains_required ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            {info.contains_forbidden ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Divergences */}
              {lastCheck.divergences.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-500">
                      <AlertTriangle className="w-5 h-5" />
                      Divergências Detectadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Entidade</TableHead>
                          <TableHead>Problema</TableHead>
                          <TableHead>Severidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lastCheck.divergences.map((div, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{div.check_type}</TableCell>
                            <TableCell className="font-mono">{div.entity_name}</TableCell>
                            <TableCell>{div.divergence_type}</TableCell>
                            <TableCell>{getSeverityBadge(div.severity)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Database className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Clique em "Verificar Agora" para executar a verificação de schema
                </p>
                <Button onClick={() => runCheckMutation.mutate()} disabled={runCheckMutation.isPending}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${runCheckMutation.isPending ? 'animate-spin' : ''}`} />
                  Verificar Agora
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Divergências</CardTitle>
              <CardDescription>Últimas 50 divergências detectadas</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : auditLogs?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma divergência registrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Problema</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{log.check_type}</TableCell>
                        <TableCell className="font-mono text-sm">{log.entity_name}</TableCell>
                        <TableCell>{log.divergence_type}</TableCell>
                        <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                        <TableCell>
                          {log.is_resolved ? (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              Resolvido
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!log.is_resolved && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => resolveMutation.mutate({ id: log.id, notes: 'Resolvido manualmente' })}
                            >
                              Resolver
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
