import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const ConversationsTab = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [chatTypeFilter, setChatTypeFilter] = useState<"all" | "health" | "study">("all");
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from("conversation_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return;
    }

    setConversations(data || []);
  };

  const deleteConversation = async (id: string) => {
    const { error } = await supabase
      .from("conversation_history")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao deletar conversa");
      return;
    }

    toast.success("Conversa deletada com sucesso");
    fetchConversations();
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.session_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = chatTypeFilter === "all" || 
      (conv.chat_type || 'health') === chatTypeFilter;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Conversas Salvas</CardTitle>
          <CardDescription>
            Visualize e gerencie o histórico de conversas dos usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar por título ou ID da sessão..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={chatTypeFilter} onValueChange={(value: any) => setChatTypeFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de chat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="health">Saúde</SelectItem>
                <SelectItem value="study">Estudo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {filteredConversations.map((conv) => (
                <Card
                  key={conv.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setSelectedConversation(conv)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-semibold">{conv.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(conv.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant={(conv.chat_type || 'health') === 'study' ? 'default' : 'secondary'}>
                          {(conv.chat_type || 'health') === 'study' ? '📚 Estudo' : '🏥 Saúde'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span>{conv.messages?.length || 0} mensagens</span>
                      {conv.sentiment_label && (
                        <Badge variant="outline">
                          {conv.sentiment_label === 'positive' ? '😊' : 
                           conv.sentiment_label === 'negative' ? '😟' : '😐'}
                          {' '}{conv.sentiment_label}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {selectedConversation && (
            <div className="mt-6 p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">{selectedConversation.title}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                >
                  Fechar
                </Button>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {selectedConversation.messages?.map((msg: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        msg.role === 'user' ? 'bg-primary/10' : 'bg-secondary/10'
                      }`}
                    >
                      <p className="text-xs font-medium mb-1">
                        {msg.role === 'user' ? 'Usuário' : 'Assistente'}
                      </p>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};