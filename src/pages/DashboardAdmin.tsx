import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import iconsaiAdminLogo from "@/assets/knowyou-admin-logo.png";
import { DashboardSidebar, type DashboardTabType } from "@/components/dashboard/DashboardSidebar";
import { UserBadge } from "@/components/UserBadge";
import { DashboardAnalyticsProvider } from "@/contexts/DashboardAnalyticsContext";

// ============================================================
// DASHBOARD ADMIN SIMPLIFICADO
// Muitas tabs foram removidas pois consultavam tabelas deletadas
// ============================================================

// Lazy load tab components
const DashboardTab = lazy(() => import("@/components/admin/DashboardTab").then(m => ({ default: m.DashboardTab })));
const InfrastructureArchitectureTab = lazy(() => import("@/components/admin/InfrastructureArchitectureTab").then(m => ({ default: m.InfrastructureArchitectureTab })));
const PWASimulator = lazy(() => import("@/components/admin/PWASimulator"));
const InstitutionsTab = lazy(() => import("@/components/admin/InstitutionsTab"));
const InstitutionUsersTab = lazy(() => import("@/components/admin/InstitutionUsersTab"));
const UserActivityLogsTab = lazy(() => import("@/components/admin/UserActivityLogsTab"));
const EmotionAnalyticsTab = lazy(() => import("@/components/admin/EmotionAnalyticsTab"));
const PWAHomeContainersTab = lazy(() => import("@/components/admin/PWAHomeContainersTab"));

// Loading fallback
const TabLoader = () => (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTabType>("indicators");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Check authentication and role
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate("/admin/login");
          return;
        }

        // Check if user has admin or superadmin role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "superadmin"])
          .maybeSingle();

        if (!roleData) {
          toast.error("Acesso não autorizado");
          navigate("/");
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        navigate("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("admin_authenticated");
    navigate("/admin/login");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "indicators":
        return <DashboardTab />;
      case "institutions":
        return (
          <div className="p-6">
            <InstitutionsTab />
          </div>
        );
      case "institution-users":
        return (
          <div className="p-6">
            <InstitutionUsersTab />
          </div>
        );
      case "activity-logs":
        return (
          <div className="p-6">
            <UserActivityLogsTab />
          </div>
        );
      case "emotion-analytics":
        return (
          <div className="p-6">
            <EmotionAnalyticsTab />
          </div>
        );
      case "pwa-home-config":
        return (
          <div className="p-6">
            <PWAHomeContainersTab />
          </div>
        );
      case "dataflow-architecture":
        return (
          <div className="p-6">
            <InfrastructureArchitectureTab />
          </div>
        );
      case "dataflow-talk-app":
        return (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Talk APP Preview
              </h1>
              <p className="text-muted-foreground text-sm">
                Preview do aplicativo de voz
              </p>
            </div>
            <PWASimulator
              showFrame={true}
              scale={0.85}
              showControls={false}
              isLandscape={false}
            />
          </div>
        );
      // Tabs removidas - tabelas foram deletadas
      case "api":
      case "ai":
      case "data-analysis":
      case "analytics-uf":
      case "chart-database":
      case "table-database":
      case "dataflow-retail-system":
      case "dataflow-autocontrol":
      case "dataflow-tutor":
      case "dataflow-healthcare":
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="max-w-md">
              <h2 className="text-xl font-semibold mb-2">Tab Desabilitada</h2>
              <p className="text-muted-foreground">
                Esta funcionalidade foi removida ou está em manutenção.
                As tabelas de dados foram migradas para o brasil-data-hub.
              </p>
            </div>
          </div>
        );
      default:
        return <DashboardTab />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardAnalyticsProvider>
      <div className="min-h-screen bg-background flex w-full">
        {/* Fixed Sidebar */}
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main content with dynamic margin */}
        <div
          className={`flex-1 flex flex-col transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'ml-[72px]' : 'ml-[256px]'}`}
        >
          {/* Header */}
          <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src={iconsaiAdminLogo}
                alt="IconsAI Admin"
                className="h-8 w-auto"
              />
              <span className="font-semibold text-sm">Dashboard</span>
            </div>
            {/* UserBadge */}
            <UserBadge />
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto bg-muted/30">
            <Suspense fallback={<TabLoader />}>
              {renderContent()}
            </Suspense>
          </main>
        </div>
      </div>
    </DashboardAnalyticsProvider>
  );
};

export default DashboardAdmin;
