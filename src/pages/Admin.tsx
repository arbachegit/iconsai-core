import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { DashboardTab } from "@/components/admin/DashboardTab";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { ChatConfigTab } from "@/components/admin/ChatConfigTab";
import { TooltipsTab } from "@/components/admin/TooltipsTab";
import { GmailTab } from "@/components/admin/GmailTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { ConversationsTab } from "@/components/admin/ConversationsTab";
import { ImageCacheTab } from "@/components/admin/ImageCacheTab";
import { YouTubeCacheTab } from "@/components/admin/YouTubeCacheTab";
import { DocumentsTab } from "@/components/admin/DocumentsTab";
import { RagMetricsTab } from "@/components/admin/RagMetricsTab";
import { VersionControlTab } from "@/components/admin/VersionControlTab";
import { DocumentAnalysisTab } from "@/components/admin/DocumentAnalysisTab";
import { DocumentRoutingLogsTab } from "@/components/admin/DocumentRoutingLogsTab";
import { RagDiagnosticsTab } from "@/components/admin/RagDiagnosticsTab";
import { ChatScopeConfigTab } from "@/components/admin/ChatScopeConfigTab";
import { RagDocumentationTab } from "@/components/admin/RagDocumentationTab";
import { PodcastManagementTab } from "@/components/admin/PodcastManagementTab";
import { ContentManagementTab } from "@/components/admin/ContentManagementTab";
import { ActivityLogsTab } from "@/components/admin/ActivityLogsTab";
import { UserUsageLogsTab } from "@/components/admin/UserUsageLogsTab";
import { TagModificationLogsTab } from "@/components/admin/TagModificationLogsTab";
import { DeterministicAnalysisTab } from "@/components/admin/DeterministicAnalysisTab";
import { InfrastructureArchitectureTab } from "@/components/admin/InfrastructureArchitectureTab";
import { RegionalConfigTab } from "@/components/admin/RegionalConfigTab";
import { SuggestionAuditTab } from "@/components/admin/SuggestionAuditTab";
import { ContactMessagesTab } from "@/components/admin/ContactMessagesTab";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { TagsManagementTab } from "@/components/admin/TagsManagementTab";

type TabType = "dashboard" | "chat" | "tooltips" | "gmail" | "analytics" | "conversations" | "images" | "youtube" | "documents" | "rag-metrics" | "version-control" | "tags" | "document-analysis" | "document-routing-logs" | "rag-diagnostics" | "chat-scope-config" | "rag-documentation" | "content-management" | "podcasts" | "activity-logs" | "user-usage-logs" | "tag-modification-logs" | "deterministic-analysis" | "architecture" | "regional-config" | "suggestion-audit" | "contact-messages";

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
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab />;
      case "chat":
        return <ChatConfigTab />;
      case "tooltips":
        return <TooltipsTab />;
      case "conversations":
        return <ConversationsTab />;
      case "gmail":
        return <GmailTab />;
      case "analytics":
        return <AnalyticsTab />;
      case "documents":
        return <DocumentsTab />;
      case "rag-metrics":
        return <RagMetricsTab />;
      case "version-control":
        return <VersionControlTab />;
      case "tags":
        return <TagsManagementTab />;
      case "document-analysis":
        return <DocumentAnalysisTab />;
      case "document-routing-logs":
        return <DocumentRoutingLogsTab />;
      case "rag-diagnostics":
        return <RagDiagnosticsTab />;
      case "chat-scope-config":
        return <ChatScopeConfigTab />;
      case "rag-documentation":
        return <RagDocumentationTab />;
      case "content-management":
        return <ContentManagementTab />;
      case "podcasts":
        return <PodcastManagementTab />;
      case "activity-logs":
        return <ActivityLogsTab />;
      case "user-usage-logs":
        return <UserUsageLogsTab />;
      case "tag-modification-logs":
        return <TagModificationLogsTab />;
      case "deterministic-analysis":
        return <DeterministicAnalysisTab />;
      case "architecture":
        return <InfrastructureArchitectureTab />;
      case "regional-config":
        return <RegionalConfigTab />;
      case "suggestion-audit":
        return <SuggestionAuditTab />;
      case "contact-messages":
        return <ContactMessagesTab />;
      case "images":
        return <ImageCacheTab />;
      case "youtube":
        return <YouTubeCacheTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-end px-8 py-4">
            <NotificationsPanel />
          </div>
        </div>
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {renderTab()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
