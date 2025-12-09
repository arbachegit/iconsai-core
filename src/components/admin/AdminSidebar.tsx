import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import knowyouAdminLogo from "@/assets/knowyou-admin-logo.png";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Mail,
  BarChart3,
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
  ChevronUp,
  Zap,
  MessageCircle,
  Brain,
  Palette,
  Settings,
  Route,
  TestTube,
  Music,
  Shield,
  ShieldCheck,
  History,
  Users,
  Target,
  Cpu,
  Globe,
  Sparkles,
  Menu,
  Monitor,
  RefreshCw,
  Bell,
} from "lucide-react";

type TabType = "dashboard" | "chat" | "tooltips" | "gmail" | "analytics" | "conversations" | "images" | "youtube" | "documents" | "rag-metrics" | "version-control" | "tags" | "document-analysis" | "document-routing-logs" | "rag-diagnostics" | "chat-scope-config" | "rag-documentation" | "content-management" | "podcasts" | "activity-logs" | "user-usage-logs" | "tag-modification-logs" | "deterministic-analysis" | "architecture" | "regional-config" | "suggestion-audit" | "contact-messages" | "documentation-sync" | "ml-dashboard" | "maieutic-training" | "taxonomy-ml-audit" | "manage-taxonomy" | "security-integrity" | "notification-settings";

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
  const { t } = useTranslation();
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [pendingMessagesCount, setPendingMessagesCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const previousCountRef = useRef(0);
  const navRef = useRef<HTMLElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isControlCenterCollapsed, setIsControlCenterCollapsed] = useState(false);

  // Check scroll position to show/hide fade indicators
  const handleNavScroll = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    
    const { scrollTop, scrollHeight, clientHeight } = nav;
    setCanScrollUp(scrollTop > 10);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 10);
  }, []);


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
        { id: "manage-taxonomy" as TabType, label: "Gerenciar Taxonomia", icon: Settings },
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
        { id: "security-integrity" as TabType, label: "Segurança & Integridade", icon: ShieldCheck },
        { id: "activity-logs" as TabType, label: "Log de Atividades (admin)", icon: History },
        { id: "user-usage-logs" as TabType, label: "Log de Uso (Usuários)", icon: Users },
        { id: "document-routing-logs" as TabType, label: "Logs de Roteamento", icon: Route },
        { id: "tag-modification-logs" as TabType, label: "Logs de Mescla Tags", icon: Tags },
        { id: "suggestion-audit" as TabType, label: "Auditoria Sugestões", icon: Sparkles },
        { id: "ml-dashboard" as TabType, label: "Machine Learning ML", icon: Brain },
        { id: "taxonomy-ml-audit" as TabType, label: "Taxonomy ML", icon: Target },
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
        { id: "notification-settings" as TabType, label: "Notificação", icon: Bell },
        { id: "architecture" as TabType, label: "Arquitetura", icon: Cpu },
        { id: "gmail" as TabType, label: "Gmail", icon: Mail },
        { id: "analytics" as TabType, label: "Analytics", icon: BarChart3 },
      ]
    }
  ];

  // Filter menu categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return menuCategories;
    
    const query = searchQuery.toLowerCase();
    
    return menuCategories
      .map(category => ({
        ...category,
        items: category.items.filter(item => 
          item.label.toLowerCase().includes(query) ||
          category.label.toLowerCase().includes(query)
        )
      }))
      .filter(category => category.items.length > 0);
  }, [searchQuery]);

  // Initial check and resize observer for scroll indicators
  useEffect(() => {
    handleNavScroll();
    const nav = navRef.current;
    if (!nav) return;

    const resizeObserver = new ResizeObserver(handleNavScroll);
    resizeObserver.observe(nav);
    
    return () => resizeObserver.disconnect();
  }, [handleNavScroll, filteredCategories]);

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={`
          ${isCollapsed ? 'w-[72px]' : 'w-[280px]'} 
          bg-sidebar border-r border-border 
          fixed left-0 top-0 h-screen z-50 
          flex flex-col overflow-hidden 
          transition-all duration-300 ease-in-out
        `}
      >
        {/* TOP HEADER: Hamburger + Logo (Gemini-style) */}
        <div className="h-14 px-3 border-b border-border flex items-center gap-3 shrink-0">
          {/* Hamburger Menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="shrink-0 h-10 w-10 rounded-full hover:bg-muted/50"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo + Text - hidden when collapsed */}
          {!isCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <img 
                src={knowyouAdminLogo} 
                alt="KnowYOU" 
                className="h-8 w-8 rounded-full object-cover shrink-0"
              />
              <span className="text-lg font-semibold text-foreground whitespace-nowrap">
                KnowYOU
              </span>
            </div>
          )}
        </div>

        {/* Search Input - below header */}
        <div className={`px-3 py-2 border-b border-border shrink-0 ${isCollapsed ? 'flex justify-center' : ''}`}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-muted/50"
                  onClick={() => {
                    onToggleCollapse();
                    setTimeout(() => {
                      const searchInput = document.querySelector('input[placeholder="Buscar..."]') as HTMLInputElement;
                      searchInput?.focus();
                    }, 350);
                  }}
                >
                  <Search className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Buscar</TooltipContent>
            </Tooltip>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-sm bg-muted/30 border-border rounded-full focus:border-primary/50"
              />
            </div>
          )}
        </div>

        {/* Top fade indicator */}
        <div 
          className={`absolute top-[116px] left-0 right-0 h-6 bg-gradient-to-b from-sidebar to-transparent z-10 pointer-events-none transition-opacity duration-200 ${canScrollUp ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* MIDDLE NAVIGATION - Scrollable with margin-bottom for dock */}
        <nav 
          ref={navRef}
          onScroll={handleNavScroll}
          className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'} py-2 mb-[140px] space-y-1`}
        >
          {filteredCategories.map((category, index) => (
            <div key={category.id}>
              {index > 0 && <Separator className="my-2 bg-border/50" />}
              
              {isCollapsed ? (
                // Collapsed mode: icons only with tooltips
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
                            className={`w-full h-10 rounded-lg ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"} relative`}
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
                // Expanded mode: full menu with collapsible sections
                <Collapsible 
                  open={openSections.includes(category.id)}
                  onOpenChange={() => toggleSection(category.id)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <category.icon className="w-3.5 h-3.5" />
                      {category.label}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${openSections.includes(category.id) ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-0.5 mt-1">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      const showBadge = item.id === "contact-messages" && pendingMessagesCount > 0;

                      return (
                        <Button
                          key={item.id}
                          variant={isActive ? "default" : "ghost"}
                          className={`w-full justify-start gap-3 h-9 rounded-lg ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}
                          onClick={() => onTabChange(item.id)}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
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

        {/* BOTTOM DOCK - Control Center (Gemini-style fixed footer) */}
        <div className="absolute bottom-0 left-0 w-full bg-[#0B1120] border-t border-white/10 p-2 transition-all duration-200">
          {/* Chevron Toggle - Only visible when sidebar is expanded */}
          {!isCollapsed && (
            <button
              onClick={() => setIsControlCenterCollapsed(!isControlCenterCollapsed)}
              className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-[#0B1120] border border-white/10 rounded-full p-0.5 hover:bg-muted/50 transition-colors"
            >
              {isControlCenterCollapsed ? (
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          )}

          {isCollapsed ? (
            // SCENARIO A: Sidebar COLLAPSED - Always vertical icons only
            <div className="flex flex-col items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-lg hover:bg-muted/50 hover:text-foreground"
                    onClick={() => navigate("/docs")}
                  >
                    <BookOpen className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('admin.documentation')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-lg hover:bg-muted/50 hover:text-foreground"
                    onClick={() => navigate("#")}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('admin.dataAnalytics')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-lg text-primary hover:bg-muted/50 hover:text-foreground"
                    onClick={() => navigate("/")}
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('admin.backToApp')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-lg text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('admin.logout')}</TooltipContent>
              </Tooltip>
            </div>
          ) : isControlCenterCollapsed ? (
            // SCENARIO B-2: Sidebar EXPANDED + Control Center COLLAPSED - Horizontal row of icons
            <div className="flex flex-row items-center justify-around py-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-lg hover:bg-muted/50 hover:text-foreground"
                    onClick={() => navigate("/docs")}
                  >
                    <BookOpen className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t('admin.documentation')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-lg hover:bg-muted/50 hover:text-foreground"
                    onClick={() => navigate("#")}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t('admin.dataAnalytics')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-lg text-primary hover:bg-muted/50 hover:text-foreground"
                    onClick={() => navigate("/")}
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t('admin.backToApp')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t('admin.logout')}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            // SCENARIO B-1: Sidebar EXPANDED + Control Center EXPANDED (default) - Vertical with text
            <div className="flex flex-col gap-0.5">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 h-9 rounded-lg hover:bg-muted/50 hover:text-foreground"
                onClick={() => navigate("/docs")}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{t('admin.documentation')}</span>
              </Button>

              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 h-9 rounded-lg hover:bg-muted/50 hover:text-foreground"
                onClick={() => navigate("#")}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{t('admin.dataAnalytics')}</span>
              </Button>

              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 h-9 rounded-lg text-primary hover:bg-muted/50 hover:text-foreground"
                onClick={() => navigate("/")}
              >
                <Monitor className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{t('admin.backToApp')}</span>
              </Button>

              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 h-9 rounded-lg text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{t('admin.logout')}</span>
              </Button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};
