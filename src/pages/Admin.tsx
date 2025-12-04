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
import { TagsManagementTab } from "@/components/admin/TagsManagementTab";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type TabType = "dashboard" | "chat" | "tooltips" | "gmail" | "analytics" | "conversations" | "images" | "youtube" | "documents" | "rag-metrics" | "version-control" | "tags" | "document-analysis" | "document-routing-logs" | "rag-diagnostics" | "chat-scope-config" | "rag-documentation" | "content-management" | "podcasts" | "activity-logs" | "user-usage-logs" | "tag-modification-logs" | "deterministic-analysis" | "architecture";

const Admin = () => {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/admin/login");
          return;
        }

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
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
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
