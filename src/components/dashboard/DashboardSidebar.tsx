import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Bot, 
  TrendingUp, 
  MapPin, 
  Database 
} from "lucide-react";

export type DashboardTabType = "indicators" | "ai" | "analytics" | "analytics-uf" | "charts";

interface DashboardSidebarProps {
  activeTab: DashboardTabType;
  onTabChange: (tab: DashboardTabType) => void;
}

const menuItems: { id: DashboardTabType; label: string; icon: React.ElementType }[] = [
  { id: "indicators", label: "Indicadores de Uso", icon: BarChart3 },
  { id: "ai", label: "IA", icon: Bot },
  { id: "analytics", label: "Data Analytics", icon: TrendingUp },
  { id: "analytics-uf", label: "Data Analytics UF", icon: MapPin },
  { id: "charts", label: "Chart Database", icon: Database },
];

export function DashboardSidebar({ activeTab, onTabChange }: DashboardSidebarProps) {
  return (
    <aside className="w-64 bg-sidebar border-r border-border flex flex-col py-4 px-3 shrink-0">
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
    </aside>
  );
}
