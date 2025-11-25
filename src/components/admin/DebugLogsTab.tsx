import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, RefreshCw, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface DebugLog {
  id: string;
  created_at: string;
  log_type: string;
  component: string | null;
  message: string;
  data: any;
  environment: string;
  scroll_x: number;
  scroll_y: number;
}

interface FeatureFlag {
  id: string;
  flag_name: string;
  enabled: boolean;
  description: string;
  environment: string;
}

export const DebugLogsTab = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  const fetchLogs = async () => {
    const query = supabase
      .from('debug_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filterType !== 'all') {
      query.eq('log_type', filterType);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Erro ao carregar logs",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setLogs(data || []);
  };

  const fetchFlags = async () => {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('flag_name');

    if (error) {
      toast({
        title: "Erro ao carregar feature flags",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setFlags(data || []);
  };

  const toggleFlag = async (flagName: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled: !currentValue })
      .eq('flag_name', flagName);

    if (error) {
      toast({
        title: "Erro ao atualizar flag",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Flag atualizada",
      description: `${flagName} foi ${!currentValue ? 'ativada' : 'desativada'}`,
    });

    fetchFlags();
  };

  const clearLogs = async () => {
    const { error } = await supabase
      .from('debug_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      toast({
        title: "Erro ao limpar logs",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Logs limpos",
      description: "Todos os logs foram removidos",
    });

    fetchLogs();
  };

  useEffect(() => {
    fetchLogs();
    fetchFlags();

    // Setup realtime subscription for logs
    const logsChannel = supabase
      .channel('debug_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'debug_logs'
        },
        () => {
          if (autoRefresh) {
            fetchLogs();
          }
        }
      )
      .subscribe();

    // Auto-refresh every 5 seconds if enabled
    const interval = autoRefresh ? setInterval(fetchLogs, 5000) : null;

    return () => {
      supabase.removeChannel(logsChannel);
      if (interval) clearInterval(interval);
    };
  }, [filterType, autoRefresh]);

  const getLogTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      scroll: "bg-blue-500",
      animation: "bg-purple-500",
      carousel: "bg-green-500",
      mount: "bg-yellow-500",
      effect: "bg-orange-500",
    };
    return colors[type] || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      {/* Feature Flags Section */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {flags.map((flag) => (
            <div key={flag.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={flag.flag_name} className="font-mono text-sm">
                    {flag.flag_name}
                  </Label>
                  <Badge variant={flag.enabled ? "default" : "secondary"}>
                    {flag.enabled ? "ON" : "OFF"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{flag.description}</p>
              </div>
              <Switch
                id={flag.flag_name}
                checked={flag.enabled}
                onCheckedChange={() => toggleFlag(flag.flag_name, flag.enabled)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Debug Logs Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Debug Logs em Tempo Real</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scroll">Scroll</SelectItem>
                  <SelectItem value="animation">Animation</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                  <SelectItem value="mount">Mount</SelectItem>
                  <SelectItem value="effect">Effect</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchLogs} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button onClick={clearLogs} variant="destructive" size="sm">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum log encontrado
                </p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Badge className={getLogTypeColor(log.log_type)}>
                          {log.log_type}
                        </Badge>
                        {log.component && (
                          <Badge variant="outline">{log.component}</Badge>
                        )}
                        <Badge variant="secondary">{log.environment}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm">{log.message}</p>
                    {log.scroll_y > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Scroll: {log.scroll_x}, {log.scroll_y}
                      </p>
                    )}
                    {log.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Dados adicionais
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
