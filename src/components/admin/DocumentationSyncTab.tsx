import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Database, 
  Code, 
  Layout, 
  Palette,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
  Timer,
  FileText
} from 'lucide-react';

interface SyncLog {
  id: string;
  sync_id: string;
  trigger_type: 'scheduled' | 'manual';
  triggered_by: string | null;
  status: 'running' | 'completed' | 'failed';
  current_phase: string | null;
  progress: number;
  phases_completed: string[];
  changes_detected: Record<string, any>;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

const SYNC_PHASES = [
  { id: 'database', label: 'Schema do Banco', icon: Database },
  { id: 'edge_functions', label: 'Edge Functions', icon: Code },
  { id: 'frontend', label: 'Componentes', icon: Layout },
  { id: 'icons', label: 'Ícones', icon: Palette },
  { id: 'finalize', label: 'Finalização', icon: CheckCircle2 },
];

export const DocumentationSyncTab: React.FC = () => {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Fetch sync logs
  const fetchSyncLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('documentation_sync_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Type assertion since the table was just created
      setSyncLogs((data || []) as unknown as SyncLog[]);
    } catch (error) {
      console.error('Failed to fetch sync logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncLogs();
  }, []);

  // Realtime subscription for progress updates
  useEffect(() => {
    if (!activeSyncId) return;

    const channel = supabase
      .channel('sync-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentation_sync_log',
          filter: `sync_id=eq.${activeSyncId}`,
        },
        (payload) => {
          const newData = payload.new as SyncLog;
          setCurrentProgress(newData.progress);
          setCurrentPhase(newData.current_phase);

          if (newData.status === 'completed') {
            setIsSyncing(false);
            setActiveSyncId(null);
            toast.success('Sincronização concluída com sucesso!');
            fetchSyncLogs();
          } else if (newData.status === 'failed') {
            setIsSyncing(false);
            setActiveSyncId(null);
            toast.error(`Sincronização falhou: ${newData.error_message}`);
            fetchSyncLogs();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSyncId]);

  const handleStartSync = async () => {
    setIsSyncing(true);
    setCurrentProgress(0);
    setCurrentPhase(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const response = await supabase.functions.invoke('sync-documentation', {
        body: {
          trigger: 'manual',
          triggered_by: userData.user?.email || 'admin',
        },
      });

      if (response.error) throw response.error;

      const { sync_id } = response.data;
      setActiveSyncId(sync_id);
      toast.info('Sincronização iniciada...');
    } catch (error) {
      console.error('Failed to start sync:', error);
      toast.error('Falha ao iniciar sincronização');
      setIsSyncing(false);
    }
  };

  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-400/40"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluído</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-400/40"><XCircle className="w-3 h-3 mr-1" /> Falhou</Badge>;
      case 'running':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/40"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Em Andamento</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTriggerBadge = (triggerType: string) => {
    return triggerType === 'scheduled' ? (
      <Badge variant="outline" className="text-amber-400 border-amber-400/40">
        <Clock className="w-3 h-3 mr-1" /> Agendado
      </Badge>
    ) : (
      <Badge variant="outline" className="text-cyan-400 border-cyan-400/40">
        <RefreshCw className="w-3 h-3 mr-1" /> Manual
      </Badge>
    );
  };

  const lastSync = syncLogs.find((log) => log.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-card/80 to-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Sincronização de Documentação
          </CardTitle>
          <CardDescription>
            Sincronize a documentação interna da aplicação rastreando todas as seções, Edge Functions e componentes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Last Sync Info */}
          {lastSync && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Última sincronização: {formatDate(lastSync.started_at)}
              </span>
              <span className="flex items-center gap-1">
                <Timer className="w-4 h-4" />
                Duração: {formatDuration(lastSync.duration_ms)}
              </span>
              {getTriggerBadge(lastSync.trigger_type)}
            </div>
          )}

          {/* Sync Button */}
          <Button
            onClick={handleStartSync}
            disabled={isSyncing}
            className="w-full sm:w-auto"
            size="lg"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar Agora
              </>
            )}
          </Button>

          {/* Progress Section */}
          {isSyncing && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso da Sincronização</span>
                <span className="font-medium">{currentProgress}%</span>
              </div>
              <Progress value={currentProgress} className="h-3" />
              
              {/* Phase Indicators */}
              <div className="flex justify-between gap-1 mt-4">
                {SYNC_PHASES.map((phase, index) => {
                  const PhaseIcon = phase.icon;
                  const isCompleted = SYNC_PHASES.findIndex(p => p.id === currentPhase) > index;
                  const isCurrent = phase.id === currentPhase;
                  
                  return (
                    <div
                      key={phase.id}
                      className={`flex flex-col items-center gap-1 flex-1 ${
                        isCompleted ? 'text-green-400' : isCurrent ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${
                        isCompleted ? 'bg-green-500/20' : isCurrent ? 'bg-primary/20' : 'bg-muted/50'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <PhaseIcon className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-xs text-center hidden sm:block">{phase.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Sincronizações</CardTitle>
          <CardDescription>Últimas 20 sincronizações realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : syncLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma sincronização realizada ainda.
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleLogExpanded(log.id)}
                      >
                        <TableCell>
                          {expandedLogs.has(log.id) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDate(log.started_at)}
                        </TableCell>
                        <TableCell>{getTriggerBadge(log.trigger_type)}</TableCell>
                        <TableCell>{formatDuration(log.duration_ms)}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                      </TableRow>
                      
                      {expandedLogs.has(log.id) && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/20">
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                                  <div className="text-xs text-muted-foreground mb-1">Tabelas</div>
                                  <div className="text-xl font-bold text-primary">
                                    {log.changes_detected?.database?.tables || 0}
                                  </div>
                                </div>
                                <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                                  <div className="text-xs text-muted-foreground mb-1">Edge Functions</div>
                                  <div className="text-xl font-bold text-primary">
                                    {log.changes_detected?.edge_functions?.total || 0}
                                  </div>
                                </div>
                                <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                                  <div className="text-xs text-muted-foreground mb-1">Componentes</div>
                                  <div className="text-xl font-bold text-primary">
                                    {log.changes_detected?.frontend?.components || 0}
                                  </div>
                                </div>
                                <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                                  <div className="text-xs text-muted-foreground mb-1">Ícones</div>
                                  <div className="text-xl font-bold text-primary">
                                    {log.changes_detected?.icons?.total || 0}
                                  </div>
                                </div>
                              </div>
                              
                              {log.triggered_by && (
                                <div className="text-sm text-muted-foreground">
                                  Iniciado por: <span className="text-foreground">{log.triggered_by}</span>
                                </div>
                              )}
                              
                              {log.error_message && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                  {log.error_message}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Schedule Info */}
      <Card className="bg-muted/20 border-border/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              A sincronização automática é executada diariamente às <strong className="text-foreground">03:00</strong>.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
