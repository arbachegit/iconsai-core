import { useEffect, useState, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Languages } from "lucide-react";
import { UserBadge } from "@/components/UserBadge";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ErrorBoundary } from "@/components/admin/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
// Logo temporário - usar o existente até criar novo asset IconsAI
import iconsaiAdminLogo from "@/assets/knowyou-admin-logo.png";
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

// ============================================================
// ADMIN SIMPLIFICADO - Apenas tabs que funcionam com tabelas existentes
// Tabelas disponíveis: pwa_*, security_*, contact_messages, admin_settings, user_preferences, user_roles
// ============================================================

// Lazy load all tabs
const DashboardTab = lazy(() => import("@/components/admin/DashboardTab").then(m => ({ default: m.DashboardTab })));
const PWATab = lazy(() => import("@/components/admin/PWATab"));
const PWAHomeContainersTab = lazy(() => import("@/components/admin/PWAHomeContainersTab"));
const PWAConversationsTab = lazy(() => import("@/components/admin/PWAConversationsTab"));
const ContactMessagesTab = lazy(() => import("@/components/admin/ContactMessagesTab").then(m => ({ default: m.ContactMessagesTab })));
const SecurityDashboard = lazy(() => import("@/components/admin/SecurityDashboard").then(m => ({ default: m.SecurityDashboard })));
const SecurityWhitelist = lazy(() => import("@/components/admin/SecurityWhitelist").then(m => ({ default: m.SecurityWhitelist })));
const SecurityAuditLogsTab = lazy(() => import("@/components/admin/SecurityAuditLogsTab").then(m => ({ default: m.SecurityAuditLogsTab })));
const SecurityShieldConfigTab = lazy(() => import("@/components/admin/SecurityShieldConfigTab").then(m => ({ default: m.SecurityShieldConfigTab })));
const AppConfigTab = lazy(() => import("@/components/admin/AppConfigTab"));
const InfrastructureArchitectureTab = lazy(() => import("@/components/admin/InfrastructureArchitectureTab").then(m => ({ default: m.InfrastructureArchitectureTab })));
// User Management Tabs (IconsAI)
const InstitutionsTab = lazy(() => import("@/components/admin/InstitutionsTab"));
const InstitutionUsersTab = lazy(() => import("@/components/admin/InstitutionUsersTab"));
const UserActivityLogsTab = lazy(() => import("@/components/admin/UserActivityLogsTab"));
const EmotionAnalyticsTab = lazy(() => import("@/components/admin/EmotionAnalyticsTab"));

const TabLoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

// Tipos de tabs disponíveis (simplificado)
export type TabType =
  | "dashboard"
  | "pwa"
  | "pwa-home-containers"
  | "pwa-conversations"
  | "contact-messages"
  | "security-dashboard"
  | "security-whitelist"
  | "security-audit-logs"
  | "security-shield-config"
  | "app-config"
  | "architecture"
  // User Management (IconsAI)
  | "institutions"
  | "institution-users"
  | "user-activity-logs"
  | "emotion-analytics";

// Labels para cada tab
export const TAB_LABELS: Record<TabType, string> = {
  "dashboard": "Dashboard",
  "pwa": "Config. PWA",
  "pwa-home-containers": "Containers HOME",
  "pwa-conversations": "Conversas PWA",
  "contact-messages": "Mensagens de Contato",
  "security-dashboard": "Dashboard Segurança",
  "security-whitelist": "Whitelist de IPs",
  "security-audit-logs": "Audit Logs",
  "security-shield-config": "Config. Security Shield",
  "app-config": "Configurações do Sistema",
  "architecture": "Arquitetura",
  // User Management (IconsAI)
  "institutions": "Instituições",
  "institution-users": "Usuários",
  "user-activity-logs": "Logs de Atividade",
  "emotion-analytics": "Análise de Emoções",
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

  const router = useRouter();
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

  const handleTabChange = (newTab: TabType) => {
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
          router.push("/admin/login");
          return;
        }

        setUserEmail(user.email || null);

        // Check if user has SUPERADMIN role (exclusive access to /admin)
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "superadmin")
          .maybeSingle();

        if (!roleData) {
          // Silently redirect non-superadmin users to /dashboard
          router.push("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/admin/login");
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
    const LazyComponent = (() => {
      switch (activeTab) {
        case "dashboard": return <DashboardTab />;
        case "pwa": return <PWATab />;
        case "pwa-home-containers": return <PWAHomeContainersTab />;
        case "pwa-conversations": return <PWAConversationsTab />;
        case "contact-messages": return <ContactMessagesTab />;
        case "security-dashboard": return <SecurityDashboard />;
        case "security-whitelist": return <SecurityWhitelist />;
        case "security-audit-logs": return <SecurityAuditLogsTab />;
        case "security-shield-config": return <SecurityShieldConfigTab />;
        case "app-config": return <AppConfigTab />;
        case "architecture": return <InfrastructureArchitectureTab />;
        // User Management (IconsAI)
        case "institutions": return <InstitutionsTab />;
        case "institution-users": return <InstitutionUsersTab />;
        case "user-activity-logs": return <UserActivityLogsTab />;
        case "emotion-analytics": return <EmotionAnalyticsTab />;
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
    <div className="h-screen w-full bg-background overflow-hidden">
      {/* Sidebar - Fixed full height */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main content wrapper with dynamic left margin */}
      <div className={`${sidebarWidth} relative z-10 transition-all duration-500 ease-in-out h-screen flex flex-col`}>
        {/* Header */}
        <header className={`h-14 bg-background/80 backdrop-blur-md border-b border-border/50 fixed top-0 right-0 z-30 flex items-center justify-between px-6 transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'left-[72px]' : 'left-[280px]'}`}>
          {/* Left: Logo + Admin Panel title */}
          <div className="flex items-center gap-3">
            <img
              src={iconsaiAdminLogo}
              alt="IconsAI"
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              {t('admin.panel')}
            </span>
          </div>

          {/* Right: Language + User */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-5">
              {/* Language Selector with Tooltip */}
              <Tooltip>
              <TooltipTrigger asChild>
                  <div>
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
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Mudar Idioma</p>
                </TooltipContent>
              </Tooltip>

              {/* User Badge */}
              <UserBadge />
            </div>
          </TooltipProvider>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pt-14 opacity-100 visible bg-background">
          <div className="p-8">
            <div className="w-full">
              <ErrorBoundary key={activeTab} fallbackMessage="Erro ao carregar este módulo do painel admin">
                {renderTab()}
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
