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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FileText, ChevronDown, Loader2, Tag, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileJson, FileDown, HelpCircle, Heart, BookOpen, Package, Check, AlertTriangle, X, Plus, Trash2 } from "lucide-react";
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
  const [selectedParentTag, setSelectedParentTag] = useState<string | null>(null);
  const [selectedChildTags, setSelectedChildTags] = useState<Set<string>>(new Set());
  const [tagToDelete, setTagToDelete] = useState<{ id: string; name: string; isParent: boolean } | null>(null);
  
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

  // Fetch unique parent tag names for autocomplete
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

  // Fetch child tags for a selected parent tag name
  const { data: childTagsForParent } = useQuery({
    queryKey: ["child-tags-for-parent", selectedParentTag],
    queryFn: async () => {
      if (!selectedParentTag) return [];
      // Find all parent tag IDs with this name
      const { data: parentTags } = await supabase
        .from("document_tags")
        .select("id")
        .eq("tag_name", selectedParentTag)
        .eq("tag_type", "parent");
      
      if (!parentTags?.length) return [];
      
      // Get all child tags for these parents
      const parentIds = parentTags.map(t => t.id);
      const { data: childTags } = await supabase
        .from("document_tags")
        .select("tag_name")
        .in("parent_tag_id", parentIds);
      
      return [...new Set(childTags?.map(t => t.tag_name) || [])];
    },
    enabled: !!selectedParentTag
  });

  // Insert parent tag mutation
  const insertTagMutation = useMutation({
    mutationFn: async ({ docId, tagName }: { docId: string; tagName: string }) => {
      const { data } = await supabase.from("document_tags").insert({
        document_id: docId,
        tag_name: tagName,
        tag_type: "parent",
        source: "admin",
        confidence: 1.0
      }).select().single();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-tags-all"] });
      queryClient.invalidateQueries({ queryKey: ["unique-tags"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar tag: ${error.message}`);
    }
  });

  // Insert tags with children mutation
  const insertTagsWithChildrenMutation = useMutation({
    mutationFn: async ({ docId, parentTagName, childTagNames }: { docId: string; parentTagName: string; childTagNames: string[] }) => {
      // Insert parent tag
      const { data: parentTag } = await supabase.from("document_tags").insert({
        document_id: docId,
        tag_name: parentTagName,
        tag_type: "parent",
        source: "admin",
        confidence: 1.0
      }).select().single();

      if (!parentTag) throw new Error("Falha ao criar tag pai");

      // Insert child tags
      if (childTagNames.length > 0) {
        const childInserts = childTagNames.map(childName => ({
          document_id: docId,
          tag_name: childName,
          tag_type: "child",
          parent_tag_id: parentTag.id,
          source: "admin",
          confidence: 1.0
        }));
        await supabase.from("document_tags").insert(childInserts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-tags-all"] });
      queryClient.invalidateQueries({ queryKey: ["unique-tags"] });
      queryClient.invalidateQueries({ queryKey: ["child-tags-for-parent"] });
      toast.success("Tags adicionadas com sucesso!");
      setTagSearchOpen(null);
      setTagSearchTerm("");
      setSelectedParentTag(null);
      setSelectedChildTags(new Set());
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar tags: ${error.message}`);
    }
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      // First delete all child tags that reference this tag
      const { error: childError } = await supabase
        .from("document_tags")
        .delete()
        .eq("parent_tag_id", tagId);
      
      if (childError) {
        console.error("Error deleting child tags:", childError);
        throw new Error(`Erro ao excluir tags filhas: ${childError.message}`);
      }
      
      // Then delete the tag itself
      const { error: deleteError } = await supabase
        .from("document_tags")
        .delete()
        .eq("id", tagId);
      
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-tags-all"] });
      queryClient.invalidateQueries({ queryKey: ["unique-tags"] });
      toast.success("Tag excluída com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao deletar tag: ${error.message}`);
    }
  });


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
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2"
                                onClick={() => setTagSearchOpen(doc.id)}
                              >
                                <Plus className="h-4 w-4" />
                                INSERIR TAGS
                              </Button>
                              <Dialog 
                                open={tagSearchOpen === doc.id} 
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setTagSearchOpen(null);
                                    setTagSearchTerm("");
                                    setSelectedParentTag(null);
                                    setSelectedChildTags(new Set());
                                  }
                                }}
                              >
                                <DialogContent className="sm:max-w-[500px]">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <Tag className="h-5 w-5" />
                                      {selectedParentTag 
                                        ? `Selecionar Tags Filhas: ${selectedParentTag}` 
                                        : `Inserir Tags - ${doc.filename}`
                                      }
                                    </DialogTitle>
                                  </DialogHeader>
                                  
                                  {!selectedParentTag ? (
                                    // Step 1: Select parent tag
                                    <Command className="border rounded-lg">
                                      <CommandInput 
                                        placeholder="Buscar ou criar tag pai..." 
                                        value={tagSearchTerm}
                                        onValueChange={setTagSearchTerm}
                                      />
                                      <CommandList>
                                        <CommandEmpty>
                                          {tagSearchTerm.trim() && (
                                            <Button 
                                              variant="ghost" 
                                              className="w-full justify-start"
                                              onClick={() => {
                                                setSelectedParentTag(tagSearchTerm.trim());
                                              }}
                                            >
                                              <Plus className="h-4 w-4 mr-2" />
                                              Criar "{tagSearchTerm}" e selecionar filhas
                                            </Button>
                                          )}
                                        </CommandEmpty>
                                        <ScrollArea className="h-[300px]">
                                          <CommandGroup heading="Tags Pai existentes">
                                            {uniqueTags
                                              ?.filter(t => t.toLowerCase().includes(tagSearchTerm.toLowerCase()))
                                              .map(tag => (
                                                <CommandItem 
                                                  key={tag}
                                                  onSelect={() => {
                                                    setSelectedParentTag(tag);
                                                    setTagSearchTerm("");
                                                  }}
                                                >
                                                  <Tag className="h-4 w-4 mr-2" />
                                                  {tag}
                                                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                                                </CommandItem>
                                              ))
                                            }
                                          </CommandGroup>
                                        </ScrollArea>
                                      </CommandList>
                                    </Command>
                                  ) : (
                                    // Step 2: Select child tags
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => {
                                            setSelectedParentTag(null);
                                            setSelectedChildTags(new Set());
                                          }}
                                        >
                                          <ChevronLeft className="h-4 w-4 mr-1" />
                                          Voltar
                                        </Button>
                                        <Badge variant="default">{selectedParentTag}</Badge>
                                      </div>
                                      
                                      {childTagsForParent && childTagsForParent.length > 0 ? (
                                        <div className="space-y-3">
                                          <p className="text-sm text-muted-foreground">
                                            Selecione as tags filhas para incluir:
                                          </p>
                                          <ScrollArea className="h-[250px] border rounded-lg p-3">
                                            <div className="space-y-2">
                                              {childTagsForParent.map(childTag => (
                                                <label 
                                                  key={childTag}
                                                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={selectedChildTags.has(childTag)}
                                                    onChange={(e) => {
                                                      const newSet = new Set(selectedChildTags);
                                                      if (e.target.checked) {
                                                        newSet.add(childTag);
                                                      } else {
                                                        newSet.delete(childTag);
                                                      }
                                                      setSelectedChildTags(newSet);
                                                    }}
                                                    className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                                                  />
                                                  <span className="text-sm">{childTag}</span>
                                                </label>
                                              ))}
                                            </div>
                                          </ScrollArea>
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                              {selectedChildTags.size} selecionada(s)
                                            </span>
                                            <div className="flex gap-2">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  if (selectedChildTags.size === childTagsForParent.length) {
                                                    setSelectedChildTags(new Set());
                                                  } else {
                                                    setSelectedChildTags(new Set(childTagsForParent));
                                                  }
                                                }}
                                              >
                                                {selectedChildTags.size === childTagsForParent.length ? "Desmarcar Todas" : "Selecionar Todas"}
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-center py-6 text-muted-foreground">
                                          <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                          <p>Nenhuma tag filha encontrada para "{selectedParentTag}"</p>
                                          <p className="text-xs mt-1">A tag pai será inserida sem filhas</p>
                                        </div>
                                      )}
                                      
                                      <div className="flex justify-end gap-2 pt-2 border-t">
                                        <Button 
                                          variant="outline"
                                          onClick={() => {
                                            setTagSearchOpen(null);
                                            setSelectedParentTag(null);
                                            setSelectedChildTags(new Set());
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                        <Button 
                                          onClick={() => {
                                            insertTagsWithChildrenMutation.mutate({
                                              docId: doc.id,
                                              parentTagName: selectedParentTag,
                                              childTagNames: Array.from(selectedChildTags)
                                            });
                                          }}
                                          disabled={insertTagsWithChildrenMutation.isPending}
                                        >
                                          {insertTagsWithChildrenMutation.isPending ? (
                                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Inserindo...</>
                                          ) : (
                                            <><Check className="h-4 w-4 mr-2" /> Inserir Tags</>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
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
                                <div key={parent.id} className="flex items-start gap-3 p-3 bg-background rounded-lg group">
                                  <div className="flex-shrink-0 min-w-[140px]">
                                    <div className="flex items-center gap-1">
                                      <Badge variant="default" className="mb-1">{parent.tag_name}</Badge>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                              onClick={() => setTagToDelete({ id: parent.id, name: parent.tag_name, isParent: true })}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Excluir tag e filhas</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
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
                                        <Badge key={child.id} variant="secondary" className="text-xs group/child flex items-center gap-1">
                                          {child.tag_name}
                                          <button
                                            className="opacity-0 group-hover/child:opacity-100 transition-opacity hover:text-destructive"
                                            onClick={() => setTagToDelete({ id: child.id, name: child.tag_name, isParent: false })}
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
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
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-2"
                              onClick={() => setTagSearchOpen(doc.id)}
                            >
                              <Plus className="h-4 w-4" />
                              INSERIR TAGS
                            </Button>
                            <Dialog 
                              open={tagSearchOpen === doc.id} 
                              onOpenChange={(open) => {
                                if (!open) {
                                  setTagSearchOpen(null);
                                  setTagSearchTerm("");
                                }
                              }}
                            >
                              <DialogContent className="sm:max-w-[400px]">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Tag className="h-5 w-5" />
                                    Inserir Tags - {doc.filename}
                                  </DialogTitle>
                                </DialogHeader>
                                <Command className="border rounded-lg">
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
                                    <ScrollArea className="h-[300px]">
                                      <CommandGroup heading="Tags existentes">
                                        {uniqueTags
                                          ?.filter(t => t.toLowerCase().includes(tagSearchTerm.toLowerCase()))
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
                                    </ScrollArea>
                                  </CommandList>
                                </Command>
                              </DialogContent>
                            </Dialog>
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

      {/* AlertDialog for tag deletion confirmation */}
      <AlertDialog open={!!tagToDelete} onOpenChange={(open) => !open && setTagToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tagToDelete?.isParent ? (
                <>
                  Tem certeza que deseja excluir a tag <strong>"{tagToDelete?.name}"</strong> e todas as suas tags filhas?
                  <br /><br />
                  Esta ação não pode ser desfeita.
                </>
              ) : (
                <>
                  Tem certeza que deseja excluir a tag filha <strong>"{tagToDelete?.name}"</strong>?
                  <br /><br />
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (tagToDelete) {
                  deleteTagMutation.mutate(tagToDelete.id);
                  setTagToDelete(null);
                }
              }}
            >
              {deleteTagMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Excluindo...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" /> Excluir</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
