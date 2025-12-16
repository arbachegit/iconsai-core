import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Home, 
  MessageSquare, 
  Database, 
  BarChart3, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AgentChat } from "@/components/chat/AgentChat";
import knowyouLogo from "@/assets/knowyou-admin-logo.png";

type AppView = "home" | "chat" | "data" | "analytics";

export default function AppPage() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<AppView>("chat");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems = [
    { id: "home" as AppView, label: "Início", icon: Home },
    { id: "chat" as AppView, label: "Assistente IA", icon: MessageSquare },
    { id: "data" as AppView, label: "Dados", icon: Database },
    { id: "analytics" as AppView, label: "Analytics", icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (currentView) {
      case "home":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Bem-vindo ao KnowYOU App</h1>
            <p className="text-muted-foreground text-center max-w-md">
              Sua plataforma de análise de dados e inteligência artificial. 
              Use o assistente para analisar seus dados.
            </p>
            <Button onClick={() => setCurrentView("chat")} size="lg">
              <MessageSquare className="mr-2 h-5 w-5" />
              Iniciar Chat
            </Button>
          </div>
        );
      case "chat":
        return <AgentChat agentSlug="analyst" embedded />;
      case "data":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <Database className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Área de Dados</h2>
            <p className="text-muted-foreground text-center">
              Upload e gestão de datasets em breve.
            </p>
          </div>
        );
      case "analytics":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <BarChart3 className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Analytics</h2>
            <p className="text-muted-foreground text-center">
              Relatórios e dashboards em breve.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "h-full bg-card border-r border-border flex flex-col transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!sidebarCollapsed && (
            <img src={knowyouLogo} alt="KnowYOU" className="h-8" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="shrink-0"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  sidebarCollapsed && "justify-center px-2"
                )}
                onClick={() => setCurrentView(item.id)}
              >
                <Icon className={cn("h-5 w-5", !sidebarCollapsed && "mr-3")} />
                {!sidebarCollapsed && item.label}
              </Button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-border space-y-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-muted-foreground",
              sidebarCollapsed && "justify-center px-2"
            )}
            onClick={() => navigate("/")}
          >
            <LogOut className={cn("h-5 w-5", !sidebarCollapsed && "mr-3")} />
            {!sidebarCollapsed && "Voltar ao Site"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
          <h1 className="font-semibold text-foreground">
            {menuItems.find((m) => m.id === currentView)?.label || "KnowYOU App"}
          </h1>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
