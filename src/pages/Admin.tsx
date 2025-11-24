import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { DashboardTab } from "@/components/admin/DashboardTab";
import { ChatConfigTab } from "@/components/admin/ChatConfigTab";
import { TooltipsTab } from "@/components/admin/TooltipsTab";
import { GmailTab } from "@/components/admin/GmailTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";

type TabType = "dashboard" | "chat" | "tooltips" | "gmail" | "analytics";

const Admin = () => {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const isAuthenticated = localStorage.getItem("admin_authenticated");
    if (!isAuthenticated) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab />;
      case "chat":
        return <ChatConfigTab />;
      case "tooltips":
        return <TooltipsTab />;
      case "gmail":
        return <GmailTab />;
      case "analytics":
        return <AnalyticsTab />;
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
