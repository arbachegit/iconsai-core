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
const InstitutionsTab = lazy(() => import("@/components/admin/InstitutionsTab"));
const InstitutionUsersTab = lazy(() => import("@/components/admin/InstitutionUsersTab"));
const UsersManagementTab = lazy(() => import("@/components/admin/UsersManagementTab"));
const UserActivityLogsTab = lazy(() => import("@/components/admin/UserActivityLogsTab"));
const EmotionAnalyticsTab = lazy(() => import("@/components/admin/EmotionAnalyticsTab"));
const PWAHomeContainersTab = lazy(() => import("@/components/admin/PWAHomeContainersTab"));
const VoiceConfigTab = lazy(() => import("@/components/admin/VoiceConfigTab"));
const AssistantsTab = lazy(() => import("@/components/admin/AssistantsTab"));
const CompaniesTab = lazy(() => import("@/components/admin/CompaniesTab"));
const ManagersTab = lazy(() => import("@/components/admin/ManagersTab"));

// Loading fallback
const TabLoader = () => (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTabType>("users-management");
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
      case "users-management":
        return (
          <div className="p-6">
            <UsersManagementTab />
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
      case "voice-config":
        return (
          <div className="p-6">
            <VoiceConfigTab />
          </div>
        );
      case "assistants":
        return (
          <div className="p-6">
            <AssistantsTab />
          </div>
        );
      case "companies":
        return (
          <div className="p-6">
            <CompaniesTab />
          </div>
        );
      case "managers":
        return (
          <div className="p-6">
            <ManagersTab />
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
      <div className="h-screen bg-background flex w-full overflow-hidden">
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
                alt="Iconsai Voz Admin"
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
