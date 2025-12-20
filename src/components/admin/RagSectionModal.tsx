import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  RotateCcw, 
  FileText, 
  Database, 
  Search, 
  MessageSquare, 
  Code, 
  Tags, 
  Settings, 
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Zap,
  Layers
} from "lucide-react";

interface RagSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
}

interface AnimationState {
  phase: number;
  items: { id: number; active: boolean; loaded: boolean }[];
}

const sectionContent: Record<string, {
  title: string;
  description: string;
  icon: React.ElementType;
  phases: { name: string; description: string }[];
  items: string[];
  color: string;
}> = {
  overview: {
    title: "Visão Geral do RAG",
    description: "O RAG (Retrieval-Augmented Generation) combina busca de documentos com geração de texto por IA para fornecer respostas precisas e contextualizadas.",
    icon: FileText,
    phases: [
      { name: "Indexação", description: "Documentos são processados e indexados" },
      { name: "Retrieval", description: "Busca de contexto relevante" },
      { name: "Augmentation", description: "Enriquecimento do prompt" },
      { name: "Generation", description: "Geração da resposta final" },
    ],
    items: ["PDFs", "Chunks", "Embeddings", "Vetores", "Respostas"],
    color: "primary"
  },
  architecture: {
    title: "Arquitetura do Sistema",
    description: "Sistema em camadas que separa responsabilidades: ETL, Database, Retrieval e Generation.",
    icon: Database,
    phases: [
      { name: "ETL Layer", description: "Processamento de documentos" },
      { name: "Storage Layer", description: "PostgreSQL + pgvector" },
      { name: "Retrieval Layer", description: "Busca híbrida" },
      { name: "Generation Layer", description: "SLM com contexto" },
    ],
    items: ["Upload", "Processo", "Armazena", "Busca", "Gera"],
    color: "secondary"
  },
  search: {
    title: "Sistema de Busca Híbrida",
    description: "Combina busca vetorial (similaridade semântica) com fallback de keywords para máxima cobertura.",
    icon: Search,
    phases: [
      { name: "Query", description: "Recebe pergunta do usuário" },
      { name: "Embedding", description: "Gera vetor da query" },
      { name: "Vector Search", description: "Busca por similaridade" },
      { name: "Fallback", description: "Keywords se necessário" },
    ],
    items: ["Query", "Vector", "Match", "Rank", "Return"],
    color: "accent"
  },
  integration: {
    title: "Integração com Chats",
    description: "RAG é integrado aos chats Study e Health através de Edge Functions que constroem prompts contextualizados.",
    icon: MessageSquare,
    phases: [
      { name: "Mensagem", description: "Usuário envia pergunta" },
      { name: "Search", description: "Busca contexto RAG" },
      { name: "Prompt Build", description: "Monta system prompt" },
      { name: "Response", description: "SLM gera resposta" },
    ],
    items: ["User", "RAG", "Context", "SLM", "Chat"],
    color: "green"
  },
  functions: {
    title: "Edge Functions",
    description: "Funções serverless que processam documentos, geram embeddings e executam buscas em tempo real.",
    icon: Code,
    phases: [
      { name: "process-document", description: "Processa PDFs" },
      { name: "search-documents", description: "Executa buscas" },
      { name: "chat-router", description: "Integra RAG+Chat" },
      { name: "suggest-tags", description: "Auto-categorização" },
    ],
    items: ["Request", "Auth", "Process", "DB", "Response"],
    color: "purple"
  },
  tags: {
    title: "Tags Hierárquicas",
    description: "Sistema de categorização com tags pai/filho que permite navegação e filtragem inteligente de documentos.",
    icon: Tags,
    phases: [
      { name: "Extração", description: "Identifica temas do documento" },
      { name: "Hierarquia", description: "Define relações pai/filho" },
      { name: "Merge Rules", description: "Consolida tags similares" },
      { name: "Scope", description: "Delimita escopo do chat" },
    ],
    items: ["Doc", "Extract", "Parent", "Child", "Scope"],
    color: "orange"
  },
  config: {
    title: "Configurações RAG",
    description: "Parâmetros ajustáveis que controlam threshold de similaridade, número de matches e comportamento de fallback.",
    icon: Settings,
    phases: [
      { name: "match_threshold", description: "Similaridade mínima (0.15)" },
      { name: "match_count", description: "Chunks retornados (5)" },
      { name: "scope_topics", description: "Tópicos permitidos" },
      { name: "rejection_msg", description: "Mensagem fora escopo" },
    ],
    items: ["Load", "Validate", "Apply", "Cache", "Active"],
    color: "cyan"
  },
  analytics: {
    title: "Analytics RAG",
    description: "Métricas de performance incluindo latência, taxa de sucesso, scores de similaridade e uso de fallback.",
    icon: TrendingUp,
    phases: [
      { name: "Coleta", description: "Registra cada query" },
      { name: "Métricas", description: "Calcula KPIs" },
      { name: "Agregação", description: "Consolida por período" },
      { name: "Visualização", description: "Dashboards admin" },
    ],
    items: ["Query", "Log", "Calc", "Store", "Show"],
    color: "emerald"
  },
  troubleshooting: {
    title: "Troubleshooting",
    description: "Diagnóstico de problemas comuns: documentos não encontrados, baixa relevância, timeouts e erros de processamento.",
    icon: AlertTriangle,
    phases: [
      { name: "Identificar", description: "Detecta o problema" },
      { name: "Diagnóstico", description: "Analisa logs/métricas" },
      { name: "Solução", description: "Aplica correção" },
      { name: "Validação", description: "Confirma resolução" },
    ],
    items: ["Error", "Log", "Fix", "Test", "OK"],
    color: "red"
  },
};

export const RagSectionModal = ({ isOpen, onClose, sectionId }: RagSectionModalProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animation, setAnimation] = useState<AnimationState>({
    phase: -1,
    items: []
  });

  const content = sectionContent[sectionId] || sectionContent.overview;
  const Icon = content.icon;

  useEffect(() => {
    if (!isOpen) {
      resetAnimation();
    }
  }, [isOpen]);

  const startAnimation = () => {
    setIsAnimating(true);
    setAnimation({
      phase: 0,
      items: content.items.map((_, i) => ({ id: i, active: false, loaded: false }))
    });

    // Animate through phases
    content.phases.forEach((_, index) => {
      setTimeout(() => {
        setAnimation(prev => ({
          ...prev,
          phase: index,
          items: prev.items.map((item, i) => ({
            ...item,
            active: i === index,
            loaded: i < index
          }))
        }));
      }, index * 1200);
    });

    // Final state
    setTimeout(() => {
      setAnimation(prev => ({
        ...prev,
        phase: content.phases.length,
        items: prev.items.map(item => ({ ...item, active: false, loaded: true }))
      }));
      setIsAnimating(false);
    }, content.phases.length * 1200);
  };

  const resetAnimation = () => {
    setIsAnimating(false);
    setAnimation({ phase: -1, items: [] });
  };

  const getColorClass = (color: string, type: 'bg' | 'border' | 'text') => {
    const colors: Record<string, Record<string, string>> = {
      primary: { bg: 'bg-primary/20', border: 'border-primary', text: 'text-primary' },
      secondary: { bg: 'bg-secondary/20', border: 'border-secondary', text: 'text-secondary' },
      accent: { bg: 'bg-accent/20', border: 'border-accent', text: 'text-accent-foreground' },
      green: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-500' },
      purple: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-500' },
      orange: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-500' },
      cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-500' },
      emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-500' },
      red: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-500' },
    };
    return colors[color]?.[type] || colors.primary[type];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getColorClass(content.color, 'bg')}`}>
              <Icon className={`h-6 w-6 ${getColorClass(content.color, 'text')}`} />
            </div>
            {content.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Animation Controls */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={startAnimation} 
              disabled={isAnimating}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Simular Fluxo
            </Button>
            <Button 
              variant="outline" 
              onClick={resetAnimation}
              disabled={animation.phase === -1}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Resetar
            </Button>
            {animation.phase >= 0 && animation.phase < content.phases.length && (
              <Badge variant="outline" className={`${getColorClass(content.color, 'border')} ${getColorClass(content.color, 'text')} animate-pulse`}>
                {content.phases[animation.phase]?.name}
              </Badge>
            )}
            {animation.phase === content.phases.length && (
              <Badge className="bg-green-500 text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completo
              </Badge>
            )}
          </div>

          {/* Animated Flow Diagram */}
          <div className={`relative p-6 rounded-xl border-2 ${getColorClass(content.color, 'border')} ${getColorClass(content.color, 'bg')}`}>
            <div className="flex items-center justify-between gap-2">
              {content.items.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className={`
                      relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-500
                      ${animation.items[index]?.active 
                        ? `${getColorClass(content.color, 'border')} ${getColorClass(content.color, 'bg')} scale-110 shadow-lg` 
                        : animation.items[index]?.loaded 
                          ? 'border-green-500 bg-green-500/20' 
                          : 'border-muted bg-muted/50'}
                    `}
                  >
                    {animation.items[index]?.active && (
                      <Zap className={`h-4 w-4 ${getColorClass(content.color, 'text')} animate-pulse absolute -top-2 -right-2`} />
                    )}
                    {animation.items[index]?.loaded && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 absolute -top-2 -right-2" />
                    )}
                    <Layers className={`h-5 w-5 mb-1 ${animation.items[index]?.active || animation.items[index]?.loaded ? getColorClass(content.color, 'text') : 'text-muted-foreground'}`} />
                    <span className="text-xs font-medium">{item}</span>
                  </div>
                  {index < content.items.length - 1 && (
                    <ArrowRight className={`h-4 w-4 mx-1 transition-colors duration-300 ${
                      animation.items[index]?.loaded ? getColorClass(content.color, 'text') : 'text-muted-foreground/50'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Phases Description */}
          <div className="grid grid-cols-2 gap-3">
            {content.phases.map((phase, index) => (
              <div 
                key={index}
                className={`
                  p-3 rounded-lg border transition-all duration-300
                  ${animation.phase === index 
                    ? `${getColorClass(content.color, 'border')} ${getColorClass(content.color, 'bg')} shadow-md` 
                    : animation.phase > index
                      ? 'border-green-500/50 bg-green-500/10'
                      : 'border-muted bg-muted/30'}
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant={animation.phase >= index ? "default" : "outline"}
                    className={animation.phase === index ? getColorClass(content.color, 'bg') : ''}
                  >
                    {index + 1}
                  </Badge>
                  <span className="font-medium text-sm">{phase.name}</span>
                  {animation.phase > index && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
