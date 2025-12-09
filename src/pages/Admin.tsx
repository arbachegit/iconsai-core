import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Languages, Camera } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { t } from "i18next";
import knowyouAdminLogo from "@/assets/knowyou-admin-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Eager load only DashboardTab (first view)
import { DashboardTab } from "@/components/admin/DashboardTab";

// Lazy load all other tabs for better initial bundle size
const ChatConfigTab = lazy(() => import("@/components/admin/ChatConfigTab").then(m => ({ default: m.ChatConfigTab })));
const TooltipsTab = lazy(() => import("@/components/admin/TooltipsTab").then(m => ({ default: m.TooltipsTab })));
const GmailTab = lazy(() => import("@/components/admin/GmailTab").then(m => ({ default: m.GmailTab })));
const AnalyticsTab = lazy(() => import("@/components/admin/AnalyticsTab").then(m => ({ default: m.AnalyticsTab })));
const ConversationsTab = lazy(() => import("@/components/admin/ConversationsTab").then(m => ({ default: m.ConversationsTab })));
const ImageCacheTab = lazy(() => import("@/components/admin/ImageCacheTab").then(m => ({ default: m.ImageCacheTab })));
const YouTubeCacheTab = lazy(() => import("@/components/admin/YouTubeCacheTab").then(m => ({ default: m.YouTubeCacheTab })));
const DocumentsTab = lazy(() => import("@/components/admin/DocumentsTab").then(m => ({ default: m.DocumentsTab })));
const RagMetricsTab = lazy(() => import("@/components/admin/RagMetricsTab").then(m => ({ default: m.RagMetricsTab })));
const VersionControlTab = lazy(() => import("@/components/admin/VersionControlTab").then(m => ({ default: m.VersionControlTab })));
const DocumentAnalysisTab = lazy(() => import("@/components/admin/DocumentAnalysisTab").then(m => ({ default: m.DocumentAnalysisTab })));
const DocumentRoutingLogsTab = lazy(() => import("@/components/admin/DocumentRoutingLogsTab").then(m => ({ default: m.DocumentRoutingLogsTab })));
const RagDiagnosticsTab = lazy(() => import("@/components/admin/RagDiagnosticsTab").then(m => ({ default: m.RagDiagnosticsTab })));
const ChatScopeConfigTab = lazy(() => import("@/components/admin/ChatScopeConfigTab").then(m => ({ default: m.ChatScopeConfigTab })));
const RagDocumentationTab = lazy(() => import("@/components/admin/RagDocumentationTab").then(m => ({ default: m.RagDocumentationTab })));
const PodcastManagementTab = lazy(() => import("@/components/admin/PodcastManagementTab").then(m => ({ default: m.PodcastManagementTab })));
const ContentManagementTab = lazy(() => import("@/components/admin/ContentManagementTab").then(m => ({ default: m.ContentManagementTab })));
const ActivityLogsTab = lazy(() => import("@/components/admin/ActivityLogsTab").then(m => ({ default: m.ActivityLogsTab })));
const UserUsageLogsTab = lazy(() => import("@/components/admin/UserUsageLogsTab").then(m => ({ default: m.UserUsageLogsTab })));
const TagModificationLogsTab = lazy(() => import("@/components/admin/TagModificationLogsTab").then(m => ({ default: m.TagModificationLogsTab })));
const DeterministicAnalysisTab = lazy(() => import("@/components/admin/DeterministicAnalysisTab").then(m => ({ default: m.DeterministicAnalysisTab })));
const InfrastructureArchitectureTab = lazy(() => import("@/components/admin/InfrastructureArchitectureTab").then(m => ({ default: m.InfrastructureArchitectureTab })));
const RegionalConfigTab = lazy(() => import("@/components/admin/RegionalConfigTab").then(m => ({ default: m.RegionalConfigTab })));
const SuggestionAuditTab = lazy(() => import("@/components/admin/SuggestionAuditTab").then(m => ({ default: m.SuggestionAuditTab })));
const ContactMessagesTab = lazy(() => import("@/components/admin/ContactMessagesTab").then(m => ({ default: m.ContactMessagesTab })));
const DocumentationSyncTab = lazy(() => import("@/components/admin/DocumentationSyncTab").then(m => ({ default: m.DocumentationSyncTab })));
const TagsManagementTab = lazy(() => import("@/components/admin/TagsManagementTab").then(m => ({ default: m.TagsManagementTab })));
const MLDashboardTab = lazy(() => import("@/components/admin/MLDashboardTab").then(m => ({ default: m.MLDashboardTab })));
const MaieuticTrainingTab = lazy(() => import("@/components/admin/MaieuticTrainingTab").then(m => ({ default: m.MaieuticTrainingTab })));
const TaxonomyMLAuditTab = lazy(() => import("@/components/admin/TaxonomyMLAuditTab").then(m => ({ default: m.TaxonomyMLAuditTab })));
const ManageTaxonomyTab = lazy(() => import("@/components/admin/ManageTaxonomyTab").then(m => ({ default: m.ManageTaxonomyTab })));
const SecurityIntegrityTab = lazy(() => import("@/components/admin/SecurityIntegrityTab").then(m => ({ default: m.SecurityIntegrityTab })));
const NotificationSettingsTab = lazy(() => import("@/components/admin/NotificationSettingsTab"));
const NotificationLogsTab = lazy(() => import("@/components/admin/NotificationLogsTab"));
const UserRegistryTab = lazy(() => import("@/components/admin/UserRegistryTab"));

// Loading fallback component
const TabLoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

type TabType = "dashboard" | "chat" | "tooltips" | "gmail" | "analytics" | "conversations" | "images" | "youtube" | "documents" | "rag-metrics" | "version-control" | "tags" | "document-analysis" | "document-routing-logs" | "rag-diagnostics" | "chat-scope-config" | "rag-documentation" | "content-management" | "podcasts" | "activity-logs" | "user-usage-logs" | "tag-modification-logs" | "deterministic-analysis" | "architecture" | "regional-config" | "suggestion-audit" | "contact-messages" | "documentation-sync" | "ml-dashboard" | "maieutic-training" | "taxonomy-ml-audit" | "manage-taxonomy" | "security-integrity" | "notification-settings" | "notification-logs" | "user-registry";

// Mapping de tab para nome legível
const TAB_LABELS: Record<TabType, string> = {
  "dashboard": "Dashboard",
  "chat": "Chat Config",
  "tooltips": "Tooltips",
  "gmail": "Gmail",
  "analytics": "Analytics",
  "conversations": "Conversas",
  "images": "Cache de Imagens",
  "youtube": "Inserir Vídeos",
  "documents": "RAG Documentos",
  "rag-metrics": "Métricas RAG",
  "version-control": "Versionamento",
  "tags": "Gerenciar Tags",
  "document-analysis": "Análise Documentos",
  "document-routing-logs": "Logs de Roteamento",
  "rag-diagnostics": "Diagnóstico RAG",
  "chat-scope-config": "Delimitações",
  "rag-documentation": "Documentação RAG",
  "content-management": "Seções Landing Page",
  "podcasts": "Podcasts",
  "activity-logs": "Log de Atividades",
  "user-usage-logs": "Log de Uso (Usuários)",
  "tag-modification-logs": "Logs de Mescla Tags",
  "deterministic-analysis": "Fala Determinística",
  "architecture": "Arquitetura",
  "regional-config": "Configurações Regionais",
  "suggestion-audit": "Auditoria Sugestões",
  "contact-messages": "Mensagens Contato",
  "documentation-sync": "Sincronizar Docs",
  "ml-dashboard": "Machine Learning ML",
  "maieutic-training": "Treino IA Maiêutica",
  "taxonomy-ml-audit": "Taxonomy ML",
  "manage-taxonomy": "Gerenciar Taxonomia",
  "security-integrity": "Segurança & Integridade",
  "notification-settings": "Notificação",
  "notification-logs": "Logs de Notificações",
  "user-registry": "Cadastro de Usuários",
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    return saved === 'true';
  });
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const languages = [
    { code: "pt", label: "Português", abbr: "PT" },
    { code: "en", label: "English", abbr: "EN" },
    { code: "fr", label: "Français", abbr: "FR" },
  ];

  const handleLanguageChange = async (code: string) => {
    setIsChangingLanguage(true);
    try {
      await i18n.changeLanguage(code);
      localStorage.setItem("i18nextLng", code);
      document.cookie = `i18next=${code};path=/;max-age=31536000`;
    } finally {
      setIsChangingLanguage(false);
    }
  };

  const currentLanguage = languages.find((l) => l.code === i18n.language) || languages[0];

  // Função para logar navegação
  const logNavigation = async (fromTab: TabType, toTab: TabType, email: string) => {
    try {
      await supabase.from("user_activity_logs").insert({
        user_email: email,
        action_category: "NAVIGATION",
        action: `Navegou de "${TAB_LABELS[fromTab]}" para "${TAB_LABELS[toTab]}"`,
        details: {
          from_tab: fromTab,
          to_tab: toTab,
          from_label: TAB_LABELS[fromTab],
          to_label: TAB_LABELS[toTab],
        },
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error("Error logging navigation:", error);
    }
  };

  // Handler de mudança de tab com logging
  const handleTabChange = (newTab: TabType) => {
    if (newTab !== activeTab && userEmail) {
      logNavigation(activeTab, newTab, userEmail);
    }
    setActiveTab(newTab);
  };

  // Persistir estado do sidebar no localStorage
  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/admin/login");
          return;
        }

        setUserEmail(user.email || null);

        // Check if user has admin or superadmin role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "superadmin"])
          .maybeSingle();

        if (!roleData) {
          toast({
            title: "Acesso negado",
            description: "Você não tem permissões de administrador.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          navigate("/admin/login");
          return;
        }
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    // Dashboard is eagerly loaded, all others use Suspense
    if (activeTab === "dashboard") {
      return <DashboardTab />;
    }

    const LazyComponent = (() => {
      switch (activeTab) {
        case "chat": return <ChatConfigTab />;
        case "tooltips": return <TooltipsTab />;
        case "conversations": return <ConversationsTab />;
        case "gmail": return <GmailTab />;
        case "analytics": return <AnalyticsTab />;
        case "documents": return <DocumentsTab />;
        case "rag-metrics": return <RagMetricsTab />;
        case "version-control": return <VersionControlTab />;
        case "tags": return <TagsManagementTab />;
        case "document-analysis": return <DocumentAnalysisTab />;
        case "document-routing-logs": return <DocumentRoutingLogsTab />;
        case "rag-diagnostics": return <RagDiagnosticsTab />;
        case "chat-scope-config": return <ChatScopeConfigTab />;
        case "rag-documentation": return <RagDocumentationTab />;
        case "content-management": return <ContentManagementTab />;
        case "podcasts": return <PodcastManagementTab />;
        case "activity-logs": return <ActivityLogsTab />;
        case "user-usage-logs": return <UserUsageLogsTab />;
        case "tag-modification-logs": return <TagModificationLogsTab />;
        case "deterministic-analysis": return <DeterministicAnalysisTab />;
        case "architecture": return <InfrastructureArchitectureTab />;
        case "regional-config": return <RegionalConfigTab />;
        case "suggestion-audit": return <SuggestionAuditTab />;
        case "contact-messages": return <ContactMessagesTab />;
        case "documentation-sync": return <DocumentationSyncTab />;
        case "images": return <ImageCacheTab />;
        case "youtube": return <YouTubeCacheTab />;
        case "ml-dashboard": return <MLDashboardTab />;
        case "maieutic-training": return <MaieuticTrainingTab />;
        case "taxonomy-ml-audit": return <TaxonomyMLAuditTab />;
        case "manage-taxonomy": return <ManageTaxonomyTab />;
        case "security-integrity": return <SecurityIntegrityTab />;
        case "notification-settings": return <NotificationSettingsTab />;
        case "notification-logs": return <NotificationLogsTab />;
        case "user-registry": return <UserRegistryTab />;
        default: return <DashboardTab />;
      }
    })();

    return (
      <Suspense fallback={<TabLoadingFallback />}>
        {LazyComponent}
      </Suspense>
    );
  };

  // Dynamic margin based on sidebar state
  const sidebarWidth = isSidebarCollapsed ? 'ml-[72px]' : 'ml-[280px]';

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Fixed full height */}
      <AdminSidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main content wrapper with dynamic left margin */}
      <div className={`${sidebarWidth} transition-all duration-500 ease-in-out min-h-screen flex flex-col`}>
        {/* Header - inside main content area, not overlapping sidebar */}
        <header className={`h-14 bg-background/80 backdrop-blur-md border-b border-border/50 fixed top-0 right-0 z-30 flex items-center justify-between px-6 transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'left-[72px]' : 'left-[280px]'}`}>
          {/* Left: Logo + Admin Panel title */}
          <div className="flex items-center gap-3">
            <img 
              src={knowyouAdminLogo} 
              alt="KnowYOU" 
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              {t('admin.panel')}
            </span>
          </div>
          
          {/* Right: Language + Notifications + User */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-5">
              {/* Language Selector with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full"
                        disabled={isChangingLanguage}
                      >
                        {isChangingLanguage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Languages className="h-4 w-4" />
                            <span className="text-xs font-semibold">{currentLanguage.abbr}</span>
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      {languages.map((lang) => (
                        <DropdownMenuItem
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`flex items-center gap-3 cursor-pointer ${
                            i18n.language === lang.code ? "bg-accent" : ""
                          }`}
                        >
                          <span className="text-xs font-bold text-muted-foreground w-5">{lang.abbr}</span>
                          <span>{lang.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Mudar Idioma</p>
                </TooltipContent>
              </Tooltip>

              {/* Notifications with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <NotificationsPanel />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Notificações</p>
                </TooltipContent>
              </Tooltip>
              
              {/* User Avatar with Halo Effect and Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    onClick={() => setIsProfileOpen(true)}
                    className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer transition-all duration-300 ease-in-out hover:ring-4 hover:ring-primary/20 hover:shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                  >
                    <span className="text-xs font-semibold text-primary">AD</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Perfil do Usuário</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pt-14">
          <div className="p-8">
            <div className="max-w-7xl mx-auto">
              {renderTab()}
            </div>
          </div>
        </main>

        {/* User Profile Modal */}
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Perfil do Usuário</DialogTitle>
              <DialogDescription>
                Informações da conta administrativa
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center gap-4 py-4">
              {/* Editable Avatar with Hover Overlay */}
              <div className="relative group cursor-pointer">
                <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center transition-all duration-300 group-hover:ring-4 group-hover:ring-primary/30">
                  <span className="text-3xl font-bold text-primary">AD</span>
                </div>
                
                {/* Camera Overlay - appears on hover */}
                <div 
                  className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                >
                  <Camera className="h-6 w-6 text-white" />
                  <span className="text-xs text-white mt-1">Alterar Foto</span>
                </div>
              </div>
              
              {/* User Info */}
              <div className="w-full space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Nome</span>
                  <span className="text-sm font-medium">Admin User</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{userEmail || "admin@knowyou.app"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Função</span>
                  <span className="text-sm font-medium">Administrator</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Plano</span>
                  <span className="text-sm font-medium text-primary">Enterprise</span>
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setIsProfileOpen(false)}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Admin;
