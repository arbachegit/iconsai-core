import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { MessageSquare, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  id: string;
  session_id: string;
  title: string;
  messages: any;
  created_at: string;
  updated_at: string;
}

interface ConversationHistoryProps {
  onLoadConversation: (sessionId: string, messages: any[]) => void;
  currentSessionId: string;
}

export const ConversationHistory = ({ 
  onLoadConversation, 
  currentSessionId 
}: ConversationHistoryProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("conversation_history")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast({
        title: "Erro ao carregar conversas",
        description: "Não foi possível carregar o histórico de conversas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      setDeletingId(id);
      const { error } = await supabase
        .from("conversation_history")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setConversations(prev => prev.filter(conv => conv.id !== id));
      toast({
        title: "Conversa excluída",
        description: "A conversa foi removida do histórico.",
      });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a conversa.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoad = (conversation: Conversation) => {
    const messages = Array.isArray(conversation.messages) 
      ? conversation.messages 
      : [];
    onLoadConversation(conversation.session_id, messages);
    toast({
      title: "Conversa carregada",
      description: `"${conversation.title}" foi carregada.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <MessageSquare className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">
          Nenhuma conversa salva ainda
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          As conversas serão salvas automaticamente
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        {conversations.map((conversation) => {
          const isActive = conversation.session_id === currentSessionId;
          const messages = Array.isArray(conversation.messages) 
            ? conversation.messages 
            : [];
          const messageCount = messages.length;
          
          return (
            <div
              key={conversation.id}
              className={`group relative p-3 rounded-lg border transition-all cursor-pointer hover:border-primary/50 hover:bg-accent/5 ${
                isActive 
                  ? "border-primary bg-primary/5" 
                  : "border-border bg-card"
              }`}
              onClick={() => !isActive && handleLoad(conversation)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground truncate mb-1">
                    {conversation.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{messageCount} mensagens</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(conversation.updated_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => handleDelete(conversation.id, e)}
                  disabled={deletingId === conversation.id}
                >
                  {deletingId === conversation.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 text-destructive" />
                  )}
                </Button>
              </div>
              
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
