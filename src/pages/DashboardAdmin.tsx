import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import knowyouAdminLogo from "@/assets/knowyou-admin-logo.png";
import { DashboardSidebar, type DashboardTabType } from "@/components/dashboard/DashboardSidebar";
import { FloatingChatButton } from "@/components/FloatingChatButton";
import { UserBadge } from "@/components/UserBadge";

// Lazy load tab components
const DashboardTab = lazy(() => import("@/components/admin/DashboardTab").then(m => ({ default: m.DashboardTab })));
const DataAnalysisTab = lazy(() => import("@/components/admin/DataAnalysisTab").then(m => ({ default: m.DataAnalysisTab })));
const ChartDatabaseTab = lazy(() => import("@/components/admin/ChartDatabaseTab").then(m => ({ default: m.ChartDatabaseTab })));
const TableDatabaseTab = lazy(() => import("@/components/admin/TableDatabaseTab").then(m => ({ default: m.TableDatabaseTab })));
const AIChat = lazy(() => import("@/components/dashboard/AIChat").then(m => ({ default: m.AIChat })));
const DataAnalyticsUF = lazy(() => import("@/components/dashboard/DataAnalyticsUF").then(m => ({ default: m.DataAnalyticsUF })));

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
      case "ai":
        return <AIChat />;
      case "data-analysis":
        return (
          <div className="p-6">
            <DataAnalysisTab />
          </div>
        );
      case "analytics-uf":
        return <DataAnalyticsUF />;
      case "chart-database":
        return (
          <div className="p-6">
            <ChartDatabaseTab />
          </div>
        );
      case "table-database":
        return (
          <div className="p-6">
            <TableDatabaseTab />
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
              src={knowyouAdminLogo} 
              alt="KnowYOU Admin" 
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

      {/* Floating Chat Button */}
      <FloatingChatButton />
    </div>
  );
};

export default DashboardAdmin;
