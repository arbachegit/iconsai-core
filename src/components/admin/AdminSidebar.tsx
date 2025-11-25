import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Mail,
  BarChart3,
  Image,
  Database,
  Coins,
  ArrowLeft,
  LogOut,
} from "lucide-react";

type TabType = "dashboard" | "chat" | "tooltips" | "email" | "analytics" | "images" | "cache" | "credits";

interface AdminSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    navigate("/admin/login");
  };

  const menuItems = [
    { id: "dashboard" as TabType, label: "Dashboard", icon: LayoutDashboard },
    { id: "credits" as TabType, label: "Créditos", icon: Coins },
    { id: "chat" as TabType, label: "Chat Config", icon: MessageSquare },
    { id: "tooltips" as TabType, label: "Tooltips", icon: FileText },
    { id: "email" as TabType, label: "Email", icon: Mail },
    { id: "analytics" as TabType, label: "Analytics", icon: BarChart3 },
    { id: "images" as TabType, label: "Imagens", icon: Image },
    { id: "cache" as TabType, label: "Cache", icon: Database },
  ];

  return (
    <aside className="w-64 bg-card border-r border-primary/20 flex flex-col">
      <div className="p-6 border-b border-primary/20">
        <h1 className="text-xl font-bold text-gradient">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-1">KnowYOU</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start gap-3 ${
                isActive ? "bg-gradient-primary" : ""
              }`}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-primary/20 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Site
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
};
