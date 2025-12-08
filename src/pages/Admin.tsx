import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import knowriskLogo from "@/assets/knowrisk-logo-circular.png";

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

// Loading fallback component
const TabLoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

type TabType = "dashboard" | "chat" | "tooltips" | "gmail" | "analytics" | "conversations" | "images" | "youtube" | "documents" | "rag-metrics" | "version-control" | "tags" | "document-analysis" | "document-routing-logs" | "rag-diagnostics" | "chat-scope-config" | "rag-documentation" | "content-management" | "podcasts" | "activity-logs" | "user-usage-logs" | "tag-modification-logs" | "deterministic-analysis" | "architecture" | "regional-config" | "suggestion-audit" | "contact-messages" | "documentation-sync" | "ml-dashboard" | "maieutic-training";

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
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    return saved === 'true';
  });
  const navigate = useNavigate();
  const { toast } = useToast();

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

        // Check if user has admin role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
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
        default: return <DashboardTab />;
      }
    })();

    return (
      <Suspense fallback={<TabLoadingFallback />}>
        {LazyComponent}
      </Suspense>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Fixed Global Header */}
      <header 
        className={`fixed top-0 left-0 right-0 h-12 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-primary/20 z-30 flex items-center justify-start px-4 pr-6 transition-all duration-300 ease-in-out`}
        style={{
          paddingLeft: isSidebarCollapsed ? '80px' : '272px',
        }}
      >
        {/* Logo and Admin Panel Text - Left side */}
        <div className="flex items-center gap-3">
          <img 
            src={knowriskLogo} 
            alt="Knowrisk" 
            className="h-7 w-7 rounded-full object-cover"
          />
          <span className="text-lg font-bold text-gradient whitespace-nowrap">Admin Panel</span>
        </div>

        {/* Separator + Notifications - Right side */}
        <div className="flex items-center gap-4 ml-auto">
          <div className="h-6 w-px bg-border/40" />
          <NotificationsPanel />
        </div>
      </header>

      <div className="flex flex-1 pt-12">
        <AdminSidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            <div className="max-w-7xl mx-auto">
              {renderTab()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
