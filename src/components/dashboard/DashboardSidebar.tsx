import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, 
  Bot, 
  TrendingUp, 
  MapPin, 
  Database,
  Monitor,
  LogOut,
  Menu,
  X,
  Search,
  ChevronUp,
  ChevronDown,
  Settings
} from "lucide-react";

export type DashboardTabType = "indicators" | "ai" | "data-analysis" | "analytics-uf" | "chart-database" | "table-database";

interface DashboardSidebarProps {
  activeTab: DashboardTabType;
  onTabChange: (tab: DashboardTabType) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const menuItems: { id: DashboardTabType; label: string; icon: React.ElementType }[] = [
  { id: "indicators", label: "Indicadores de Uso", icon: BarChart3 },
  { id: "ai", label: "IA", icon: Bot },
  { id: "data-analysis", label: "Data Analysis", icon: TrendingUp },
  { id: "analytics-uf", label: "Data Analytics UF", icon: MapPin },
  { id: "chart-database", label: "Chart Data Base", icon: Database },
  { id: "table-database", label: "Table Data Base", icon: Database },
];

export function DashboardSidebar({ 
  activeTab, 
  onTabChange, 
  onLogout,
  isCollapsed,
  onToggleCollapse
}: DashboardSidebarProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isControlCenterCollapsed, setIsControlCenterCollapsed] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Check if user is superadmin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "superadmin")
        .maybeSingle();

      setIsSuperAdmin(!!roleData);
    };

    checkSuperAdmin();
  }, []);

  // Check scroll position
  const handleNavScroll = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    
    const { scrollTop, scrollHeight, clientHeight } = nav;
    setCanScrollUp(scrollTop > 10);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 10);
  }, []);

  // Filter menu items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems;
    const query = searchQuery.toLowerCase();
    return menuItems.filter(item => 
      item.label.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Resize observer for scroll indicators
  useEffect(() => {
    handleNavScroll();
    const nav = navRef.current;
    if (!nav) return;

    const resizeObserver = new ResizeObserver(handleNavScroll);
    resizeObserver.observe(nav);
    
    return () => resizeObserver.disconnect();
  }, [handleNavScroll, filteredItems]);

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={`
          ${isCollapsed ? 'w-[72px]' : 'w-[256px]'} 
          bg-sidebar border-r border-border 
          fixed left-0 top-0 h-screen z-50 
          flex flex-col overflow-hidden 
          transition-all duration-500 ease-in-out
        `}
      >
        {/* TOP HEADER: Hamburger + Search */}
        <div className={`
          border-b border-border shrink-0
          flex transition-all duration-500 ease-in-out
          ${isCollapsed 
            ? 'flex-col items-center w-full gap-4 px-3 py-4' 
            : 'flex-row items-center w-full gap-3 px-4 py-3'}
        `}>
          {/* Hamburger Menu with Rotation Animation */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="group shrink-0 h-10 w-10 rounded-full hover:bg-[#00D4FF]/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] transition-all duration-300"
          >
            <div className="relative w-5 h-5">
              <Menu className={`w-5 h-5 absolute inset-0 transition-all duration-300 group-hover:text-[#00D4FF] ${isCollapsed ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} />
              <X className={`w-5 h-5 absolute inset-0 transition-all duration-300 group-hover:text-[#00D4FF] ${isCollapsed ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`} />
            </div>
          </Button>

          {/* Search Component */}
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="group h-10 w-10 rounded-full hover:bg-[#00D4FF]/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] transition-all duration-500 ease-in-out animate-pulse"
                  onClick={() => {
                    onToggleCollapse();
                    setTimeout(() => {
                      const searchInput = document.querySelector('input[placeholder="Buscar..."]') as HTMLInputElement;
                      searchInput?.focus();
                    }, 350);
                  }}
                >
                  <Search className="w-4 h-4 group-hover:text-[#00D4FF] transition-colors duration-300" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Buscar</TooltipContent>
            </Tooltip>
          ) : (
            <div className="relative flex-1 transition-all duration-500 ease-in-out">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-sm bg-muted/30 border-border rounded-full focus:border-primary/50 w-full"
              />
            </div>
          )}
        </div>

        {/* Top fade indicator */}
        <div 
          className={`absolute top-[100px] left-0 right-0 h-6 bg-gradient-to-b from-sidebar to-transparent z-10 pointer-events-none transition-opacity duration-200 ${canScrollUp ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* MIDDLE NAVIGATION - Scrollable */}
        <nav 
          ref={navRef}
          onScroll={handleNavScroll}
          className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'} py-4 pb-48 space-y-1`}
        >
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return isCollapsed ? (
              <div key={item.id} className="flex justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "group w-full h-12 rounded-lg transition-all duration-300 ease-in-out",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105"
                      )}
                      onClick={() => onTabChange(item.id)}
                    >
                      <Icon className={cn("w-5 h-5", !isActive && "group-hover:text-black")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "group w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all duration-300 ease-in-out",
                  isActive
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 text-muted-foreground hover:text-black"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className={cn("h-5 w-5 shrink-0", !isActive && "group-hover:text-black")} />
                <span className="truncate">{item.label}</span>
              </Button>
            );
          })}
        </nav>

        {/* Bottom fade indicator */}
        <div 
          className={`absolute bottom-[200px] left-0 right-0 h-6 bg-gradient-to-t from-sidebar to-transparent z-10 pointer-events-none transition-opacity duration-200 ${canScrollDown ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* BOTTOM DOCK - Control Center */}
        <div className="absolute bottom-0 left-0 w-full z-50 bg-[#0B1120] border-t border-white/10 p-2 transition-all duration-200">
          {/* Chevron Toggle - Only visible when sidebar is expanded */}
          {!isCollapsed && (
            <button
              onClick={() => setIsControlCenterCollapsed(!isControlCenterCollapsed)}
              className="group absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-[#0B1120] border border-white/10 rounded-full p-0.5 hover:bg-[#00D4FF] hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-110 transition-all duration-300 ease-in-out"
            >
              {isControlCenterCollapsed ? (
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-black" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-black" />
              )}
            </button>
          )}

          {isCollapsed ? (
            // SCENARIO A: Sidebar COLLAPSED - Vertical icons only
            <div className="flex flex-col items-center gap-1">
              {isSuperAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="group h-10 w-10 rounded-lg hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                      onClick={() => navigate("/admin")}
                    >
                      <Settings className="w-4 h-4 group-hover:text-black" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Admin</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-10 w-10 rounded-lg text-primary hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                    onClick={() => navigate("/")}
                  >
                    <Monitor className="w-4 h-4 group-hover:text-black" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Voltar ao APP</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-10 w-10 rounded-lg text-destructive hover:bg-[#FF3366] hover:text-white hover:shadow-[0_0_15px_rgba(255,51,102,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                    onClick={onLogout}
                  >
                    <LogOut className="w-4 h-4 group-hover:text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            </div>
          ) : isControlCenterCollapsed ? (
            // SCENARIO B-2: Sidebar EXPANDED + Control Center COLLAPSED - Horizontal row
            <div className="flex flex-row items-center justify-around py-1">
              {isSuperAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="group h-9 w-9 rounded-lg hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                      onClick={() => navigate("/admin")}
                    >
                      <Settings className="w-4 h-4 group-hover:text-black" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Admin</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-9 w-9 rounded-lg text-primary hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                    onClick={() => navigate("/")}
                  >
                    <Monitor className="w-4 h-4 group-hover:text-black" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Voltar ao APP</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-9 w-9 rounded-lg text-destructive hover:bg-[#FF3366] hover:text-white hover:shadow-[0_0_15px_rgba(255,51,102,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                    onClick={onLogout}
                  >
                    <LogOut className="w-4 h-4 group-hover:text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Sair</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            // SCENARIO B-1: Sidebar EXPANDED + Control Center EXPANDED - Vertical with text
            <div className="flex flex-col gap-0.5">
              {isSuperAdmin && (
                <Button 
                  variant="ghost" 
                  className="group w-full justify-start gap-3 h-9 rounded-lg hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                  onClick={() => navigate("/admin")}
                >
                  <Settings className="w-4 h-4 shrink-0 group-hover:text-black" />
                  <span className="whitespace-nowrap">Admin</span>
                </Button>
              )}

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
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
