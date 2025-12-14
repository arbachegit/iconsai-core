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
  Film,
  Settings,
  Route,
  TestTube,
  Music,
  ClipboardCheck,
  ShieldCheck,
  History,
  Users,
  Target,
  Cpu,
  Globe,
  Sparkles,
  Menu,
  X,
  Monitor,
  RefreshCw,
  Bell,
  FilePlus2,
  ScrollText,
  TrendingUp,
  Newspaper,
  Webhook,
  FileJson,
  MapPin,
} from "lucide-react";


type TabType = "dashboard" | "chat" | "tooltips" | "gmail" | "analytics" | "conversations" | "images" | "youtube" | "documents" | "rag-metrics" | "version-control" | "tags" | "document-analysis" | "document-routing-logs" | "rag-diagnostics" | "chat-scope-config" | "rag-documentation" | "content-management" | "podcasts" | "activity-logs" | "user-usage-logs" | "tag-modification-logs" | "deterministic-analysis" | "architecture" | "regional-config" | "suggestion-audit" | "contact-messages" | "documentation-sync" | "ml-dashboard" | "maieutic-training" | "taxonomy-ml-audit" | "manage-taxonomy" | "security-integrity" | "notification-settings" | "user-registry" | "data-registry" | "notification-logs" | "economic-indicators" | "market-news" | "api-management" | "json-data" | "data-analysis" | "chart-database" | "json-test" | "regional-indicators" | "dashboard-external" | "table-database";

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
      id: "database",
      label: "Banco de Dados",
      icon: Database,
      items: [
        { id: "user-registry" as TabType, label: "Cadastro de Usuários", icon: Users },
        { id: "data-registry" as TabType, label: "Cadastro de Dados", icon: FilePlus2 },
      ]
    },
    {
      id: "media",
      label: "Mídia & Conteúdo",
      icon: Film,
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
      icon: ClipboardCheck,
      items: [
        { id: "security-integrity" as TabType, label: "Segurança & Integridade", icon: ShieldCheck },
        { id: "activity-logs" as TabType, label: "Log de Atividades (admin)", icon: History },
        { id: "user-usage-logs" as TabType, label: "Log de Uso (Usuários)", icon: Users },
        { id: "notification-logs" as TabType, label: "Logs de Notificações", icon: ScrollText },
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
      id: "indicators",
      label: "INDICADORES ECONÔMICOS",
      icon: TrendingUp,
      items: [
        { id: "economic-indicators" as TabType, label: "Painel de Indicadores", icon: BarChart3 },
        { id: "regional-indicators" as TabType, label: "Indicadores Regionais", icon: MapPin },
        { id: "market-news" as TabType, label: "Balcão de Notícias", icon: Newspaper },
        { id: "json-test" as TabType, label: "Teste de JSON", icon: TestTube },
        { id: "api-management" as TabType, label: "Gestão de APIs", icon: Webhook },
        { id: "json-data" as TabType, label: "JSON Dados", icon: FileJson },
      ]
    },
    {
      id: "analytics-hub",
      label: "ANALYTICS",
      icon: BarChart3,
      items: [
        { id: "dashboard-external" as TabType, label: "Dashboard", icon: LayoutDashboard },
        { id: "data-analysis" as TabType, label: "Data Analysis", icon: TrendingUp },
        { id: "chart-database" as TabType, label: "Chart Data Base", icon: Database },
        { id: "table-database" as TabType, label: "Table Data Base", icon: Database },
      ]
    },
    {
      id: "system",
      label: "Sistema",
      icon: Settings,
      items: [
        { id: "notification-settings" as TabType, label: "Notificação", icon: Bell },
        { id: "architecture" as TabType, label: "Arquitetura", icon: Cpu },
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
          transition-all duration-500 ease-in-out
        `}
      >
        {/* TOP HEADER: Hamburger + Search (Horizontal-to-Vertical Transformation) */}
        <div className={`
          border-b border-border shrink-0
          flex transition-all duration-500 ease-in-out
          ${isCollapsed 
            ? 'flex-col items-center w-full gap-4 px-3 py-4' 
            : 'flex-row items-center w-full gap-3 px-4 py-3'}
        `}>
          {/* 1. Hamburger Menu with Rotation Animation */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="group shrink-0 h-10 w-10 rounded-full hover:bg-[#00D4FF]/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] transition-all duration-300"
          >
            <div className="relative w-5 h-5">
              <Menu className={`w-5 h-5 absolute inset-0 transition-all duration-300 group-hover:text-[#00D4FF] ${isCollapsed ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} />
              <X className={`w-5 h-5 absolute inset-0 transition-all duration-300 group-hover:text-[#00D4FF] ${isCollapsed ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`} />
            </div>
          </Button>

          {/* 2. Search Component - Adapts to sidebar state */}
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="group h-10 w-10 rounded-full hover:bg-[#00D4FF]/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] transition-all duration-500 ease-in-out animate-pulse"
                  onClick={() => {
                    onToggleCollapse();
                    setTimeout(() => {
                      const searchInput = document.querySelector('input[placeholder="Buscar..."]') as HTMLInputElement;
                      searchInput?.focus();
                    }, 350);
                  }}
                >
                  <Search className="w-4 h-4 group-hover:text-[#00D4FF] transition-colors duration-300" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Buscar</TooltipContent>
            </Tooltip>
          ) : (
            <div className="relative flex-1 transition-all duration-500 ease-in-out">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-sm bg-muted/30 border-border rounded-full focus:border-primary/50 w-full"
              />
            </div>
          )}
        </div>

        {/* Top fade indicator */}
        <div 
          className={`absolute top-[100px] left-0 right-0 h-6 bg-gradient-to-b from-sidebar to-transparent z-10 pointer-events-none transition-opacity duration-200 ${canScrollUp ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* MIDDLE NAVIGATION - Scrollable with margin-bottom for dock */}
        <nav 
          ref={navRef}
          onScroll={handleNavScroll}
          className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'} py-2 pb-48 space-y-1`}
        >
          {filteredCategories.map((category, index) => (
            <div key={category.id}>
              {index > 0 && <Separator className="my-2 bg-border/50" />}
              
              {isCollapsed ? (
                // Collapsed mode: ONLY parent category icon with click-to-expand
                <div className="flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="group w-full h-12 rounded-lg hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                        onClick={() => {
                          // Click-to-expand: Always expand sidebar first
                          onToggleCollapse();
                          // Then open this category's section
                          if (!openSections.includes(category.id)) {
                            toggleSection(category.id);
                          }
                        }}
                      >
                        <category.icon className="w-5 h-5 group-hover:text-black" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {category.label}
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                // Expanded mode: full menu with collapsible sections
                <Collapsible 
                  open={openSections.includes(category.id)}
                  onOpenChange={() => toggleSection(category.id)}
                >
                  <CollapsibleTrigger className="group flex items-center justify-between w-full p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-black rounded-lg hover:bg-[#00D4FF] hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out">
                    <div className="flex items-center gap-2">
                      <category.icon className="w-3.5 h-3.5 group-hover:text-black" />
                      {category.label}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:text-black ${openSections.includes(category.id) ? 'rotate-180' : ''}`} />
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
                          className={`group w-full justify-start gap-3 h-9 rounded-lg ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105"} transition-all duration-300 ease-in-out`}
                          onClick={() => {
                            // Navigate to external dashboard page
                            if (item.id === "dashboard-external") {
                              navigate("/dashboard");
                            } else {
                              onTabChange(item.id);
                            }
                          }}
                        >
                          <Icon className="w-4 h-4 shrink-0 group-hover:text-black" />
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
        <div className="absolute bottom-0 left-0 w-full z-50 bg-[#0B1120] border-t border-white/10 p-2 transition-all duration-200">
          {/* Chevron Toggle - Only visible when sidebar is expanded */}
          {!isCollapsed && (
            <button
              onClick={() => setIsControlCenterCollapsed(!isControlCenterCollapsed)}
              className="group absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-[#0B1120] border border-white/10 rounded-full p-0.5 hover:bg-[#00D4FF] hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-110 transition-all duration-300 ease-in-out"
            >
              {isControlCenterCollapsed ? (
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-black" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-black" />
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
                    className="group h-10 w-10 rounded-lg hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                    onClick={() => navigate("/docs")}
                  >
                    <BookOpen className="w-4 h-4 group-hover:text-black" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('admin.documentation')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-10 w-10 rounded-lg hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                    onClick={() => navigate("/dashboard")}
                  >
                    <LayoutDashboard className="w-4 h-4 group-hover:text-black" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Dashboard</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-10 w-10 rounded-lg text-primary hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                    onClick={() => navigate("/")}
                  >
                    <Monitor className="w-4 h-4 group-hover:text-black" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('admin.backToApp')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-10 w-10 rounded-lg text-destructive hover:bg-[#FF3366] hover:text-white hover:shadow-[0_0_15px_rgba(255,51,102,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 group-hover:text-white" />
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
                    className="group h-9 w-9 rounded-lg hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                    onClick={() => navigate("/docs")}
                  >
                    <BookOpen className="w-4 h-4 group-hover:text-black" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t('admin.documentation')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-9 w-9 rounded-lg hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                    onClick={() => navigate("/dashboard")}
                  >
                    <LayoutDashboard className="w-4 h-4 group-hover:text-black" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Dashboard</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-9 w-9 rounded-lg text-primary hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                    onClick={() => navigate("/")}
                  >
                    <Monitor className="w-4 h-4 group-hover:text-black" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t('admin.backToApp')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-9 w-9 rounded-lg text-destructive hover:bg-[#FF3366] hover:text-white hover:shadow-[0_0_15px_rgba(255,51,102,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 group-hover:text-white" />
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
                className="group w-full justify-start gap-3 h-9 rounded-lg hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                onClick={() => navigate("/docs")}
              >
                <BookOpen className="w-4 h-4 shrink-0 group-hover:text-black" />
                <span className="whitespace-nowrap">{t('admin.documentation')}</span>
              </Button>

              <Button 
                variant="ghost" 
                className="group w-full justify-start gap-3 h-9 rounded-lg hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                onClick={() => navigate("/dashboard")}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0 group-hover:text-black" />
                <span className="whitespace-nowrap">Dashboard</span>
              </Button>

              <Button 
                variant="ghost" 
                className="group w-full justify-start gap-3 h-9 rounded-lg text-primary hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                onClick={() => navigate("/")}
              >
                <Monitor className="w-4 h-4 shrink-0 group-hover:text-black" />
                <span className="whitespace-nowrap">{t('admin.backToApp')}</span>
              </Button>

              <Button 
                variant="ghost" 
                className="group w-full justify-start gap-3 h-9 rounded-lg text-destructive hover:bg-[#FF3366] hover:text-white hover:shadow-[0_0_15px_rgba(255,51,102,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 shrink-0 group-hover:text-white" />
                <span className="whitespace-nowrap">{t('admin.logout')}</span>
              </Button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};
