import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Mail,
  BarChart3,
  ArrowLeft,
  LogOut,
  MessagesSquare,
  Image,
  Youtube,
  BookOpen,
  Database,
  GitBranch,
  Tags,
  Search,
  ChevronDown,
  Zap,
  MessageCircle,
  Brain,
  Palette,
  Settings,
  Route,
  TestTube,
  Music,
  Shield,
  History,
  Users,
  Target,
  Cpu,
  Globe,
  Sparkles,
  Menu,
  PanelLeftClose,
  RefreshCw,
} from "lucide-react";

type TabType = "dashboard" | "chat" | "tooltips" | "gmail" | "analytics" | "conversations" | "images" | "youtube" | "documents" | "rag-metrics" | "version-control" | "tags" | "document-analysis" | "document-routing-logs" | "rag-diagnostics" | "chat-scope-config" | "rag-documentation" | "content-management" | "podcasts" | "activity-logs" | "user-usage-logs" | "tag-modification-logs" | "deterministic-analysis" | "architecture" | "regional-config" | "suggestion-audit" | "contact-messages" | "documentation-sync" | "ml-dashboard" | "maieutic-training";

interface AdminSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// Função para tocar som de notificação
const playNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
  oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.1); // C6
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};

export const AdminSidebar = ({ activeTab, onTabChange, isCollapsed, onToggleCollapse }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [pendingMessagesCount, setPendingMessagesCount] = useState(0);
  const previousCountRef = useRef(0);

  const fetchPendingMessages = useCallback(async () => {
    const { count } = await supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    
    const newCount = count || 0;
    
    // Tocar som apenas se houver nova mensagem (count aumentou)
    if (newCount > previousCountRef.current && previousCountRef.current > 0) {
      playNotificationSound();
      toast.info("Nova mensagem de contato recebida!", {
        description: "Clique em 'Mensagens Contato' para visualizar.",
      });
    }
    
    previousCountRef.current = newCount;
    setPendingMessagesCount(newCount);
  }, []);

  useEffect(() => {
    fetchPendingMessages();

    // Subscrição realtime para novas mensagens
    const channel = supabase
      .channel('contact-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_messages'
        },
        () => {
          playNotificationSound();
          toast.info("Nova mensagem de contato recebida!", {
            description: "Clique em 'Mensagens Contato' para visualizar.",
          });
          fetchPendingMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contact_messages'
        },
        () => {
          fetchPendingMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingMessages]);

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    navigate("/admin/login");
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const menuCategories = [
    {
      id: "quick-access",
      label: "Acesso Rápido",
      icon: Zap,
      items: [
        { id: "dashboard" as TabType, label: "Dashboard", icon: LayoutDashboard },
        { id: "documents" as TabType, label: "RAG Documentos", icon: FileText },
      ]
    },
    {
      id: "chat",
      label: "Chat & Conversas",
      icon: MessageCircle,
      items: [
        { id: "chat" as TabType, label: "Chat Config", icon: MessageSquare },
        { id: "maieutic-training" as TabType, label: "Treino IA Maiêutica", icon: Sparkles },
        { id: "chat-scope-config" as TabType, label: "Delimitações", icon: Settings },
        { id: "regional-config" as TabType, label: "Configurações Regionais", icon: Globe },
        { id: "conversations" as TabType, label: "Conversas", icon: MessagesSquare },
        { id: "deterministic-analysis" as TabType, label: "Fala Determinística", icon: Target },
        { id: "rag-diagnostics" as TabType, label: "Diagnóstico RAG", icon: TestTube },
      ]
    },
    {
      id: "rag",
      label: "RAG & Análise",
      icon: Brain,
      items: [
        { id: "rag-documentation" as TabType, label: "📖 Documentação RAG", icon: BookOpen },
        { id: "rag-metrics" as TabType, label: "Métricas RAG", icon: Database },
        { id: "tags" as TabType, label: "Gerenciar Tags", icon: Tags },
        { id: "document-analysis" as TabType, label: "Análise Documentos", icon: Search },
      ]
    },
    {
      id: "media",
      label: "Mídia & Conteúdo",
      icon: Palette,
      items: [
        { id: "content-management" as TabType, label: "Seções Landing Page", icon: FileText },
        { id: "podcasts" as TabType, label: "Podcasts", icon: Music },
        { id: "tooltips" as TabType, label: "Tooltips", icon: MessageCircle },
        { id: "images" as TabType, label: "Cache de Imagens", icon: Image },
        { id: "youtube" as TabType, label: "Inserir Vídeos", icon: Youtube },
      ]
    },
    {
      id: "audit",
      label: "Auditoria",
      icon: Shield,
      items: [
        { id: "activity-logs" as TabType, label: "Log de Atividades (admin)", icon: History },
        { id: "user-usage-logs" as TabType, label: "Log de Uso (Usuários)", icon: Users },
        { id: "document-routing-logs" as TabType, label: "Logs de Roteamento", icon: Route },
        { id: "tag-modification-logs" as TabType, label: "Logs de Mescla Tags", icon: Tags },
        { id: "suggestion-audit" as TabType, label: "Auditoria Sugestões", icon: Sparkles },
        { id: "ml-dashboard" as TabType, label: "Machine Learning ML", icon: Brain },
        { id: "version-control" as TabType, label: "Versionamento", icon: GitBranch },
        { id: "contact-messages" as TabType, label: "Mensagens Contato", icon: MessageSquare },
        { id: "documentation-sync" as TabType, label: "Sincronizar Docs", icon: RefreshCw },
      ]
    },
    {
      id: "system",
      label: "Sistema",
      icon: Settings,
      items: [
        { id: "architecture" as TabType, label: "Arquitetura", icon: Cpu },
        { id: "gmail" as TabType, label: "Gmail", icon: Mail },
        { id: "analytics" as TabType, label: "Analytics", icon: BarChart3 },
      ]
    }
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <>
        <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-card border-r border-primary/20 flex flex-col h-screen transition-all duration-300`}>
        <div className={`${isCollapsed ? 'p-3' : 'p-6'} border-b border-primary/20 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <h1 className="text-xl font-bold text-gradient whitespace-nowrap">Admin Panel</h1>
              <p className="text-sm text-muted-foreground mt-1 whitespace-nowrap">KnowYOU</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="shrink-0"
            >
              <Menu className={`w-5 h-5 transition-transform duration-300 ease-in-out ${isCollapsed ? 'rotate-90' : 'rotate-0'}`} />
            </Button>
          </div>

          <nav className={`flex-1 ${isCollapsed ? 'p-2' : 'p-4'} pb-44 space-y-1 overflow-y-auto`}>
            {menuCategories.map((category, index) => (
              <div key={category.id}>
                {index > 0 && <Separator className="my-2 bg-primary/10" />}
                
                {isCollapsed ? (
                  // Modo colapsado: mostrar apenas ícones com tooltip
                  <div className="space-y-1">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      const showBadge = item.id === "contact-messages" && pendingMessagesCount > 0;

                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={isActive ? "default" : "ghost"}
                              size="icon"
                              className={`w-full ${isActive ? "bg-gradient-primary" : ""} relative`}
                              onClick={() => onTabChange(item.id)}
                            >
                              <Icon className="w-4 h-4" />
                              {showBadge && (
                                <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground rounded-full px-1">
                                  {pendingMessagesCount}
                                </span>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="font-medium">
                            {item.id === "activity-logs" ? (
                              <div>
                                <span className="font-bold">Log de Atividades</span>
                                <br />
                                <span className="text-xs text-muted-foreground">(admin)</span>
                              </div>
                            ) : (
                              item.label
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ) : (
                  // Modo expandido: mostrar menu completo
                  <Collapsible 
                    open={openSections.includes(category.id)}
                    onOpenChange={() => toggleSection(category.id)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors">
                      <div className="flex items-center gap-2">
                        <category.icon className="w-3 h-3" />
                        {category.label}
                      </div>
                      <ChevronDown className={`w-3 h-3 transition-transform ${openSections.includes(category.id) ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-1 mt-1">
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        const showBadge = item.id === "contact-messages" && pendingMessagesCount > 0;

                        return (
                          <Button
                            key={item.id}
                            variant={isActive ? "default" : "ghost"}
                            className={`w-full justify-start gap-3 ${isActive ? "bg-gradient-primary" : ""}`}
                            onClick={() => onTabChange(item.id)}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="transition-opacity duration-300 ease-in-out">
                              {item.label}
                            </span>
                            {showBadge && (
                              <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1.5">
                                {pendingMessagesCount}
                              </Badge>
                            )}
                          </Button>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ))}
          </nav>
        </aside>

        <div className={`fixed bottom-0 left-0 ${isCollapsed ? 'w-16' : 'w-64'} p-${isCollapsed ? '2' : '4'} border-t border-primary/20 bg-card space-y-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20 transition-all duration-300`}>
          {isCollapsed ? (
            // Modo colapsado: apenas ícones
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full"
                    onClick={() => navigate("/docs")}
                  >
                    <BookOpen className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Documentação</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full text-primary"
                    onClick={() => navigate("/")}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Voltar ao APP</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            </>
          ) : (
            // Modo expandido: botões completos
            <>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => navigate("/docs")}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="transition-opacity duration-300 ease-in-out">Documentação</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-primary hover:!text-black"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="transition-opacity duration-300 ease-in-out">Voltar ao APP</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="transition-opacity duration-300 ease-in-out">Sair</span>
              </Button>
            </>
          )}
        </div>
      </>
    </TooltipProvider>
  );
};
