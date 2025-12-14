import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  BarChart3, 
  Bot, 
  TrendingUp, 
  MapPin, 
  Database,
  Monitor,
  LogOut
} from "lucide-react";

export type DashboardTabType = "indicators" | "ai" | "analytics" | "analytics-uf" | "charts";

interface DashboardSidebarProps {
  activeTab: DashboardTabType;
  onTabChange: (tab: DashboardTabType) => void;
  onLogout: () => void;
}

const menuItems: { id: DashboardTabType; label: string; icon: React.ElementType }[] = [
  { id: "indicators", label: "Indicadores de Uso", icon: BarChart3 },
  { id: "ai", label: "IA", icon: Bot },
  { id: "analytics", label: "Data Analytics", icon: TrendingUp },
  { id: "analytics-uf", label: "Data Analytics UF", icon: MapPin },
  { id: "charts", label: "Chart Database", icon: Database },
];

export function DashboardSidebar({ activeTab, onTabChange, onLogout }: DashboardSidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="w-64 bg-sidebar border-r border-border flex flex-col shrink-0 relative">
      {/* Menu Items */}
      <div className="flex-1 py-4 px-3 pb-28">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-11 px-3 transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Floating Control Panel Dock */}
      <div className="absolute bottom-0 left-0 w-full z-50 bg-[#0B1120] border-t border-white/10 p-3">
        <div className="flex flex-col gap-1">
          <Button 
            variant="ghost" 
            className="group w-full justify-start gap-3 h-9 rounded-lg text-primary hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
            onClick={() => navigate("/")}
          >
            <Monitor className="w-4 h-4 shrink-0 group-hover:text-black" />
            <span className="whitespace-nowrap">Voltar ao APP</span>
          </Button>

          <Button 
            variant="ghost" 
            className="group w-full justify-start gap-3 h-9 rounded-lg text-destructive hover:bg-[#FF3366] hover:text-white hover:shadow-[0_0_15px_rgba(255,51,102,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 shrink-0 group-hover:text-white" />
            <span className="whitespace-nowrap">Sair</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
