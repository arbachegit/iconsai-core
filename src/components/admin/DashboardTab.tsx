import { Card } from "@/components/ui/card";
import { useChatAnalytics } from "@/hooks/useChatAnalytics";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { MessageSquare, Volume2, CheckCircle, XCircle, Mail, Search, FileText, LayoutDashboard, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export const DashboardTab = () => {
  const { analytics } = useChatAnalytics();
  const { settings } = useAdminSettings();

  // Fetch documents metrics
  const { data: docsData } = useQuery({
    queryKey: ["dashboard-docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("status, created_at");
      if (error) throw error;
      return data;
    },
  });

  // Fetch RAG searches
  const { data: ragSearches } = useQuery({
    queryKey: ["dashboard-rag"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("rag_analytics")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const today = new Date().toDateString();
  const todayAnalytics = analytics?.filter(
    (a) => new Date(a.started_at).toDateString() === today
  ) || [];

  const totalConversations = analytics?.length || 0;
  const totalMessages = analytics?.reduce((sum, a) => sum + a.message_count, 0) || 0;
  const totalAudioPlays = analytics?.reduce((sum, a) => sum + a.audio_plays, 0) || 0;
  const processedDocs = docsData?.filter(d => d.status === "completed").length || 0;

  // Chart data: Last 7 days conversations
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const conversationsByDay = last7Days.map(date => {
    const count = analytics?.filter(
      a => new Date(a.started_at).toISOString().split('T')[0] === date
    ).length || 0;
    return {
      date: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
      conversations: count
    };
  });

  // Document status distribution
  const docStatusData = [
    { name: 'Completo', value: docsData?.filter(d => d.status === 'completed').length || 0, color: '#10B981' },
    { name: 'Processando', value: docsData?.filter(d => d.status === 'processing' || d.status === 'pending').length || 0, color: '#F59E0B' },
    { name: 'Falha', value: docsData?.filter(d => d.status === 'failed').length || 0, color: '#EF4444' },
  ];

  // Peak usage hours
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const count = analytics?.filter(a => {
      const h = new Date(a.started_at).getHours();
      return h === hour;
    }).length || 0;
    return {
      hour: `${hour}h`,
      count
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <AdminTitleWithInfo
          title="Dashboard"
          level="h1"
          icon={LayoutDashboard}
          tooltipText="Visão geral do sistema KnowYOU"
          infoContent={
            <>
              <p>Painel central com métricas em tempo real do sistema.</p>
              <p className="mt-2">Mostra conversas totais, documentos processados, mensagens trocadas e buscas RAG.</p>
              <p className="mt-2">Ideal para monitoramento rápido da saúde do sistema.</p>
            </>
          }
        />
        <p className="text-muted-foreground mt-2">
          Visão geral do sistema KnowYOU
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conversas Totais</p>
              <p className="text-2xl font-bold text-foreground">{totalConversations}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Documentos Processados</p>
              <p className="text-2xl font-bold text-foreground">{processedDocs}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mensagens Trocadas</p>
              <p className="text-2xl font-bold text-foreground">{totalMessages}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Buscas RAG</p>
              <p className="text-2xl font-bold text-foreground">{ragSearches}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
          <h3 className="text-lg font-semibold mb-4">Conversas (Últimos 7 Dias)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={conversationsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))' 
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="conversations" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
          <h3 className="text-lg font-semibold mb-4">Distribuição de Documentos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={docStatusData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value, index }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius + 40;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  
                  // Ajuste vertical para evitar sobreposição
                  const verticalOffset = index % 2 === 0 ? -5 : 5;
                  
                  return (
                    <text
                      x={x}
                      y={y + verticalOffset}
                      fill="currentColor"
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                      className="text-xs font-medium"
                    >
                      {`${name}: ${value}`}
                    </text>
                  );
                }}
                outerRadius={55}
                fill="#8884d8"
                dataKey="value"
              >
                {docStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
        <h3 className="text-lg font-semibold mb-4">Horários de Pico de Uso</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))' 
              }} 
            />
            <Bar dataKey="count" fill="hsl(var(--secondary))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Status das Integrações
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Áudio do Chat</span>
            </div>
            {settings?.chat_audio_enabled ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Ativo</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">Inativo</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Gmail API</span>
            </div>
            {settings?.gmail_api_configured ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Configurado</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-500">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">Não Configurado</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
