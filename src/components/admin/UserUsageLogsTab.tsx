import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, Download, Search, ChevronDown, MessageSquare, Volume2, GraduationCap, Heart, Clock } from "lucide-react";
import { format, subDays, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { exportData } from "@/lib/export-utils";

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "all", label: "Todo o período" },
];

const CHAT_TYPE_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  study: { color: "bg-blue-500", icon: GraduationCap, label: "Estudo" },
  health: { color: "bg-emerald-500", icon: Heart, label: "Saúde" },
};

export const UserUsageLogsTab = () => {
  const [chatFilter, setChatFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("7days");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const getDateFilter = () => {
    switch (periodFilter) {
      case "today":
        return subHours(new Date(), 24).toISOString();
      case "7days":
        return subDays(new Date(), 7).toISOString();
      case "30days":
        return subDays(new Date(), 30).toISOString();
      default:
        return null;
    }
  };

  // Fetch chat analytics with conversation history
  const { data: usageLogs, isLoading } = useQuery({
    queryKey: ["user-usage-logs", chatFilter, periodFilter, searchQuery],
    queryFn: async () => {
      // Fetch chat analytics
      let analyticsQuery = supabase
        .from("chat_analytics")
        .select("*")
        .order("started_at", { ascending: false });

      const dateFilter = getDateFilter();
      if (dateFilter) {
        analyticsQuery = analyticsQuery.gte("started_at", dateFilter);
      }

      if (searchQuery) {
        analyticsQuery = analyticsQuery.ilike("user_name", `%${searchQuery}%`);
      }

      const { data: analytics, error: analyticsError } = await analyticsQuery;
      if (analyticsError) throw analyticsError;

      // Fetch conversation history to enrich data
      let conversationsQuery = supabase
        .from("conversation_history")
        .select("session_id, chat_type, messages, title, created_at")
        .order("created_at", { ascending: false });

      if (chatFilter !== "all") {
        conversationsQuery = conversationsQuery.eq("chat_type", chatFilter);
      }

      if (dateFilter) {
        conversationsQuery = conversationsQuery.gte("created_at", dateFilter);
      }

      const { data: conversations, error: convError } = await conversationsQuery;
      if (convError) throw convError;

      // Merge data by session_id
      const conversationsMap = new Map(
        conversations?.map((c) => [c.session_id, c]) || []
      );

      const enrichedData = (analytics || []).map((a) => {
        const conv = conversationsMap.get(a.session_id);
        return {
          ...a,
          chat_type: conv?.chat_type || "unknown",
          messages: conv?.messages || [],
          conversation_title: conv?.title || "",
          first_message: Array.isArray(conv?.messages) && conv.messages.length > 0
            ? (conv.messages[0] as any)?.content?.substring(0, 100) || ""
            : "",
        };
      });

      // Apply chat filter
      if (chatFilter !== "all") {
        return enrichedData.filter((d) => d.chat_type === chatFilter);
      }

      return enrichedData;
    },
    staleTime: 30 * 1000,
  });

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExportCSV = () => {
    if (!usageLogs?.length) return;

    const csvData = usageLogs.map((log) => ({
      data_hora: format(new Date(log.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      usuario: log.user_name || "Anônimo",
      chat: log.chat_type,
      mensagens: log.message_count || 0,
      audios: log.audio_plays || 0,
      topicos: (log.topics || []).join(", "),
      ultima_interacao: log.last_interaction
        ? format(new Date(log.last_interaction), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "",
    }));

    exportData({ filename: "user-usage-logs", data: csvData, format: "csv" });
  };

  const getChatBadge = (chatType: string) => {
    const config = CHAT_TYPE_CONFIG[chatType];
    if (!config) {
      return <Badge variant="outline">{chatType}</Badge>;
    }
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Calculate totals
  const totals = usageLogs?.reduce(
    (acc, log) => ({
      sessions: acc.sessions + 1,
      messages: acc.messages + (log.message_count || 0),
      audios: acc.audios + (log.audio_plays || 0),
    }),
    { sessions: 0, messages: 0, audios: 0 }
  ) || { sessions: 0, messages: 0, audios: 0 };

  return (
    <div className="space-y-6">
      <AdminTitleWithInfo
        title="Log de Uso dos Usuários"
        level="h2"
        tooltipText="Histórico de interações dos visitantes"
        infoContent={
          <div className="space-y-2 text-sm">
            <p>Visualize como os usuários estão interagindo com os chats.</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Sessões de chat iniciadas</li>
              <li>Quantidade de mensagens trocadas</li>
              <li>Reproduções de áudio</li>
              <li>Tópicos discutidos</li>
            </ul>
          </div>
        }
        icon={Users}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={chatFilter} onValueChange={setChatFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Chat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Chats</SelectItem>
            <SelectItem value="study">Estudo</SelectItem>
            <SelectItem value="health">Saúde</SelectItem>
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome de usuário..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button variant="outline" onClick={handleExportCSV} disabled={!usageLogs?.length}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary">{totals.sessions}</div>
          <div className="text-sm text-muted-foreground">Sessões</div>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{totals.messages}</div>
          <div className="text-sm text-muted-foreground">Mensagens</div>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-emerald-500">{totals.audios}</div>
          <div className="text-sm text-muted-foreground">Áudios Reproduzidos</div>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="h-[500px] border rounded-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[140px]">Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead className="w-[100px]">Chat</TableHead>
              <TableHead className="w-[80px] text-center">Msgs</TableHead>
              <TableHead className="w-[80px] text-center">Áudios</TableHead>
              <TableHead>Tópicos</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : usageLogs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              usageLogs?.map((log) => (
                <Collapsible key={log.id} open={expandedRows.has(log.id)}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleRow(log.id)}
                  >
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.started_at), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{log.user_name || "Anônimo"}</TableCell>
                    <TableCell>{getChatBadge(log.chat_type)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <MessageSquare className="w-3 h-3 text-muted-foreground" />
                        {log.message_count || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Volume2 className="w-3 h-3 text-muted-foreground" />
                        {log.audio_plays || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(log.topics || []).slice(0, 3).map((topic: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                        {(log.topics || []).length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(log.topics || []).length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          expandedRows.has(log.id) ? "rotate-180" : ""
                        }`}
                      />
                    </TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={7} className="py-4">
                        <div className="space-y-3 px-4">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              Última interação:{" "}
                              {log.last_interaction
                                ? format(new Date(log.last_interaction), "dd/MM/yyyy HH:mm", {
                                    locale: ptBR,
                                  })
                                : "N/A"}
                            </div>
                          </div>
                          {log.first_message && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Primeira mensagem: </span>
                              <span className="italic">"{log.first_message}..."</span>
                            </div>
                          )}
                          {log.conversation_title && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Título da conversa: </span>
                              <span>{log.conversation_title}</span>
                            </div>
                          )}
                          {Array.isArray(log.messages) && log.messages.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm font-medium mb-2">
                                Mensagens ({log.messages.length}):
                              </div>
                              <ScrollArea className="h-[150px] border rounded p-2 bg-background">
                                <div className="space-y-2">
                                  {log.messages.map((msg: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className={`text-xs p-2 rounded ${
                                        msg.role === "user"
                                          ? "bg-primary/10 ml-4"
                                          : "bg-muted mr-4"
                                      }`}
                                    >
                                      <span className="font-medium">
                                        {msg.role === "user" ? "Usuário" : "Assistente"}:
                                      </span>{" "}
                                      {msg.content?.substring(0, 200)}
                                      {msg.content?.length > 200 && "..."}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Footer */}
      <div className="text-sm text-muted-foreground text-center">
        Total: {totals.sessions} sessões | {totals.messages} mensagens | {totals.audios} áudios reproduzidos
      </div>
    </div>
  );
};
