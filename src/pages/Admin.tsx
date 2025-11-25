import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { DashboardTab } from "@/components/admin/DashboardTab";
import { ChatConfigTab } from "@/components/admin/ChatConfigTab";
import { TooltipsTab } from "@/components/admin/TooltipsTab";
import { EmailTab } from "@/components/admin/EmailTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { ImageAnalyticsTab } from "@/components/admin/ImageAnalyticsTab";
import { ImageCacheTab } from "@/components/admin/ImageCacheTab";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type TabType = "dashboard" | "chat" | "tooltips" | "email" | "analytics" | "images" | "cache";

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
      case "email":
        return <EmailTab />;
      case "analytics":
        return <AnalyticsTab />;
      case "images":
        return <ImageAnalyticsTab />;
      case "cache":
        return <ImageCacheTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {renderTab()}
        </div>
      </main>
    </div>
  );
};

export default Admin;
