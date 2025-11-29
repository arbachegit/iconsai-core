import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  FileText, Download, Loader2, Menu, Sun, Moon, Database,
  Server, Code, ArrowLeft, Maximize2, Table, GitBranch, Lock
} from 'lucide-react';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { MermaidZoomModal } from '@/components/MermaidZoomModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
  { id: 'menu-principal', title: '🏠 Menu Principal', icon: FileText },
  { id: 'database', title: '🗄️ Database', icon: Database },
  { id: 'backend', title: '⚡ Backend', icon: Server },
  { id: 'frontend', title: '🖥️ Frontend', icon: Code },
];

const Documentation = () => {
  const isMobile = useIsMobile();
  const [isExporting, setIsExporting] = useState(false);
  const [activeSection, setActiveSection] = useState('menu-principal');
  const [readProgress, setReadProgress] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('docs-theme');
    return saved !== 'light';
  });
  const [zoomModal, setZoomModal] = useState<{
    open: boolean;
    chart: string;
    id: string;
    title: string;
  }>({
    open: false,
    chart: '',
    id: '',
    title: '',
  });

  // Persist theme preference
  useEffect(() => {
    localStorage.setItem('docs-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Toggle theme
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Open zoom modal
  const openZoomModal = (chart: string, id: string, title: string) => {
    setZoomModal({ open: true, chart, id, title });
  };

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
    
    const element = document.getElementById('documentation-content');
    if (!element) {
      setIsExporting(false);
      return;
    }
    
    const container = document.querySelector('.docs-page');
    const wasLight = container?.classList.contains('docs-light');
    
    if (!wasLight) {
      container?.classList.add('docs-light');
      await new Promise(r => setTimeout(r, 100));
    }
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
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

      pdf.save('KnowRisk-Documentacao-Tecnica.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      if (!wasLight) {
        container?.classList.remove('docs-light');
      }
      setIsExporting(false);
    }
  };

  // Backend flow diagram
  const backendFlowDiagram = `flowchart TD
    subgraph Frontend["🖥️ Frontend"]
        U[Usuário] --> PDF[Upload PDF]
        U --> Chat[Chat Interface]
    end
    
    subgraph EdgeFunctions["⚡ Edge Functions"]
        PDF --> PBD[process-bulk-document]
        PBD --> VAL[Validação]
        PBD --> CLASS[Auto-Categorização LLM]
        PBD --> CHUNK[Chunking 750w]
        PBD --> EMB[Embeddings OpenAI]
        
        Chat --> CHATFN[chat / chat-study]
        CHATFN --> RAG[search-documents]
        RAG --> DB[(PostgreSQL + pgvector)]
        CHATFN --> AI[Lovable AI Gateway]
    end
    
    subgraph Outputs["📤 Outputs"]
        AI --> Stream[SSE Streaming]
        Stream --> U
    end
    
    style Frontend fill:#8B5CF6,color:#fff
    style EdgeFunctions fill:#10B981,color:#fff
    style Outputs fill:#3B82F6,color:#fff`;

  // Sidebar navigation component
  const SidebarNav = () => (
    <aside className="fixed left-8 top-24 w-64 h-[calc(100vh-12rem)] overflow-y-auto space-y-1 pr-4">
      <div className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Navegação
      </div>
      
      <div className="mb-3 pb-3 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="w-full gap-2 no-print"
        >
          {isDarkMode ? (
            <>
              <Sun className="h-4 w-4" />
              Modo Claro
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" />
              Modo Escuro
            </>
          )}
        </Button>
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
          className="w-full gap-2 no-print"
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
        <Button variant="outline" size="icon" className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg no-print">
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
              className={activeSection === section.id ? "bg-primary/10" : ""}
            >
              <Icon className="mr-2 h-4 w-4" />
              <span>{section.title}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuItem onClick={toggleTheme}>
          {isDarkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          <span>{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} disabled={isExporting}>
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          <span>{isExporting ? 'Gerando...' : 'Exportar PDF'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Back to index button
  const BackToIndex = () => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => scrollToSection('menu-principal')}
      className="gap-2 mb-6"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar ao Menu Principal
    </Button>
  );

  return (
    <div className={cn("docs-page min-h-screen transition-colors", isDarkMode ? "bg-background text-foreground" : "docs-light bg-white text-gray-900")}>
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-muted z-50 no-print">
        <div 
          className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-300"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* Sidebar Navigation (Desktop) */}
      {!isMobile && <SidebarNav />}

      {/* Mobile Navigation */}
      {isMobile && <MobileNav />}

      {/* Main Content */}
      <main className={cn("mx-auto px-6 py-12", isMobile ? "max-w-4xl" : "ml-80 mr-8 max-w-5xl")}>
        <div id="documentation-content" className="space-y-12">
          
          {/* ===== MENU PRINCIPAL ===== */}
          <section id="menu-principal" className="scroll-mt-20">
            <Card className="p-8 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-2">
              <div className="text-center space-y-6">
                <FileText className="h-20 w-20 mx-auto text-primary" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Documentação Técnica
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Sistema RAG com Auto-Categorização LLM, Processamento em Lote e Chat Multimodal
                </p>
                <div className="flex flex-wrap justify-center gap-4 pt-6">
                  <Button onClick={() => scrollToSection('database')} size="lg" className="gap-2">
                    <Database className="h-5 w-5" />
                    Database
                  </Button>
                  <Button onClick={() => scrollToSection('backend')} size="lg" variant="secondary" className="gap-2">
                    <Server className="h-5 w-5" />
                    Backend
                  </Button>
                  <Button onClick={() => scrollToSection('frontend')} size="lg" variant="outline" className="gap-2">
                    <Code className="h-5 w-5" />
                    Frontend
                  </Button>
                </div>
              </div>
            </Card>
          </section>

          {/* ===== DATABASE ===== */}
          <section id="database" className="scroll-mt-20 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Database className="h-8 w-8 text-primary" />
                🗄️ Database
              </h2>
            </div>

            <BackToIndex />

            {/* Extensões */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <GitBranch className="h-6 w-6 text-secondary" />
                Extensões
              </h3>
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-bold text-lg">pgvector</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                    <li><strong>Propósito:</strong> Busca semântica via embeddings</li>
                    <li><strong>Tipo:</strong> VECTOR(1536)</li>
                    <li><strong>Operador:</strong> <code className="bg-muted px-2 py-1 rounded">&lt;=&gt;</code> (cosine distance)</li>
                    <li><strong>Uso:</strong> Armazena embeddings gerados pela OpenAI text-embedding-3-small</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Tabelas */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Table className="h-6 w-6 text-secondary" />
                Tabelas Principais
              </h3>
              
              {/* documents */}
              <div className="space-y-6">
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-bold text-lg mb-3">documents</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Armazena PDFs processados pelo sistema RAG com metadados enriquecidos por LLM.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Coluna</th>
                          <th className="text-left p-2">Tipo</th>
                          <th className="text-left p-2">Descrição</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr><td className="p-2 font-mono">id</td><td className="p-2">UUID</td><td className="p-2">Identificador único</td></tr>
                        <tr><td className="p-2 font-mono">filename</td><td className="p-2">TEXT</td><td className="p-2">Nome do arquivo PDF</td></tr>
                        <tr><td className="p-2 font-mono">target_chat</td><td className="p-2">TEXT</td><td className="p-2">health/study/general (auto-classificado)</td></tr>
                        <tr><td className="p-2 font-mono">ai_summary</td><td className="p-2">TEXT</td><td className="p-2">Resumo LLM (150-300 palavras)</td></tr>
                        <tr><td className="p-2 font-mono">implementation_status</td><td className="p-2">TEXT</td><td className="p-2">ready/needs_review/incomplete</td></tr>
                        <tr><td className="p-2 font-mono">status</td><td className="p-2">TEXT</td><td className="p-2">pending/processing/completed/failed</td></tr>
                        <tr><td className="p-2 font-mono">total_chunks</td><td className="p-2">INTEGER</td><td className="p-2">Quantidade de chunks criados</td></tr>
                        <tr><td className="p-2 font-mono">is_readable</td><td className="p-2">BOOLEAN</td><td className="p-2">Validação de legibilidade</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 p-3 bg-background rounded border">
                    <p className="text-sm font-semibold mb-2">Foreign Keys:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <code>document_chunks.document_id</code> → <code>documents.id</code></li>
                      <li>• <code>document_tags.document_id</code> → <code>documents.id</code></li>
                    </ul>
                  </div>
                </div>

                {/* document_chunks */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-bold text-lg mb-3">document_chunks</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Chunks vetorizados com embeddings para busca semântica.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Coluna</th>
                          <th className="text-left p-2">Tipo</th>
                          <th className="text-left p-2">Descrição</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr><td className="p-2 font-mono">id</td><td className="p-2">UUID</td><td className="p-2">Identificador único</td></tr>
                        <tr><td className="p-2 font-mono">document_id</td><td className="p-2">UUID</td><td className="p-2">FK para documents</td></tr>
                        <tr><td className="p-2 font-mono">content</td><td className="p-2">TEXT</td><td className="p-2">Texto do chunk (750 palavras)</td></tr>
                        <tr><td className="p-2 font-mono">embedding</td><td className="p-2">VECTOR(1536)</td><td className="p-2">Vetor para busca semântica</td></tr>
                        <tr><td className="p-2 font-mono">chunk_index</td><td className="p-2">INTEGER</td><td className="p-2">Ordem no documento</td></tr>
                        <tr><td className="p-2 font-mono">word_count</td><td className="p-2">INTEGER</td><td className="p-2">Contagem de palavras</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* document_tags */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-bold text-lg mb-3">document_tags</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tags hierárquicas (parent/child) geradas por LLM.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Coluna</th>
                          <th className="text-left p-2">Tipo</th>
                          <th className="text-left p-2">Descrição</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr><td className="p-2 font-mono">id</td><td className="p-2">UUID</td><td className="p-2">Identificador único</td></tr>
                        <tr><td className="p-2 font-mono">document_id</td><td className="p-2">UUID</td><td className="p-2">FK para documents</td></tr>
                        <tr><td className="p-2 font-mono">tag_name</td><td className="p-2">TEXT</td><td className="p-2">Nome da tag</td></tr>
                        <tr><td className="p-2 font-mono">tag_type</td><td className="p-2">TEXT</td><td className="p-2">parent/child</td></tr>
                        <tr><td className="p-2 font-mono">parent_tag_id</td><td className="p-2">UUID</td><td className="p-2">FK para parent tag</td></tr>
                        <tr><td className="p-2 font-mono">confidence</td><td className="p-2">NUMERIC(3,2)</td><td className="p-2">Score 0.0-1.0</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Outras tabelas resumidas */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-bold text-lg mb-3">Outras Tabelas</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• <strong>conversation_history:</strong> Histórico de conversas com chat_type (study/health)</li>
                    <li>• <strong>chat_analytics:</strong> Métricas de uso (message_count, audio_plays, topics)</li>
                    <li>• <strong>admin_settings:</strong> Configurações do painel admin</li>
                    <li>• <strong>tooltip_contents:</strong> Conteúdo tooltips com áudio TTS</li>
                    <li>• <strong>generated_images:</strong> Cache de imagens geradas (Nano Banana)</li>
                    <li>• <strong>user_roles:</strong> RBAC com role 'admin'</li>
                    <li>• <strong>credits_usage:</strong> Log de consumo de créditos API</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* RLS Policies */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Lock className="h-6 w-6 text-secondary" />
                Políticas RLS (Row Level Security)
              </h3>
              <div className="space-y-4">
                <div className="border-l-4 border-destructive pl-4">
                  <h4 className="font-bold">admin_settings</h4>
                  <ul className="list-disc list-inside text-muted-foreground text-sm mt-2">
                    <li>SELECT/UPDATE: Apenas admins autenticados</li>
                    <li>Protege gmail_notification_email de acesso público</li>
                  </ul>
                </div>
                <div className="border-l-4 border-destructive pl-4">
                  <h4 className="font-bold">documents</h4>
                  <ul className="list-disc list-inside text-muted-foreground text-sm mt-2">
                    <li>INSERT/UPDATE: Sistema pode inserir (verify_jwt = false)</li>
                    <li>SELECT/DELETE: Apenas admins</li>
                  </ul>
                </div>
                <div className="border-l-4 border-warning pl-4">
                  <h4 className="font-bold">conversation_history</h4>
                  <ul className="list-disc list-inside text-muted-foreground text-sm mt-2">
                    <li>ALL: Acesso público para INSERT/SELECT/UPDATE/DELETE</li>
                    <li>Permite salvar conversas sem autenticação</li>
                  </ul>
                </div>
              </div>
            </Card>
          </section>

          {/* ===== BACKEND ===== */}
          <section id="backend" className="scroll-mt-20 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Server className="h-8 w-8 text-primary" />
                ⚡ Backend
              </h2>
            </div>

            <BackToIndex />

            {/* Diagrama de Fluxo Principal */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-semibold">Diagrama de Fluxo Principal</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openZoomModal(backendFlowDiagram, 'backend-flow', 'Fluxo Backend Completo')}
                  className="gap-2"
                >
                  <Maximize2 className="h-4 w-4" />
                  Ampliar
                </Button>
              </div>
              <div className="cursor-pointer" onClick={() => openZoomModal(backendFlowDiagram, 'backend-flow', 'Fluxo Backend Completo')}>
                <MermaidDiagram 
                  chart={backendFlowDiagram} 
                  id="backend-flow-diagram" 
                  theme={isDarkMode ? 'dark' : 'light'} 
                />
              </div>
            </Card>

            {/* Edge Functions */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-6">Edge Functions (16 funções)</h3>
              
              <div className="space-y-8">
                {/* process-bulk-document */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-4 text-primary">process-bulk-document</h4>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Caminho</p>
                      <code className="text-xs bg-background p-2 rounded block mt-1">supabase/functions/process-bulk-document/index.ts</code>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Método / JWT</p>
                      <p className="text-sm mt-1"><code className="bg-background px-2 py-1 rounded">POST</code> <code className="bg-background px-2 py-1 rounded ml-2">verify_jwt = false</code></p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold mb-2">Input JSON:</p>
                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "documents_data": [
    {
      "document_id": "uuid",
      "full_text": "texto extraído do PDF",
      "title": "nome_arquivo.pdf"
    }
  ]
}`}
                      </pre>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Output JSON (Success):</p>
                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "results": [
    { "document_id": "uuid", "status": "completed" }
  ]
}`}
                      </pre>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Códigos de Status:</p>
                      <table className="w-full text-xs border rounded">
                        <tbody className="divide-y">
                          <tr><td className="p-2 font-mono">200</td><td className="p-2">Sucesso</td></tr>
                          <tr><td className="p-2 font-mono">400</td><td className="p-2">Texto inválido (&lt; 100 chars ou ratio &lt; 80%)</td></tr>
                          <tr><td className="p-2 font-mono">500</td><td className="p-2">Erro interno</td></tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Fluxo Interno:</p>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Validação de sanidade do texto</li>
                        <li>Auto-categorização via LLM (HEALTH/STUDY/GENERAL)</li>
                        <li>Geração de metadados (tags, resumo, implementation_status)</li>
                        <li>Chunking (750 palavras, 180 overlap)</li>
                        <li>Embeddings via OpenAI text-embedding-3-small</li>
                        <li>Persistência em document_chunks</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* chat / chat-study */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-4 text-primary">chat / chat-study</h4>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Caminhos</p>
                      <code className="text-xs bg-background p-2 rounded block mt-1">supabase/functions/chat/index.ts</code>
                      <code className="text-xs bg-background p-2 rounded block mt-1">supabase/functions/chat-study/index.ts</code>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Método / JWT</p>
                      <p className="text-sm mt-1"><code className="bg-background px-2 py-1 rounded">POST</code> <code className="bg-background px-2 py-1 rounded ml-2">verify_jwt = false</code></p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold mb-2">Input JSON:</p>
                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "messages": [
    { "role": "user", "content": "pergunta do usuário" }
  ],
  "session_id": "chat_2025-01-01_123456"
}`}
                      </pre>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Output:</p>
                      <p className="text-xs text-muted-foreground">SSE Streaming (text/event-stream)</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Fluxo Interno:</p>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Busca RAG via search-documents (contexto relevante)</li>
                        <li>Monta prompt com contexto + mensagens</li>
                        <li>Streaming via Lovable AI Gateway (google/gemini-2.5-flash)</li>
                        <li>Análise de sentimento ao final</li>
                        <li>Salva conversa em conversation_history</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* search-documents */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-4 text-primary">search-documents</h4>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Caminho</p>
                      <code className="text-xs bg-background p-2 rounded block mt-1">supabase/functions/search-documents/index.ts</code>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Método / JWT</p>
                      <p className="text-sm mt-1"><code className="bg-background px-2 py-1 rounded">POST</code> <code className="bg-background px-2 py-1 rounded ml-2">verify_jwt = false</code></p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold mb-2">Input JSON:</p>
                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "query": "pergunta do usuário",
  "targetChat": "health",
  "matchThreshold": 0.7,
  "matchCount": 5
}`}
                      </pre>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Output JSON:</p>
                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "results": [
    {
      "chunk_id": "uuid",
      "content": "texto do chunk",
      "similarity": 0.85
    }
  ]
}`}
                      </pre>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Fluxo Interno:</p>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Gera embedding da query via OpenAI</li>
                        <li>Busca no PostgreSQL usando cosine distance (pgvector)</li>
                        <li>Filtra por target_chat e similarity threshold</li>
                        <li>Retorna top N chunks mais similares</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Outras Edge Functions (resumidas) */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-4">Outras Edge Functions</h4>
                  <div className="grid gap-4">
                    <div className="border-l-4 border-primary pl-4">
                      <p className="font-semibold text-sm">text-to-speech</p>
                      <p className="text-xs text-muted-foreground">TTS ElevenLabs (Fernando Arbache voice), streaming Web Audio API</p>
                    </div>
                    <div className="border-l-4 border-primary pl-4">
                      <p className="font-semibold text-sm">voice-to-text</p>
                      <p className="text-xs text-muted-foreground">STT OpenAI Whisper, suporte PT-BR</p>
                    </div>
                    <div className="border-l-4 border-secondary pl-4">
                      <p className="font-semibold text-sm">generate-image</p>
                      <p className="text-xs text-muted-foreground">Geração imagens saúde via google/gemini-3-pro-image-preview</p>
                    </div>
                    <div className="border-l-4 border-secondary pl-4">
                      <p className="font-semibold text-sm">generate-history-image</p>
                      <p className="text-xs text-muted-foreground">Imagens timeline IA (AI History modal)</p>
                    </div>
                    <div className="border-l-4 border-secondary pl-4">
                      <p className="font-semibold text-sm">generate-section-image</p>
                      <p className="text-xs text-muted-foreground">Imagens seções landing page</p>
                    </div>
                    <div className="border-l-4 border-accent pl-4">
                      <p className="font-semibold text-sm">analyze-sentiment</p>
                      <p className="text-xs text-muted-foreground">Análise sentimento via Lovable AI</p>
                    </div>
                    <div className="border-l-4 border-accent pl-4">
                      <p className="font-semibold text-sm">sentiment-alert</p>
                      <p className="text-xs text-muted-foreground">Alertas email para conversas negativas</p>
                    </div>
                    <div className="border-l-4 border-warning pl-4">
                      <p className="font-semibold text-sm">send-email</p>
                      <p className="text-xs text-muted-foreground">Emails via Resend API</p>
                    </div>
                    <div className="border-l-4 border-warning pl-4">
                      <p className="font-semibold text-sm">youtube-videos</p>
                      <p className="text-xs text-muted-foreground">Cache YouTube API, otimização quota (hardcoded channelId)</p>
                    </div>
                    <div className="border-l-4 border-muted pl-4">
                      <p className="font-semibold text-sm">process-document-with-text</p>
                      <p className="text-xs text-muted-foreground">Processamento individual (legado, substituído por process-bulk-document)</p>
                    </div>
                    <div className="border-l-4 border-muted pl-4">
                      <p className="font-semibold text-sm">suggest-document-tags</p>
                      <p className="text-xs text-muted-foreground">Sugestão tags via LLM (agora integrado em process-bulk-document)</p>
                    </div>
                    <div className="border-l-4 border-muted pl-4">
                      <p className="font-semibold text-sm">generate-document-summary</p>
                      <p className="text-xs text-muted-foreground">Resumo via LLM (agora integrado em process-bulk-document)</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* ===== FRONTEND ===== */}
          <section id="frontend" className="scroll-mt-20 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Code className="h-8 w-8 text-primary" />
                🖥️ Frontend
              </h2>
            </div>

            <BackToIndex />

            {/* Dependências */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-4">Dependências Core</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Pacote</th>
                      <th className="text-left p-2">Versão</th>
                      <th className="text-left p-2">Uso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2 font-mono">pdfjs-dist</td>
                      <td className="p-2">^5.4.449</td>
                      <td className="p-2">Extração texto PDF no cliente</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">mermaid</td>
                      <td className="p-2">^11.12.1</td>
                      <td className="p-2">Diagramas de fluxo</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">react-i18next</td>
                      <td className="p-2">^16.3.5</td>
                      <td className="p-2">Internacionalização PT/EN/FR</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">@tanstack/react-query</td>
                      <td className="p-2">^5.83.0</td>
                      <td className="p-2">Cache e fetching assíncrono</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">lucide-react</td>
                      <td className="p-2">^0.462.0</td>
                      <td className="p-2">Biblioteca de ícones</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">@supabase/supabase-js</td>
                      <td className="p-2">^2.84.0</td>
                      <td className="p-2">Cliente Supabase/Lovable Cloud</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Componentes */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-6">Componentes Principais</h3>
              
              <div className="space-y-6">
                {/* DocumentsTab.tsx */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-3 text-primary">DocumentsTab.tsx</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    <strong>Caminho:</strong> <code>src/components/admin/DocumentsTab.tsx</code>
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold mb-2">Descrição:</p>
                      <p className="text-sm text-muted-foreground">
                        Tab de gerenciamento de documentos RAG no painel admin. Permite upload múltiplo de PDFs, 
                        processamento em lote com auto-categorização LLM, e visualização de documentos com status.
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Dependências:</p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        <li><code>pdfjs-dist</code> - Extração de texto</li>
                        <li><code>@tanstack/react-query</code> - Cache e mutations</li>
                        <li><code>@supabase/supabase-js</code> - Chamadas backend</li>
                      </ul>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Ações Principais:</p>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li><strong>Upload múltiplo de PDFs:</strong> Aceita arquivos <code>.pdf</code> via drag-and-drop ou file input</li>
                        <li><strong>Extração de texto:</strong> Usa <code>pdfjsLib.getDocument()</code> para extrair texto página por página</li>
                        <li><strong>Criação de registros:</strong> Insere documentos com status "pending" e <code>target_chat: "general"</code></li>
                        <li><strong>Processamento em lote:</strong> Invoca <code>process-bulk-document</code> edge function</li>
                        <li><strong>Auto-categorização:</strong> LLM classifica automaticamente (HEALTH/STUDY/GENERAL)</li>
                        <li><strong>Visualização:</strong> Tabela com status, target_chat, implementation_status, resumo AI, tags</li>
                      </ol>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Lógica Principal:</p>
                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`// Extração de texto PDF
const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((item: any) => item.str).join(' ');
  }
  return fullText;
};

// Processamento bulk
await supabase.functions.invoke("process-bulk-document", {
  body: { documents_data }
});`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* ChatKnowYOU.tsx / ChatStudy.tsx */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-3 text-primary">ChatKnowYOU.tsx / ChatStudy.tsx</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    <strong>Caminhos:</strong> 
                    <code className="block mt-1">src/components/ChatKnowYOU.tsx</code>
                    <code className="block mt-1">src/components/ChatStudy.tsx</code>
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold mb-2">Descrição:</p>
                      <p className="text-sm text-muted-foreground">
                        Componentes de chat interativo com RAG. ChatKnowYOU focado em saúde (Hospital Moinhos), 
                        ChatStudy focado em conteúdo KnowRISK/KnowYOU. Ambos incluem geração de imagens, 
                        áudio TTS/STT, e análise de sentimento.
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Funcionalidades:</p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Streaming SSE de respostas via edge functions</li>
                        <li>Modo de geração de imagens (botão "Desenhar")</li>
                        <li>Controles de áudio (Play, Stop, Download) com progresso</li>
                        <li>Gravação de voz com transcrição automática (Whisper)</li>
                        <li>Sugestões contextuais dinâmicas (baseadas em tags de documentos)</li>
                        <li>Histórico de conversas persistente (localStorage + DB)</li>
                        <li>Análise de sentimento em tempo real</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Outros componentes resumidos */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-4">Outros Componentes</h4>
                  <div className="grid gap-3">
                    <div className="border-l-4 border-primary pl-4">
                      <p className="font-semibold text-sm">AIHistoryPanel.tsx</p>
                      <p className="text-xs text-muted-foreground">Modal timeline evolução IA com 5 eras, áudio sincronizado, navegação jump</p>
                    </div>
                    <div className="border-l-4 border-primary pl-4">
                      <p className="font-semibold text-sm">DraggablePreviewPanel.tsx</p>
                      <p className="text-xs text-muted-foreground">Painel arrastável para tooltips com áudio TTS e carrosséis de imagens</p>
                    </div>
                    <div className="border-l-4 border-secondary pl-4">
                      <p className="font-semibold text-sm">Header.tsx</p>
                      <p className="text-xs text-muted-foreground">Navegação fixa com seletor de idiomas (PT/EN/FR), scroll progress, tema claro/escuro</p>
                    </div>
                    <div className="border-l-4 border-secondary pl-4">
                      <p className="font-semibold text-sm">MediaCarousel.tsx</p>
                      <p className="text-xs text-muted-foreground">Carrossel lado a lado: Spotify podcast + YouTube videos</p>
                    </div>
                    <div className="border-l-4 border-accent pl-4">
                      <p className="font-semibold text-sm">MermaidDiagram.tsx</p>
                      <p className="text-xs text-muted-foreground">Renderização de diagramas Mermaid com tema adaptativo</p>
                    </div>
                    <div className="border-l-4 border-accent pl-4">
                      <p className="font-semibold text-sm">MermaidZoomModal.tsx</p>
                      <p className="text-xs text-muted-foreground">Modal fullscreen com zoom (+ / - / Reset) e pan para diagramas</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Hooks */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-4">Hooks Customizados</h3>
              <div className="space-y-3">
                <div className="border-l-4 border-primary pl-4">
                  <p className="font-semibold text-sm">useChatKnowYOU.ts</p>
                  <p className="text-xs text-muted-foreground">Lógica chat saúde: streaming, histórico, geração imagem, análise sentimento</p>
                </div>
                <div className="border-l-4 border-primary pl-4">
                  <p className="font-semibold text-sm">useChatStudy.ts</p>
                  <p className="text-xs text-muted-foreground">Lógica chat estudos: RAG KnowRISK/KnowYOU, sugestões dinâmicas</p>
                </div>
                <div className="border-l-4 border-secondary pl-4">
                  <p className="font-semibold text-sm">useAdminSettings.ts</p>
                  <p className="text-xs text-muted-foreground">Gerenciamento configurações admin (audio, alerts, Gmail API)</p>
                </div>
                <div className="border-l-4 border-secondary pl-4">
                  <p className="font-semibold text-sm">useChatAnalytics.ts</p>
                  <p className="text-xs text-muted-foreground">Tracking métricas: message_count, audio_plays, topics</p>
                </div>
                <div className="border-l-4 border-accent pl-4">
                  <p className="font-semibold text-sm">useTooltipContent.ts</p>
                  <p className="text-xs text-muted-foreground">Fetch conteúdo tooltips com cache e validação</p>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </main>

      {/* Zoom Modal */}
      <MermaidZoomModal
        chart={zoomModal.chart}
        id={zoomModal.id}
        title={zoomModal.title}
        open={zoomModal.open}
        onOpenChange={(open) => setZoomModal({ ...zoomModal, open })}
        theme={isDarkMode ? 'dark' : 'light'}
      />
    </div>
  );
};

export default Documentation;
