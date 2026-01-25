import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare, ShieldAlert, Users, Mail,
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
// DASHBOARD SIMPLIFICADO
// Usa apenas tabelas existentes: pwa_*, security_*, contact_messages
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

  // Fetch PWA conversation sessions (existing table)
  const { data: pwaSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["dashboard-pwa-sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pwa_conversation_sessions")
        .select("id, started_at, device_id")
        .order("started_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  // Fetch security audit logs (existing table)
  const { data: securityAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["dashboard-security-alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("security_audit_log")
        .select("id, severity, occurred_at")
        .gte("occurred_at", subDays(new Date(), 30).toISOString())
        .order("occurred_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch contact messages (existing table)
  const { data: contactMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ["dashboard-contact-messages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contact_messages")
        .select("id, status, created_at")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch banned devices count (existing table)
  const { data: bannedDevices } = useQuery({
    queryKey: ["dashboard-banned-devices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("banned_devices")
        .select("id")
        .eq("is_active", true);
      return data || [];
    },
  });

  const isLoading = sessionsLoading || alertsLoading || messagesLoading;

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

  // Calculate metrics from existing tables
  const totalPWASessions = pwaSessions?.length || 0;
  const uniqueDevices = new Set(pwaSessions?.map(s => s.device_id)).size;
  const securityIncidents = securityAlerts?.length || 0;
  const criticalIncidents = securityAlerts?.filter(a => a.severity === 'critical').length || 0;
  const pendingMessages = contactMessages?.filter(m => m.status === 'pending').length || 0;
  const totalMessages = contactMessages?.length || 0;
  const activeBans = bannedDevices?.length || 0;

  // Generate chart data for PWA sessions (last 7 days)
  const generateChartData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayName = format(date, "EEE", { locale: ptBR });
      const dateStr = format(date, "yyyy-MM-dd");

      const sessionsCount = pwaSessions?.filter(s =>
        s.started_at?.startsWith(dateStr)
      ).length ?? 0;

      const incidentsCount = securityAlerts?.filter(a =>
        a.occurred_at?.startsWith(dateStr)
      ).length ?? 0;

      days.push({
        name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        sessoes: sessionsCount,
        incidentes: incidentsCount,
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
          value={totalPWASessions.toLocaleString()}
          change={`${uniqueDevices} dispositivos`}
          icon={Smartphone}
          trend="neutral"
          tooltip="Total de sessões de conversa no PWA. Cada sessão representa uma interação com o assistente de voz."
        />
        <StatCard
          title="Dispositivos Únicos"
          value={uniqueDevices.toLocaleString()}
          change="últimos 30 dias"
          icon={Users}
          trend="neutral"
          tooltip="Quantidade de dispositivos únicos que acessaram o PWA."
        />
        <StatCard
          title="Mensagens de Contato"
          value={totalMessages.toString()}
          change={`${pendingMessages} pendentes`}
          icon={Mail}
          trend={pendingMessages > 0 ? "up" : "neutral"}
          tooltip="Mensagens recebidas pelo formulário de contato do site."
        />
        <StatCard
          title="Incidentes de Segurança"
          value={securityIncidents.toString()}
          change={`${criticalIncidents} críticos | ${activeBans} banidos`}
          icon={ShieldAlert}
          trend={criticalIncidents > 0 ? "down" : "neutral"}
          tooltip="Violações de segurança detectadas nos últimos 30 dias."
        />
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PWA Sessions Chart */}
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

        {/* Security Incidents Chart */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Incidentes de Segurança</h3>
            <p className="text-sm text-muted-foreground">Volume de incidentes nos últimos 7 dias</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncidentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e94560" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#e94560" stopOpacity={0}/>
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
                  dataKey="incidentes"
                  stroke="#e94560"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorIncidentes)"
                  name="Incidentes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-4">
            <Smartphone className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">PWA Voice</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total de sessões</span>
              <span className="font-medium">{totalPWASessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dispositivos únicos</span>
              <span className="font-medium">{uniqueDevices}</span>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Contato</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total de mensagens</span>
              <span className="font-medium">{totalMessages}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pendentes</span>
              <span className={`font-medium ${pendingMessages > 0 ? 'text-amber-500' : ''}`}>
                {pendingMessages}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold">Segurança</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Incidentes (30d)</span>
              <span className="font-medium">{securityIncidents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dispositivos banidos</span>
              <span className={`font-medium ${activeBans > 0 ? 'text-red-500' : ''}`}>
                {activeBans}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
