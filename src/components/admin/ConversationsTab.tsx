import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MessageSquare, Smile, Frown, Meh, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  id: string;
  session_id: string;
  title: string;
  messages: any[];
  created_at: string;
  sentiment_label: string | null;
  sentiment_score: number | null;
}

export const ConversationsTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", searchTerm, sentimentFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("conversation_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,messages::text.ilike.%${searchTerm}%`);
      }

      if (sentimentFilter !== "all") {
        query = query.eq("sentiment_label", sentimentFilter);
      }

      if (dateFrom) {
        query = query.gte("created_at", new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endDate.toISOString());
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Conversation[];
    },
    staleTime: 30 * 1000,
  });

  const getSentimentIcon = (label: string | null) => {
    switch (label) {
      case "positive":
        return <Smile className="w-5 h-5 text-green-500" />;
      case "negative":
        return <Frown className="w-5 h-5 text-red-500" />;
      default:
        return <Meh className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getSentimentText = (label: string | null) => {
    switch (label) {
      case "positive":
        return "Positivo";
      case "negative":
        return "Negativo";
      default:
        return "Neutro";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Histórico de Conversas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="Data inicial"
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="Data final"
                  className="flex-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={sentimentFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSentimentFilter("all")}
                  className="flex-1"
                >
                  Todos
                </Button>
                <Button
                  variant={sentimentFilter === "positive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSentimentFilter("positive")}
                  className="flex-1"
                >
                  <Smile className="w-4 h-4" />
                </Button>
                <Button
                  variant={sentimentFilter === "neutral" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSentimentFilter("neutral")}
                  className="flex-1"
                >
                  <Meh className="w-4 h-4" />
                </Button>
                <Button
                  variant={sentimentFilter === "negative" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSentimentFilter("negative")}
                  className="flex-1"
                >
                  <Frown className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Conversations List */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma conversa encontrada
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <Card
                    key={conv.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            <span className="font-medium">{conv.title}</span>
                            {getSentimentIcon(conv.sentiment_label)}
                            <span className="text-sm text-muted-foreground">
                              {getSentimentText(conv.sentiment_label)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(conv.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                            <span>{conv.messages?.length || 0} mensagens</span>
                            {conv.sentiment_score && (
                              <span>Score: {conv.sentiment_score}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversation Detail Dialog */}
      <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedConversation && getSentimentIcon(selectedConversation.sentiment_label)}
              {selectedConversation?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedConversation && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {format(new Date(selectedConversation.created_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </div>
              <div className="space-y-3">
                {selectedConversation.messages?.map((msg: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary/10 ml-8"
                        : "bg-secondary/10 mr-8"
                    }`}
                  >
                    <div className="text-xs font-medium mb-1">
                      {msg.role === "user" ? "Usuário" : "KnowYOU"}
                    </div>
                    <div className="text-sm">{msg.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};