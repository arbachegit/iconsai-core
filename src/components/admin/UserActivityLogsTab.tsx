/**
 * UserActivityLogsTab - View User Activity Logs
 * @version 1.0.0
 * @date 2026-01-28
 *
 * Admin component for viewing:
 * - User sessions and conversations
 * - Keywords extracted (user + AI)
 * - Emotional state (F0 analysis)
 * - Activity timeline
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Activity, Search, Loader2, Calendar, Clock, MessageSquare,
  ChevronDown, ChevronRight, User, Hash, Smile, Frown, Meh,
  TrendingUp, Volume2, Eye
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlatformUser {
  id: string;
  full_name: string;
  email: string;
}

interface Session {
  id: string;
  device_id: string;
  user_id: string | null;
  module_slug: string;
  started_at: string;
  ended_at: string | null;
  last_activity_at: string;
  total_messages: number;
  total_duration_seconds: number;
  is_active: boolean;
  summary_keywords: string[];
  conversations?: Conversation[];
}

interface Conversation {
  id: string;
  session_id: string;
  module_slug: string;
  question: string;
  response: string;
  asked_at: string;
  keywords_user: string[];
  keywords_ai: string[];
  intonation_user: {
    f0_mean?: number;
    f0_range_hz?: number;
    contour?: string;
    emotion?: string;
    confidence?: number;
  } | null;
  question_duration_seconds: number | null;
  response_duration_seconds: number | null;
  platform_user_id: string | null;
}

interface ActivityLog {
  userId: string;
  userName: string;
  userEmail: string;
  sessions: Session[];
  totalMessages: number;
  totalDuration: number;
  lastActivity: string;
  emotionSummary: Record<string, number>;
}

const moduleLabels: Record<string, string> = {
  home: "HOME",
  world: "Mundo",
  health: "Saúde",
  ideas: "Ideias",
};

const emotionIcons: Record<string, React.ReactNode> = {
  happy: <Smile className="h-4 w-4 text-green-500" />,
  sad: <Frown className="h-4 w-4 text-blue-500" />,
  neutral: <Meh className="h-4 w-4 text-gray-500" />,
  angry: <Frown className="h-4 w-4 text-red-500" />,
  fearful: <Frown className="h-4 w-4 text-purple-500" />,
  surprised: <Smile className="h-4 w-4 text-yellow-500" />,
  bored: <Meh className="h-4 w-4 text-gray-400" />,
};

const emotionColors: Record<string, string> = {
  happy: "bg-green-500/10 text-green-500",
  sad: "bg-blue-500/10 text-blue-500",
  neutral: "bg-gray-500/10 text-gray-500",
  angry: "bg-red-500/10 text-red-500",
  fearful: "bg-purple-500/10 text-purple-500",
  surprised: "bg-yellow-500/10 text-yellow-500",
  bored: "bg-gray-400/10 text-gray-400",
};

export default function UserActivityLogsTab() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [conversationDetailOpen, setConversationDetailOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
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

  // Fetch users of the institution
  const fetchUsers = useCallback(async (institutionId: string) => {
    const { data, error } = await supabase
      .from("platform_users")
      .select("id, full_name, email")
      .eq("institution_id", institutionId)
      .order("full_name");

    if (error) throw error;
    setUsers(data || []);
    return data || [];
  }, []);

  // Fetch activity logs
  const fetchActivityLogs = useCallback(async (institutionId: string, usersList: PlatformUser[]) => {
    // Build query for conversations
    let query = supabase
      .from("pwa_conversations")
      .select(`
        *,
        session:pwa_sessions(*)
      `)
      .eq("institution_id", institutionId);

    if (selectedUser !== "all") {
      query = query.eq("platform_user_id", selectedUser);
    }

    if (selectedModule !== "all") {
      query = query.eq("module_slug", selectedModule);
    }

    if (dateRange.from) {
      query = query.gte("asked_at", dateRange.from);
    }

    if (dateRange.to) {
      query = query.lte("asked_at", dateRange.to + "T23:59:59");
    }

    const { data: conversations, error } = await query.order("asked_at", { ascending: false }).limit(500);

    if (error) throw error;

    // Group by user
    const userMap = new Map<string, ActivityLog>();

    conversations?.forEach((conv) => {
      const userId = conv.platform_user_id || "anonymous";
      const user = usersList.find((u) => u.id === userId);

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName: user?.full_name || "Anônimo",
          userEmail: user?.email || "-",
          sessions: [],
          totalMessages: 0,
          totalDuration: 0,
          lastActivity: conv.asked_at,
          emotionSummary: {},
        });
      }

      const log = userMap.get(userId)!;
      log.totalMessages++;

      if (conv.question_duration_seconds) {
        log.totalDuration += conv.question_duration_seconds;
      }

      // Track emotions
      const emotion = conv.intonation_user?.emotion;
      if (emotion) {
        log.emotionSummary[emotion] = (log.emotionSummary[emotion] || 0) + 1;
      }

      // Add to sessions
      const sessionId = conv.session_id;
      let session = log.sessions.find((s) => s.id === sessionId);
      if (!session && conv.session) {
        session = {
          ...conv.session,
          conversations: [],
        };
        log.sessions.push(session);
      }
      if (session) {
        session.conversations = session.conversations || [];
        session.conversations.push(conv);
      }
    });

    // Sort sessions by date
    userMap.forEach((log) => {
      log.sessions.sort((a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
      log.sessions.forEach((s) => {
        s.conversations?.sort((a, b) =>
          new Date(a.asked_at).getTime() - new Date(b.asked_at).getTime()
        );
      });
    });

    // Convert to array and sort by last activity
    const logs = Array.from(userMap.values()).sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );

    setActivityLogs(logs);
  }, [selectedUser, selectedModule, dateRange]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const institutionId = await fetchCurrentUser();
        if (institutionId) {
          const usersList = await fetchUsers(institutionId);
          await fetchActivityLogs(institutionId, usersList);
        }
      } catch (err) {
        console.error("[UserActivityLogsTab] Error:", err);
        toast.error("Erro ao carregar logs");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetchCurrentUser, fetchUsers, fetchActivityLogs]);

  // Reload when filters change
  useEffect(() => {
    if (currentInstitutionId && users.length > 0) {
      fetchActivityLogs(currentInstitutionId, users);
    }
  }, [selectedUser, selectedModule, dateRange, currentInstitutionId, users, fetchActivityLogs]);

  // Toggle user expansion
  const toggleUser = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  // Toggle session expansion
  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  // View conversation detail
  const viewConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setConversationDetailOpen(true);
  };

  // Filter logs by search
  const filteredLogs = activityLogs.filter(
    (log) =>
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
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
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Logs de Atividade</CardTitle>
          </div>
          <CardDescription>
            Visualize as conversas, palavras-chave e estado emocional dos usuários.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-[180px]">
              <Label className="text-xs text-muted-foreground">Usuário</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px]">
              <Label className="text-xs text-muted-foreground">Módulo</Label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="home">HOME</SelectItem>
                  <SelectItem value="world">Mundo</SelectItem>
                  <SelectItem value="health">Saúde</SelectItem>
                  <SelectItem value="ideas">Ideias</SelectItem>
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
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs */}
      <div className="space-y-4">
        {filteredLogs.map((log) => (
          <Card key={log.userId}>
            <Collapsible
              open={expandedUsers.has(log.userId)}
              onOpenChange={() => toggleUser(log.userId)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {expandedUsers.has(log.userId) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {log.userName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {log.userEmail}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Emotion Summary */}
                      <div className="flex items-center gap-2">
                        {Object.entries(log.emotionSummary)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([emotion, count]) => (
                            <Badge
                              key={emotion}
                              className={emotionColors[emotion]}
                            >
                              {emotionIcons[emotion]}
                              <span className="ml-1">{count}</span>
                            </Badge>
                          ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span>{log.totalMessages}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDuration(log.totalDuration)}</span>
                        </div>
                        <div className="text-muted-foreground">
                          {formatDistanceToNow(new Date(log.lastActivity), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  {/* Sessions */}
                  <div className="space-y-4 ml-6">
                    {log.sessions.map((session) => (
                      <div key={session.id} className="border rounded-lg">
                        <Collapsible
                          open={expandedSessions.has(session.id)}
                          onOpenChange={() => toggleSession(session.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {expandedSessions.has(session.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  <Badge variant="outline">
                                    {moduleLabels[session.module_slug] || session.module_slug}
                                  </Badge>
                                  <span className="text-sm">
                                    {format(new Date(session.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </span>
                                  {session.is_active && (
                                    <Badge className="bg-green-500/10 text-green-500">
                                      Ativa
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>{session.conversations?.length || 0} mensagens</span>
                                  {session.summary_keywords?.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Hash className="h-3 w-3" />
                                      {session.summary_keywords.slice(0, 3).join(", ")}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="border-t">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-24">Hora</TableHead>
                                    <TableHead>Pergunta</TableHead>
                                    <TableHead className="w-32">Keywords</TableHead>
                                    <TableHead className="w-24">Emoção</TableHead>
                                    <TableHead className="w-16">Ver</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {session.conversations?.map((conv) => (
                                    <TableRow key={conv.id}>
                                      <TableCell className="text-sm">
                                        {format(new Date(conv.asked_at), "HH:mm:ss")}
                                      </TableCell>
                                      <TableCell>
                                        <div className="max-w-md truncate text-sm">
                                          {conv.question}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                          {conv.keywords_user?.slice(0, 2).map((kw, i) => (
                                            <Badge
                                              key={i}
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              {kw}
                                            </Badge>
                                          ))}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        {conv.intonation_user?.emotion && (
                                          <Badge
                                            className={emotionColors[conv.intonation_user.emotion]}
                                          >
                                            {emotionIcons[conv.intonation_user.emotion]}
                                            <span className="ml-1 capitalize">
                                              {conv.intonation_user.emotion}
                                            </span>
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => viewConversation(conv)}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        {filteredLogs.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhuma atividade encontrada com os filtros selecionados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Conversation Detail Dialog */}
      <Dialog open={conversationDetailOpen} onOpenChange={setConversationDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Detalhes da Conversa
            </DialogTitle>
            <DialogDescription>
              {selectedConversation && format(
                new Date(selectedConversation.asked_at),
                "dd/MM/yyyy 'às' HH:mm:ss",
                { locale: ptBR }
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedConversation && (
            <div className="space-y-6 py-4">
              {/* Question */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Pergunta do Usuário</Label>
                <div className="p-4 bg-muted rounded-lg">
                  <p>{selectedConversation.question}</p>
                </div>
                {selectedConversation.keywords_user?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    {selectedConversation.keywords_user.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Response */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Resposta da IA</Label>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p>{selectedConversation.response}</p>
                </div>
                {selectedConversation.keywords_ai?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    {selectedConversation.keywords_ai.map((kw, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Voice Analysis */}
              {selectedConversation.intonation_user && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Análise de Voz
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedConversation.intonation_user.emotion && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-xs text-muted-foreground mb-1">Emoção</div>
                        <Badge className={emotionColors[selectedConversation.intonation_user.emotion]}>
                          {emotionIcons[selectedConversation.intonation_user.emotion]}
                          <span className="ml-1 capitalize">
                            {selectedConversation.intonation_user.emotion}
                          </span>
                        </Badge>
                        {selectedConversation.intonation_user.confidence && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {Math.round(selectedConversation.intonation_user.confidence * 100)}% confiança
                          </div>
                        )}
                      </div>
                    )}
                    {selectedConversation.intonation_user.f0_mean && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-xs text-muted-foreground mb-1">F0 Média</div>
                        <div className="text-lg font-medium">
                          {Math.round(selectedConversation.intonation_user.f0_mean)} Hz
                        </div>
                      </div>
                    )}
                    {selectedConversation.intonation_user.f0_range_hz && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-xs text-muted-foreground mb-1">F0 Range</div>
                        <div className="text-lg font-medium">
                          {Math.round(selectedConversation.intonation_user.f0_range_hz)} Hz
                        </div>
                      </div>
                    )}
                    {selectedConversation.intonation_user.contour && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-xs text-muted-foreground mb-1">Contorno</div>
                        <div className="flex items-center justify-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span className="capitalize">
                            {selectedConversation.intonation_user.contour}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Duration */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {selectedConversation.question_duration_seconds && (
                  <span>Pergunta: {formatDuration(selectedConversation.question_duration_seconds)}</span>
                )}
                {selectedConversation.response_duration_seconds && (
                  <span>Resposta: {formatDuration(selectedConversation.response_duration_seconds)}</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
