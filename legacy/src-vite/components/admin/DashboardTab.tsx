import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare, Users, Building2, Activity,
  ArrowUpRight, ArrowDownRight, Info, Smartphone
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================================
// DASHBOARD - Nova Arquitetura
// Tabelas: pwa_sessions, pwa_conversations, platform_users, institutions
// ============================================================

// Stat Card Component
const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
  tooltip
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  trend: "up" | "down" | "neutral";
  tooltip: string;
}) => (
  <div className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow relative">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
            <Info size={20} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] text-sm">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <div className="flex items-center justify-between">
      <div className="p-3 bg-primary/10 rounded-lg">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className={`flex items-center gap-1 text-sm font-medium ${
        trend === "up" ? "text-emerald-500" :
        trend === "down" ? "text-red-500" :
        "text-muted-foreground"
      }`}>
        {trend === "up" && <ArrowUpRight size={16} />}
        {trend === "down" && <ArrowDownRight size={16} />}
        {change}
      </div>
    </div>
    <div className="mt-4">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
    </div>
  </div>
);

export const DashboardTab = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch PWA sessions
  const { data: pwaSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["dashboard-pwa-sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pwa_sessions")
        .select("id, started_at, device_id, module_slug")
        .order("started_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  // Fetch PWA conversations
  const { data: pwaConversations, isLoading: convsLoading } = useQuery({
    queryKey: ["dashboard-pwa-conversations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pwa_conversations")
        .select("id, created_at, session_id")
        .order("created_at", { ascending: false })
        .limit(1000);
      return data || [];
    },
  });

  // Fetch platform users count
  const { data: platformUsers } = useQuery({
    queryKey: ["dashboard-platform-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_users")
        .select("id, status, created_at")
        .eq("status", "active");
      return data || [];
    },
  });

  // Fetch institutions count
  const { data: institutions } = useQuery({
    queryKey: ["dashboard-institutions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("institutions")
        .select("id, is_active")
        .eq("is_active", true);
      return data || [];
    },
  });

  const isLoading = sessionsLoading || convsLoading;

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-64 min-h-[256px] bg-background">
        <div className="text-muted-foreground">Carregando painel...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 min-h-[256px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate metrics
  const totalSessions = pwaSessions?.length || 0;
  const uniqueDevices = new Set(pwaSessions?.map(s => s.device_id)).size;
  const totalConversations = pwaConversations?.length || 0;
  const activeUsers = platformUsers?.length || 0;
  const activeInstitutions = institutions?.length || 0;

  // Generate chart data for sessions (last 7 days)
  const generateChartData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayName = format(date, "EEE", { locale: ptBR });
      const dateStr = format(date, "yyyy-MM-dd");

      const sessionsCount = pwaSessions?.filter(s =>
        s.started_at?.startsWith(dateStr)
      ).length ?? 0;

      const conversationsCount = pwaConversations?.filter(c =>
        c.created_at?.startsWith(dateStr)
      ).length ?? 0;

      days.push({
        name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        sessoes: sessionsCount,
        conversas: conversationsCount,
      });
    }
    return days;
  };

  const chartData = generateChartData();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do sistema IconsAI.</p>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Sessões PWA"
          value={totalSessions.toLocaleString()}
          change={`${uniqueDevices} dispositivos`}
          icon={Smartphone}
          trend="neutral"
          tooltip="Total de sessões no PWA. Cada sessão representa uma interação com o assistente."
        />
        <StatCard
          title="Conversas"
          value={totalConversations.toLocaleString()}
          change="mensagens trocadas"
          icon={MessageSquare}
          trend="neutral"
          tooltip="Total de mensagens trocadas entre usuários e assistentes."
        />
        <StatCard
          title="Usuários Ativos"
          value={activeUsers.toString()}
          change="na plataforma"
          icon={Users}
          trend={activeUsers > 0 ? "up" : "neutral"}
          tooltip="Usuários cadastrados e ativos na plataforma."
        />
        <StatCard
          title="Instituições"
          value={activeInstitutions.toString()}
          change="ativas"
          icon={Building2}
          trend={activeInstitutions > 0 ? "up" : "neutral"}
          tooltip="Instituições cadastradas e ativas."
        />
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions Chart */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Sessões PWA</h3>
            <p className="text-sm text-muted-foreground">Volume de sessões nos últimos 7 dias</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSessoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sessoes"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSessoes)"
                  name="Sessões"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversations Chart */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Conversas</h3>
            <p className="text-sm text-muted-foreground">Volume de mensagens nos últimos 7 dias</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConversas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="conversas"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorConversas)"
                  name="Conversas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
