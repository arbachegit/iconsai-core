import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Activity, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CreditUsage {
  id: string;
  created_at: string;
  operation_type: string;
  credits_consumed: number;
  success: boolean;
  error_code: string | null;
  section_id: string | null;
}

interface DailyStats {
  date: string;
  total: number;
  successful: number;
  failed: number;
  image_gen: number;
  chat: number;
}

interface AutoPreloadConfig {
  id: string;
  enabled: boolean;
  check_interval_minutes: number;
  last_check: string | null;
  last_preload: string | null;
}

export const CreditsDashboardTab = () => {
  const [usage, setUsage] = useState<CreditUsage[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [autoPreloadConfig, setAutoPreloadConfig] = useState<AutoPreloadConfig | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Carregar últimos 30 dias de uso
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: usageData, error: usageError } = await supabase
        .from("credits_usage")
        .select("*")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (usageError) throw usageError;

      setUsage(usageData || []);

      // Calcular estatísticas
      const total = usageData?.reduce((sum, u) => sum + u.credits_consumed, 0) || 0;
      const successful = usageData?.filter(u => u.success).length || 0;
      const rate = usageData?.length ? (successful / usageData.length) * 100 : 0;

      setTotalCredits(total);
      setSuccessRate(rate);

      // Agrupar por dia
      const dailyMap = new Map<string, DailyStats>();

      usageData?.forEach((u) => {
        const date = new Date(u.created_at).toLocaleDateString('pt-BR');
        
        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            date,
            total: 0,
            successful: 0,
            failed: 0,
            image_gen: 0,
            chat: 0,
          });
        }

        const stats = dailyMap.get(date)!;
        stats.total += u.credits_consumed;
        
        if (u.success) {
          stats.successful += u.credits_consumed;
        } else {
          stats.failed += u.credits_consumed;
        }

        if (u.operation_type === "image_generation") {
          stats.image_gen += u.credits_consumed;
        } else if (u.operation_type === "chat") {
          stats.chat += u.credits_consumed;
        }
      });

      setDailyStats(Array.from(dailyMap.values()).reverse().slice(-14)); // Últimos 14 dias

      // Carregar config de auto-preload
      const { data: configData, error: configError } = await supabase
        .from("auto_preload_config")
        .select("*")
        .single();

      if (!configError && configData) {
        setAutoPreloadConfig(configData);
      }

    } catch (error) {
      console.error("Error loading credits data:", error);
      toast.error("Erro ao carregar dados de créditos");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutoPreload = async (enabled: boolean) => {
    if (!autoPreloadConfig) return;

    try {
      const { error } = await supabase
        .from("auto_preload_config")
        .update({ enabled })
        .eq("id", autoPreloadConfig.id);

      if (error) throw error;

      setAutoPreloadConfig({ ...autoPreloadConfig, enabled });
      toast.success(`Auto-preload ${enabled ? "ativado" : "desativado"}`);
    } catch (error) {
      console.error("Error toggling auto-preload:", error);
      toast.error("Erro ao atualizar configuração");
    }
  };

  const triggerManualCheck = async () => {
    try {
      toast.info("Verificando créditos e iniciando pré-carregamento...");
      
      const { data, error } = await supabase.functions.invoke("check-credits-preload");

      if (error) throw error;

      toast.success("Verificação concluída! " + (data?.message || ""));
      loadData();
    } catch (error) {
      console.error("Error triggering preload:", error);
      toast.error("Erro ao verificar créditos");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const trend = dailyStats.length >= 2 
    ? dailyStats[dailyStats.length - 1].total - dailyStats[dailyStats.length - 2].total
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Dashboard de Créditos</h2>
        <p className="text-muted-foreground">
          Monitore o consumo de créditos Lovable AI ao longo do tempo
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total (30 dias)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCredits}</div>
            <p className="text-xs text-muted-foreground">créditos consumidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">operações bem-sucedidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendência</CardTitle>
            {trend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trend >= 0 ? "+" : ""}{trend}
            </div>
            <p className="text-xs text-muted-foreground">vs dia anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Auto-preload config */}
      {autoPreloadConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Auto-Preload de Imagens</CardTitle>
            <CardDescription>
              Verifica automaticamente se há créditos disponíveis e pré-carrega imagens críticas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ativar Auto-Preload</Label>
                <p className="text-sm text-muted-foreground">
                  Verifica a cada {autoPreloadConfig.check_interval_minutes} minutos
                </p>
              </div>
              <Switch
                checked={autoPreloadConfig.enabled}
                onCheckedChange={toggleAutoPreload}
              />
            </div>

            {autoPreloadConfig.last_check && (
              <div className="text-sm text-muted-foreground">
                Última verificação: {new Date(autoPreloadConfig.last_check).toLocaleString('pt-BR')}
              </div>
            )}

            {autoPreloadConfig.last_preload && (
              <div className="text-sm text-muted-foreground">
                Último pré-carregamento: {new Date(autoPreloadConfig.last_preload).toLocaleString('pt-BR')}
              </div>
            )}

            <Button onClick={triggerManualCheck} variant="outline">
              Verificar Agora
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de linha - consumo diário */}
      <Card>
        <CardHeader>
          <CardTitle>Consumo Diário (últimos 14 dias)</CardTitle>
          <CardDescription>Créditos consumidos por dia</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Total"
              />
              <Line 
                type="monotone" 
                dataKey="successful" 
                stroke="hsl(142, 76%, 36%)" 
                strokeWidth={2}
                name="Sucesso"
              />
              <Line 
                type="monotone" 
                dataKey="failed" 
                stroke="hsl(0, 84%, 60%)" 
                strokeWidth={2}
                name="Falha"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de barras - por tipo de operação */}
      <Card>
        <CardHeader>
          <CardTitle>Consumo por Tipo</CardTitle>
          <CardDescription>Distribuição de créditos por operação</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="image_gen" fill="hsl(var(--primary))" name="Geração de Imagens" />
              <Bar dataKey="chat" fill="hsl(var(--accent))" name="Chat" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela de últimas operações */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Operações</CardTitle>
          <CardDescription>Histórico recente de uso de créditos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {usage.slice(0, 20).map((u) => (
              <div 
                key={u.id} 
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex-1">
                  <div className="font-medium">{u.operation_type}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleString('pt-BR')}
                    {u.section_id && ` • ${u.section_id}`}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`px-2 py-1 rounded text-xs ${
                    u.success 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {u.success ? 'Sucesso' : 'Falha'}
                  </div>
                  <div className="font-mono text-sm">{u.credits_consumed}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};