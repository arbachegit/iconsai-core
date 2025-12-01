import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Mail,
  BarChart3,
  ArrowLeft,
  LogOut,
  MessagesSquare,
  Image,
  Youtube,
  BookOpen,
  Database,
  GitBranch,
  Tags,
  Search,
  ChevronDown,
  Zap,
  MessageCircle,
  Brain,
  Palette,
  Settings,
  Route,
  TestTube,
} from "lucide-react";

type TabType = "dashboard" | "chat" | "tooltips" | "gmail" | "analytics" | "conversations" | "images" | "youtube" | "documents" | "rag-metrics" | "version-control" | "tags" | "document-analysis" | "document-routing-logs" | "rag-diagnostics" | "chat-scope-config" | "rag-documentation" | "content-management";

interface AdminSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState<string[]>(["quick-access"]);

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    navigate("/admin/login");
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const menuCategories = [
    {
      id: "quick-access",
      label: "Acesso Rápido",
      icon: Zap,
      items: [
        { id: "dashboard" as TabType, label: "Dashboard", icon: LayoutDashboard },
        { id: "documents" as TabType, label: "RAG Documentos", icon: FileText },
      ]
    },
    {
      id: "chat",
      label: "Chat & Conversas",
      icon: MessageCircle,
      items: [
        { id: "chat" as TabType, label: "Chat Config", icon: MessageSquare },
        { id: "chat-scope-config" as TabType, label: "Delimitações", icon: Settings },
        { id: "conversations" as TabType, label: "Conversas", icon: MessagesSquare },
        { id: "rag-diagnostics" as TabType, label: "Diagnóstico RAG", icon: TestTube },
      ]
    },
    {
      id: "rag",
      label: "RAG & Análise",
      icon: Brain,
      items: [
        { id: "rag-documentation" as TabType, label: "📖 Documentação RAG", icon: BookOpen },
        { id: "rag-metrics" as TabType, label: "Métricas RAG", icon: Database },
        { id: "tags" as TabType, label: "Gerenciar Tags", icon: Tags },
        { id: "document-analysis" as TabType, label: "Análise Documentos", icon: Search },
        { id: "document-routing-logs" as TabType, label: "Logs de Roteamento", icon: Route },
      ]
    },
    {
      id: "media",
      label: "Mídia e Conteúdo",
      icon: Palette,
      items: [
        { id: "content-management" as TabType, label: "Seções Landing Page", icon: FileText },
        { id: "tooltips" as TabType, label: "Tooltips", icon: MessageCircle },
        { id: "images" as TabType, label: "Cache de Imagens", icon: Image },
        { id: "youtube" as TabType, label: "YouTube Preload", icon: Youtube },
      ]
    },
    {
      id: "system",
      label: "Sistema",
      icon: Settings,
      items: [
        { id: "version-control" as TabType, label: "Versionamento", icon: GitBranch },
        { id: "gmail" as TabType, label: "Gmail", icon: Mail },
        { id: "analytics" as TabType, label: "Analytics", icon: BarChart3 },
      ]
    }
  ];

  return (
    <>
      <aside className="w-64 bg-card border-r border-primary/20 flex flex-col h-screen">
        <div className="p-6 border-b border-primary/20">
          <h1 className="text-xl font-bold text-gradient">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">KnowYOU</p>
        </div>

        <nav className="flex-1 p-4 pb-44 space-y-1 overflow-y-auto">
          {menuCategories.map((category, index) => (
            <div key={category.id}>
              {index > 0 && <Separator className="my-2 bg-primary/10" />}
              
              <Collapsible 
                open={openSections.includes(category.id)}
                onOpenChange={() => toggleSection(category.id)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors">
                  <div className="flex items-center gap-2">
                    <category.icon className="w-3 h-3" />
                    {category.label}
                  </div>
                  <ChevronDown className={`w-3 h-3 transition-transform ${openSections.includes(category.id) ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-1 mt-1">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "default" : "ghost"}
                        className={`w-full justify-start gap-3 ${isActive ? "bg-gradient-primary" : ""}`}
                        onClick={() => onTabChange(item.id)}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </nav>
      </aside>

      <div className="fixed bottom-0 left-0 w-64 p-4 border-t border-primary/20 bg-card space-y-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={() => navigate("/docs")}
        >
          <BookOpen className="w-4 h-4" />
          Documentação
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-primary hover:text-primary"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao APP
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
    </>
  );
};
