import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Search, Calendar, Mail, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

type ActivityLog = {
  id: string;
  user_email: string;
  user_name: string | null;
  action: string;
  action_category: string;
  details: Record<string, any>;
  created_at: string;
};

const categoryColors: Record<string, string> = {
  LOGIN: "bg-green-500/20 text-green-700 dark:text-green-300",
  LOGOUT: "bg-gray-500/20 text-gray-700 dark:text-gray-300",
  DOCUMENT: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  CONFIG: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  CONTENT: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  NAVIGATION: "bg-slate-500/20 text-slate-700 dark:text-slate-300",
  RAG: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
  EXPORT: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
  DELETE: "bg-red-500/20 text-red-700 dark:text-red-300",
  VERSION: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  TAG: "bg-pink-500/20 text-pink-700 dark:text-pink-300",
  IMAGE: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
};

export default function UserActivityLogsTab() {
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportsOpen, setReportsOpen] = useState(true);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["user-activity-logs", searchText, categoryFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("user_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (categoryFilter !== "all") {
        query = query.eq("action_category", categoryFilter);
      }

      if (dateFrom) {
        query = query.gte("created_at", new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      if (searchText) {
        return (data as ActivityLog[]).filter(log =>
          log.action.toLowerCase().includes(searchText.toLowerCase()) ||
          log.user_email.toLowerCase().includes(searchText.toLowerCase())
        );
      }

      return data as ActivityLog[];
    },
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (period: "daily" | "weekly" | "monthly") => {
      const { data, error } = await supabase.functions.invoke("generate-activity-report", {
        body: { period }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, period) => {
      toast.success(`Relatório ${period} enviado com sucesso para ${data.recipient}!`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    }
  });

  const handleGenerateReport = (period: "daily" | "weekly" | "monthly") => {
    generateReportMutation.mutate(period);
  };

  const exportToCSV = () => {
    const headers = ["Data/Hora", "Usuário", "Ação", "Categoria"];
    const rows = logs.map(log => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
      log.user_email,
      log.action,
      log.action_category
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `activity-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Relatórios Automáticos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <CardTitle>📊 Relatórios Automáticos</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReportsOpen(!reportsOpen)}
              className="gap-2"
            >
              {reportsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {reportsOpen ? "Colapsar" : "Expandir"}
            </Button>
          </div>
        </CardHeader>
        <Collapsible open={reportsOpen}>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gere e envie relatórios de atividade por email usando a integração Gmail configurada.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => handleGenerateReport("daily")}
                  disabled={generateReportMutation.isPending}
                  variant="outline"
                  className="h-24 flex-col gap-2 border-blue-400/60 hover:bg-blue-500/20"
                >
                  {generateReportMutation.isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Mail className="w-6 h-6" />
                  )}
                  <span className="font-semibold">Enviar Relatório Diário</span>
                  <span className="text-xs text-muted-foreground">Últimas 24 horas</span>
                </Button>

                <Button
                  onClick={() => handleGenerateReport("weekly")}
                  disabled={generateReportMutation.isPending}
                  variant="outline"
                  className="h-24 flex-col gap-2 border-purple-400/60 hover:bg-purple-500/20"
                >
                  {generateReportMutation.isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Mail className="w-6 h-6" />
                  )}
                  <span className="font-semibold">Enviar Relatório Semanal</span>
                  <span className="text-xs text-muted-foreground">Últimos 7 dias</span>
                </Button>

                <Button
                  onClick={() => handleGenerateReport("monthly")}
                  disabled={generateReportMutation.isPending}
                  variant="outline"
                  className="h-24 flex-col gap-2 border-green-400/60 hover:bg-green-500/20"
                >
                  {generateReportMutation.isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Mail className="w-6 h-6" />
                  )}
                  <span className="font-semibold">Enviar Relatório Mensal</span>
                  <span className="text-xs text-muted-foreground">Últimos 30 dias</span>
                </Button>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  📧 Os relatórios serão enviados para o email configurado em <strong>Chat & Conversas → Gmail API</strong>
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Log de Atividades */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              📋 Log de Atividades
            </CardTitle>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ação ou usuário..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
                <SelectItem value="DOCUMENT">Documento</SelectItem>
                <SelectItem value="CONFIG">Configuração</SelectItem>
                <SelectItem value="CONTENT">Conteúdo</SelectItem>
                <SelectItem value="NAVIGATION">Navegação</SelectItem>
                <SelectItem value="RAG">RAG</SelectItem>
                <SelectItem value="EXPORT">Exportação</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
                <SelectItem value="VERSION">Versão</SelectItem>
                <SelectItem value="TAG">Tag</SelectItem>
                <SelectItem value="IMAGE">Imagem</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-9"
                placeholder="De:"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-9"
                placeholder="Até:"
              />
            </div>
          </div>

          {/* Logs Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Categoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Carregando logs...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.user_name || log.user_email}
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>
                        <Badge className={categoryColors[log.action_category] || "bg-gray-500/20"}>
                          {log.action_category}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            Mostrando {logs.length} registro(s)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
