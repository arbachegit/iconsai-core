import { useState } from 'react';
import { Menu, X, BarChart3, Bot, GitBranch, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { AIChat } from '@/components/dashboard/AIChat';
import { IndicatorAPITable } from '@/components/dashboard/IndicatorAPITable';
import { useLandscapeMode } from '@/hooks/useLandscapeMode';
import { cn } from '@/lib/utils';

interface MobilePlatformViewProps {
  isAdmin?: boolean;
}

type ViewType = 'chat' | 'api' | 'dataflow-architecture' | 'dataflow-new-domain' | 
  'dataflow-talk-app' | 'dataflow-retail-system' | 'dataflow-autocontrol' | 'dataflow-gov-system';

const dataFlowItems: { id: ViewType; label: string }[] = [
  { id: 'dataflow-architecture', label: 'Architecture' },
  { id: 'dataflow-new-domain', label: 'New Domain' },
  { id: 'dataflow-talk-app', label: 'Talk APP' },
  { id: 'dataflow-retail-system', label: 'Retail System' },
  { id: 'dataflow-autocontrol', label: 'AutoControl' },
  { id: 'dataflow-gov-system', label: 'Gov System AI' },
];

export function MobilePlatformView({ isAdmin = false }: MobilePlatformViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('chat');
  const [dataFlowExpanded, setDataFlowExpanded] = useState(false);

  const isDataFlowView = activeView.startsWith('dataflow-');
  const { showRotateMessage } = useLandscapeMode(isDataFlowView);

  const handleMenuClick = (viewId: ViewType) => {
    setActiveView(viewId);
    setMenuOpen(false);
  };

  const getDataFlowLabel = () => {
    const item = dataFlowItems.find(i => i.id === activeView);
    return item?.label || 'DataFlow';
  };

  // Se não é admin, mostra apenas o chat fullscreen
  if (!isAdmin) {
    return (
      <div className="h-screen w-full bg-background">
        <AIChat />
      </div>
    );
  }

  // Admin: Chat + Hamburger Menu
  return (
    <div className="h-screen w-full bg-background flex flex-col">
      {/* Header com Hamburger */}
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
        <h1 className="text-lg font-semibold text-foreground">KnowYOU</h1>
        
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
            <nav className="flex flex-col pt-6">
              <div className="px-4 pb-4 border-b border-border">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Menu
                </h2>
              </div>

              {/* API */}
              <button
                onClick={() => handleMenuClick('api')}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                  activeView === 'api' && "bg-muted text-primary font-medium"
                )}
              >
                <BarChart3 className="h-5 w-5" />
                <span>API</span>
              </button>

              {/* IA */}
              <button
                onClick={() => handleMenuClick('chat')}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                  activeView === 'chat' && "bg-muted text-primary font-medium"
                )}
              >
                <Bot className="h-5 w-5" />
                <span>IA</span>
              </button>

              {/* DataFlow (expansível) */}
              <div className="border-t border-border">
                <button
                  onClick={() => setDataFlowExpanded(!dataFlowExpanded)}
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                    isDataFlowView && "text-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <GitBranch className="h-5 w-5" />
                    <span>DataFlow</span>
                  </div>
                  {dataFlowExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                
                {dataFlowExpanded && (
                  <div className="bg-muted/30">
                    {dataFlowItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleMenuClick(item.id)}
                        className={cn(
                          "w-full text-left pl-12 pr-4 py-2.5 text-sm hover:bg-muted/50 transition-colors",
                          activeView === item.id && "bg-muted text-primary font-medium"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      {/* Conteúdo baseado na view ativa */}
      <main className="flex-1 overflow-hidden">
        {activeView === 'chat' && <AIChat />}
        
        {activeView === 'api' && (
          <div className="h-full overflow-auto p-4">
            <IndicatorAPITable />
          </div>
        )}
        
        {isDataFlowView && (
          <div className="h-full flex flex-col">
            {showRotateMessage && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg mx-4 mt-4 p-4 flex items-center gap-3">
                <RotateCcw className="h-5 w-5 text-primary animate-pulse" />
                <p className="text-sm text-foreground">
                  Rotacione o celular para melhor visualização do {getDataFlowLabel()}
                </p>
              </div>
            )}
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-card rounded-lg border border-border p-6 min-h-[300px] flex items-center justify-center">
                <div className="text-center space-y-2">
                  <GitBranch className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-semibold">{getDataFlowLabel()}</h3>
                  <p className="text-sm text-muted-foreground">
                    Visualização do fluxo de dados
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
