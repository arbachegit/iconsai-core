/**
 * EmotionAnalyticsTab - Emotion Analytics Dashboard
 * @version 1.0.0
 * @date 2026-01-28
 *
 * Admin component for analyzing:
 * - F0 frequency over time
 * - Emotion distribution
 * - Comparative analysis by day/week/month
 * - User-level emotion trends
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart3, LineChart as LineChartIcon, PieChart, Loader2, Calendar,
  TrendingUp, TrendingDown, Minus, Users, Activity, Volume2,
  Smile, Frown, Meh, AlertCircle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import EmotionFrequencyChart from "./EmotionFrequencyChart";

interface VoiceAnalysis {
  id: string;
  conversation_id: string;
  platform_user_id: string | null;
  f0_mean: number;
  f0_range_hz: number;
  emotion: string;
  emotion_confidence: number;
  speech_rate_wpm: number | null;
  contour_type: string | null;
  created_at: string;
  platform_user?: {
    full_name: string;
  };
}

interface EmotionStats {
  totalAnalyses: number;
  avgF0Mean: number;
  avgF0Range: number;
  dominantEmotion: string;
  emotionCounts: Record<string, number>;
  trend: "up" | "down" | "stable";
  trendValue: number;
}

interface PlatformUser {
  id: string;
  full_name: string;
  email: string;
}

const EMOTION_ICONS: Record<string, React.ReactNode> = {
  happy: <Smile className="h-5 w-5 text-green-500" />,
  sad: <Frown className="h-5 w-5 text-blue-500" />,
  neutral: <Meh className="h-5 w-5 text-gray-500" />,
  angry: <Frown className="h-5 w-5 text-red-500" />,
  fearful: <Frown className="h-5 w-5 text-purple-500" />,
  surprised: <Smile className="h-5 w-5 text-yellow-500" />,
  bored: <Meh className="h-5 w-5 text-gray-400" />,
};

const EMOTION_LABELS: Record<string, string> = {
  happy: "Alegria",
  sad: "Tristeza",
  neutral: "Neutro",
  angry: "Raiva",
  fearful: "Medo",
  surprised: "Surpresa",
  bored: "Tédio",
};

export default function EmotionAnalyticsTab() {
  const [analyses, setAnalyses] = useState<VoiceAnalysis[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [stats, setStats] = useState<EmotionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: format(subWeeks(new Date(), 1), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  });
  const [currentInstitutionId, setCurrentInstitutionId] = useState<string | null>(null);

  // Get current user's institution
  const fetchCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: platformUser } = await supabase
      .from("platform_users")
      .select("institution_id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (platformUser?.institution_id) {
      setCurrentInstitutionId(platformUser.institution_id);
      return platformUser.institution_id;
    }
    return null;
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async (institutionId: string) => {
    const { data, error } = await supabase
      .from("platform_users")
      .select("id, full_name, email")
      .eq("institution_id", institutionId)
      .order("full_name");

    if (error) throw error;
    setUsers(data || []);
  }, []);

  // Fetch voice analyses
  const fetchAnalyses = useCallback(async (institutionId: string) => {
    let query = supabase
      .from("voice_frequency_analysis")
      .select(`
        *,
        platform_user:platform_users(full_name)
      `)
      .eq("institution_id", institutionId)
      .eq("audio_type", "question")
      .not("emotion", "is", null)
      .gte("created_at", dateRange.from)
      .lte("created_at", dateRange.to + "T23:59:59")
      .order("created_at", { ascending: true });

    if (selectedUser !== "all") {
      query = query.eq("platform_user_id", selectedUser);
    }

    const { data, error } = await query.limit(1000);

    if (error) throw error;
    setAnalyses(data || []);

    // Calculate stats
    if (data && data.length > 0) {
      const emotionCounts: Record<string, number> = {};
      let f0Sum = 0;
      let rangeSum = 0;

      data.forEach((a) => {
        emotionCounts[a.emotion] = (emotionCounts[a.emotion] || 0) + 1;
        f0Sum += a.f0_mean || 0;
        rangeSum += a.f0_range_hz || 0;
      });

      // Find dominant emotion
      const dominantEmotion = Object.entries(emotionCounts).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] || "neutral";

      // Calculate trend (compare first half to second half)
      const midpoint = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, midpoint);
      const secondHalf = data.slice(midpoint);

      const firstAvg = firstHalf.reduce((sum, a) => sum + (a.f0_mean || 0), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, a) => sum + (a.f0_mean || 0), 0) / secondHalf.length;
      const trendDiff = secondAvg - firstAvg;

      let trend: "up" | "down" | "stable" = "stable";
      if (trendDiff > 10) trend = "up";
      else if (trendDiff < -10) trend = "down";

      setStats({
        totalAnalyses: data.length,
        avgF0Mean: Math.round(f0Sum / data.length),
        avgF0Range: Math.round(rangeSum / data.length),
        dominantEmotion,
        emotionCounts,
        trend,
        trendValue: Math.round(Math.abs(trendDiff)),
      });
    } else {
      setStats(null);
    }
  }, [dateRange, selectedUser]);

  // Update date range based on period
  const updatePeriod = (newPeriod: "day" | "week" | "month") => {
    setPeriod(newPeriod);
    const today = new Date();
    let from: Date;

    switch (newPeriod) {
      case "day":
        from = subDays(today, 1);
        break;
      case "week":
        from = subWeeks(today, 1);
        break;
      case "month":
        from = subMonths(today, 1);
        break;
    }

    setDateRange({
      from: format(from, "yyyy-MM-dd"),
      to: format(today, "yyyy-MM-dd"),
    });
  };

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const institutionId = await fetchCurrentUser();
        if (institutionId) {
          await fetchUsers(institutionId);
          await fetchAnalyses(institutionId);
        }
      } catch (err) {
        console.error("[EmotionAnalyticsTab] Error:", err);
        toast.error("Erro ao carregar dados");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetchCurrentUser, fetchUsers, fetchAnalyses]);

  // Reload when filters change
  useEffect(() => {
    if (currentInstitutionId) {
      fetchAnalyses(currentInstitutionId);
    }
  }, [selectedUser, dateRange, currentInstitutionId, fetchAnalyses]);

  // Prepare chart data
  const chartData = analyses.map((a) => ({
    timestamp: a.created_at,
    f0Mean: a.f0_mean,
    f0Range: a.f0_range_hz,
    emotion: a.emotion,
    confidence: a.emotion_confidence,
    userName: a.platform_user?.full_name,
  }));

  // Refresh data
  const refresh = async () => {
    if (currentInstitutionId) {
      setIsLoading(true);
      try {
        await fetchAnalyses(currentInstitutionId);
        toast.success("Dados atualizados");
      } catch (err) {
        toast.error("Erro ao atualizar");
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" />
              <CardTitle>Análise de Emoções</CardTitle>
            </div>
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
          <CardDescription>
            Analise as emoções detectadas nas conversas dos usuários baseado em frequência F0.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-[180px]">
              <Label className="text-xs text-muted-foreground">Período</Label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={period === "day" ? "default" : "outline"}
                  onClick={() => updatePeriod("day")}
                >
                  Dia
                </Button>
                <Button
                  size="sm"
                  variant={period === "week" ? "default" : "outline"}
                  onClick={() => updatePeriod("week")}
                >
                  Semana
                </Button>
                <Button
                  size="sm"
                  variant={period === "month" ? "default" : "outline"}
                  onClick={() => updatePeriod("month")}
                >
                  Mês
                </Button>
              </div>
            </div>

            <div className="w-[200px]">
              <Label className="text-xs text-muted-foreground">Usuário</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px]">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
              />
            </div>

            <div className="w-[140px]">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
              />
            </div>

            <Badge variant="outline" className="h-10 flex items-center">
              {analyses.length} análises
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Emoção Dominante</p>
                  <div className="flex items-center gap-2 mt-1">
                    {EMOTION_ICONS[stats.dominantEmotion]}
                    <span className="text-2xl font-bold">
                      {EMOTION_LABELS[stats.dominantEmotion]}
                    </span>
                  </div>
                </div>
                <div className="text-3xl">
                  {EMOTION_ICONS[stats.dominantEmotion]}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">F0 Média</p>
                  <p className="text-2xl font-bold mt-1">{stats.avgF0Mean} Hz</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">F0 Range Médio</p>
                  <p className="text-2xl font-bold mt-1">{stats.avgF0Range} Hz</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tendência</p>
                  <div className="flex items-center gap-2 mt-1">
                    {stats.trend === "up" ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : stats.trend === "down" ? (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    ) : (
                      <Minus className="h-5 w-5 text-gray-500" />
                    )}
                    <span className="text-2xl font-bold">
                      {stats.trend === "stable"
                        ? "Estável"
                        : `${stats.trend === "up" ? "+" : "-"}${stats.trendValue} Hz`}
                    </span>
                  </div>
                </div>
                {stats.trend === "up" ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : stats.trend === "down" ? (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                ) : (
                  <Minus className="h-8 w-8 text-gray-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {analyses.length > 0 ? (
        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Distribuição
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Comparativo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Frequência F0 ao Longo do Tempo</CardTitle>
                <CardDescription>
                  Evolução da frequência fundamental e range ao longo do período selecionado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmotionFrequencyChart
                  data={chartData}
                  type="timeline"
                  period={period}
                  showUsers={selectedUser === "all"}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição de Emoções</CardTitle>
                <CardDescription>
                  Proporção de cada emoção detectada nas conversas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmotionFrequencyChart
                  data={chartData}
                  type="distribution"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comparativo por Emoção</CardTitle>
                <CardDescription>
                  Valores médios de F0 para cada tipo de emoção detectada.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmotionFrequencyChart
                  data={chartData}
                  type="comparison"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma análise de voz encontrada para o período selecionado.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reference Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Referência: Correlatos Acústicos</CardTitle>
          <CardDescription>
            Tabela de referência para interpretação dos valores de F0.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Emoção</th>
                  <th className="text-center p-2">F0 Média (Hz)</th>
                  <th className="text-center p-2">F0 Range (Hz)</th>
                  <th className="text-center p-2">Velocidade (wpm)</th>
                  <th className="text-center p-2">Padrão</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 flex items-center gap-2">
                    <Meh className="h-4 w-4 text-gray-500" />
                    Neutro
                  </td>
                  <td className="text-center p-2">100-150</td>
                  <td className="text-center p-2">30-50</td>
                  <td className="text-center p-2">120-150</td>
                  <td className="text-center p-2">Declarativo</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 flex items-center gap-2">
                    <Smile className="h-4 w-4 text-green-500" />
                    Alegria
                  </td>
                  <td className="text-center p-2">150-200</td>
                  <td className="text-center p-2">80-120</td>
                  <td className="text-center p-2">160-200</td>
                  <td className="text-center p-2">Ascendente</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 flex items-center gap-2">
                    <Frown className="h-4 w-4 text-blue-500" />
                    Tristeza
                  </td>
                  <td className="text-center p-2">80-120</td>
                  <td className="text-center p-2">20-40</td>
                  <td className="text-center p-2">80-100</td>
                  <td className="text-center p-2">Descendente</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 flex items-center gap-2">
                    <Frown className="h-4 w-4 text-red-500" />
                    Raiva
                  </td>
                  <td className="text-center p-2">180-250</td>
                  <td className="text-center p-2">100-150</td>
                  <td className="text-center p-2">180-220</td>
                  <td className="text-center p-2">Irregular</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 flex items-center gap-2">
                    <Frown className="h-4 w-4 text-purple-500" />
                    Medo
                  </td>
                  <td className="text-center p-2">150-220</td>
                  <td className="text-center p-2">80-130</td>
                  <td className="text-center p-2">160-200</td>
                  <td className="text-center p-2">Instável</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 flex items-center gap-2">
                    <Smile className="h-4 w-4 text-yellow-500" />
                    Surpresa
                  </td>
                  <td className="text-center p-2">200-280</td>
                  <td className="text-center p-2">120-180</td>
                  <td className="text-center p-2">Variável</td>
                  <td className="text-center p-2">Pico súbito</td>
                </tr>
                <tr>
                  <td className="p-2 flex items-center gap-2">
                    <Meh className="h-4 w-4 text-gray-400" />
                    Tédio
                  </td>
                  <td className="text-center p-2">90-110</td>
                  <td className="text-center p-2">15-30</td>
                  <td className="text-center p-2">60-90</td>
                  <td className="text-center p-2">Plano</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
