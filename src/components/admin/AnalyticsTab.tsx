import { useChatAnalytics } from "@/hooks/useChatAnalytics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Clock, TrendingUp, Smile, TrendingDown, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";

export const AnalyticsTab = () => {
  const { analytics, isLoading } = useChatAnalytics();
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Fetch conversation data for sentiment and peak hours analysis
  const { data: conversations } = useQuery({
    queryKey: ["conversations-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  // Calculate summary stats - current week
  const today = startOfDay(new Date());
  const todayConversations = conversations?.filter(
    (c) => new Date(c.created_at) >= today
  ).length || 0;
  
  const totalMessages = conversations?.reduce(
    (sum, c) => sum + ((c.messages as any[])?.length || 0),
    0
  ) || 0;

  // Calculate previous week stats for comparison
  const currentWeekStart = subDays(new Date(), 7);
  const previousWeekStart = subDays(new Date(), 14);
  
  const currentWeekConversations = conversations?.filter(
    (c) => new Date(c.created_at) >= currentWeekStart
  ).length || 0;
  
  const previousWeekConversations = conversations?.filter((c) => {
    const date = new Date(c.created_at);
    return date >= previousWeekStart && date < currentWeekStart;
  }).length || 0;

  const currentWeekMessages = conversations
    ?.filter((c) => new Date(c.created_at) >= currentWeekStart)
    ?.reduce((sum, c) => sum + ((c.messages as any[])?.length || 0), 0) || 0;
  
  const previousWeekMessages = conversations
    ?.filter((c) => {
      const date = new Date(c.created_at);
      return date >= previousWeekStart && date < currentWeekStart;
    })
    ?.reduce((sum, c) => sum + ((c.messages as any[])?.length || 0), 0) || 0;

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const conversationsGrowth = calculateGrowth(currentWeekConversations, previousWeekConversations);
  const messagesGrowth = calculateGrowth(currentWeekMessages, previousWeekMessages);

  // Peak hours analysis
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const count = conversations?.filter((c) => {
      const createdHour = new Date(c.created_at).getHours();
      return createdHour === hour;
    }).length || 0;
    return {
      hour: `${hour}h`,
      conversas: count,
    };
  }) || [];

  const peakHour = hourlyData.reduce((max, curr) => 
    curr.conversas > max.conversas ? curr : max
  , { hour: "0h", conversas: 0 });

  // Sentiment analysis
  const sentimentData = [
    {
      name: "Positivo",
      value: conversations?.filter((c) => c.sentiment_label === "positive").length || 0,
      color: "#22c55e",
    },
    {
      name: "Neutro",
      value: conversations?.filter((c) => c.sentiment_label === "neutral").length || 0,
      color: "#eab308",
    },
    {
      name: "Negativo",
      value: conversations?.filter((c) => c.sentiment_label === "negative").length || 0,
      color: "#ef4444",
    },
  ];

  const totalSentiment = sentimentData.reduce((sum, s) => sum + s.value, 0);
  const positivePercent = totalSentiment > 0 
    ? Math.round((sentimentData[0].value / totalSentiment) * 100)
    : 0;

  // Process data for trend charts
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "dd/MM", { locale: ptBR });
    
    const dayAnalytics = analytics?.filter((a) => {
      const analyticsDate = new Date(a.started_at);
      return analyticsDate.toDateString() === date.toDateString();
    });

    return {
      date: dateStr,
      conversas: dayAnalytics?.length || 0,
      mensagens: dayAnalytics?.reduce((sum, a) => sum + a.message_count, 0) || 0,
      audios: dayAnalytics?.reduce((sum, a) => sum + a.audio_plays, 0) || 0,
    };
  });

  // Top topics
  const topicsCount = analytics?.reduce((acc: any, curr) => {
    curr.topics?.forEach((topic: string) => {
      acc[topic] = (acc[topic] || 0) + 1;
    });
    return acc;
  }, {});

  const topicsData = Object.entries(topicsCount || {})
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  const exportToPDF = async () => {
    if (!dashboardRef.current) return;
    
    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Header
      pdf.setFontSize(20);
      pdf.text("KnowYOU - Relatório de Analytics", 20, 20);
      pdf.setFontSize(12);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 20, 30);
      
      // Add graphics
      pdf.addImage(imgData, "PNG", 10, 40, pdfWidth - 20, pdfHeight);
      
      pdf.save(`knowyou-analytics-${Date.now()}.pdf`);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={exportToPDF} className="gap-2">
          <Download className="w-4 h-4" />
          Exportar PDF
        </Button>
      </div>

      <div ref={dashboardRef} className="space-y-6">
      {/* Summary Cards com Comparativo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversas Hoje</p>
                <p className="text-2xl font-bold">{todayConversations}</p>
                <div className="flex items-center gap-1 mt-1">
                  {conversationsGrowth >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs ${conversationsGrowth >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {conversationsGrowth.toFixed(1)}% vs. semana anterior
                  </span>
                </div>
              </div>
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Mensagens</p>
                <p className="text-2xl font-bold">{totalMessages}</p>
                <div className="flex items-center gap-1 mt-1">
                  {messagesGrowth >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs ${messagesGrowth >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {messagesGrowth.toFixed(1)}% vs. semana anterior
                  </span>
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Horário de Pico</p>
                <p className="text-2xl font-bold">{peakHour.hour}</p>
              </div>
              <Clock className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Satisfação</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  {positivePercent}%
                  <Smile className="w-6 h-6 text-green-500" />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Conversas nos Últimos 7 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="conversas" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Horários de Pico (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="conversas" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sentiment Analysis and Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Análise de Sentimento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Topics */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Tópicos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topicsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="topic" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Sessões Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics?.slice(0, 10).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 rounded-lg bg-background/50"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {session.user_name || "Usuário Anônimo"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(session.started_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">Mensagens</p>
                    <p className="font-bold text-foreground">{session.message_count}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Áudios</p>
                    <p className="font-bold text-foreground">{session.audio_plays}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};