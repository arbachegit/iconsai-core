import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FileText, ChevronDown, Loader2, Tag, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileJson, FileDown, HelpCircle, Heart, BookOpen, Package, Check, AlertTriangle, X, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { exportData, type ExportFormat } from "@/lib/export-utils";
import { toast } from "sonner";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";

interface Document {
  id: string;
  filename: string;
  target_chat: string;
  ai_summary: string | null;
  status: string;
  implementation_status: string | null;
  created_at: string;
  total_chunks: number | null;
  total_words: number | null;
}

interface DocumentTag {
  id: string;
  tag_name: string;
  tag_type: string;
  confidence: number | null;
  parent_tag_id: string | null;
  document_id: string;
}

export const DocumentAnalysisTab = () => {
  const [filterChat, setFilterChat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [tagSearchOpen, setTagSearchOpen] = useState<string | null>(null);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  
  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ["documents-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Document[];
    },
  });

  // Fetch all tags
  const { data: allTags, isLoading: tagsLoading } = useQuery({
    queryKey: ["document-tags-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_tags")
        .select("*");

      if (error) throw error;
      return data as DocumentTag[];
    },
  });

  // Fetch unique tag names for autocomplete
  const { data: uniqueTags } = useQuery({
    queryKey: ["unique-tags"],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_tags")
        .select("tag_name")
        .eq("tag_type", "parent");
      return [...new Set(data?.map(t => t.tag_name) || [])];
    }
  });

  // Insert tag mutation
  const insertTagMutation = useMutation({
    mutationFn: async ({ docId, tagName }: { docId: string; tagName: string }) => {
      await supabase.from("document_tags").insert({
        document_id: docId,
        tag_name: tagName,
        tag_type: "parent",
        source: "admin",
        confidence: 1.0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-tags-all"] });
      queryClient.invalidateQueries({ queryKey: ["unique-tags"] });
      toast.success("Tag adicionada com sucesso!");
      setTagSearchOpen(null);
      setTagSearchTerm("");
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar tag: ${error.message}`);
    }
  });

  // Group tags by document
  const tagsByDocument = allTags?.reduce((acc, tag) => {
    if (!acc[tag.document_id]) {
      acc[tag.document_id] = [];
    }
    acc[tag.document_id].push(tag);
    return acc;
  }, {} as Record<string, DocumentTag[]>) || {};

  // Filter documents
  const filteredDocs = documents?.filter((doc) => {
    const matchesChat = filterChat === "all" || doc.target_chat === filterChat;
    const matchesStatus = filterStatus === "all" || doc.implementation_status === filterStatus;
    const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesChat && matchesStatus && matchesSearch;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocs = filteredDocs.slice(startIndex, startIndex + itemsPerPage);

  const toggleExpanded = (docId: string) => {
    setExpandedDocs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const getChatBadgeVariant = (chat: string) => {
    switch (chat) {
      case "health":
        return "default";
      case "study":
        return "secondary";
      case "general":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "ready":
        return "default";
      case "needs_review":
        return "secondary";
      case "incomplete":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getParentTags = (docTags: DocumentTag[]) => {
    return docTags.filter((t) => !t.parent_tag_id);
  };

  const getChildTags = (docTags: DocumentTag[], parentId: string) => {
    return docTags.filter((t) => t.parent_tag_id === parentId);
  };

  if (docsLoading || tagsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleExport = async (format: ExportFormat) => {
    const exportColumns = [
      { key: 'filename', label: 'Nome do Arquivo' },
      { key: 'target_chat', label: 'Chat' },
      { key: 'status', label: 'Status' },
      { key: 'implementation_status', label: 'Status de Implementação' },
      { key: 'total_chunks', label: 'Total de Chunks' },
      { key: 'total_words', label: 'Total de Palavras' },
      { key: 'created_at', label: 'Data de Criação' },
    ];

    const exportableData = filteredDocs.map(doc => ({
      filename: doc.filename,
      target_chat: doc.target_chat,
      status: doc.status,
      implementation_status: doc.implementation_status || 'N/A',
      total_chunks: doc.total_chunks || 0,
      total_words: doc.total_words || 0,
      created_at: new Date(doc.created_at).toLocaleString('pt-BR'),
    }));

    try {
      await exportData({
        filename: 'documentos_analise',
        data: exportableData,
        format,
        columns: exportColumns,
      });
      toast.success(`Dados exportados em formato ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Erro ao exportar dados");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <AdminTitleWithInfo
            title="Análise de Documentos"
            level="h2"
            icon={FileText}
            tooltipText="Visualização detalhada de documentos"
            infoContent={
              <>
                <p>Explore documentos processados com análise completa de tags e categorizações.</p>
                <p className="mt-2">Veja resumos AI, hierarquia de tags, métricas de confiança e status de implementação.</p>
              </>
            }
          />
          <p className="text-muted-foreground mt-1">
            Visualização detalhada de documentos e suas categorizações
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              <FileText className="h-4 w-4 mr-2" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('xlsx')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('json')}>
              <FileJson className="h-4 w-4 mr-2" /> JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('pdf')}>
              <FileDown className="h-4 w-4 mr-2" /> PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Buscar</Label>
            <Input
              placeholder="Nome do documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Label>Chat Destino</Label>
            <Select value={filterChat} onValueChange={setFilterChat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="health">Saúde</SelectItem>
                <SelectItem value="study">Estudo</SelectItem>
                <SelectItem value="general">Geral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status de Implementação</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ready">Pronto</SelectItem>
                <SelectItem value="needs_review">Precisa Revisão</SelectItem>
                <SelectItem value="incomplete">Incompleto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Documents List */}
      <div className="space-y-4">
        {paginatedDocs.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhum documento encontrado
          </Card>
        ) : (
          paginatedDocs.map((doc) => {
            const docTags = tagsByDocument[doc.id] || [];
            const parentTags = getParentTags(docTags);

            return (
              <Collapsible
                key={doc.id}
                open={expandedDocs.has(doc.id)}
                onOpenChange={() => toggleExpanded(doc.id)}
              >
                <Card className="border-primary/20">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="mt-1">
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                expandedDocs.has(doc.id) ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <div className="flex-1">
                          <div className="font-semibold text-lg mb-2">{doc.filename}</div>
                          <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getChatBadgeVariant(doc.target_chat)} className="flex items-center gap-1">
                            {doc.target_chat === "health" ? (
                              <><Heart className="h-3 w-3" /> Saúde</>
                            ) : doc.target_chat === "study" ? (
                              <><BookOpen className="h-3 w-3" /> Estudo</>
                            ) : (
                              <><FileText className="h-3 w-3" /> Geral</>
                            )}
                          </Badge>
                            {doc.implementation_status && (
                              <Badge variant={getStatusBadgeVariant(doc.implementation_status)} className="flex items-center gap-1">
                                {doc.implementation_status === "ready" ? (
                                  <><Check className="h-3 w-3" /> Pronto</>
                                ) : doc.implementation_status === "needs_review" ? (
                                  <><AlertTriangle className="h-3 w-3" /> Precisa Revisão</>
                                ) : (
                                  <><X className="h-3 w-3" /> Incompleto</>
                                )}
                              </Badge>
                            )}
                            <Badge variant="outline">
                              {doc.total_chunks || 0} chunks
                            </Badge>
                            <Badge variant="outline">
                              {doc.total_words || 0} palavras
                            </Badge>
                            {(() => {
                              const avgConfidence = parentTags.length > 0 
                                ? parentTags.reduce((sum, t) => sum + (t.confidence || 0), 0) / parentTags.length 
                                : 0;
                              return avgConfidence > 0 ? (
                                <Badge 
                                  variant={avgConfidence >= 0.8 ? "default" : avgConfidence >= 0.6 ? "secondary" : "destructive"}
                                  className="flex items-center gap-1"
                                >
                                  <div className={`w-2 h-2 rounded-full ${
                                    avgConfidence >= 0.8 ? 'bg-green-500' : avgConfidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`} />
                                  Confiança: {Math.round(avgConfidence * 100)}%
                                </Badge>
                              ) : null;
                            })()}
                          </div>

                          {/* Preview de Tags no Header */}
                          {parentTags.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              {parentTags.slice(0, 3).map((tag) => (
                                <Badge key={tag.id} variant="outline" className="text-xs">
                                  {tag.tag_name}
                                </Badge>
                              ))}
                              {parentTags.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{parentTags.length - 3} mais
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <CollapsibleContent className="mt-4 space-y-4">
                      {/* AI Summary */}
                      {doc.ai_summary && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Resumo AI
                          </h4>
                          <p className="text-sm text-muted-foreground">{doc.ai_summary}</p>
                        </div>
                      )}

                      {/* Card de Classificação Completa */}
                      {parentTags.length > 0 ? (
                        <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Tag className="h-4 w-4" />
                              Classificação do Documento
                            </h4>
                            <div className="flex items-center gap-2">
                              {/* INSERIR TAGS Button */}
                              <Popover open={tagSearchOpen === doc.id} onOpenChange={(open) => {
                                setTagSearchOpen(open ? doc.id : null);
                                if (!open) setTagSearchTerm("");
                              }}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    INSERIR TAGS
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[250px] p-0" align="end">
                                  <Command>
                                    <CommandInput 
                                      placeholder="Buscar ou criar tag..." 
                                      value={tagSearchTerm}
                                      onValueChange={setTagSearchTerm}
                                    />
                                    <CommandList>
                                      <CommandEmpty>
                                        {tagSearchTerm.trim() && (
                                          <Button 
                                            variant="ghost" 
                                            className="w-full justify-start"
                                            onClick={() => insertTagMutation.mutate({ 
                                              docId: doc.id, 
                                              tagName: tagSearchTerm.trim() 
                                            })}
                                          >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Criar "{tagSearchTerm}"
                                          </Button>
                                        )}
                                      </CommandEmpty>
                                      <CommandGroup heading="Tags existentes">
                                        {uniqueTags
                                          ?.filter(t => t.toLowerCase().includes(tagSearchTerm.toLowerCase()))
                                          .slice(0, 10)
                                          .map(tag => (
                                            <CommandItem 
                                              key={tag}
                                              onSelect={() => {
                                                insertTagMutation.mutate({ docId: doc.id, tagName: tag });
                                              }}
                                            >
                                              <Tag className="h-4 w-4 mr-2" />
                                              {tag}
                                            </CommandItem>
                                          ))
                                        }
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              {/* Contexto/Caixa destacado */}
                              <Badge variant="default" className="text-sm px-3 py-1 flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {doc.target_chat === "health" ? "Caixa: Saúde" : 
                                 doc.target_chat === "study" ? "Caixa: Estudo" : "Caixa: Geral"}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Tags com Confiança Visual */}
                          <div className="space-y-3">
                            {parentTags.map((parent) => {
                              const children = getChildTags(docTags, parent.id);
                              return (
                                <div key={parent.id} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                                  <div className="flex-shrink-0 min-w-[140px]">
                                    <Badge variant="default" className="mb-1">{parent.tag_name}</Badge>
                                    <span className="text-xs text-muted-foreground block">
                                      ({parent.tag_type})
                                    </span>
                                  </div>
                                  
                                  {/* Barra de Confiança Visual com Tooltip */}
                                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                    <Progress value={(parent.confidence || 0) * 100} className="h-2 flex-1" />
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-1 cursor-help">
                                            <div className={`w-3 h-3 rounded-full ${
                                              (parent.confidence || 0) >= 0.9 ? 'bg-green-500' :
                                              (parent.confidence || 0) >= 0.7 ? 'bg-blue-500' :
                                              (parent.confidence || 0) >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`} />
                                            <span className={`text-sm font-semibold ${
                                              (parent.confidence || 0) >= 0.9 ? 'text-green-500' :
                                              (parent.confidence || 0) >= 0.7 ? 'text-blue-500' :
                                              (parent.confidence || 0) >= 0.5 ? 'text-yellow-500' : 'text-red-500'
                                            }`}>
                                              {Math.round((parent.confidence || 0) * 100)}%
                                            </span>
                                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-[300px]">
                                          <p className="font-semibold">Grau de Confiança da Classificação</p>
                                          <p className="text-sm mt-1">Indica a certeza da IA ao classificar este documento:</p>
                                          <ul className="text-sm mt-2 space-y-1">
                                            <li className="text-green-500">🟢 90-100%: Alta confiança</li>
                                            <li className="text-blue-500">🔵 70-89%: Boa confiança</li>
                                            <li className="text-yellow-500">🟡 50-69%: Moderada</li>
                                            <li className="text-red-500">🔴 &lt;50%: Baixa confiança</li>
                                          </ul>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  
                                  {/* Tags filhas */}
                                  {children.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {children.map((child) => (
                                        <Badge key={child.id} variant="secondary" className="text-xs">
                                          {child.tag_name}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Nenhuma tag atribuída</span>
                            <Popover open={tagSearchOpen === doc.id} onOpenChange={(open) => {
                              setTagSearchOpen(open ? doc.id : null);
                              if (!open) setTagSearchTerm("");
                            }}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                  <Plus className="h-4 w-4" />
                                  INSERIR TAGS
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[250px] p-0" align="end">
                                <Command>
                                  <CommandInput 
                                    placeholder="Buscar ou criar tag..." 
                                    value={tagSearchTerm}
                                    onValueChange={setTagSearchTerm}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      {tagSearchTerm.trim() && (
                                        <Button 
                                          variant="ghost" 
                                          className="w-full justify-start"
                                          onClick={() => insertTagMutation.mutate({ 
                                            docId: doc.id, 
                                            tagName: tagSearchTerm.trim() 
                                          })}
                                        >
                                          <Plus className="h-4 w-4 mr-2" />
                                          Criar "{tagSearchTerm}"
                                        </Button>
                                      )}
                                    </CommandEmpty>
                                    <CommandGroup heading="Tags existentes">
                                      {uniqueTags
                                        ?.filter(t => t.toLowerCase().includes(tagSearchTerm.toLowerCase()))
                                        .slice(0, 10)
                                        .map(tag => (
                                          <CommandItem 
                                            key={tag}
                                            onSelect={() => {
                                              insertTagMutation.mutate({ docId: doc.id, tagName: tag });
                                            }}
                                          >
                                            <Tag className="h-4 w-4 mr-2" />
                                            {tag}
                                          </CommandItem>
                                        ))
                                      }
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Data:</span>
                          <div className="font-mono">
                            {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <div>{doc.status}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Chunks:</span>
                          <div>{doc.total_chunks || 0}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Palavras:</span>
                          <div>{doc.total_words || 0}</div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Card>
              </Collapsible>
            );
          })
        )}

        {/* Pagination Controls */}
        {filteredDocs.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredDocs.length)} de {filteredDocs.length}
              </span>
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
