import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Search, 
  Download, 
  ChevronDown, 
  LogIn, 
  LogOut, 
  Trash2, 
  Settings, 
  FileText, 
  Upload, 
  Database, 
  GitBranch, 
  Tag, 
  Image,
  Loader2,
  ClipboardList
} from "lucide-react";
import { exportData } from "@/lib/export-utils";
import { toast } from "sonner";

const CATEGORY_CONFIG: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  LOGIN: { color: "bg-green-500", icon: LogIn },
  LOGOUT: { color: "bg-gray-500", icon: LogOut },
  DELETE: { color: "bg-red-500", icon: Trash2 },
  CONFIG: { color: "bg-blue-500", icon: Settings },
  CONTENT: { color: "bg-purple-500", icon: FileText },
  DOCUMENT: { color: "bg-amber-500", icon: Upload },
  RAG: { color: "bg-cyan-500", icon: Database },
  EXPORT: { color: "bg-indigo-500", icon: Download },
  VERSION: { color: "bg-pink-500", icon: GitBranch },
  TAG: { color: "bg-orange-500", icon: Tag },
  IMAGE: { color: "bg-emerald-500", icon: Image },
  NAVIGATION: { color: "bg-slate-500", icon: ClipboardList },
};

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "all", label: "Todos" },
];

export const ActivityLogsTab = () => {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("7days");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const getDateFilter = () => {
    const now = new Date();
    switch (periodFilter) {
      case "today":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case "7days":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "30days":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return null;
    }
  };

  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity-logs", categoryFilter, periodFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("user_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (categoryFilter !== "all") {
        query = query.eq("action_category", categoryFilter);
      }

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte("created_at", dateFilter);
      }

      if (searchQuery) {
        query = query.or(`action.ilike.%${searchQuery}%,user_email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleExportCSV = async () => {
    if (!logs || logs.length === 0) {
      toast.error("Nenhum log para exportar");
      return;
    }

    const exportLogs = logs.map(log => ({
      "Data/Hora": format(new Date(log.created_at!), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
      "Usuário": log.user_email,
      "Categoria": log.action_category,
      "Ação": log.action,
      "Detalhes": JSON.stringify(log.details),
      "Browser": log.user_agent?.substring(0, 50) || "-",
    }));

    await exportData({
      filename: "activity-logs",
      data: exportLogs,
      format: "csv",
    });

    toast.success("Logs exportados com sucesso");
  };

  const getCategoryBadge = (category: string) => {
    const config = CATEGORY_CONFIG[category] || { color: "bg-gray-400", icon: ClipboardList };
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white gap-1`}>
        <Icon className="w-3 h-3" />
        {category}
      </Badge>
    );
  };

  const categories = Object.keys(CATEGORY_CONFIG);

  return (
    <div className="space-y-6">
      <AdminTitleWithInfo
        title="Log de Atividades"
        level="h1"
        tooltipText="Histórico de ações administrativas"
        infoContent="Visualize e audite todas as ações dos administradores incluindo logins, exclusões, configurações e uploads de documentos."
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
            </div>

            <Button variant="outline" onClick={handleExportCSV} disabled={!logs?.length}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : logs && logs.length > 0 ? (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Data/Hora</TableHead>
                      <TableHead className="w-[200px]">Usuário</TableHead>
                      <TableHead className="w-[120px]">Categoria</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <Collapsible key={log.id} asChild open={expandedRows.has(log.id)}>
                        <>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(log.id)}>
                            <TableCell className="font-mono text-xs">
                              {format(new Date(log.created_at!), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-sm truncate max-w-[200px]" title={log.user_email}>
                              {log.user_email}
                            </TableCell>
                            <TableCell>{getCategoryBadge(log.action_category)}</TableCell>
                            <TableCell className="text-sm">{log.action}</TableCell>
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedRows.has(log.id) ? 'rotate-180' : ''}`} />
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={5} className="p-4">
                                <div className="space-y-2 text-sm">
                                  {log.details && Object.keys(log.details as object).length > 0 && (
                                    <div>
                                      <span className="font-semibold text-muted-foreground">Detalhes:</span>
                                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-[200px]">
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.user_agent && (
                                    <div>
                                      <span className="font-semibold text-muted-foreground">Browser: </span>
                                      <span className="text-xs text-muted-foreground">{log.user_agent}</span>
                                    </div>
                                  )}
                                  {log.ip_address && (
                                    <div>
                                      <span className="font-semibold text-muted-foreground">IP: </span>
                                      <span className="text-xs">{log.ip_address}</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                Total: {logs.length} log(s) encontrado(s)
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum log encontrado para os filtros selecionados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
