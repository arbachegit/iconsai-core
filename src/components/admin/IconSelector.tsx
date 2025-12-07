import React, { useState, useMemo, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, X, Loader2, icons, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Complete list of all icons used in the application organized by category
export const APPLICATION_ICONS = {
  // Navegação
  navigation: [
    { name: "ArrowLeft", description: "Voltar à página anterior" },
    { name: "ArrowRight", description: "Avançar, continuar, próximo" },
    { name: "ArrowUp", description: "Voltar ao topo da página" },
    { name: "ArrowDown", description: "Rolar para baixo" },
    { name: "ArrowUpDown", description: "Ordenar/alternar direção" },
    { name: "ChevronDown", description: "Expandir conteúdo colapsável" },
    { name: "ChevronUp", description: "Colapsar conteúdo" },
    { name: "ChevronLeft", description: "Navegação anterior em carrossel" },
    { name: "ChevronRight", description: "Navegação próxima em carrossel" },
    { name: "Menu", description: "Abrir menu mobile hamburger" },
    { name: "X", description: "Fechar modal/drawer/painel" },
    { name: "Home", description: "Ir para página inicial" },
    { name: "PanelLeft", description: "Sidebar toggle" },
    { name: "MoreHorizontal", description: "Menu de opções" },
  ],
  // Ação
  action: [
    { name: "Play", description: "Iniciar reprodução de áudio" },
    { name: "Square", description: "Parar reprodução de áudio" },
    { name: "StopCircle", description: "Parar processo" },
    { name: "Download", description: "Baixar arquivo/áudio" },
    { name: "Upload", description: "Enviar arquivo (drag & drop)" },
    { name: "Send", description: "Enviar mensagem no chat" },
    { name: "Mic", description: "Ativar gravação de voz" },
    { name: "ImagePlus", description: "Gerar imagem (modo draw)" },
    { name: "Search", description: "Buscar/filtrar conteúdo" },
    { name: "RefreshCw", description: "Reprocessar documento" },
    { name: "RotateCcw", description: "Desfazer/restaurar versão" },
    { name: "RotateCw", description: "Refazer ação" },
    { name: "Trash2", description: "Excluir item" },
    { name: "Edit2", description: "Editar conteúdo" },
    { name: "Edit3", description: "Editar alternativo" },
    { name: "Pencil", description: "Edição de texto" },
    { name: "Save", description: "Salvar alterações" },
    { name: "Copy", description: "Copiar para clipboard" },
    { name: "Plus", description: "Adicionar novo item" },
    { name: "Minus", description: "Remover/decrementar" },
    { name: "Merge", description: "Mesclar tags/itens" },
    { name: "Filter", description: "Filtrar resultados" },
    { name: "Maximize2", description: "Expandir/zoom" },
    { name: "ZoomIn", description: "Aumentar zoom" },
    { name: "ZoomOut", description: "Diminuir zoom" },
    { name: "Target", description: "Foco/objetivo" },
    { name: "Wand2", description: "Auto-detectar/magia IA" },
  ],
  // Status
  status: [
    { name: "Loader2", description: "Indicador de carregamento" },
    { name: "Check", description: "Confirmação/seleção" },
    { name: "CheckCircle2", description: "Documento processado com sucesso" },
    { name: "XCircle", description: "Erro/falha no processamento" },
    { name: "AlertCircle", description: "Aviso/atenção" },
    { name: "AlertTriangle", description: "Alerta crítico" },
    { name: "Clock", description: "Pendente/aguardando" },
    { name: "Info", description: "Informação adicional" },
    { name: "HelpCircle", description: "Ajuda/tooltip" },
    { name: "Dot", description: "Indicador de ponto" },
    { name: "Activity", description: "Atividade/monitoramento" },
  ],
  // Comunicação
  communication: [
    { name: "MessageCircle", description: "Botão flutuante de chat" },
    { name: "MessageSquare", description: "Configuração de chat" },
    { name: "Mail", description: "Configuração de email" },
    { name: "Bell", description: "Notificações" },
    { name: "Radio", description: "Transmissão/broadcast" },
  ],
  // Mídia
  media: [
    { name: "Youtube", description: "Cache de vídeos YouTube" },
    { name: "Video", description: "Conteúdo de vídeo" },
    { name: "Music", description: "Embed de podcast Spotify" },
    { name: "Image", description: "Cache de imagens geradas" },
    { name: "FileDown", description: "Download de arquivo" },
  ],
  // Data
  data: [
    { name: "BarChart3", description: "Métricas e analytics" },
    { name: "TrendingUp", description: "Tendência positiva" },
    { name: "TrendingDown", description: "Tendência negativa" },
    { name: "Percent", description: "Porcentagem" },
    { name: "Database", description: "Métricas RAG/banco de dados" },
    { name: "FileText", description: "Documento/tooltip" },
    { name: "FileCode", description: "Código/documentação técnica" },
    { name: "FileSpreadsheet", description: "Exportar Excel" },
    { name: "FileJson", description: "Exportar JSON" },
    { name: "ClipboardList", description: "Logs/listagem" },
    { name: "Table2", description: "Visualização de tabela" },
    { name: "Package", description: "Documento empacotado" },
    { name: "Boxes", description: "Múltiplos documentos (both)" },
  ],
  // Sistema
  system: [
    { name: "Brain", description: "Acesso ao painel admin" },
    { name: "Languages", description: "Seletor de idioma" },
    { name: "Sun", description: "Tema claro" },
    { name: "Moon", description: "Tema escuro" },
    { name: "Lock", description: "Autenticação admin" },
    { name: "LogOut", description: "Sair do sistema" },
    { name: "GitBranch", description: "Controle de versão" },
    { name: "Tags", description: "Gerenciamento de tags" },
    { name: "Tag", description: "Tag individual" },
    { name: "Settings", description: "Configurações gerais" },
    { name: "Settings2", description: "Configurações avançadas" },
    { name: "Key", description: "Chave/autenticação" },
    { name: "KeyRound", description: "Chave de recuperação" },
    { name: "Shield", description: "Segurança/proteção" },
    { name: "Globe", description: "Globalização/idiomas" },
    { name: "Network", description: "Conexões/rede" },
    { name: "Cpu", description: "Processamento/hardware" },
    { name: "Zap", description: "Performance/velocidade" },
    { name: "Layers", description: "Camadas/níveis" },
    { name: "Layout", description: "Layout/estrutura" },
    { name: "Shapes", description: "Formas/componentes" },
    { name: "Component", description: "Componente reutilizável" },
  ],
  // Temático (AI History)
  thematic: [
    { name: "Baby", description: "Era: Nascimento (Anos 50)" },
    { name: "Users", description: "Era: Infância (Anos 60-80)" },
    { name: "User", description: "Usuário individual" },
    { name: "GraduationCap", description: "Era: Fase Adulta (90s-2000s)" },
    { name: "Rocket", description: "Era: Revolução Generativa" },
    { name: "Bot", description: "Marcos de IA (chatbots, Siri)" },
    { name: "Sparkles", description: "Momentos históricos/mágica" },
    { name: "Lightbulb", description: "Insights/descobertas" },
    { name: "Crown", description: "Vitórias (Deep Blue, AlphaGo)" },
    { name: "Cat", description: "Deep Learning YouTube" },
    { name: "Palette", description: "Era ChatGPT/Gemini criativa" },
    { name: "Snowflake", description: "Inverno da IA" },
    { name: "Skull", description: "Exterminador do Futuro" },
    { name: "Heart", description: "Saúde/Healthcare" },
    { name: "BookOpen", description: "Estudo/Educação" },
    { name: "History", description: "Histórico/Timeline" },
    { name: "Type", description: "Tipografia/Texto" },
  ],
  // Interação
  interaction: [
    { name: "GripVertical", description: "Arrastar verticalmente" },
    { name: "GripHorizontal", description: "Arrastar horizontalmente" },
    { name: "Eye", description: "Visualizar/mostrar" },
    { name: "EyeOff", description: "Ocultar/esconder" },
    { name: "Paperclip", description: "Anexar documento" },
    { name: "Smile", description: "Sentimento positivo" },
    { name: "Frown", description: "Sentimento negativo" },
    { name: "Meh", description: "Sentimento neutro" },
    { name: "MapPin", description: "Localização" },
  ],
};

// Flatten all icons for easy access
export const ALL_APPLICATION_ICONS = Object.entries(APPLICATION_ICONS).flatMap(
  ([category, iconList]) =>
    iconList.map((icon) => ({
      ...icon,
      category: category.charAt(0).toUpperCase() + category.slice(1),
    }))
);

// Category labels in Portuguese
const CATEGORY_LABELS: Record<string, string> = {
  navigation: "Navegação",
  action: "Ação",
  status: "Status",
  communication: "Comunicação",
  media: "Mídia",
  data: "Data",
  system: "Sistema",
  thematic: "Temático",
  interaction: "Interação",
};

interface IconSelectorProps {
  value?: string;
  onSelect: (iconName: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const IconSelector: React.FC<IconSelectorProps> = ({
  value,
  onSelect,
  className,
  disabled = false,
  placeholder = "Selecionar ícone",
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Filter icons based on search and category
  const filteredIcons = useMemo(() => {
    let result = ALL_APPLICATION_ICONS;

    if (categoryFilter !== "all") {
      result = result.filter(
        (icon) => icon.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (icon) =>
          icon.name.toLowerCase().includes(query) ||
          icon.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [searchQuery, categoryFilter]);

  // Get the selected icon component
  const SelectedIconComponent = value ? (icons[value as keyof typeof icons] as LucideIcon) : null;

  const handleSelect = (iconName: string) => {
    onSelect(iconName);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start gap-2", className)}
          disabled={disabled}
        >
          {SelectedIconComponent ? (
            <>
              <SelectedIconComponent className="h-4 w-4" />
              <span className="font-mono text-xs">{value}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shapes className="h-5 w-5" />
            Biblioteca de Ícones
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ícone por nome ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todas ({ALL_APPLICATION_ICONS.length})
                </SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label} ({APPLICATION_ICONS[key as keyof typeof APPLICATION_ICONS].length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filteredIcons.length} ícone{filteredIcons.length !== 1 ? "s" : ""} encontrado{filteredIcons.length !== 1 ? "s" : ""}
            </span>
            {value && (
              <Badge variant="secondary" className="gap-1">
                Selecionado: {value}
              </Badge>
            )}
          </div>

          {/* Icon Grid */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {filteredIcons.map((iconData) => {
                const IconComponent = icons[iconData.name as keyof typeof icons] as LucideIcon;
                if (!IconComponent) return null;
                
                const isSelected = value === iconData.name;
                
                return (
                  <button
                    key={iconData.name}
                    onClick={() => handleSelect(iconData.name)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border transition-all group hover:border-primary hover:bg-primary/5",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background"
                    )}
                    title={`${iconData.name}: ${iconData.description}`}
                  >
                    <IconComponent
                      className={cn(
                        "h-5 w-5 mb-1 transition-colors",
                        isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                      )}
                    />
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                      {iconData.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredIcons.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-50" />
                <p>Nenhum ícone encontrado</p>
                <p className="text-xs">Tente outro termo de busca</p>
              </div>
            )}
          </ScrollArea>

          {/* Usage Example */}
          <div className="pt-4 border-t">
            <Label className="text-xs text-muted-foreground">
              Exemplo de uso:
            </Label>
            <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto">
              {value
                ? `import { ${value} } from 'lucide-react';\n\n<${value} className="h-5 w-5" />`
                : "// Selecione um ícone para ver o código"}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Import the Shapes icon for the component
import { Shapes } from "lucide-react";

export default IconSelector;
