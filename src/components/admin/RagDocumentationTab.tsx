import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  FileText, 
  Database, 
  Search, 
  MessageSquare, 
  Code, 
  Tags, 
  Settings, 
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Download,
  ExternalLink,
  Lightbulb
} from "lucide-react";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { ETLExplanationModal } from "./ETLExplanationModal";
import { RagSectionModal } from "./RagSectionModal";

export const RagDocumentationTab = () => {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [showETLModal, setShowETLModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState<string | null>(null);

  const sections = [
    { id: "overview", title: "Visão Geral", icon: FileText, hasInfo: true },
    { id: "architecture", title: "Arquitetura", icon: Database, hasInfo: true },
    { id: "etl", title: "Pipeline ETL", icon: Code, hasInfo: true, useETLModal: true },
    { id: "search", title: "Sistema de Busca", icon: Search, hasInfo: true },
    { id: "integration", title: "Integração Chats", icon: MessageSquare, hasInfo: true },
    { id: "functions", title: "Edge Functions", icon: Code, hasInfo: true },
    { id: "tags", title: "Tags Hierárquicas", icon: Tags, hasInfo: true },
    { id: "config", title: "Configurações", icon: Settings, hasInfo: true },
    { id: "analytics", title: "Analytics", icon: TrendingUp, hasInfo: true },
    { id: "troubleshooting", title: "Troubleshooting", icon: AlertTriangle, hasInfo: true },
  ];

  const downloadMarkdown = () => {
    const link = document.createElement('a');
    link.href = '/src/documentation/rag/integration-guide.md';
    link.download = 'rag-integration-guide.md';
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gradient">
            Documentação RAG
          </h2>
          <p className="text-muted-foreground mt-2">
            Guia completo de integração do sistema RAG com os chats
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadMarkdown}>
            <Download className="h-4 w-4 mr-2" />
            Download MD
          </Button>
          <Button variant="outline" asChild>
            <a href="/docs" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              Docs Completos
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Navegação</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-4">
                {sections.map((section) => (
                  <div key={section.id} className="flex items-center gap-1">
                    <Button
                      variant={activeSection === section.id ? "secondary" : "ghost"}
                      className="flex-1 justify-start"
                      onClick={() => setActiveSection(section.id)}
                    >
                      <section.icon className="h-4 w-4 mr-2" />
                      {section.title}
                    </Button>
                    {section.hasInfo && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 relative group"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (section.useETLModal) {
                                  setShowETLModal(true);
                                } else {
                                  setShowSectionModal(section.id);
                                }
                              }}
                            >
                              <Lightbulb className="h-4 w-4 text-yellow-500 group-hover:text-yellow-400 transition-colors" />
                              {/* Green pulsating dot */}
                              <div className="absolute -top-0.5 -right-0.5 z-20">
                                <div className="relative">
                                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                                  <div className="absolute inset-0 rounded-full bg-green-400 animate-ping" />
                                </div>
                              </div>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>Clique para entender {section.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Content */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {sections.find(s => s.id === activeSection)?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {activeSection === "overview" && <OverviewSection />}
              {activeSection === "architecture" && <ArchitectureSection />}
              {activeSection === "etl" && <ETLSection />}
              {activeSection === "search" && <SearchSection />}
              {activeSection === "integration" && <IntegrationSection />}
              {activeSection === "functions" && <FunctionsSection />}
              {activeSection === "tags" && <TagsSection />}
              {activeSection === "config" && <ConfigSection />}
              {activeSection === "analytics" && <AnalyticsSection />}
              {activeSection === "troubleshooting" && <TroubleshootingSection />}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ETL Explanation Modal */}
      <ETLExplanationModal isOpen={showETLModal} onClose={() => setShowETLModal(false)} />
      
      {/* Section Explanation Modals */}
      <RagSectionModal 
        isOpen={showSectionModal !== null} 
        onClose={() => setShowSectionModal(null)} 
        sectionId={showSectionModal || 'overview'} 
      />
    </div>
  );
};

const OverviewSection = () => (
  <div className="space-y-4">
    <p className="text-muted-foreground">
      O sistema RAG (Retrieval-Augmented Generation) integrado aos chats KnowYOU permite que os assistentes de IA forneçam respostas fundamentadas em documentos específicos, melhorando significativamente a precisão e relevância das respostas.
    </p>

    {/* Card explicativo LLM vs SLM */}
    <Card className="p-4 border-amber-500/30 bg-amber-500/5">
      <div className="flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-amber-500 mt-1 shrink-0" />
        <div>
          <h4 className="font-medium text-amber-200">LLM vs SLM - Entenda a Diferença</h4>
          <div className="text-sm text-muted-foreground space-y-2 mt-2">
            <p>
              <strong className="text-foreground">LLM</strong> (Large Language Model): Modelos grandes como GPT-4, Gemini Pro. 
              Mais precisos para tarefas complexas, mas mais caros e lentos.
            </p>
            <p>
              <strong className="text-foreground">SLM</strong> (Small Language Model): Modelos otimizados e especializados. 
              Mais rápidos, econômicos e eficientes para tarefas específicas.
            </p>
            <p className="pt-1 border-t border-amber-500/20">
              <strong className="text-amber-300">No sistema KnowYOU:</strong> Utilizamos SLMs para tarefas repetitivas 
              (classificação de documentos, avaliação de legibilidade, sugestão de tags) e podemos escalar para LLMs 
              quando respostas mais complexas são necessárias.
            </p>
          </div>
        </div>
      </div>
    </Card>

    <div className="space-y-3">
      <h3 className="font-semibold text-lg">Características Principais</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Search className="h-5 w-5 text-primary mt-1" />
            <div>
              <h4 className="font-medium">Busca Híbrida</h4>
              <p className="text-sm text-muted-foreground">
                Combina busca vetorial com fallback para keywords
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Tags className="h-5 w-5 text-primary mt-1" />
            <div>
              <h4 className="font-medium">Tags Hierárquicas</h4>
              <p className="text-sm text-muted-foreground">
                Sistema parent/child para categorização inteligente
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-primary mt-1" />
            <div>
              <h4 className="font-medium">Auto-categorização</h4>
              <p className="text-sm text-muted-foreground">
                SLMs classificam documentos automaticamente
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-primary mt-1" />
            <div>
              <h4 className="font-medium">Métricas em Tempo Real</h4>
              <p className="text-sm text-muted-foreground">
                Tracking completo de performance e qualidade
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <Separator />

    <div className="space-y-3">
      <h3 className="font-semibold text-lg">Fluxo de Dados</h3>
      <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm">
        <div className="space-y-2">
          <div>📥 Upload PDF → Extração (pdfjs-dist)</div>
          <div>🔍 Validação → Análise de Legibilidade (SLM)</div>
          <div>✂️ Chunking → 1500 palavras por chunk</div>
          <div>🔢 Embeddings → KY AI (1536 dimensões)</div>
          <div>🗄️ Storage → PostgreSQL + pgvector</div>
          <div>🔎 Retrieval → Busca vetorial/keywords</div>
          <div>🤖 Generation → SLM com contexto RAG</div>
        </div>
      </div>
    </div>
  </div>
);

const ArchitectureSection = () => (
  <div className="space-y-4">
    <p className="text-muted-foreground">
      Arquitetura completa do sistema RAG, desde o upload até a geração de respostas.
    </p>

    <div className="bg-muted/30 p-6 rounded-lg">
      <h3 className="font-semibold mb-4">Camadas do Sistema</h3>
      <div className="space-y-4">
        <div className="border-l-4 border-primary pl-4">
          <h4 className="font-medium">Layer 1: ETL Pipeline</h4>
          <p className="text-sm text-muted-foreground">
            Extração, transformação e carregamento de documentos
          </p>
          <div className="flex gap-2 mt-2">
            <Badge>pdfjs-dist</Badge>
            <Badge>Unicode Validation</Badge>
            <Badge>Chunking</Badge>
            <Badge>Embeddings</Badge>
          </div>
        </div>

        <div className="border-l-4 border-secondary pl-4">
          <h4 className="font-medium">Layer 2: Database</h4>
          <p className="text-sm text-muted-foreground">
            Armazenamento vetorial com PostgreSQL + pgvector
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">VECTOR(1536)</Badge>
            <Badge variant="secondary">Cosine Distance</Badge>
            <Badge variant="secondary">HNSW Index</Badge>
          </div>
        </div>

        <div className="border-l-4 border-accent pl-4">
          <h4 className="font-medium">Layer 3: Retrieval</h4>
          <p className="text-sm text-muted-foreground">
            Sistema híbrido de busca com fallbacks
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">Vector Search</Badge>
            <Badge variant="outline">Keyword Fallback</Badge>
            <Badge variant="outline">Top-K Selection</Badge>
          </div>
        </div>

        <div className="border-l-4 border-green-500 pl-4">
          <h4 className="font-medium">Layer 4: Generation</h4>
          <p className="text-sm text-muted-foreground">
            SLM com contexto RAG e scope control
          </p>
          <div className="flex gap-2 mt-2">
            <Badge className="bg-green-500">KY AI</Badge>
            <Badge className="bg-green-500">System Prompt</Badge>
            <Badge className="bg-green-500">Scope Validation</Badge>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ETLSection = () => (
  <div className="space-y-4">
    <p className="text-muted-foreground">
      Pipeline completo de processamento de documentos desde upload até embeddings.
    </p>

    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Upload e Extração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Extração de texto usando pdfjs-dist no frontend (NUNCA no backend para evitar corrupção)
          </p>
          <div className="bg-muted p-3 rounded text-xs font-mono">
            const pdf = await pdfjsLib.getDocument(buffer).promise;<br/>
            const text = await extractAllPages(pdf);
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Validação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>Mínimo 100 caracteres</li>
            <li>Sanitização Unicode (remove surrogates)</li>
            <li>Análise de legibilidade com SLM</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Chunking</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Divisão em chunks de 1500 palavras para otimizar embeddings e retrieval
          </p>
          <div className="mt-2 flex gap-2">
            <Badge>1500 palavras/chunk</Badge>
            <Badge>Overlap opcional</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Embeddings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Geração de vetores usando KY AI text-embedding-3-small
          </p>
          <div className="mt-2 flex gap-2">
            <Badge>VECTOR(1536)</Badge>
            <Badge>KY AI</Badge>
            <Badge>Batch Processing</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const SearchSection = () => (
  <div className="space-y-4">
    <p className="text-muted-foreground">
      Sistema híbrido de busca com fallbacks para garantir alta taxa de recall.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Busca Vetorial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Método primário usando similaridade cosseno
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Threshold:</span>
              <Badge>0.15</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Match Count:</span>
              <Badge>5 chunks</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Metric:</span>
              <Badge>Cosine Distance</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Keyword Fallback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ativado quando busca vetorial retorna 0 resultados
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Threshold:</span>
              <Badge variant="outline">0.50</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Method:</span>
              <Badge variant="outline">ILIKE</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stopwords:</span>
              <Badge variant="outline">Filtrados</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fluxo de Decisão</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm space-y-2">
          <div>1. Gerar embedding da query</div>
          <div>2. Busca vetorial (threshold 0.15)</div>
          <div>3. ✓ Resultados encontrados? → Retornar</div>
          <div>4. ✗ Sem resultados? → Fallback keywords</div>
          <div>5. Extrair keywords (remove stopwords)</div>
          <div>6. Busca ILIKE com keywords</div>
          <div>7. Retornar resultados + analytics</div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const IntegrationSection = () => (
  <div className="space-y-4">
    <p className="text-muted-foreground">
      Como o sistema RAG é integrado aos chats Study e Health.
    </p>

    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Prompt Construction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Com Contexto RAG:</h4>
              <p className="text-xs text-muted-foreground font-mono">
                REGRA ABSOLUTA - CONTEXTO RAG TEM PRIORIDADE TOTAL<br/>
                [Chunks recuperados inseridos aqui]<br/>
                USE APENAS informações do contexto acima.
              </p>
            </div>
            <Separator />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Sem Contexto RAG:</h4>
              <p className="text-xs text-muted-foreground font-mono">
                ESCOPO PERMITIDO: [lista de scope_topics]<br/>
                MENSAGEM DE REJEIÇÃO: [rejection_message]
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              📚 Chat Study
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Target:</span>
              <Badge>study</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Documentos:</span>
              <span className="text-xs">KnowRISK, ACC, IA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Escopo:</span>
              <span className="text-xs">Tecnologia, Frameworks</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              🏥 Chat Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Target:</span>
              <Badge>health</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Documentos:</span>
              <span className="text-xs">Hospital Moinhos</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Escopo:</span>
              <span className="text-xs">Saúde, Medicina</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

const FunctionsSection = () => (
  <div className="space-y-4">
    <p className="text-muted-foreground">
      Edge Functions que compõem o sistema RAG.
    </p>

    <div className="space-y-3">
      {[
        {
          name: "process-bulk-document",
          description: "Pipeline completo: extração → chunking → embeddings → tags",
          badge: "ETL"
        },
        {
          name: "search-documents",
          description: "Busca híbrida vetorial + keywords com analytics",
          badge: "Search"
        },
        {
          name: "suggest-document-tags",
          description: "Geração de tags hierárquicas parent/child com SLM",
          badge: "Tags"
        },
        {
          name: "generate-document-summary",
          description: "Sumário 150-300 palavras + avaliação de legibilidade",
          badge: "Summary"
        }
      ].map((func) => (
        <Card key={func.name}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {func.name}
                  </code>
                  <Badge variant="outline">{func.badge}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{func.description}</p>
              </div>
              <Button variant="ghost" size="sm">
                <Code className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const TagsSection = () => (
  <div className="space-y-4">
    <p className="text-muted-foreground">
      Sistema de tags hierárquicas para categorização e escopo dinâmico.
    </p>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estrutura Hierárquica</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm">
          <div className="space-y-1">
            <div>📁 Parent Tag (confidence ≥ 0.70) ← No escopo</div>
            <div className="ml-4">├── 📄 Child Tag 1 (confidence ≥ 0.60)</div>
            <div className="ml-4">├── 📄 Child Tag 2 (confidence ≥ 0.70)</div>
            <div className="ml-4">└── 📄 Child Tag 3 (confidence ≥ 0.50)</div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Atualização Automática</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Trigger de banco atualiza scope_topics automaticamente quando tags são inseridas/atualizadas
        </p>
        <div className="bg-muted p-3 rounded text-xs font-mono">
          on_tag_insert_update_config<br/>
          ↓<br/>
          Recalcula scope_topics (parent tags confidence ≥ 0.7)<br/>
          ↓<br/>
          Atualiza document_tags_data (estatísticas)
        </div>
      </CardContent>
    </Card>
  </div>
);

const ConfigSection = () => (
  <div className="space-y-4">
    <p className="text-muted-foreground">
      Configurações e parâmetros do sistema RAG por chat.
    </p>

    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parâmetros Principais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
              <span className="text-sm">match_threshold</span>
              <Badge>0.15</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
              <span className="text-sm">match_count</span>
              <Badge>5</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
              <span className="text-sm">scope_topics</span>
              <Badge variant="outline">Auto-gerado</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2">
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <span>Threshold muito alto ({">"} 0.30)</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <span>Match count muito baixo ({"<"} 3)</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
              <span>Nenhum documento disponível</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <span>Documentos ilegíveis detectados</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
);

const AnalyticsSection = () => (
  <div className="space-y-4">
    <p className="text-muted-foreground">
      Métricas e analytics do sistema RAG.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Métricas Tracked</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Query original
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Tipo de busca (vector/keyword)
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Número de resultados
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Top similarity score
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Latência (ms)
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Status de sucesso
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dashboards Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2">
            <li>📊 Taxa de sucesso geral</li>
            <li>📈 Evolução temporal de uploads</li>
            <li>🏷️ Tags mais usadas</li>
            <li>🔍 Qualidade dos embeddings</li>
            <li>⚡ Latência por tipo de busca</li>
            <li>🔥 Queries mais frequentes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
);

const TroubleshootingSection = () => (
  <div className="space-y-4">
    <p className="text-muted-foreground">
      Problemas comuns e soluções.
    </p>

    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-red-500">
            ❌ Documentos não encontrados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Diagnóstico:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Verificar status do documento (completed?)</li>
              <li>Verificar embeddings (não nulos?)</li>
              <li>Testar busca com threshold baixo (0.05)</li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Soluções:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Reduzir threshold para 0.10-0.12</li>
              <li>Reprocessar documento se embeddings ausentes</li>
              <li>Verificar qualidade do PDF original</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-yellow-500">
            ⚠️ Tags não aparecem no escopo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Diagnóstico:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Verificar tags do documento</li>
              <li>Confirmar que são parent tags</li>
              <li>Conferir confidence (≥ 0.70?)</li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Soluções:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Reprocessar com novo prompt de tags</li>
              <li>Executar suggest-document-tags manualmente</li>
              <li>Verificar se trigger está ativo</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-blue-500">
            🐌 Performance lenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Diagnóstico:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Verificar latência em rag_analytics</li>
              <li>Confirmar existência de índices</li>
              <li>Verificar tamanho dos chunks</li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Soluções:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Criar índice HNSW para busca vetorial</li>
              <li>Reduzir match_count (5 → 3)</li>
              <li>Implementar cache de embeddings</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);
