import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  FileText, Download, Loader2, ArrowUp, List, Folder, 
  FileCode, Layers, Code, Server, GitBranch, CheckSquare, Cpu, Menu, FileCode2
} from 'lucide-react';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

// Sections data structure
const sections = [
  { id: 'capa', title: 'Capa', icon: FileText },
  { id: 'indice', title: 'Índice', icon: List },
  { id: 'estrutura-diretorios', title: '1. Estrutura de Diretórios', icon: Folder },
  { id: 'convencoes-nomenclatura', title: '2. Convenções de Nomenclatura', icon: FileCode },
  { id: 'inventario-componentes', title: '3. Inventário de Componentes', icon: Layers },
  { id: 'hooks-customizados', title: '4. Hooks Customizados', icon: Code },
  { id: 'edge-functions', title: '5. Edge Functions', icon: Server },
  { id: 'hierarquia-componentes', title: '6. Hierarquia de Componentes', icon: GitBranch },
  { id: 'padroes-codigo', title: '7. Padrões de Código', icon: FileCode2 },
  { id: 'checklist-review', title: '8. Checklist de Code Review', icon: CheckSquare },
  { id: 'tecnologias', title: 'Tecnologias', icon: Cpu },
];

const Documentation = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isExporting, setIsExporting] = useState(false);
  const [activeSection, setActiveSection] = useState('capa');
  const [readProgress, setReadProgress] = useState(0);

  // Smooth scroll to section
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', `#${id}`);
    }
  };

  // Progress bar
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      setReadProgress((scrolled / documentHeight) * 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver for active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // URL hash navigation
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => scrollToSection(hash), 100);
    }
  }, []);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('documentation-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0a0a0f',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      let heightLeft = imgHeight * ratio;
      let position = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight * ratio;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pdfHeight;
      }

      pdf.save('KnowRisk-Guia-de-Estilo.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const directoryStructure = `graph TD
    A[src/] --> B[components/]
    A --> C[pages/]
    A --> D[hooks/]
    A --> E[lib/]
    A --> F[integrations/]
    A --> G[i18n/]
    
    B --> B1[admin/]
    B --> B2[ui/]
    B --> B3[Core Components]
    
    C --> C1[Index.tsx]
    C --> C2[Admin.tsx]
    C --> C3[AdminLogin.tsx]
    C --> C4[Documentation.tsx]
    
    D --> D1[useChatKnowYOU.ts]
    D --> D2[useChatStudy.ts]
    D --> D3[useAdminSettings.ts]
    
    style A fill:#8B5CF6
    style B fill:#10B981
    style C fill:#3B82F6
    style D fill:#F59E0B`;

  const componentHierarchy = `graph TD
    A[App.tsx] --> B[Index.tsx]
    B --> C[Header]
    B --> D[HeroSection]
    B --> E[Section Components]
    B --> F[TuringLegacy]
    B --> G[DigitalExclusionSection]
    B --> H[MediaCarousel]
    B --> I[FloatingChatButton]
    
    E --> E1[Software]
    E --> E2[Internet]
    E --> E3[Tech Sem Propósito]
    E --> E4[Watson]
    E --> E5[Nova Era]
    E --> E6[KnowYOU Chat]
    E --> E7[Bom Prompt]
    
    I --> J[ChatModal]
    J --> K[ChatStudy]
    
    C --> L[Language Selector]
    C --> M[Scroll Progress]
    
    style A fill:#8B5CF6
    style B fill:#10B981
    style I fill:#F59E0B`;

  // Sidebar navigation component
  const SidebarNav = () => (
    <aside className="fixed left-8 top-24 w-64 h-[calc(100vh-12rem)] overflow-y-auto space-y-1 pr-4">
      <div className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Navegação
      </div>
      <nav className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{section.title}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-6 pt-4 border-t border-border">
        <Button
          onClick={exportToPDF}
          disabled={isExporting}
          size="sm"
          className="w-full gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Exportar PDF
            </>
          )}
        </Button>
      </div>
    </aside>
  );

  // Mobile dropdown navigation
  const MobileNav = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg">
          <Menu className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <DropdownMenuItem
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "flex items-center gap-2",
                activeSection === section.id && "bg-primary/10 font-medium"
              )}
            >
              <Icon className="h-4 w-4" />
              {section.title}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Back to index button
  const BackToIndex = () => (
    <div className="flex justify-end mt-4">
      <button
        onClick={() => scrollToSection('indice')}
        className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
      >
        <ArrowUp className="h-4 w-4" />
        Voltar ao índice
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-muted z-50">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* Desktop sidebar navigation */}
      {!isMobile && <SidebarNav />}

      {/* Mobile navigation */}
      {isMobile && <MobileNav />}

      {/* Main content */}
      <div className={cn(
        "container mx-auto px-4 py-8",
        !isMobile ? "max-w-4xl ml-auto mr-8" : "max-w-6xl"
      )}>
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Guia de Estilo de Código</h1>
          </div>
          {isMobile && (
            <Button
              onClick={exportToPDF}
              disabled={isExporting}
              size="sm"
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>

        <div id="documentation-content" className="space-y-8">
          {/* Capa */}
          <Card id="capa" className="p-12 text-center bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 scroll-mt-20">
            <h1 className="text-5xl font-bold mb-4">KnowRisk</h1>
            <h2 className="text-3xl mb-6">Guia de Estilo de Código</h2>
            <p className="text-muted-foreground">
              Convenções, Padrões e Arquitetura do Projeto
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Gerado em: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </Card>

          {/* Índice */}
          <Card id="indice" className="p-6 scroll-mt-20">
            <h2 className="text-2xl font-bold mb-4">Índice</h2>
            <ol className="space-y-2">
              {sections.slice(2).map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollToSection(section.id)}
                    className="text-left hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline"
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ol>
          </Card>

          {/* 1. Estrutura de Diretórios */}
          <Card id="estrutura-diretorios" className="p-6 scroll-mt-20">
            <h2 className="text-2xl font-bold mb-4">1. Estrutura de Diretórios</h2>
            <MermaidDiagram chart={directoryStructure} id="directory-structure" />
            
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">src/components/</h3>
                <p className="text-muted-foreground">Componentes React reutilizáveis</p>
                <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground mt-2">
                  <li><code>admin/</code> - Componentes da área administrativa</li>
                  <li><code>ui/</code> - Componentes base (shadcn/ui)</li>
                  <li>Componentes core no nível raiz</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">src/pages/</h3>
                <p className="text-muted-foreground">Páginas principais da aplicação</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">src/hooks/</h3>
                <p className="text-muted-foreground">React hooks customizados</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">src/lib/</h3>
                <p className="text-muted-foreground">Utilitários e helpers</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">supabase/functions/</h3>
                <p className="text-muted-foreground">Edge Functions (backend serverless)</p>
              </div>
            </div>
            <BackToIndex />
          </Card>

          {/* 2. Convenções de Nomenclatura */}
          <Card id="convencoes-nomenclatura" className="p-6 scroll-mt-20">
            <h2 className="text-2xl font-bold mb-4">2. Convenções de Nomenclatura</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-primary">PascalCase</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="mb-2"><strong>Uso:</strong> Componentes React, Interfaces TypeScript, Types</p>
                  <code className="text-sm">HeroSection.tsx, ChatKnowYOU.tsx, AdminSettings</code>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-secondary">camelCase</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="mb-2"><strong>Uso:</strong> Variáveis, funções, hooks customizados</p>
                  <code className="text-sm">useChatKnowYOU, sendMessage, audioRef</code>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-accent">kebab-case</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="mb-2"><strong>Uso:</strong> Componentes UI (shadcn), Edge Functions</p>
                  <code className="text-sm">alert-dialog.tsx, text-to-speech</code>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-orange-500">SCREAMING_SNAKE_CASE</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="mb-2"><strong>Uso:</strong> Constantes globais</p>
                  <code className="text-sm">CREDITS_EXHAUSTED_KEY, MAX_RETRIES</code>
                </div>
              </div>
            </div>
            <BackToIndex />
          </Card>

          {/* 3. Inventário de Componentes */}
          <Card id="inventario-componentes" className="p-6 scroll-mt-20">
            <h2 className="text-2xl font-bold mb-4">3. Inventário de Componentes</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">Core Components (26)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'AIHistoryPanel.tsx - Modal com timeline da história da IA',
                    'AudioControls.tsx - Controles de áudio (Play/Stop/Download)',
                    'ChatKnowYOU.tsx - Chat assistente de saúde',
                    'ChatModal.tsx - Modal wrapper para chat',
                    'ChatStudy.tsx - Chat assistente de estudos',
                    'DigitalExclusionSection.tsx - Seção exclusão digital',
                    'DraggablePreviewPanel.tsx - Painel arrastável tooltips',
                    'FloatingChatButton.tsx - Botão flutuante chat',
                    'Header.tsx - Cabeçalho com navegação',
                    'HeroSection.tsx - Hero com animação partículas',
                    'MediaCarousel.tsx - Carrossel Spotify/YouTube',
                    'MermaidDiagram.tsx - Renderizador de diagramas',
                    'MarkdownContent.tsx - Renderizador Markdown',
                    'MobileHistoryCarousel.tsx - Carrossel mobile',
                    'NavLink.tsx - Links de navegação',
                    'ScrollToTopButton.tsx - Botão voltar ao topo',
                    'Section.tsx - Container de seção',
                    'TooltipIcon.tsx - Ícone tooltip com indicador',
                    'TuringLegacy.tsx - Seção Alan Turing',
                    'TypingIndicator.tsx - Indicador digitando',
                  ].map((item, i) => (
                    <div key={i} className="bg-muted/30 p-3 rounded text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Admin Components (8)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'AdminSidebar.tsx - Menu lateral admin',
                    'AnalyticsTab.tsx - Dashboard analytics',
                    'ChatConfigTab.tsx - Configurações chat',
                    'ConversationsTab.tsx - Histórico conversas',
                    'DashboardTab.tsx - Visão geral',
                    'GmailTab.tsx - Integração Gmail',
                    'ImageCacheTab.tsx - Gestão cache imagens',
                    'TooltipsTab.tsx - Editor tooltips',
                    'YouTubeCacheTab.tsx - Cache YouTube',
                  ].map((item, i) => (
                    <div key={i} className="bg-muted/30 p-3 rounded text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">UI Components (45)</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Componentes shadcn/ui: accordion, alert, alert-dialog, avatar, badge, button, 
                  calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, 
                  dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, 
                  menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, 
                  scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, 
                  table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip
                </p>
              </div>
            </div>
            <BackToIndex />
          </Card>

          {/* 4. Hooks Customizados */}
          <Card id="hooks-customizados" className="p-6 scroll-mt-20">
            <h2 className="text-2xl font-bold mb-4">4. Hooks Customizados</h2>
            
            <div className="space-y-4">
              {[
                {
                  name: 'useChatKnowYOU',
                  file: 'src/hooks/useChatKnowYOU.ts',
                  desc: 'Gerencia chat assistente de saúde com streaming AI, TTS, sentimento',
                },
                {
                  name: 'useChatStudy',
                  file: 'src/hooks/useChatStudy.ts',
                  desc: 'Gerencia chat assistente de estudos com AI e histórico',
                },
                {
                  name: 'useAdminSettings',
                  file: 'src/hooks/useAdminSettings.ts',
                  desc: 'Carrega configurações admin do banco de dados',
                },
                {
                  name: 'useChatAnalytics',
                  file: 'src/hooks/useChatAnalytics.ts',
                  desc: 'Rastreia analytics de conversações e interações',
                },
                {
                  name: 'useTooltipContent',
                  file: 'src/hooks/useTooltipContent.ts',
                  desc: 'Carrega conteúdo dinâmico de tooltips',
                },
                {
                  name: 'useYouTubeAutoPreload',
                  file: 'src/hooks/useYouTubeAutoPreload.ts',
                  desc: 'Pré-carrega vídeos YouTube com cache',
                },
                {
                  name: 'use-mobile',
                  file: 'src/hooks/use-mobile.tsx',
                  desc: 'Detecta viewport mobile/desktop',
                },
                {
                  name: 'use-toast',
                  file: 'src/hooks/use-toast.ts',
                  desc: 'Sistema de notificações toast',
                },
              ].map((hook) => (
                <div key={hook.name} className="bg-muted/30 p-4 rounded">
                  <code className="text-primary font-semibold">{hook.name}</code>
                  <p className="text-sm text-muted-foreground mt-1">{hook.file}</p>
                  <p className="text-sm mt-2">{hook.desc}</p>
                </div>
              ))}
            </div>
            <BackToIndex />
          </Card>

          {/* 5. Edge Functions */}
          <Card id="edge-functions" className="p-6 scroll-mt-20">
            <h2 className="text-2xl font-bold mb-4">5. Edge Functions (Backend)</h2>
            
            <div className="space-y-4">
              {[
                {
                  name: 'chat',
                  desc: 'Streaming AI chat usando Lovable AI Gateway (Gemini Pro)',
                },
                {
                  name: 'chat-study',
                  desc: 'Chat focado em estudos KnowRISK/ACC',
                },
                {
                  name: 'text-to-speech',
                  desc: 'Geração áudio via ElevenLabs (Fernando Arbache)',
                },
                {
                  name: 'voice-to-text',
                  desc: 'Transcrição áudio via OpenAI Whisper',
                },
                {
                  name: 'generate-image',
                  desc: 'Geração imagens via Gemini 3 Pro Image',
                },
                {
                  name: 'generate-history-image',
                  desc: 'Imagens específicas timeline IA',
                },
                {
                  name: 'generate-section-image',
                  desc: 'Imagens para seções landing page',
                },
                {
                  name: 'analyze-sentiment',
                  desc: 'Análise de sentimento conversas',
                },
                {
                  name: 'sentiment-alert',
                  desc: 'Alertas sentimento negativo',
                },
                {
                  name: 'send-email',
                  desc: 'Envio emails via Resend API',
                },
                {
                  name: 'youtube-videos',
                  desc: 'Busca vídeos YouTube com cache',
                },
              ].map((func) => (
                <div key={func.name} className="bg-muted/30 p-4 rounded">
                  <code className="text-secondary font-semibold">{func.name}</code>
                  <p className="text-sm mt-2">{func.desc}</p>
                </div>
              ))}
            </div>
            <BackToIndex />
          </Card>

          {/* 6. Hierarquia de Componentes */}
          <Card id="hierarquia-componentes" className="p-6 scroll-mt-20">
            <h2 className="text-2xl font-bold mb-4">6. Hierarquia de Componentes</h2>
            <MermaidDiagram chart={componentHierarchy} id="component-hierarchy" />
            <BackToIndex />
          </Card>

          {/* 7. Padrões de Código */}
          <Card id="padroes-codigo" className="p-6 scroll-mt-20">
            <h2 className="text-2xl font-bold mb-4">7. Padrões de Código</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">React Component Pattern</h3>
                <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-xs">
{`import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MyComponentProps {
  title: string;
  className?: string;
}

export const MyComponent = ({ title, className }: MyComponentProps) => {
  const [state, setState] = useState<string>('');

  return (
    <div className={cn("base-styles", className)}>
      <h2>{title}</h2>
    </div>
  );
};`}
                </pre>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Custom Hook Pattern</h3>
                <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-xs">
{`import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMyHook = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Fetch logic
    setLoading(false);
  };

  return { data, loading, loadData };
};`}
                </pre>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Tailwind + cn() Pattern</h3>
                <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-xs">
{`import { cn } from '@/lib/utils';

// Uso de tokens semânticos
<div className={cn(
  "bg-background text-foreground",
  "border border-border",
  isActive && "bg-primary text-primary-foreground",
  className
)} />`}
                </pre>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">i18n Pattern</h3>
                <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-xs">
{`import { useTranslation } from 'react-i18next';

export const Component = () => {
  const { t } = useTranslation();
  
  return <h1>{t('hero.title')}</h1>;
};`}
                </pre>
              </div>
            </div>
            <BackToIndex />
          </Card>

          {/* 8. Checklist */}
          <Card id="checklist-review" className="p-6 scroll-mt-20">
            <h2 className="text-2xl font-bold mb-4">8. Code Review Checklist</h2>
            
            <div className="space-y-3">
              {[
                '✓ Nomenclatura segue convenções (PascalCase, camelCase, etc.)',
                '✓ Imports organizados: React → Third-party → Local',
                '✓ Tipos TypeScript definidos (interfaces/types)',
                '✓ Props components tipadas com interface',
                '✓ Estados com tipos explícitos useState<Type>()',
                '✓ Estilos usando cn() e tokens semânticos',
                '✓ Sem cores hardcoded (text-white, bg-black)',
                '✓ i18n implementado (useTranslation + t())',
                '✓ Validação de entrada em Edge Functions',
                '✓ Variáveis ambiente checadas (VITE_*, process.env)',
                '✓ RLS policies configuradas em tabelas',
                '✓ Cleanup em useEffect (audio, listeners)',
                '✓ Loading states para operações async',
                '✓ Error handling com try-catch',
                '✓ Acessibilidade (aria-labels, roles)',
                '✓ Mobile-first responsive design',
                '✓ Performance (lazy loading, memoization)',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <BackToIndex />
          </Card>

          {/* Tecnologias */}
          <Card id="tecnologias" className="p-6 scroll-mt-20">
            <h2 className="text-2xl font-bold mb-4">Tecnologias Principais</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/30 p-4 rounded">
                <h3 className="font-semibold mb-2">Frontend</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>React 18</li>
                  <li>TypeScript</li>
                  <li>Tailwind CSS</li>
                  <li>Vite</li>
                  <li>shadcn/ui</li>
                  <li>React Router</li>
                  <li>React Query</li>
                </ul>
              </div>

              <div className="bg-muted/30 p-4 rounded">
                <h3 className="font-semibold mb-2">Backend</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Lovable Cloud</li>
                  <li>PostgreSQL</li>
                  <li>Edge Functions</li>
                  <li>Row Level Security</li>
                  <li>Realtime subscriptions</li>
                </ul>
              </div>

              <div className="bg-muted/30 p-4 rounded">
                <h3 className="font-semibold mb-2">APIs Externas</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Lovable AI (Gemini)</li>
                  <li>ElevenLabs TTS</li>
                  <li>OpenAI Whisper</li>
                  <li>YouTube Data API</li>
                  <li>Resend Email</li>
                </ul>
              </div>
            </div>
            <BackToIndex />
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-8 border-t border-border">
            <p>KnowRisk Application - Guia de Estilo de Código</p>
            <p className="mt-1">© 2024 KnowRisk - Todos os direitos reservados</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
