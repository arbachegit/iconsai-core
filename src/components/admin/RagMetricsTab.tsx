import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Database, FileText, Search, CheckCircle2, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const RagMetricsTab = () => {
  // Fetch documents metrics
  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ["rag-metrics-docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("status, target_chat, total_chunks");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch chunks count
  const { data: chunksCount, isLoading: chunksLoading } = useQuery({
    queryKey: ["rag-metrics-chunks"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("document_chunks")
        .select("*", { count: "exact", head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Calculate metrics
  const totalDocs = docsData?.length || 0;
  const completedDocs = docsData?.filter(d => d.status === "completed").length || 0;
  const failedDocs = docsData?.filter(d => d.status === "failed").length || 0;
  const pendingDocs = docsData?.filter(d => d.status === "pending" || d.status === "processing").length || 0;
  const successRate = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;
  const avgChunks = totalDocs > 0 ? Math.round((chunksCount || 0) / totalDocs) : 0;

  // Status distribution data
  const statusData = [
    { name: "Completo", value: completedDocs, color: "#10B981" },
    { name: "Falha", value: failedDocs, color: "#EF4444" },
    { name: "Processando", value: pendingDocs, color: "#F59E0B" },
  ];

  // Target chat distribution data
  const chatData = [
    { name: "Saúde", value: docsData?.filter(d => d.target_chat === "health").length || 0 },
    { name: "Estudo", value: docsData?.filter(d => d.target_chat === "study").length || 0 },
    { name: "Geral", value: docsData?.filter(d => d.target_chat === "general").length || 0 },
  ];

  if (docsLoading || chunksLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">📊 Métricas RAG</h2>
        <p className="text-muted-foreground">
          Estatísticas detalhadas do sistema de Recuperação Aumentada por Geração
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Documentos</p>
              <p className="text-3xl font-bold mt-1">{totalDocs}</p>
            </div>
            <Database className="h-10 w-10 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Chunks Totais</p>
              <p className="text-3xl font-bold mt-1">{chunksCount}</p>
              <p className="text-xs text-muted-foreground mt-1">~{avgChunks} por doc</p>
            </div>
            <FileText className="h-10 w-10 text-secondary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
              <p className="text-3xl font-bold mt-1">{successRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">{completedDocs}/{totalDocs} completos</p>
            </div>
            <CheckCircle2 className="h-10 w-10 text-accent opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Falhas</p>
              <p className="text-3xl font-bold mt-1">{failedDocs}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalDocs > 0 ? Math.round((failedDocs / totalDocs) * 100) : 0}% dos docs
              </p>
            </div>
            <Search className="h-10 w-10 text-destructive opacity-20" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Status dos Documentos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Target Chat Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Distribuição por Chat</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chatData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Estatísticas Detalhadas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Documentos de Saúde</p>
            <p className="text-2xl font-bold text-primary">{chatData[0].value}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Documentos de Estudo</p>
            <p className="text-2xl font-bold text-secondary">{chatData[1].value}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Documentos Gerais</p>
            <p className="text-2xl font-bold text-accent">{chatData[2].value}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
